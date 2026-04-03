import calendar

from django.utils import timezone
from django.db.models import Sum

from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import UserProfile, Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    """Full CRUD for Transaction model, newest first."""
    serializer_class = TransactionSerializer
    queryset = Transaction.objects.all().order_by('-date')


class DashboardSummaryView(APIView):
    """
    Simple financial summary for the current month.

    Returns:
        total_salary       - monthly salary from UserProfile
        total_spent        - sum of Expense transactions this month
        remaining_balance  - total_salary - total_spent
        daily_safe_limit   - remaining_balance / days_left (min 1 day guard)
        days_left          - calendar days remaining in the current month
        transactions       - 5 most recent transactions
    """

    def get(self, request):
        profile = UserProfile.objects.select_related('user').first()

        if profile is None:
            return Response({
                'total_salary': 0,
                'total_spent': 0,
                'remaining_balance': 0,
                'daily_safe_limit': 0,
                'days_left': 0,
                'transactions': [],
            })

        user = profile.user
        today = timezone.localdate()
        total_salary = float(profile.monthly_salary)

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

        # ── Derived values ────────────────────────────────────────────────────
        remaining_balance = total_salary - total_spent

        days_in_month = calendar.monthrange(today.year, today.month)[1]
        days_left = max(days_in_month - today.day + 1, 1)  # guardrail: never 0

        daily_safe_limit = round(remaining_balance / days_left, 2)

        # ── 5 most recent transactions (any type) ─────────────────────────────
        recent_txns = (
            Transaction.objects
            .filter(user=user)
            .order_by('-date')[:5]
        )
        transactions_data = TransactionSerializer(recent_txns, many=True).data

        return Response({
            'total_salary': total_salary,
            'total_spent': round(total_spent, 2),
            'remaining_balance': round(remaining_balance, 2),
            'daily_safe_limit': daily_safe_limit,
            'days_left': days_left,
            'transactions': transactions_data,
        })
