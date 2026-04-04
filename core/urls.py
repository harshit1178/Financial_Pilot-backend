from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    TransactionViewSet, DashboardSummaryView, TransactionCreateView, ProfileUpdateView,
    GoalViewSet, GoalWithdrawView,
    WeeklyCategoryBudgetViewSet, WeeklyPledgeViewSet, PledgeSettleView,
)

router = DefaultRouter()
router.register(r'transactions',    TransactionViewSet,          basename='transaction')
router.register(r'goals',           GoalViewSet,                 basename='goal')
router.register(r'weekly-budgets',  WeeklyCategoryBudgetViewSet, basename='weekly-budget')
router.register(r'pledges',         WeeklyPledgeViewSet,         basename='pledge')

urlpatterns = [
    # ── Transaction ──────────────────────────────────────────────────────────
    # Must come BEFORE router.urls so "add" isn't treated as a {pk}
    path('transactions/add/', TransactionCreateView.as_view(), name='transaction-add'),

    # ── Dashboard & Profile ───────────────────────────────────────────────────
    path('dashboard/',        DashboardSummaryView.as_view(),  name='dashboard-summary'),
    path('profile/',          ProfileUpdateView.as_view(),      name='profile-update'),

    # ── Goals ─────────────────────────────────────────────────────────────────
    # Must come BEFORE router to avoid "withdraw" being parsed as a {pk}
    path('goals/withdraw/',   GoalWithdrawView.as_view(),       name='goal-withdraw'),

    # ── Pledges ───────────────────────────────────────────────────────────────
    path('pledges/settle/',   PledgeSettleView.as_view(),       name='pledge-settle'),

    # ── Router (CRUD for all registered ViewSets) ─────────────────────────────
    path('', include(router.urls)),
]