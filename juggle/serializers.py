from rest_framework import serializers
from .models import User, Product, ProductImage, JuggleSession, GlobalSettings, CartItem, Category, ProductVariant, Transaction, Order, Review, Conversation, Message, DeliveryTracking
from django.utils import timezone
from collections import namedtuple


class UserSerializer(serializers.ModelSerializer):
    current_cb = serializers.SerializerMethodField()
    seconds_until_next_change = serializers.SerializerMethodField()
    pyramid_data = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'actual_balance', 'pending_balance', 'phone_number', 'current_cb', 'seconds_until_next_change', 'pyramid_data', 'is_juggler', 'deals_completed', 'seller_full_name', 'business_name', 'is_seller_verified', 'seller_status', 'seller_phone', 'business_license', 'tin_number', 'id_proof', 'bank_details_proof', 'address_proof', 'vat_registration', 'import_license']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def get_current_cb(self, obj):
        return obj.get_available_cb()

    def get_seconds_until_next_change(self, obj):
        settings = GlobalSettings.get_settings()
        now = timezone.now()
        elapsed = (now - settings.last_reset_time).total_seconds()
        PHASE_DURATION = 300.0
        return int(PHASE_DURATION - (elapsed % PHASE_DURATION))

    def get_pyramid_data(self, obj):
        from .models import Pyramid
        info = obj.get_pyramid_info()
        cb = obj.get_calculated_cb()
        tiers_raw = obj.get_pyramid_tiers()
        active_pyramids = Pyramid.objects.filter(status='ACTIVE').count() or 1

        labels = ["BASE", "JUNIOR", "SENIOR", "TEAM LEAD", "SUPERVISOR", "MANAGER", "DIRECTOR", "EXECUTIVE"]
        formatted_tiers = []
        for i, (survivors, value) in enumerate(tiers_raw):
            tier_value = value * active_pyramids if i == 7 else value
            formatted_tiers.append({
                "phase": i,
                "survivors": survivors,
                "value": tier_value,
                "label": labels[i] if i < len(labels) else f"PHASE {i}"
            })

        return {
            "phase": info["current_phase"],
            "total_phases": info["total_phases"],
            "session_id": info["session_id"],
            "user_rank": info["user_rank"],
            "box_size": info["box_size"],
            "is_winner": cb > 10.0,
            "pulse_active": cb > 0,
            "reserved_cb": float(obj.reserved_cb),
            "raw_cb": round(float(cb), 2),
            "total_safe_balance": GlobalSettings.get_current_pool(),
            "active_pyramids": active_pyramids,
            "next_winning_phase_seconds": obj.get_next_winning_phase_seconds(),
            "tiers": formatted_tiers
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
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'brand', 'description', 'base_price', 'category', 'category_name', 'attributes', 'image_url', 'image', 'delivery_type', 'delivery_fee', 'status', 'stock', 'remaining_slots', 'seller', 'seller_name', 'allow_juggling', 'is_limited', 'images', 'variants']

    def get_category_name(self, obj):
        if obj.category:
            return obj.category.name
        return None

    def get_remaining_slots(self, obj):
        active_count = obj.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).count()
        return max(0, obj.stock - active_count)

    def validate_image(self, value):
        from django.core.files.images import get_image_dimensions
        width, height = get_image_dimensions(value)
        if width is None or height is None:
            raise serializers.ValidationError("Could not read image dimensions. The file may be corrupt.")
        if width < 1000 or height < 1000:
            raise serializers.ValidationError(
                f"Image resolution too low ({width}x{height}). Minimum 1000x1000px required for high-quality listings."
            )
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        images_data = request.FILES.getlist('images') if request else []

        import json
        variants_json = request.data.get('variants_data', '[]') if request else '[]'
        try:
            variants_data = json.loads(variants_json)
        except (json.JSONDecodeError, ValueError, TypeError):
            variants_data = []

        product = Product.objects.create(**validated_data)

        added_images = []
        if product.image:
            ProductImage.objects.create(product=product, image=product.image, is_main=True)
            added_images.append(product.image.name)

        for image_data in images_data:
            if image_data.name not in added_images:
                ProductImage.objects.create(product=product, image=image_data, is_main=False)
                added_images.append(image_data.name)

        for v in variants_data:
            ProductVariant.objects.create(
                product=product,
                name=v.get('name', ''),
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
    active_offers = serializers.SerializerMethodField()
    seller_name = serializers.ReadOnlyField(source='seller.username')

    class Meta:
        model = Product
        fields = ['id', 'name', 'brand', 'description', 'base_price', 'image_url', 'image', 'delivery_type', 'delivery_fee', 'active_offers', 'allow_juggling', 'seller_name']

    def get_active_offers(self, obj):
        sessions = obj.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).order_by('markup_price').select_related('user')
        powered_sessions = [s for s in sessions if s.user.get_calculated_cb() >= float(obj.base_price)]
        return JuggleSessionSerializer(powered_sessions, many=True).data


class DealSerializer(serializers.Serializer):
    id = serializers.CharField()
    product = ProductSerializer()
    juggler = UserSerializer(required=False, allow_null=True)
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


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import Notification
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'is_read', 'created_at']


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'transaction_type', 'amount', 'description', 'reference_id', 'balance_after', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    juggler_name = serializers.CharField(source='juggler.username', read_only=True, default=None)

    class Meta:
        model = Order
        fields = ['id', 'product', 'product_name', 'product_image', 'seller', 'seller_name', 'juggler', 'juggler_name', 'quantity', 'total_price', 'status', 'shipping_address', 'tracking_number', 'notes', 'created_at', 'updated_at']

    def get_product_image(self, obj):
        if obj.product.image:
            return obj.product.image.url
        return None


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'user', 'user_name', 'product', 'product_name', 'order', 'rating', 'comment', 'created_at']
        read_only_fields = ['user']


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'content', 'is_read', 'created_at']
        read_only_fields = ['sender', 'is_read']


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    product_name = serializers.CharField(source='product.name', read_only=True, default=None)

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'other_user', 'last_message', 'unread_count', 'product', 'product_name', 'created_at', 'updated_at']
        read_only_fields = ['participants']

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other = obj.get_other_participant(request.user)
            if other:
                return {'id': other.id, 'username': other.username}
        return None

    def get_last_message(self, obj):
        msg = obj.last_message
        if msg:
            return {
                'content': msg.content,
                'sender_name': msg.sender.username,
                'created_at': msg.created_at.isoformat()
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class DeliveryTrackingSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, default=None)

    class Meta:
        model = DeliveryTracking
        fields = ['id', 'order', 'status', 'location', 'description', 'updated_by', 'updated_by_name', 'created_at']
        read_only_fields = ['updated_by']
