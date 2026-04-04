from django.utils import timezone
from rest_framework import serializers
from .models import Transaction, Goal, WeeklyCategoryBudget, WeeklyPledge

VALID_CATEGORIES = [
    'Food', 'Travel', 'Groceries', 'Rent',
    'Loan', 'Services', 'Subscription', 'Others',
]


# ─── Transaction Serializers ──────────────────────────────────────────────────

class TransactionSerializer(serializers.ModelSerializer):
    """Read serializer — used by TransactionViewSet and dashboard listings."""

    class Meta:
        model  = Transaction
        fields = '__all__'


class TransactionCreateSerializer(serializers.ModelSerializer):
    """
    Write serializer for POST /api/transactions/add/

    Validates:
      - amount   : must be a positive number
      - category : must be one of the VALID_CATEGORIES list
      - date     : optional; defaults to today's date/time if omitted
    The `user` field is injected by the view — not accepted from the client.
    """

    date = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model  = Transaction
        fields = ['amount', 'category', 'custom_name', 'transaction_type', 'date']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be a positive number.')
        return value

    def validate_category(self, value):
        if value not in VALID_CATEGORIES:
            raise serializers.ValidationError(
                f"Invalid category. Choose from: {', '.join(VALID_CATEGORIES)}."
            )
        return value

    def validate(self, attrs):
        # Default date to now if not supplied
        if not attrs.get('date'):
            attrs['date'] = timezone.now()
        return attrs

    def create(self, validated_data):
        # user is passed in via save(user=...) from the view
        return Transaction.objects.create(**validated_data)


# ─── Goal Serializers ─────────────────────────────────────────────────────────

class GoalSerializer(serializers.ModelSerializer):
    """
    Read/write serializer for the Goal queue.
    `user` and `priority` are injected by the view — not accepted from the client.
    """

    class Meta:
        model  = Goal
        fields = ['id', 'name', 'target_amount', 'priority', 'is_completed', 'created_at']
        read_only_fields = ['id', 'priority', 'is_completed', 'created_at']

    def validate_target_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Target amount must be positive.')
        return value


# ─── Weekly Budget & Pledge Serializers ───────────────────────────────────────

class WeeklyCategoryBudgetSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    class Meta:
        model  = WeeklyCategoryBudget
        fields = ['id', 'category_name', 'weekly_limit', 'can_delete']
        read_only_fields = ['id', 'can_delete']

    def get_can_delete(self, obj):
        """True only when no unsettled (active) pledges exist for this budget."""
        return not obj.pledges.filter(is_settled=False).exists()

    def validate_weekly_limit(self, value):
        if value <= 0:
            raise serializers.ValidationError('Weekly limit must be positive.')
        return value


class WeeklyPledgeSerializer(serializers.ModelSerializer):
    category_name  = serializers.CharField(source='category.category_name', read_only=True)
    weekly_limit   = serializers.DecimalField(
        source='category.weekly_limit', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model  = WeeklyPledge
        fields = [
            'id', 'category', 'category_name', 'weekly_limit',
            'week_start_date', 'is_settled', 'settled_at', 'savings_amount',
        ]
        read_only_fields = ['id', 'category_name', 'weekly_limit', 'is_settled', 'settled_at', 'savings_amount']
