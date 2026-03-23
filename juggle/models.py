from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import datetime

class User(AbstractUser):
    actual_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    reserved_cb = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_juggler = models.BooleanField(default=False)
    
    # Seller Verification Info
    seller_full_name = models.CharField(max_length=255, blank=True, null=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    seller_phone = models.CharField(max_length=20, blank=True, null=True)
    business_license = models.ImageField(upload_to='licenses/business/', blank=True, null=True)
    
    # Expanded Verification Fields
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

    def get_pyramid_info(self):
        """Returns normalized pyramid state for the current time."""
        settings = GlobalSettings.get_settings()
        now = timezone.now()
        elapsed_seconds = (now - settings.last_reset_time).total_seconds()
        
        PHASE_DURATION = 300.0 # 5 minutes
        TOTAL_PHASES = 8
        SESSION_DURATION = PHASE_DURATION * TOTAL_PHASES
        
        session_id = int(elapsed_seconds // SESSION_DURATION)
        current_phase = int((elapsed_seconds % SESSION_DURATION) // PHASE_DURATION)
        
        # Fair Queue Rotation: Each user climbs closer to rank 0 with each session
        # Blitz Scale: 100 people instead of 1000
        BOX_SIZE = 100
        user_rank = (self.id + 1 - session_id) % BOX_SIZE
        
        return {
            "session_id": session_id,
            "current_phase": current_phase,
            "user_rank": user_rank,
            "phase_duration": PHASE_DURATION,
            "total_phases": TOTAL_PHASES
        }

    def get_calculated_cb(self):
        """Calculates the user's RAW virtual balance based on time and dynamic pyramid pool."""
        info = self.get_pyramid_info()
        current_phase = info["current_phase"]
        user_rank = info["user_rank"]
        
        # Consistent with the suggested "Balanced Pool" model:
        # Each phase wins the Total Pool divided by survivors.
        pool = GlobalSettings.get_current_pool()
        
        # TEST OVERRIDE: Keep admin/test user active for easier debugging
        if self.is_superuser or self.id == 1:
            return float(pool)

        
        TIERS = [
            (100, pool / 100.0), (50, pool / 50.0), (25, pool / 25.0), (12, pool / 12.0),
            (8, pool / 8.0), (4, pool / 4.0), (2, pool / 2.0), (1, pool / 1.0),
        ]
        
        if current_phase < len(TIERS):
            survivor_count, value = TIERS[current_phase]
            if user_rank < survivor_count:
                return float(value)
        return 0.0

    def get_available_cb(self):
        calculated = self.get_calculated_cb()
        # Dynamically calculate reservation from active sessions to ensure no "leaks"
        current_reservation = self.juggle_sessions.filter(
            is_active=True, 
            expires_at__gt=timezone.now()
        ).aggregate(total=models.Sum('product__base_price'))['total'] or 0
        
        return float(max(0.0, float(calculated) - float(current_reservation)))

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
        
        pool = GlobalSettings.get_current_pool()
        TIERS = [
            (100, pool / 100.0), (50, pool / 50.0), (25, pool / 25.0), (12, pool / 12.0),
            (8, pool / 8.0), (4, pool / 4.0), (2, pool / 2.0), (1, pool / 1.0),
        ]

        # 1. Search remaining phases in CURRENT session
        for p in range(current_phase + 1, TOTAL_PHASES):
            user_rank = info["user_rank"] # Rank is constant within a session
            survivor_count, value = TIERS[p]
            if user_rank < survivor_count and value > 0:
                return int((p - current_phase) * PHASE_DURATION - seconds_in_current_phase)

        # 2. Search in NEXT sessions (rank rotates)
        for s_offset in range(1, 10): # Look ahead up to 10 sessions
            next_session_id = current_session_id + s_offset
            # Recalculate rank for next session: (self.id + 1 - next_session_id) % 1000
            next_user_rank = (self.id + 1 - next_session_id) % 100
            for p in range(0, TOTAL_PHASES):
                survivor_count, value = TIERS[p]
                if next_user_rank < survivor_count and value > 0:
                    sessions_gap_seconds = (s_offset * TOTAL_PHASES - current_phase) * PHASE_DURATION - seconds_in_current_phase
                    return int(sessions_gap_seconds + (p * PHASE_DURATION))

        return 0

    def __str__(self):
        return self.username

class Category(models.Model):
    name = models.CharField(max_length=100)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
    icon = models.CharField(max_length=50, blank=True, null=True) # Lucide icon name

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return f"{self.parent.name} > {self.name}" if self.parent else self.name

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
    attributes = models.JSONField(default=dict, blank=True) # for color, size, material etc.
    image_url = models.URLField(blank=True, null=True)
    image = models.ImageField(upload_to='prototypes/', null=True, blank=True)
    
    DELIVERY_CHOICES = [
        ('ABET', 'Abet Delivery'),
        ('SELLER', 'Seller Custom Delivery'),
    ]
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='ABET')
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    allow_juggling = models.BooleanField(default=True)
    is_limited = models.BooleanField(default=False)
    stock = models.IntegerField(default=1) # Total stock across all variants or for simple product
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
    name = models.CharField(max_length=255) # e.g. "Red / 42"
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
    site_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    total_site_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(id=1)
        # Handle cases where existing DB has no defaults
        if obj.site_fee_percentage is None:
            obj.site_fee_percentage = 2.00
            obj.save()
        return obj

    @classmethod
    def get_current_pool(cls):
        # The pool is the sum of all REAL ETB deposited in the system
        total_real_etb = User.objects.aggregate(total=models.Sum('actual_balance'))['total'] or 0
        # Ensure a minimum baseline for the simulation if no one has deposited yet
        return float(max(10000.0, float(total_real_etb)))

class CartItem(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    # Store the specific juggle session if they chose a juggle offer
    selected_offer = models.ForeignKey(JuggleSession, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"
