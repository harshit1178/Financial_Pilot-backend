from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from .models import UserProfile, Transaction
from .serializers import TransactionSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    """Full CRUD for Transaction model, newest first."""
    serializer_class = TransactionSerializer
    queryset = Transaction.objects.all().order_by('-date')


class DashboardSummaryView(APIView):
    """Returns high-level financial summary for the first UserProfile."""

    def get(self, request):
        profile = UserProfile.objects.select_related('user').first()

        if profile is None:
            return Response({
                'total_salary': 0,
                'total_spent': 0,
                'remaining_balance': 0,
                'goal_name': None,
                'current_streak': 0,
            })

        expenses_qs = Transaction.objects.filter(
            user=profile.user,
            transaction_type='Expense',
        )
        total_spent = expenses_qs.aggregate(total=Sum('amount'))['total'] or 0

        total_salary = float(profile.monthly_salary)
        total_spent = float(total_spent)
        remaining_balance = total_salary - total_spent

        return Response({
            'total_salary': total_salary,
            'total_spent': total_spent,
            'remaining_balance': remaining_balance,
            'goal_name': profile.savings_goal_name,
            'current_streak': profile.current_streak,
        })
