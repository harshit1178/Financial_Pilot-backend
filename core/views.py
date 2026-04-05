import calendar

from django.db import transaction as db_transaction
from django.utils import timezone
from django.db.models import Sum

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import UserProfile, Transaction, Goal, WeeklyCategoryBudget, WeeklyPledge
from .serializers import (
    TransactionSerializer, TransactionCreateSerializer,
    GoalSerializer, WeeklyCategoryBudgetSerializer, WeeklyPledgeSerializer,
)


# ─── Module-level helpers ─────────────────────────────────────────────────────

_SAVINGS_PCT_MAP = {'Freestyle': 10, 'Balanced': 25, 'Savings': 50}

def _get_savings_percent(profile):
    """Return effective savings % (0-100) for the given UserProfile."""
    if profile.goal_mode == 'Custom':
        return max(0, min(100, profile.custom_savings_percent))
    return _SAVINGS_PCT_MAP.get(profile.goal_mode, 25)


def _get_active_months(user):
    """
    Return the number of calendar months used for savings calculations.

    The current month is ALWAYS counted as +1 because the savings reservation
    is active from the very first day of the month, before any expense is added.
    Past months are counted only if they contained at least one expense.

    Formula that flows from this:
        gross_savings = salary * pct * (past_months_with_expenses + 1)
        total_savings = gross_savings - savings_withdrawn
                      = historical_savings + current_month_reserved - current_month_overdraft
    """
    from django.db.models.functions import TruncMonth
    from datetime import date

    today           = timezone.localdate()
    start_of_month  = date(today.year, today.month, 1)

    past_months = (
        Transaction.objects
        .filter(
            user=user,
            transaction_type='Expense',
            date__lt=start_of_month,   # strictly before the current month
        )
        .annotate(month=TruncMonth('date'))
        .values('month')
        .distinct()
        .count()
    )

    return past_months + 1   # +1 = current month is always reserved


def _recompute_savings_withdrawn(profile):
    """
    Recompute UserProfile.savings_withdrawn from scratch by replaying every
    expense month.  For each calendar month:
        overdraft_M = max(0, total_spent_M - monthly_budget)
    savings_withdrawn = sum of all overdraft_M

    Must be called inside a db_transaction.atomic() with select_for_update
    already held on profile.
    """
    from django.db.models.functions import TruncMonth

    user           = profile.user
    savings_pct    = _get_savings_percent(profile)
    total_salary   = float(profile.monthly_salary)
    monthly_budget = total_salary * (1 - savings_pct / 100)

    # Aggregate total spent per distinct calendar month
    monthly_totals = (
        Transaction.objects
        .filter(user=user, transaction_type='Expense')
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(month_total=Sum('amount'))
    )

    total_overdraft = 0.0
    for row in monthly_totals:
        total_overdraft += max(0.0, float(row['month_total']) - monthly_budget)

    profile.savings_withdrawn = round(total_overdraft, 2)
    profile.save(update_fields=['savings_withdrawn'])


def _settled_savings_this_month(user):
    """
    Sum of savings_amount from ALL settled pledges settled in the current
    calendar month.  This money has been 'locked away' by the user and must
    be subtracted from the spendable monthly budget.
    """
    today = timezone.localdate()
    return float(
        WeeklyPledge.objects
        .filter(
            user=user,
            is_settled=True,
            settled_at__year=today.year,
            settled_at__month=today.month,
        )
        .aggregate(total=Sum('savings_amount'))['total'] or 0
    )


