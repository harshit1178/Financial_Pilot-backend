from django.utils import timezone
from rest_framework import serializers
from .models import Transaction

VALID_CATEGORIES = [
    'Food', 'Travel', 'Groceries', 'Rent',
    'Loan', 'Services', 'Subscription', 'Others',
]


class TransactionSerializer(serializers.ModelSerializer):
    """Read serializer — used by TransactionViewSet and dashboard listings."""

    class Meta:
        model = Transaction
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
        model = Transaction
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
