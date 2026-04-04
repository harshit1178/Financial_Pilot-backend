from django.contrib import admin
from .models import UserProfile, Transaction, Goal, WeeklyCategoryBudget, WeeklyPledge


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'monthly_salary', 'goal_mode',
        'goal_piggybank_balance', 'monthly_budget_left', 'savings_withdrawn',
        'current_streak',
    )
    list_editable = (
        'goal_piggybank_balance',
    )
    readonly_fields = (
        'monthly_budget_left', 'savings_withdrawn',
    )

    def monthly_budget_left(self, obj):
        from .views import _metrics_snapshot
        try:
            metrics = _metrics_snapshot(obj)
            return metrics.get('monthly_remaining_budget', 0)
        except Exception:
            return 0
    monthly_budget_left.short_description = "Monthly Budget Left"


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'category', 'amount', 'date')
    list_filter  = ('transaction_type', 'category')
    ordering     = ('-date',)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'priority', 'name', 'target_amount', 'is_completed', 'created_at')
    list_filter  = ('is_completed',)
    ordering     = ('user', 'priority')


@admin.register(WeeklyCategoryBudget)
class WeeklyCategoryBudgetAdmin(admin.ModelAdmin):
    list_display = ('user', 'category_name', 'weekly_limit')


@admin.register(WeeklyPledge)
class WeeklyPledgeAdmin(admin.ModelAdmin):
    list_display  = ('user', 'category', 'week_start_date', 'is_settled', 'savings_amount', 'settled_at')
    list_filter   = ('is_settled',)
    ordering      = ('-week_start_date',)