def _metrics_snapshot(profile):
    """
    Compute and return the four key metrics after a reconciliation.
    Called AFTER _recompute_savings_withdrawn so values are already fresh.
    """
    user         = profile.user
    today        = timezone.localdate()
    savings_pct  = _get_savings_percent(profile)
    total_salary = float(profile.monthly_salary)

    monthly_budget = round(total_salary * (1 - savings_pct / 100), 2)

    total_spent = float(
        Transaction.objects
        .filter(
            user=user,
            transaction_type='Expense',
            date__year=today.year,
            date__month=today.month,
        )
        .aggregate(total=Sum('amount'))['total'] or 0
    )

    settled_this_month = _settled_savings_this_month(user)
    monthly_remaining_budget = max(0, round(monthly_budget - total_spent - settled_this_month, 2))

    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_left     = max(days_in_month - today.day + 1, 1)
    daily_safe_limit = round(monthly_remaining_budget / days_left, 2)

    active_months = _get_active_months(user)
    gross_savings = total_salary * (savings_pct / 100) * active_months
    # Add persisted general pledge savings on top of the formula-based savings.
    # goal_piggybank_balance is displayed separately; general_pledge_savings
    # represents money the user explicitly routed to their general savings pool.
    general_pledge_savings = float(profile.general_pledge_savings)
    total_savings_all_time = max(
        0,
        round(gross_savings - float(profile.savings_withdrawn) + general_pledge_savings, 2),
    )

    return {
        'total_spent':              round(total_spent, 2),
        'monthly_remaining_budget': monthly_remaining_budget,
        'daily_safe_limit':         daily_safe_limit,
        'total_savings_all_time':   total_savings_all_time,
    }


# ─── ViewSets ─────────────────────────────────────────────────────────────────

class TransactionViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD for Transactions — newest first.

    DELETE /api/transactions/<pk>/  — removes transaction, reconciles savings.
    PATCH  /api/transactions/<pk>/  — updates transaction, reconciles savings.
    PUT    /api/transactions/<pk>/  — same as PATCH (full replace).

    Every mutating response includes reconciled metrics:
        total_spent, monthly_remaining_budget, daily_safe_limit,
        total_savings_all_time
    """
    serializer_class = TransactionSerializer
    queryset         = Transaction.objects.all().order_by('-date')

    # ── DELETE ────────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(user=instance.user)
                .first()
            )
            if profile is None:
                return Response(
                    {'error': 'No profile found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            instance.delete()                    # 1. Remove transaction
            _recompute_savings_withdrawn(profile) # 2. Recalculate savings

        # 3. Return reconciled metrics (200 so body is included, not 204)
        return Response(
            {'detail': 'Transaction deleted.', **_metrics_snapshot(profile)},
            status=status.HTTP_200_OK,
        )

    # ── UPDATE (PUT / PATCH) ──────────────────────────────────────────────────

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop('partial', False)
        instance = self.get_object()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(user=instance.user)
                .first()
            )
            if profile is None:
                return Response(
                    {'error': 'No profile found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer.save()                    # 1. Apply new values
            _recompute_savings_withdrawn(profile) # 2. Recalculate savings

        # 3. Check if new state still over budget → attach warning
        metrics = _metrics_snapshot(profile)
        user    = instance.user
        today   = timezone.localdate()
        savings_pct    = _get_savings_percent(profile)
        total_salary   = float(profile.monthly_salary)
        monthly_budget = total_salary * (1 - savings_pct / 100)
        current_month_spent = metrics['total_spent']

        response_data = dict(serializer.data)
        response_data.update(metrics)

        if current_month_spent > monthly_budget:
            response_data['warning'] = (
                "⚠️ Savings Alert: You have exhausted this month\'s budget. "
                "We are now drawing from your lifetime savings. Please reduce spending."
            )

        return Response(response_data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/

    Self-healing: recomputes savings_withdrawn from scratch on every request
    using the *current* goal_mode budget, so switching to a more generous mode
    instantly restores savings that were previously drawn due to an overdraft in
    a stricter mode.

    Returns:
        goal_mode                - user's current goal mode
        savings_percent          - effective savings % for the goal mode
        total_salary             - monthly salary from UserProfile
        monthly_budget           - salary × (1 − savings%)
        total_spent              - sum of Expense transactions this month
        monthly_remaining_budget - monthly_budget − total_spent (0 if over-budget)
        daily_safe_limit         - monthly_remaining_budget / days_left
        days_left                - calendar days remaining in the current month
        total_savings_all_time   - gross savings − savings_withdrawn (≥ 0)
        goal_piggybank_balance   - accumulated piggybank for goals
        transactions             - 5 most recent transactions
        warning                  - present only when over-budget this month
    """

    def get(self, request):
        # ── Self-heal: recompute savings_withdrawn atomically ─────────────────
        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .select_related('user')
                .first()
            )

            if profile is None:
                return Response({
                    'goal_mode': 'Balanced',
                    'savings_percent': 25,
                    'total_salary': 0,
                    'monthly_budget': 0,
                    'total_spent': 0,
                    'monthly_remaining_budget': 0,
                    'daily_safe_limit': 0,
                    'days_left': 0,
                    'total_savings_all_time': 0,
                    'goal_piggybank_balance': 0,
                    'transactions': [],
                })

            # Always recompute from scratch so the current mode's budget is used
            _recompute_savings_withdrawn(profile)

        user         = profile.user
        today        = timezone.localdate()
        total_salary = float(profile.monthly_salary)
        savings_pct  = _get_savings_percent(profile)

        # ── Goal-mode budget split ────────────────────────────────────────────
        monthly_budget = round(total_salary * (1 - savings_pct / 100), 2)

        # ── Current-month expenses only ───────────────────────────────────────
        total_spent = float(
            Transaction.objects
            .filter(
                user=user,
                transaction_type='Expense',
                date__year=today.year,
                date__month=today.month,
            )
            .aggregate(total=Sum('amount'))['total'] or 0
        )

        # ── Derived monthly values ──────────────────────────────────────────
        # Settled pledge savings are 'locked away' — deduct from spendable budget
        settled_this_month = _settled_savings_this_month(user)
        monthly_remaining_budget = max(
            0, round(monthly_budget - total_spent - settled_this_month, 2)
        )

        days_in_month = calendar.monthrange(today.year, today.month)[1]
        days_left     = max(days_in_month - today.day + 1, 1)   # never 0

        daily_safe_limit = round(monthly_remaining_budget / days_left, 2)

        # ── All-time savings (gross − withdrawn + general pledge savings, floored at 0) ─
        active_months          = _get_active_months(user)
        gross_savings          = total_salary * (savings_pct / 100) * active_months
        general_pledge_savings = float(profile.general_pledge_savings)
        total_savings_all_time = max(
            0,
            round(gross_savings - float(profile.savings_withdrawn) + general_pledge_savings, 2),
        )

        # ── 5 most recent transactions ────────────────────────────────────────
        recent_txns = (
            Transaction.objects
            .filter(user=user)
            .order_by('-date', '-id')[:5]
        )
        transactions_data = TransactionSerializer(recent_txns, many=True).data

        # ── Response ──────────────────────────────────────────────────────────
        response_data = {
            'goal_mode':                profile.goal_mode,
            'savings_percent':          savings_pct,
            'total_salary':             total_salary,
            'monthly_budget':           monthly_budget,
            'total_spent':              round(total_spent, 2),
            'monthly_remaining_budget': monthly_remaining_budget,
            'daily_safe_limit':         daily_safe_limit,
            'days_left':                days_left,
            'total_savings_all_time':   total_savings_all_time,
            'goal_piggybank_balance':   float(profile.goal_piggybank_balance),
            'transactions':             transactions_data,
            'current_streak':           profile.current_streak,
        }

        if total_spent > monthly_budget:
            response_data['warning'] = (
                "\u26a0\ufe0f Savings Alert: You have exhausted this month's budget. "
                "We are now drawing from your lifetime savings. Please reduce spending."
            )

        return Response(response_data)


# ─── Add Transaction ──────────────────────────────────────────────────────────

