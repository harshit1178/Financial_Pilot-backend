from django.contrib import admin
from .models import UserProfile, Transaction

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'monthly_salary', 'savings_goal_name', 'goal_mode', 'current_streak')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'category', 'amount', 'date')
    list_filter = ('transaction_type', 'category')
    ordering = ('-date',)
