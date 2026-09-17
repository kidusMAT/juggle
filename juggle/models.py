from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from decimal import Decimal
import datetime


BALANCE_CAP = Decimal('10000.00')
PYRAMID_CAPACITY = 1000


class User(AbstractUser):
    actual_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    reserved_cb = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    is_juggler = models.BooleanField(default=False)

    pyramid_tier = models.IntegerField(default=100)
    deals_completed = models.IntegerField(default=0)

    seller_full_name = models.CharField(max_length=255, blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    seller_phone = models.CharField(max_length=20, blank=True, null=True)
    business_license = models.ImageField(upload_to='licenses/business/', blank=True, null=True)

    tin_number = models.CharField(max_length=50, blank=True, null=True)
    id_proof = models.ImageField(upload_to='licenses/id/', blank=True, null=True)
    bank_details_proof = models.ImageField(upload_to='licenses/bank/', blank=True, null=True)
    address_proof = models.ImageField(upload_to='licenses/address/', blank=True, null=True)
    vat_registration = models.ImageField(upload_to='licenses/vat/', blank=True, null=True)
    import_license = models.ImageField(upload_to='licenses/import/', blank=True, null=True)

    SELLER_STATUS_CHOICES = [
        ('UNVERIFIED', 'Unverified'),
        ('PENDING', 'Pending'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]
    seller_status = models.CharField(max_length=20, choices=SELLER_STATUS_CHOICES, default='UNVERIFIED')
    is_seller_verified = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.pyramid_tier = 100
        super().save(*args, **kwargs)

    def get_pyramid_info(self):
        settings = GlobalSettings.get_settings()
        now = timezone.now()
        elapsed_seconds = (now - settings.last_reset_time).total_seconds()

        PHASE_DURATION = 300.0
        TOTAL_PHASES = 8
        SESSION_DURATION = PHASE_DURATION * TOTAL_PHASES

        session_id = int(elapsed_seconds // SESSION_DURATION)
        current_phase = int((elapsed_seconds % SESSION_DURATION) // PHASE_DURATION)

        BOX_SIZE = self.pyramid_tier
        user_rank = (self.id + 1 - session_id) % BOX_SIZE

        return {
            "session_id": session_id,
            "current_phase": current_phase,
            "user_rank": user_rank,
            "phase_duration": PHASE_DURATION,
            "total_phases": TOTAL_PHASES,
            "box_size": BOX_SIZE
        }

    def get_pyramid_tiers(self):
        pool = GlobalSettings.get_current_pool()
        thresholds = [100, 50, 25, 12, 8, 4, 2, 1]
        return [(t, float(pool) / float(t) if t > 0 else 0) for t in thresholds]

    def get_calculated_cb(self):
        info = self.get_pyramid_info()
        current_phase = info["current_phase"]
        user_rank = info["user_rank"]

        pool = GlobalSettings.get_current_pool()
        active_pyramids = Pyramid.objects.filter(status='ACTIVE').count() or 1

        TIERS = self.get_pyramid_tiers()

        if current_phase < len(TIERS):
            survivor_count, value = TIERS[current_phase]
            if user_rank < survivor_count:
                if current_phase == 7:
                    return float(value) * active_pyramids
                return float(value)
        return 0.0

    def get_available_cb(self):
        calculated = self.get_calculated_cb()
        current_reservation = self.juggle_sessions.filter(
            is_active=True,
            expires_at__gt=timezone.now()
        ).aggregate(total=models.Sum('product__base_price'))['total'] or 0

        return float(max(Decimal('0'), Decimal(str(calculated)) - current_reservation))

    def get_next_winning_phase_seconds(self):
        info = self.get_pyramid_info()
        current_session_id = info["session_id"]
        current_phase = info["current_phase"]
        PHASE_DURATION = info["phase_duration"]
        TOTAL_PHASES = info["total_phases"]

        settings = GlobalSettings.get_settings()
        now = timezone.now()
        elapsed_seconds = (now - settings.last_reset_time).total_seconds()
        seconds_in_current_phase = elapsed_seconds % PHASE_DURATION

        TIERS = self.get_pyramid_tiers()

        for p in range(current_phase + 1, TOTAL_PHASES):
            user_rank = info["user_rank"]
            survivor_count, value = TIERS[p]
            if user_rank < survivor_count and value > 0:
                return int((p - current_phase) * PHASE_DURATION - seconds_in_current_phase)

        for s_offset in range(1, 10):
            next_session_id = current_session_id + s_offset
            next_user_rank = (self.id + 1 - next_session_id) % self.pyramid_tier
            for p in range(0, TOTAL_PHASES):
                survivor_count, value = TIERS[p]
                if next_user_rank < survivor_count and value > 0:
                    sessions_gap_seconds = (s_offset * TOTAL_PHASES - current_phase) * PHASE_DURATION - seconds_in_current_phase
                    return int(sessions_gap_seconds + (p * PHASE_DURATION))

        return 0

    def credit_balance(self, amount):
        amount = Decimal(str(amount))
        if amount <= 0:
            return Decimal('0')
        new_total = self.actual_balance + amount
        if new_total <= BALANCE_CAP:
            self.actual_balance = new_total
            self.save(update_fields=['actual_balance'])
            return amount
        overflow = new_total - BALANCE_CAP
        self.actual_balance = BALANCE_CAP
        self.pending_balance += overflow
        self.save(update_fields=['actual_balance', 'pending_balance'])
        Pyramid.objects.create(owner=self, overflow_amount=overflow)
        return BALANCE_CAP - (new_total - amount)

    def __str__(self):
        return self.username


class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    icon = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        if self.parent_id and hasattr(self, '_parent_cache') or self.parent:
            try:
                return f"{self.parent.name} > {self.name}"
            except (AttributeError, TypeError):
                return self.name
        return self.name


class Product(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('JUGGLED', 'Juggled'),
        ('SOLD', 'Sold'),
    ]
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=255, default='Generic')
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    attributes = models.JSONField(default=dict, blank=True)
    image_url = models.URLField(blank=True, null=True)
    image = models.ImageField(upload_to='prototypes/', null=True, blank=True)

    DELIVERY_CHOICES = [
        ('ABET', 'Abet Delivery'),
        ('SELLER', 'Seller Custom Delivery'),
    ]
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='ABET')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('100.00'))

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    allow_juggling = models.BooleanField(default=True)
    is_limited = models.BooleanField(default=False)
    stock = models.IntegerField(default=1)
    seller = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='products_sold')

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='prototypes/')
    is_main = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.product.name}"