class TransactionCreateView(APIView):
    """
    POST /api/transactions/add/

    Accepts JSON body:
        {
            "amount": 500,
            "category": "Food",
            "custom_name": "Lunch",           # optional
            "transaction_type": "Expense",    # optional, defaults to 'Expense'
            "date": "2026-04-04T13:00:00"     # optional, defaults to now
        }

    Savings overdraft conditions (Expense only):
        A — amount > monthly_budget_left + total_savings  →  400 Grounded
        B — amount > monthly_budget_left                  →  201 + savings warning
        C — amount ≤ monthly_budget_left                  →  201 normal
    """

    def post(self, request):
        from django.contrib.auth.models import User

        serializer = TransactionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── Resolve user ──────────────────────────────────────────────────────
        if request.user and request.user.is_authenticated:
            user = request.user
        else:
            user = User.objects.first()
            if user is None:
                return Response(
                    {'error': 'No users found in the database. Create one first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ── Non-expense: skip overdraft logic ─────────────────────────────────
        txn_type = serializer.validated_data.get('transaction_type', 'Expense')
        if txn_type != 'Expense':
            txn = serializer.save(user=user)
            return Response(TransactionSerializer(txn).data, status=status.HTTP_201_CREATED)

        # ── Expense: run overdraft checks inside an atomic block ──────────────
        amount = float(serializer.validated_data['amount'])

        with db_transaction.atomic():
            # Lock profile row to prevent race conditions
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(user=user)
                .first()
            )
            if profile is None:
                return Response(
                    {'error': 'No profile found. Create a UserProfile first.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            today          = timezone.localdate()
            savings_pct    = _get_savings_percent(profile)
            total_salary   = float(profile.monthly_salary)
            monthly_budget = total_salary * (1 - savings_pct / 100)

            # Current-month spend BEFORE this transaction
            total_spent = float(
                Transaction.objects
                .filter(
                    user=user,
                    transaction_type='Expense',
                    date__year=today.year,
                    date__month=today.month,
                )
                .aggregate(total=Sum('amount'))['total'] or 0
            )
            monthly_budget_left = monthly_budget - total_spent

            # Gross savings accumulated − already withdrawn
            active_months  = _get_active_months(user)
            gross_savings  = total_salary * (savings_pct / 100) * active_months
            total_savings  = max(0.0, gross_savings - float(profile.savings_withdrawn))
            total_available = monthly_budget_left + total_savings

            # ── Condition A: Completely out of funds ──────────────────────────
            if amount > total_available:
                return Response(
                    {
                        'error': (
                            '\u26d4 Grounded! You have exceeded your monthly budget '
                            'and your total savings. This expense is not possible right now.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            warning = None

            # ── Conditions B / C: save transaction then recompute from scratch ─
            # We do NOT do an incremental savings_withdrawn += excess here because
            # that would leave a stale value if the user later switches modes.
            # Instead we always replay every expense month (same as DELETE/PATCH).
            txn = serializer.save(user=user)
            _recompute_savings_withdrawn(profile)   # recalculate with new txn

            if amount > monthly_budget_left:
                warning = (
                    "\u26a0\ufe0f Savings Alert: You have exhausted this month's budget. "
                    "We are now drawing from your lifetime savings. Please reduce spending."
                )

        # Build response
        response_data = dict(TransactionSerializer(txn).data)
        if warning:
            response_data['warning'] = warning

        return Response(response_data, status=status.HTTP_201_CREATED)


# ─── Profile Update ───────────────────────────────────────────────────────────

class ProfileUpdateView(APIView):
    """
    PATCH /api/profile/

    Accepts JSON body (all fields optional):
        {
            "goal_mode": "Savings",          # Freestyle | Balanced | Savings | Custom
            "custom_savings_percent": 35     # 1-99, only meaningful when goal_mode='Custom'
        }

    Returns the updated goal_mode and custom_savings_percent.
    """

    VALID_MODES = ('Freestyle', 'Balanced', 'Savings', 'Custom')

    def patch(self, request):
        # ── Validate inputs first (outside the atomic block) ─────────────────
        new_mode = None
        new_custom_pct = None

        if 'goal_mode' in request.data:
            mode = request.data['goal_mode']
            if mode not in self.VALID_MODES:
                return Response(
                    {'error': f'goal_mode must be one of {self.VALID_MODES}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_mode = mode

        if 'custom_savings_percent' in request.data:
            try:
                pct = int(request.data['custom_savings_percent'])
            except (TypeError, ValueError):
                return Response(
                    {'error': 'custom_savings_percent must be an integer.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not (0 <= pct <= 100):
                return Response(
                    {'error': 'custom_savings_percent must be between 0 and 100.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            new_custom_pct = pct

        # ── Apply changes + self-heal savings atomically ──────────────────────
        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .select_related('user')
                .first()
            )
            if profile is None:
                return Response(
                    {'error': 'No profile found. Create a UserProfile first.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if new_mode is not None:
                profile.goal_mode = new_mode
            if new_custom_pct is not None:
                profile.custom_savings_percent = new_custom_pct

            # 1. Persist the new mode/percent
            profile.save(update_fields=['goal_mode', 'custom_savings_percent'])

            # 2. Self-heal: recompute savings_withdrawn using the NEW budget.
            #    _recompute_savings_withdrawn iterates every expense month and
            #    recalculates overdraft_M = max(0, total_spent_M - new_monthly_budget).
            #    Switching to a looser mode lowers the overdraft → savings restored.
            #    Switching to a stricter mode raises the overdraft → savings reduced.
            _recompute_savings_withdrawn(profile)

        return Response({
            'goal_mode':              profile.goal_mode,
            'custom_savings_percent': profile.custom_savings_percent,
            'savings_withdrawn':      float(profile.savings_withdrawn),
        })


# ─── Goal Queue ───────────────────────────────────────────────────────────────

class GoalViewSet(viewsets.ModelViewSet):
    """
    CRUD for the user's Goal priority queue.

    POST   /api/goals/          — create goal (priority auto-assigned as max+1)
    GET    /api/goals/          — list all active goals ordered by priority
    PATCH  /api/goals/<pk>/     — edit name / target_amount
    DELETE /api/goals/<pk>/     — remove goal and re-index remaining priorities
    """
    serializer_class = GoalSerializer

    def get_queryset(self):
        user = self._resolve_user()
        return Goal.objects.filter(user=user, is_completed=False).order_by('priority')

    # ── helpers ───────────────────────────────────────────────────────────────

    def _resolve_user(self):
        from django.contrib.auth.models import User
        if self.request.user and self.request.user.is_authenticated:
            return self.request.user
        return User.objects.first()

    def _reindex(self, user):
        """Rewrite priorities 1, 2, 3, … after a deletion."""
        goals = Goal.objects.filter(user=user, is_completed=False).order_by('priority')
        for idx, g in enumerate(goals, start=1):
            if g.priority != idx:
                g.priority = idx
                g.save(update_fields=['priority'])

    # ── create ────────────────────────────────────────────────────────────────

    def perform_create(self, serializer):
        user = self._resolve_user()
        next_priority = (
            Goal.objects.filter(user=user, is_completed=False).count() + 1
        )
        serializer.save(user=user, priority=next_priority)

    # ── destroy ───────────────────────────────────────────────────────────────

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user     = instance.user
        with db_transaction.atomic():
            instance.delete()
            self._reindex(user)
        return Response(
            {'detail': 'Goal removed and queue re-indexed.'},
            status=status.HTTP_200_OK,
        )


# ─── Goal Withdraw (Complete Top Goal) ───────────────────────────────────────

class GoalWithdrawView(APIView):
    """
    POST /api/goals/withdraw/

    Identifies the highest-priority incomplete goal (priority=1), verifies the
    piggybank balance is sufficient, hard-deletes the goal, deducts the amount,
    and re-indexes the remaining queue — all inside a single atomic transaction.

    Response (success):
        {
          "message": "🏆 Goal Accomplished and removed from the system!",
          "goal_name": "...",
          "amount_used": ...,
          "piggybank_balance": ...
        }
    """

    def post(self, request):
        from django.contrib.auth.models import User

        user = request.user if request.user.is_authenticated else User.objects.first()
        if user is None:
            return Response({'error': 'No user found.'}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(user=user)
                .first()
            )
            if profile is None:
                return Response(
                    {'error': 'No profile found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Identify: priority=1 is the top of the queue
            goal = (
                Goal.objects
                .select_for_update()
                .filter(user=user, is_completed=False)
                .order_by('priority')
                .first()
            )
            if goal is None:
                return Response(
                    {'error': 'No active goals in your queue.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Verify balance
            piggybank = float(profile.goal_piggybank_balance)
            target    = float(goal.target_amount)
            if piggybank < target:
                shortfall = round(target - piggybank, 2)
                return Response(
                    {
                        'error': (
                            f'\U0001f4b0 Not enough in the Piggybank. '
                            f'You need \u20b9{shortfall:,.2f} more to complete '
                            f'"{goal.name}".'
                        ),
                        'piggybank_balance': piggybank,
                        'target_amount':     target,
                        'shortfall':         shortfall,
                    },
                    status=status.HTTP_402_PAYMENT_REQUIRED,
                )

            goal_name = goal.name

            # Execute: deduct & hard-delete
            profile.goal_piggybank_balance = round(piggybank - target, 2)
            profile.save(update_fields=['goal_piggybank_balance'])
            goal.delete()

            # Re-index remaining goals: priority = priority - 1
            remaining = Goal.objects.filter(user=user, is_completed=False).order_by('priority')
            for idx, g in enumerate(remaining, start=1):
                if g.priority != idx:
                    g.priority = idx
                    g.save(update_fields=['priority'])

        return Response({
            'message':           '\U0001f3c6 Goal Accomplished and removed from the system!',
            'goal_name':         goal_name,
            'amount_used':       target,
            'piggybank_balance': float(profile.goal_piggybank_balance),
        }, status=status.HTTP_200_OK)


# ─── Weekly Category Budget ───────────────────────────────────────────────────

class WeeklyCategoryBudgetViewSet(viewsets.ModelViewSet):
    """
    CRUD for a user's per-category weekly spending limits.

    POST   /api/weekly-budgets/       — create a new budget limit
    GET    /api/weekly-budgets/       — list all limits
    PATCH  /api/weekly-budgets/<pk>/  — update limit amount
    DELETE /api/weekly-budgets/<pk>/  — remove limit (blocked if unsettled pledge exists)
    """
    serializer_class = WeeklyCategoryBudgetSerializer

    def get_queryset(self):
        user = self._resolve_user()
        return WeeklyCategoryBudget.objects.filter(user=user)

    def _resolve_user(self):
        from django.contrib.auth.models import User
        if self.request.user and self.request.user.is_authenticated:
            return self.request.user
        return User.objects.first()

    def perform_create(self, serializer):
        serializer.save(user=self._resolve_user())

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Guard: block deletion if an active (unsettled) pledge exists for this budget
        has_active_pledge = WeeklyPledge.objects.filter(
            category=instance, is_settled=False
        ).exists()
        if has_active_pledge:
            return Response(
                {'error': 'Cannot delete a challenge that is currently being tracked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()
        return Response({'detail': 'Challenge deleted successfully.'}, status=status.HTTP_200_OK)


# ─── Weekly Pledges ───────────────────────────────────────────────────────────

class WeeklyPledgeViewSet(viewsets.ModelViewSet):
    """
    CRUD for weekly pledges (commitment to a WeeklyCategoryBudget for a week).

    POST   /api/pledges/       — create pledge for a budget + week
    GET    /api/pledges/       — list pledges (unsettled first)
    DELETE /api/pledges/<pk>/  — remove pledge
    """
    serializer_class = WeeklyPledgeSerializer

    def get_queryset(self):
        user = self._resolve_user()
        return WeeklyPledge.objects.filter(user=user).order_by('is_settled', '-week_start_date')

    def _resolve_user(self):
        from django.contrib.auth.models import User
        if self.request.user and self.request.user.is_authenticated:
            return self.request.user
        return User.objects.first()

    def perform_create(self, serializer):
        serializer.save(user=self._resolve_user())

    # ── destroy: reverse any settled savings before deleting ──────────────────

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(user=instance.user)
                .first()
            )

            # If this pledge was settled, reverse the financial side-effects.
            # WeeklyPledge has no 'destination' db field, so we subtract from
            # both pools (clamped at 0) — at most one was ever credited.
            if instance.is_settled and instance.savings_amount:
                saved = float(instance.savings_amount)
                profile.goal_piggybank_balance = round(
                    max(0.0, float(profile.goal_piggybank_balance) - saved), 2
                )
                profile.general_pledge_savings = round(
                    max(0.0, float(profile.general_pledge_savings) - saved), 2
                )
                profile.save(update_fields=['goal_piggybank_balance', 'general_pledge_savings'])

            instance.delete()

        return Response(
            {'detail': 'Pledge deleted and any settled savings reversed.'},
            status=status.HTTP_200_OK,
        )


# ─── Pledge Settlement ────────────────────────────────────────────────────────

class PledgeSettleView(APIView):
    """
    POST /api/pledges/settle/

    Body:
        {
            "pledge_id":    <int>,
            "destination":  "general" | "piggybank"   (required only on Scenario B)
        }

    Scenario A — Overspent (spend > limit):
        Returns HTTP 200 with a red-alert message.  Pledge is NOT marked settled
        so the user can view it again.

    Scenario B — Saved (spend <= limit):
        Calculates saved_amount = weekly_limit - actual_spend.

        Routes the savings to:
          - "piggybank" → increments UserProfile.goal_piggybank_balance (persistent field)
          - "general"   → no direct field update needed; budget deduction is automatic:
                          _settled_savings_this_month() sums pledge.savings_amount for
                          all settled pledges and subtracts from monthly_remaining_budget.

        In BOTH cases: subtracts saved_amount from the spendable monthly budget by
        marking pledge.is_settled=True with pledge.savings_amount=saved_amount.

    IMPORTANT: savings_withdrawn is a REPLAY-COMPUTED field overwritten on every
    dashboard request. We deliberately do NOT mutate it here.
    """

    def post(self, request):
        from datetime import timedelta

        pledge_id = request.data.get('pledge_id')
        # Accept both 'choice' (new) and 'destination' (legacy) from the frontend
        choice = (
            request.data.get('choice') or request.data.get('destination') or ''
        ).lower()

        if not pledge_id:
            return Response({'error': 'pledge_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Sandbox mode: always use the first profile / user — no auth required
        # select_for_update() requires an atomic block
        with db_transaction.atomic():
            _sandbox_profile = (
                UserProfile.objects
                .select_for_update()
                .select_related('user')
                .first()
            )
        if _sandbox_profile is None:
            return Response({'error': 'No UserProfile found in the database.'}, status=status.HTTP_400_BAD_REQUEST)
        user = _sandbox_profile.user

        try:
            pledge = WeeklyPledge.objects.select_related('category').get(pk=pledge_id, user=user)
        except WeeklyPledge.DoesNotExist:
            return Response({'error': f'Pledge {pledge_id} not found for this user.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as exc:
            return Response({'error': f'Pledge lookup failed: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if pledge.is_settled:
            return Response(
                {'error': 'This pledge has already been settled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Calculate spend for this category over the pledge's 7-day window ──
        week_start = pledge.week_start_date
        week_end   = week_start + timedelta(days=7)
        category   = pledge.category.category_name
        limit      = float(pledge.category.weekly_limit)

        total_spent = float(
            Transaction.objects
            .filter(
                user=user,
                transaction_type='Expense',
                category=category,
                date__date__gte=week_start,
                date__date__lt=week_end,
            )
            .aggregate(total=Sum('amount'))['total'] or 0
        )

        # ── Scenario A: Overspent ─────────────────────────────────────────────
        try:
            if total_spent > limit:
                overage = round(total_spent - limit, 2)

                # Mark pledge as settled-failed and reset streak atomically
                with db_transaction.atomic():
                    profile = (
                        UserProfile.objects
                        .select_for_update()
                        .filter(user=user)
                        .first()
                    )
                    if profile:
                        profile.current_streak = 0
                        profile.save(update_fields=['current_streak'])

                    pledge.is_settled     = True
                    pledge.settled_at     = timezone.now()
                    pledge.savings_amount = 0
                    pledge.save(update_fields=['is_settled', 'settled_at', 'savings_amount'])

                return Response({
                    'status':         'overspent',
                    'message':        f'\U0001f534 You exceeded your {category} limit by \u20b9{overage:,.2f}! Streak reset.',
                    'spent':          round(total_spent, 2),
                    'limit':          limit,
                    'overage':        overage,
                    'current_streak': 0,
                }, status=status.HTTP_200_OK)

            # ── Scenario B: Saved ─────────────────────────────────────────────
            saved = round(limit - total_spent, 2)

            # If choice not yet provided, return a prompt for the frontend
            if choice not in ('general', 'piggybank'):
                return Response({
                    'status':            'saved',
                    'message':           f'\U0001f7e2 Great discipline! You saved \u20b9{saved:,.2f} on {category} this week.',
                    'spent':             round(total_spent, 2),
                    'limit':             limit,
                    'savings_available': saved,
                    'action_required':   'Choose a destination: "general" or "piggybank".',
                }, status=status.HTTP_200_OK)

            # ── Commit savings atomically ─────────────────────────────────────
            #   saved_amount = weekly_limit - actual_spend (already computed above)
            #   Add saved_amount to the chosen destination.
            #   Subtract from monthly budget by marking pledge settled with savings_amount
            #   (budget helper _settled_savings_this_month sums all settled savings_amounts).
            #   Increment streak.
            with db_transaction.atomic():
                profile = (
                    UserProfile.objects
                    .select_for_update()
                    .filter(user=user)
                    .first()
                )
                if profile is None:
                    return Response(
                        {'error': 'No profile found.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if choice == 'piggybank':
                    # Add saved_amount to Goal Piggybank + bump streak
                    profile.goal_piggybank_balance = round(
                        float(profile.goal_piggybank_balance) + saved, 2
                    )
                    profile.current_streak += 1
                    profile.save(update_fields=['goal_piggybank_balance', 'current_streak'])
                    dest_label = 'Goal Piggybank'
                else:
                    # Add saved_amount to General Savings pool + bump streak
                    profile.general_pledge_savings = round(
                        float(profile.general_pledge_savings) + saved, 2
                    )
                    profile.current_streak += 1
                    profile.save(update_fields=['general_pledge_savings', 'current_streak'])
                    dest_label = 'General Savings'

                # Subtract saved_amount from monthly_budget_left by marking pledge settled.
                # _settled_savings_this_month() picks this up and deducts it from
                # monthly_remaining_budget on every dashboard/metrics call.
                # NOTE: WeeklyPledge has no 'destination' db field — routing is done
                # purely via the if/else above on UserProfile fields.
                pledge.is_settled     = True
                pledge.settled_at     = timezone.now()
                pledge.savings_amount = saved
                pledge.save(update_fields=['is_settled', 'settled_at', 'savings_amount'])

            # Return live metrics for immediate frontend card refresh
            metrics = _metrics_snapshot(profile)

            return Response({
                'status':                   'settled',
                'message':                  f'\u2705 \u20b9{saved:,.2f} saved this week added to your {dest_label}!',
                'spent':                    round(total_spent, 2),
                'limit':                    limit,
                'saved':                    saved,
                'destination':              dest_label,
                'piggybank_balance':        float(profile.goal_piggybank_balance),
                'monthly_remaining_budget': metrics['monthly_remaining_budget'],
                'total_savings_all_time':   metrics['total_savings_all_time'],
                'current_streak':           profile.current_streak,
            }, status=status.HTTP_200_OK)

        except Exception as exc:
            import traceback
            return Response(
                {'error': f'Settlement failed: {exc}', 'traceback': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Salary Update ────────────────────────────────────────────────────────────

class SalaryUpdateView(APIView):
    """
    PATCH /api/profile/update-salary/

    Body: { "monthly_salary": <positive number> }

    Single-user sandbox: always updates the profile of User.objects.first().
    Updates monthly_salary, recomputes savings_withdrawn, and returns
    reconciled budget metrics plus current_streak.
    """

    def patch(self, request):
        from django.contrib.auth.models import User

        raw = request.data.get('monthly_salary')
        if raw is None:
            return Response(
                {'error': 'monthly_salary is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            new_salary = float(raw)
        except (TypeError, ValueError):
            return Response(
                {'error': 'monthly_salary must be a valid number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if new_salary <= 0:
            return Response(
                {'error': 'monthly_salary must be a positive number.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user if request.user.is_authenticated else User.objects.first()
        if user is None:
            return Response({'error': 'No user found.'}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            profile = (
                UserProfile.objects
                .select_for_update()
                .filter(user=user)
                .first()
            )
            if profile is None:
                return Response(
                    {'error': 'No profile found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            profile.monthly_salary = round(new_salary, 2)
            profile.save(update_fields=['monthly_salary'])
            _recompute_savings_withdrawn(profile)

        metrics = _metrics_snapshot(profile)

        return Response({
            'monthly_salary': float(profile.monthly_salary),
            'current_streak': profile.current_streak,
            **metrics,
        }, status=status.HTTP_200_OK)
