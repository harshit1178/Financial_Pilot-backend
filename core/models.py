from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    savings_goal_name = models.CharField(max_length=100, blank=True, null=True)
    savings_goal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    goal_mode = models.CharField(
        max_length=20,
        choices=[
            ('Freestyle', 'Freestyle'),
            ('Balanced',  'Balanced'),
            ('Savings',   'Savings'),
            ('Custom',    'Custom'),
        ],
        default='Balanced',
    )
    custom_savings_percent = models.IntegerField(default=0)   # used only when goal_mode='Custom'
    savings_withdrawn      = models.DecimalField(             # cumulative amount drawn from savings
        max_digits=12, decimal_places=2, default=0.00
    )
    # ── Goal & Piggybank ──────────────────────────────────────────────────────
    goal_piggybank_balance = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00,
        help_text="Accumulated savings earmarked for the Goals queue."
    )
    general_pledge_savings = models.DecimalField(
        max_digits=12, decimal_places=2, default=0.00,
        help_text="Cumulative savings from weekly pledges settled into General Savings."
    )
    current_streak = models.IntegerField(default=0)
    last_streak_update = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Transaction(models.Model):
    TRANSACTION_TYPES = [('Income', 'Income'), ('Expense', 'Expense')]
    CATEGORIES = [
        ('Food', 'Food'),
        ('Travel', 'Travel'),
        ('Groceries', 'Groceries'),
        ('Rent', 'Rent'),
        ('Loan', 'Loan'),
        ('Services', 'Services'),
        ('Subscription', 'Subscription'),
        ('Others', 'Others'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, default='Expense')
    category = models.CharField(max_length=20, choices=CATEGORIES, default='Others')
    custom_name = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateTimeField(default=None, null=True, blank=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.category}"


# ─── Goal Queue ───────────────────────────────────────────────────────────────

class Goal(models.Model):
    """
    Represents a savings goal in the user's priority queue.

    priority  – integer, 1 = top of queue, auto-assigned on creation.
    is_completed – soft flag (kept for audit); hard-delete happens on withdrawal.
    """
    user           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name           = models.CharField(max_length=120)
    target_amount  = models.DecimalField(max_digits=12, decimal_places=2)
    priority       = models.PositiveIntegerField(default=1)
    is_completed   = models.BooleanField(default=False)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['priority']

    def __str__(self):
        return f"[P{self.priority}] {self.name} (₹{self.target_amount})"


# ─── Weekly Budget Pledge System ─────────────────────────────────────────────

class WeeklyCategoryBudget(models.Model):
    """
    A user-defined weekly spending limit for a particular category.
    e.g. "I will spend at most ₹1,500 on Food each week."
    """
    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weekly_budgets')
    category_name = models.CharField(max_length=50)
    weekly_limit  = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('user', 'category_name')

    def __str__(self):
        return f"{self.user.username} / {self.category_name}: ₹{self.weekly_limit}/wk"


class WeeklyPledge(models.Model):
    """
    A commitment that the user will stay under a WeeklyCategoryBudget for a
    specific week. Settlement is triggered explicitly via POST /api/pledges/settle/.
    """
    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pledges')
    category        = models.ForeignKey(
        WeeklyCategoryBudget, on_delete=models.CASCADE, related_name='pledges'
    )
    week_start_date = models.DateField()
    is_settled      = models.BooleanField(default=False)
    settled_at      = models.DateTimeField(null=True, blank=True)
    savings_amount  = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Populated after settlement if the user saved money."
    )

    class Meta:
        unique_together = ('user', 'category', 'week_start_date')

    def __str__(self):
        return (
            f"{self.user.username} / {self.category.category_name} "
            f"wk:{self.week_start_date} settled={self.is_settled}"
        )
