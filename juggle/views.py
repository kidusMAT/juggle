from rest_framework import viewsets, status, pagination
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Product, JuggleSession, GlobalSettings, User, CartItem, Category, ProductVariant
from .serializers import (
    ProductSerializer, JuggleSessionSerializer, UserSerializer, 
    BuyerMarketSerializer, CartItemSerializer, CategorySerializer
)
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import authenticate, login, logout
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
import datetime
from decimal import Decimal

class UnsafeSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # To not perform the CSRF check.


class StandardResultsSetPagination(pagination.PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

class LargeResultsSetPagination(pagination.PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer

def cleanup_expired_juggles():
    """Inactivates sessions ONLY if power is lost, or if manually cancelled.
    Ignores expires_at for persistence, allowing deals to stay live through multiple power cycles
    AS LONG AS the user's pyramid balance stays high enough.
    """
    # Order by created_at (ascending) to keep OLDEST deals first when power drops
    active_sessions = JuggleSession.objects.filter(is_active=True).select_related('user', 'product').order_by('start_time')
    
    # We group by user to check their specific power envelope
    processed_users = {}
    
    for session in active_sessions:
        user = session.user
        if user.id not in processed_users:
            processed_users[user.id] = float(user.get_calculated_cb())
        
        cost = float(session.product.base_price)
        if processed_users[user.id] >= cost:
            # Power exists, keep session active
            processed_users[user.id] -= cost
        else:
            # Power lost! Drop the deal
            session.is_active = False
            session.save()
            
            # Release reservation
            user.reserved_cb -= session.product.base_price
            if user.reserved_cb < 0: user.reserved_cb = 0
            user.save()
            
            product = session.product
            # Only revert to AVAILABLE if NO active sessions remain for this product
            if not product.active_sessions.filter(is_active=True).exists() and product.status == 'JUGGLED':
                product.status = 'AVAILABLE'
                product.save()

class ProductViewSet(viewsets.ModelViewSet):
    authentication_classes = [UnsafeSessionAuthentication, BasicAuthentication]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.all().order_by('-id')
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        if user.seller_status != 'VERIFIED':
            return Response({"error": "Seller accounts must be approved by admin before listing prototypes."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer.save(seller=user, status='AVAILABLE')

    @action(detail=False, methods=['get'])
    def prototype_feed(self, request):
        cleanup_expired_juggles()
        if request.user.is_anonymous:
            user = User.objects.first()
        else:
            user = request.user
            
        user_data = UserSerializer(user).data
        current_cb = float(user_data['current_cb'])
        
        # Show all PRODUCTS with 'AVAILABLE' or 'JUGGLED' status that ALLOW juggling
        products = Product.objects.filter(status__in=['AVAILABLE', 'JUGGLED'], allow_juggling=True).exclude(status='SOLD').order_by('-id')
        
        # Simple manual pagination after Python filtering
        # Ideally this should be optimized to database-level filtering
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='buyer_market')
    def buyer_market(self, request):
        """Site A endpoint: Shows all prototypes currently being juggled by anyone OR direct sales."""
        cleanup_expired_juggles()
        
        # Only show products that have active jugglers OR are direct sales
        products = Product.objects.filter(Q(status='JUGGLED') | Q(status='AVAILABLE', allow_juggling=False)).prefetch_related('active_sessions__user').order_by('-id')
        
        deals = []
        for product in products:
            if product.allow_juggling:
                # Group active sessions by (user, markup_price)
                sessions = product.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).select_related('user')
                
                # Dictionary to group by (user_id, markup_price)
                groups = {}
                for s in sessions:
                    # Only show jugglers who have sufficient POWER right now
                    if s.user.get_calculated_cb() < float(product.base_price):
                        continue
                        
                    key = (s.user.id, s.markup_price)
                    if key not in groups:
                        groups[key] = {
                            "id": str(s.id),
                            "deal_key": f"juggler_{s.user.id}_{product.id}",
                            "product": product,
                            "juggler": s.user,
                            "juggler_name": s.user.username,
                            "markup_price": s.markup_price,
                            "amount": 0,
                            "expires_at": s.expires_at,
                            "is_direct": False
                        }
                    groups[key]["amount"] = int(groups[key]["amount"]) + 1
                    if s.expires_at < groups[key]["expires_at"]:
                        groups[key]["expires_at"] = s.expires_at
                
                deals.extend(groups.values())
            else:
                # Direct sale deal
                deals.append({
                    "id": f"direct_{product.id}",
                    "deal_key": f"direct_{product.id}",
                    "product": product,
                    "juggler": None,
                    "juggler_name": "Direct Sale",
                    "markup_price": product.base_price,
                    "amount": product.stock,
                    "expires_at": timezone.now() + datetime.timedelta(days=365),
                    "is_direct": True
                })

        # Manual pagination for the list of deals
        from .serializers import DealSerializer
        paginator = LargeResultsSetPagination()
        page = paginator.paginate_queryset(deals, request)
        if page is not None:
            serializer = DealSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = DealSerializer(deals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def buy_direct(self, request, pk=None):
        """Site A direct purchase bypassing jugglers."""
        product = self.get_object()
        quantity = int(request.data.get('quantity', 1))
        
        if product.status == 'SOLD' or product.stock < quantity:
            return Response({"error": "Product is sold out or insufficient stock"}, status=status.HTTP_400_BAD_REQUEST)
        
        total_price = product.base_price * quantity
        
        # Transfer profit to seller (Atomic)
        from django.db.models import F
        from decimal import Decimal
        settings = GlobalSettings.get_settings()
        fee_rate = settings.site_fee_percentage / Decimal('100.0')
        site_fee = total_price * fee_rate
        seller_revenue = total_price - site_fee
        
        seller = product.seller
        if seller:
            seller_id = seller.id
            User.objects.filter(id=seller_id).update(actual_balance=F('actual_balance') + seller_revenue)
            
        # Track Site Profit
        GlobalSettings.objects.filter(id=1).update(
            total_site_profit=F('total_site_profit') + site_fee
        )
            
        product.stock -= quantity
        if product.stock <= 0:
            product.stock = 0
            product.status = 'SOLD'
            # Inactivate ALL competing juggle sessions since it's sold
            product.active_sessions.filter(is_active=True).update(is_active=False)
        product.save()
        
        return Response({
            "success": f"Purchased {quantity} {product.name}(s) directly from {seller.username if seller else 'System'} for ETB {total_price}.",
            "product_status": product.status,
            "remaining_stock": product.stock
        })

    @action(detail=False, methods=['get'])
    def my_products(self, request):
        """Seller endpoint to list all products they have posted."""
        user = request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        # Get all products belonging to logged in user
        products = Product.objects.filter(seller=user).order_by('-id')
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class JuggleViewSet(viewsets.ModelViewSet):
    authentication_classes = [UnsafeSessionAuthentication, BasicAuthentication]
    queryset = JuggleSession.objects.all()
    serializer_class = JuggleSessionSerializer

    @action(detail=True, methods=['post'])
    def buy_item(self, request, pk=None):
        """Site A purchase: A buyer selects a specific juggler's session to buy from.
        Supports quantity (purchasing multiple slots from the same deal).
        """
        # Note: pk here is the ID of ONE session in the deal. 
        # We use it to identify the (product, user, price) group.
        base_session = self.get_object()
        quantity = int(request.data.get('quantity', 1))
        
        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Find all matching active sessions for this "Deal"
        matching_sessions = list(JuggleSession.objects.filter(
            product=base_session.product,
            user=base_session.user,
            markup_price=base_session.markup_price,
            is_active=True,
            expires_at__gt=timezone.now()
        ).order_by('start_time')[:quantity])
        
        if len(matching_sessions) < quantity:
            return Response({"error": f"Only {len(matching_sessions)} slots remaining for this deal."}, status=status.HTTP_400_BAD_REQUEST)
        
        product = base_session.product
        profit_per_item = base_session.markup_price - product.base_price
        total_profit = profit_per_item * quantity
        juggler = base_session.user
        
        # Batch update sessions
        for session in matching_sessions:
            session.is_active = False
            session.save()
            
        # Calculate Site Fee (Atomic)
        from django.db.models import F
        from decimal import Decimal
        settings = GlobalSettings.get_settings()
        fee_rate = settings.site_fee_percentage / Decimal('100.0')
        site_fee = total_profit * fee_rate
        juggler_profit = total_profit - site_fee
        
        juggler_id = juggler.id
        User.objects.filter(id=juggler_id).update(
            actual_balance=F('actual_balance') + juggler_profit,
            reserved_cb=F('reserved_cb') - (product.base_price * quantity)
        )
        
        # Track Site Profit
        GlobalSettings.objects.filter(id=1).update(
            total_site_profit=F('total_site_profit') + site_fee
        )
        
        # Decrement Stock
        product.stock -= quantity
        if product.stock <= 0:
            product.stock = 0
            product.status = 'SOLD'
            # Inactivate ALL other competing sessions across ALL deals for this product
            other_active = product.active_sessions.filter(is_active=True)
            for s in other_active:
                s.is_active = False
                s.save()
                u = s.user
                u.reserved_cb -= product.base_price
                if u.reserved_cb < 0: u.reserved_cb = 0
                u.save()
        product.save()
        
        return Response({
            "success": f"Purchased {quantity} from {juggler.username}. Total profit of {total_profit} ETB sent to their safe balance.",
            "product_status": product.status,
            "remaining_stock": product.stock
        })

    @action(detail=True, methods=['post'])
    def cancel_juggle(self, request, pk=None):
        """Allows a juggler to manually cancel their active session."""
        session = self.get_object()
        if not session.is_active:
            return Response({"error": "Session is already inactive"}, status=status.HTTP_400_BAD_REQUEST)
        
        if request.user.is_anonymous:
            user = User.objects.first()
        else:
            user = request.user
            
        if session.user != user:
            return Response({"error": "You do not own this session"}, status=status.HTTP_403_FORBIDDEN)

        session.is_active = False
        session.save()
        
        # Release reservation
        user.reserved_cb -= session.product.base_price
        if user.reserved_cb < 0: user.reserved_cb = 0
        user.save()
        
        product = session.product
        # Only revert to AVAILABLE if NO active sessions remain for this product
        if not product.active_sessions.filter(is_active=True).exists() and product.status == 'JUGGLED':
            product.status = 'AVAILABLE'
            product.save()

        return Response({"success": "Juggle session cancelled. Virtual power released."})

    @action(detail=False, methods=['get'])
    def my_juggles(self, request):
        cleanup_expired_juggles()
        if request.user.is_anonymous:
            user = User.objects.first()
        else:
            user = request.user
            
        juggles = JuggleSession.objects.filter(
            user=user, 
            is_active=True,
            expires_at__gt=timezone.now()
        ).select_related('product')
        
        serializer = JuggleSessionSerializer(juggles, many=True)
        # Note: We still need nested product data for the UI
        data = []
        for j in juggles:
            j_data = JuggleSessionSerializer(j).data
            j_data['product'] = ProductSerializer(j.product).data
            data.append(j_data)
            
        return Response(data)

    @action(detail=False, methods=['post'])
    def start_juggle(self, request):
        if request.user.is_anonymous:
            user = User.objects.first()
        else:
            user = request.user
            
        if not user:
            return Response({"error": "No user context found"}, status=status.HTTP_404_NOT_FOUND)

        product_id = request.data.get('product_id')
        markup_price = request.data.get('markup_price')
        slots = int(request.data.get('slots', 1))
        
        if slots < 1:
            return Response({"error": "Must juggle at least 1 slot"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product = Product.objects.get(id=product_id)
            if product.status == 'SOLD' or product.stock <= 0:
                raise Product.DoesNotExist
        except Product.DoesNotExist:
            return Response({"error": "Product not available for juggling"}, status=status.HTTP_400_BAD_REQUEST)

        # Check Active Slots vs Stock
        active_count = product.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).count()
        remaining = product.stock - active_count
        if remaining < slots:
            return Response({"error": f"Only {remaining} slots remaining for this prototype. You requested {slots}."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate Balance: User must have enough Current Balance for ALL slots
        user_data = UserSerializer(user).data
        current_cb = float(user_data['current_cb'])
        total_required = float(product.base_price) * slots
        
        if current_cb < total_required:
            return Response({
                "error": f"Insufficient Virtual Power. Juggling {slots} slots requires {total_required} ETB, but you have {current_cb} ETB."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not markup_price or float(markup_price) <= float(product.base_price):
            return Response({"error": "Markup price must be higher than base price"}, status=status.HTTP_400_BAD_REQUEST)

        # Set expiration to a distant future for persistence
        # Deals stay live as long as power is maintained (handled by cleanup_expired_juggles)
        expires_at = timezone.now() + datetime.timedelta(days=36525) # Approx 100 years
        
        # Create sessions
        sessions_created = []
        for _ in range(slots):
            session = JuggleSession.objects.create(
                user=user,
                product=product,
                markup_price=markup_price,
                expires_at=expires_at
            )
            sessions_created.append(session)
        
        # RESERVATION field update (legacy support/logging)
        user.reserved_cb += (product.base_price * slots)
        user.save()
        
        # Mark as JUGGLED
        if product.status != 'JUGGLED':
            product.status = 'JUGGLED'
            product.save()
        
        return Response(JuggleSessionSerializer(sessions_created[0]).data, status=status.HTTP_201_CREATED)

class UserViewSet(viewsets.ModelViewSet):
    authentication_classes = [UnsafeSessionAuthentication, BasicAuthentication]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['get'])
    def me(self, request):
        cleanup_expired_juggles()
        if request.user.is_anonymous:
            return Response({"error": "Not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response({"error": "Both old and new password are required"}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "Incorrect old password"}, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, user) # Maintain session
        return Response({"success": "Password changed successfully"})

    @action(detail=False, methods=['post'])
    def update_profile(self, request):
        user = request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        username = request.data.get('username')
        email = request.data.get('email')
        
        if username and username != user.username:
            if User.objects.filter(username=username).exists():
                return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
            user.username = username
            
        if email and email != user.email:
            if User.objects.filter(email=email).exists():
                return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)
            user.email = email

        # Seller info
        user.seller_full_name = request.data.get('seller_full_name', user.seller_full_name)
        user.business_name = request.data.get('business_name', user.business_name)
        user.seller_phone = request.data.get('seller_phone', user.seller_phone)
        user.tin_number = request.data.get('tin_number', user.tin_number)
        
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['post'])
    def verify_seller(self, request):
        user = request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        
        user.seller_full_name = request.data.get('full_name')
        user.business_name = request.data.get('business_name')
        user.seller_phone = request.data.get('phone_number')
        user.tin_number = request.data.get('tin_number')

        if 'business_license' in request.FILES:
            user.business_license = request.FILES['business_license']
        if 'id_proof' in request.FILES:
            user.id_proof = request.FILES['id_proof']
        if 'bank_details_proof' in request.FILES:
            user.bank_details_proof = request.FILES['bank_details_proof']
        if 'address_proof' in request.FILES:
            user.address_proof = request.FILES['address_proof']
        if 'vat_registration' in request.FILES:
            user.vat_registration = request.FILES['vat_registration']
        if 'import_license' in request.FILES:
            user.import_license = request.FILES['import_license']
            
        user.seller_status = 'PENDING'
        user.is_seller_verified = False # Must be approved by admin
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['get'])
    def pending_sellers(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        pending = User.objects.filter(seller_status='PENDING')
        serializer = UserSerializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def review_seller(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        rev_action = request.data.get('action') # 'approve' or 'reject'
        
        if rev_action == 'approve':
            user.seller_status = 'VERIFIED'
            user.is_seller_verified = True
        elif rev_action == 'reject':
            user.seller_status = 'REJECTED'
            user.is_seller_verified = False
        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
            
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['post'])
    def top_up(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Login required"}, status=status.HTTP_401_UNAUTHORIZED)
        amount = request.data.get('amount', 0)
        try:
            amount = float(amount)
        except ValueError:
            return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)
            
        user = request.user
        user.actual_balance += Decimal(str(amount))
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['post'])
    def become_juggler(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user
        
        user.is_juggler = True
        user.save()
        return Response({"success": "You are now a Juggler!", "is_juggler": True})

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[])
    def logout_user(self, request):
        logout(request)
        return Response({"success": "Logged out successfully"})

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[])
    def signup_user(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not username or not email or not password:
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[])
    def login_user(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return Response(UserSerializer(user).data)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
class CartViewSet(viewsets.ModelViewSet):
    authentication_classes = [UnsafeSessionAuthentication, BasicAuthentication]
    serializer_class = CartItemSerializer

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return CartItem.objects.none()
        return CartItem.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def update_quantity(self, request, pk=None):
        """Update the quantity of an existing cart item."""
        cart_item = self.get_object()
        quantity = int(request.data.get('quantity', 1))
        
        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Optional: re-verify stock/slot availability
        product = cart_item.product
        if cart_item.selected_offer:
            available = product.active_sessions.filter(
                user=cart_item.selected_offer.user,
                markup_price=cart_item.selected_offer.markup_price,
                is_active=True,
                expires_at__gt=timezone.now()
            ).count()
            if available < quantity:
                return Response({"error": f"Only {available} slots remaining for this deal."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if product.stock < quantity:
                return Response({"error": f"Only {product.stock} items remaining in stock."}, status=status.HTTP_400_BAD_REQUEST)
                
        cart_item.quantity = quantity
        cart_item.save()
        
        return Response({"success": "Quantity updated", "new_quantity": cart_item.quantity})

    @action(detail=False, methods=['post'])
    def add_to_cart(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user
        product_id = request.data.get('product_id')
        offer_id = request.data.get('offer_id')
        quantity = int(request.data.get('quantity', 1))
        
        product = Product.objects.get(id=product_id)
        selected_offer = None
        if offer_id and offer_id != 'direct':
            selected_offer = JuggleSession.objects.get(id=offer_id)

        cart_item, created = CartItem.objects.get_or_create(
            user=user,
            product=product,
            defaults={'selected_offer': selected_offer, 'quantity': quantity}
        )
        
        if not created:
            cart_item.selected_offer = selected_offer
            cart_item.quantity += quantity
            cart_item.save()

        return Response({'success': f'Added {product.name} to cart'}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def clear_cart(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        CartItem.objects.filter(user=request.user).delete()
        return Response({'success': 'Cart cleared'})

    @action(detail=False, methods=['post'])
    def checkout(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user
        items = CartItem.objects.filter(user=user)
        if not items.exists():
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        # In a real app, we'd handle payments here. 
        # For this prototype, we just mark products as SOLD.
        for item in items:
            product = item.product
            product.status = 'SOLD'
            product.save()
            # If there was a juggle session, mark it as completed/inactive and reward the juggler
            if item.selected_offer:
                juggler = item.selected_offer.user
                item.selected_offer.is_active = False
                item.selected_offer.save()
                
                # Increment deals_completed and check for tier upgrade
                juggler.deals_completed += 1
                if juggler.deals_completed >= 10:
                    juggler.pyramid_tier = 1000
                elif juggler.deals_completed >= 5:
                    juggler.pyramid_tier = 500
                juggler.save()
        
        items.delete()
        return Response({'success': 'Checkout successful! Products are on their way.'})
