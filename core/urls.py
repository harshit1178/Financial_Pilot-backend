from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransactionViewSet, DashboardSummaryView, TransactionCreateView, ProfileUpdateView

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')

urlpatterns = [
    # Must come BEFORE router.urls so "add" isn't treated as a {pk}
    path('transactions/add/', TransactionCreateView.as_view(), name='transaction-add'),
    path('dashboard/',        DashboardSummaryView.as_view(),  name='dashboard-summary'),
    path('profile/',          ProfileUpdateView.as_view(),      name='profile-update'),
    path('', include(router.urls)),
]