from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    monthly_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    savings_goal_name = models.CharField(max_length=100, blank=True, null=True)
    savings_goal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    goal_mode = models.CharField(max_length=20, choices=[('Focus', 'Focus'), ('Balanced', 'Balanced'), ('Foody', 'Foody')], default='Balanced')
    current_streak = models.IntegerField(default=0)
    last_streak_update = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Transaction(models.Model):
    TRANSACTION_TYPES = [('Income', 'Income'), ('Expense', 'Expense')]
    CATEGORIES = [('Food', 'Food'), ('Transport', 'Transport'), ('Utilities', 'Utilities'), ('Entertainment', 'Entertainment'), ('Other', 'Other')]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, default='Expense')
    category = models.CharField(max_length=20, choices=CATEGORIES, default='Other')
    custom_name = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.category}"