class ProductVariant(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=255)
    price_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class JuggleSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='juggle_sessions')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='active_sessions')
    markup_price = models.DecimalField(max_digits=10, decimal_places=2)
    start_time = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.user.username} juggling {self.product.name}"


class GlobalSettings(models.Model):
    interval_duration_minutes = models.IntegerField(default=5)
    last_reset_time = models.DateTimeField(default=timezone.now)
    site_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('2.00'))
    total_site_profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(id=1)
        if obj.site_fee_percentage is None:
            obj.site_fee_percentage = Decimal('2.00')
            obj.save()
        return obj

    @classmethod
    def get_current_pool(cls):
        return float(BALANCE_CAP)


class Pyramid(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
    ]
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_pyramids')
    overflow_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    participants = models.ManyToManyField(User, related_name='participated_pyramids', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Pyramid #{self.id} by {self.owner.username} ({self.status})"

    @property
    def is_full(self):
        return self.participants.count() >= PYRAMID_CAPACITY

    def add_participant(self, user):
        self.participants.add(user)
        if self.is_full and self.status == 'ACTIVE':
            self.status = 'COMPLETED'
            self.completed_at = timezone.now()
            self.save(update_fields=['status', 'completed_at'])
            self.owner.pending_balance -= self.overflow_amount
            self.owner.actual_balance += self.overflow_amount
            self.owner.save(update_fields=['actual_balance', 'pending_balance'])
            return True
        return False


class CartItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    selected_offer = models.ForeignKey(JuggleSession, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('SALE', 'Product Sold'),
        ('JUGGLE_CLAIMED', 'Juggle Claimed'),
        ('JUGGLE_EXPIRED', 'Juggle Expired'),
        ('PAYMENT_RECEIVED', 'Payment Received'),
        ('PAYMENT_SENT', 'Payment Sent'),
        ('PYRAMID_COMPLETE', 'Pyramid Complete'),
        ('CB_CREDITED', 'CB Credited'),
        ('WITHDRAWAL', 'Withdrawal'),
        ('DEPOSIT', 'Deposit'),
        ('SYSTEM', 'System Notification'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.notification_type}: {self.title}"

    @classmethod
    def create(cls, user, notification_type, title, message):
        return cls.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message
        )


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('DEPOSIT', 'Deposit'),
        ('WITHDRAWAL', 'Withdrawal'),
        ('PURCHASE', 'Purchase'),
        ('SALE', 'Sale'),
        ('JUGGLE_PROFIT', 'Juggle Profit'),
        ('PLATFORM_FEE', 'Platform Fee'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=500)
    reference_id = models.CharField(max_length=100, blank=True, null=True)
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.transaction_type}: ETB {self.amount}"

    @classmethod
    def create(cls, user, transaction_type, amount, description, reference_id=None):
        user.refresh_from_db()
        return cls.objects.create(
            user=user,
            transaction_type=transaction_type,
            amount=amount,
            description=description,
            reference_id=reference_id,
            balance_after=user.actual_balance
        )


class Order(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    seller = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='seller_orders')
    juggler = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='juggler_orders')
    quantity = models.IntegerField(default=1)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    shipping_address = models.TextField(blank=True, null=True)
    tracking_number = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} - {self.buyer.username} - {self.status}"


class DeliveryTracking(models.Model):
    STATUS_CHOICES = [
        ('PICKED_UP', 'Picked Up'),
        ('IN_TRANSIT', 'In Transit'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Delivery Failed'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='tracking_updates')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    location = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='delivery_updates')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.order.id} - {self.status} at {self.location}"


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='reviews')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True)
    rating = models.IntegerField(default=5)
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'product']

    def __str__(self):
        return f"{self.user.username} - {self.product.name} - {self.rating} stars"

    @property
    def average_rating(self):
        reviews = Review.objects.filter(product=self.product)
        if reviews.exists():
            return round(reviews.aggregate(models.Avg('rating'))['rating__avg'], 1)
        return 0


class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    product = models.ForeignKey('Product', on_delete=models.CASCADE, related_name='conversations', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation {self.id}"

    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()

    @property
    def unread_count_for_user(self):
        def count(user):
            return self.messages.filter(is_read=False).exclude(sender=user).count()
        return count

    def get_other_participant(self, user):
        return self.participants.exclude(id=user.id).first()


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"
