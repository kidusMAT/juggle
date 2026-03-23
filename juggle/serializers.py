from rest_framework import serializers
from .models import User, Product, ProductImage, JuggleSession, GlobalSettings, CartItem, Category, ProductVariant
from django.utils import timezone
from collections import namedtuple

class UserSerializer(serializers.ModelSerializer):
    current_cb = serializers.SerializerMethodField()
    seconds_until_next_change = serializers.SerializerMethodField()
    pyramid_data = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'actual_balance', 'current_cb', 'seconds_until_next_change', 'pyramid_data', 'is_juggler', 'seller_full_name', 'business_name', 'is_seller_verified', 'seller_status', 'seller_phone', 'business_license', 'tin_number', 'id_proof', 'bank_details_proof', 'address_proof', 'vat_registration', 'import_license']

    def get_current_cb(self, obj):
        return obj.get_available_cb()

    def get_seconds_until_next_change(self, obj):
        settings = GlobalSettings.get_settings()
        now = timezone.now()
        elapsed = (now - settings.last_reset_time).total_seconds()
        PHASE_DURATION = 300.0
        return int(PHASE_DURATION - (elapsed % PHASE_DURATION))

    def get_pyramid_data(self, obj):
        info = obj.get_pyramid_info()
        cb = obj.get_calculated_cb() # RAW power for the icon/badge
        
        return {
            "phase": info["current_phase"],
            "total_phases": info["total_phases"],
            "session_id": info["session_id"],
            "user_rank": info["user_rank"],
            "is_winner": cb > 10.0,
            "pulse_active": cb > 0,
            "reserved_cb": float(obj.reserved_cb),
            "raw_cb": float(cb),
            "total_safe_balance": GlobalSettings.get_current_pool(),
            "next_winning_phase_seconds": obj.get_next_winning_phase_seconds()
        }


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'parent', 'icon']

class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'price_override', 'stock']

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_main']

class ProductSerializer(serializers.ModelSerializer):
    remaining_slots = serializers.SerializerMethodField()
    seller_name = serializers.ReadOnlyField(source='seller.username')
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Product
        fields = ['id', 'name', 'brand', 'description', 'base_price', 'category', 'category_name', 'attributes', 'image_url', 'image', 'delivery_type', 'delivery_fee', 'status', 'stock', 'remaining_slots', 'seller', 'seller_name', 'allow_juggling', 'is_limited', 'images', 'variants']

    def get_remaining_slots(self, obj):
        active_count = obj.active_sessions.filter(expires_at__gt=timezone.now()).count()
        return max(0, obj.stock - active_count)

    def validate_image(self, value):
        from django.core.files.images import get_image_dimensions
        width, height = get_image_dimensions(value)
        if width < 1000 or height < 1000:
            raise serializers.ValidationError(
                f"Image resolution too low ({width}x{height}). Minimum 1000x1000px required for high-quality listings."
            )
        return value

    def create(self, validated_data):
        # Handle multiple images and variants from request
        request = self.context.get('request')
        images_data = request.FILES.getlist('images') if request else []
        
        # Variants might be sent as JSON in a 'variants' field if using FormData
        import json
        variants_json = request.data.get('variants_data', '[]')
        try:
            variants_data = json.loads(variants_json)
        except:
            variants_data = []
            
        product = Product.objects.create(**validated_data)
        
        # Images
        added_images = []
        if product.image:
             ProductImage.objects.create(product=product, image=product.image, is_main=True)
             added_images.append(product.image.name)

        for image_data in images_data:
            if image_data.name not in added_images:
                ProductImage.objects.create(product=product, image=image_data, is_main=False)
                added_images.append(image_data.name)
        
        # Variants
        for v in variants_data:
            ProductVariant.objects.create(
                product=product,
                name=v.get('name'),
                price_override=v.get('price_override'),
                stock=v.get('stock', 1)
            )
            
        return product
PredefinedSlot = namedtuple('PredefinedSlot', ['name', 'markup_price'])

class JuggleSessionSerializer(serializers.ModelSerializer):
    juggler_name = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = JuggleSession
        fields = ['id', 'user', 'juggler_name', 'product', 'markup_price', 'start_time', 'expires_at', 'is_active']

class BuyerMarketSerializer(serializers.ModelSerializer):
    """Special serializer for Site A that groups jugglers for a product."""
    active_offers = serializers.SerializerMethodField()
    seller_name = serializers.ReadOnlyField(source='seller.username')

    class Meta:
        model = Product
        fields = ['id', 'name', 'brand', 'description', 'base_price', 'image_url', 'image', 'delivery_type', 'delivery_fee', 'active_offers', 'allow_juggling', 'seller_name']

    def get_active_offers(self, obj):
        sessions = obj.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).order_by('markup_price').select_related('user')
        # Only show jugglers who have sufficient POWER right now to keep the deal live on Site A
        powered_sessions = [s for s in sessions if s.user.get_calculated_cb() >= float(obj.base_price)]
        return JuggleSessionSerializer(powered_sessions, many=True).data

class DealSerializer(serializers.Serializer):
    """Represents a unique deal (either a juggler's group of sessions or a direct sale)."""
    id = serializers.CharField()
    product = ProductSerializer()
    juggler = UserSerializer()
    juggler_name = serializers.CharField()
    markup_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    amount = serializers.IntegerField()
    expires_at = serializers.DateTimeField()
    is_direct = serializers.BooleanField()

class CartItemSerializer(serializers.ModelSerializer):
    product_details = BuyerMarketSerializer(source='product', read_only=True)
    offer_details = JuggleSessionSerializer(source='selected_offer', read_only=True)
    
    class Meta:
        model = CartItem
        fields = ['id', 'product', 'selected_offer', 'quantity', 'product_details', 'offer_details']
