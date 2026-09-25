from rest_framework import viewsets, status, pagination
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.exceptions import PermissionDenied
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, ScopedRateThrottle
from .models import Product, JuggleSession, GlobalSettings, User, CartItem, Category, ProductVariant, Pyramid, Notification, Transaction, Order, Review, Conversation, Message, DeliveryTracking
from .serializers import (
    ProductSerializer, JuggleSessionSerializer, UserSerializer,
    BuyerMarketSerializer, CartItemSerializer, CategorySerializer, NotificationSerializer,
    TransactionSerializer, OrderSerializer, ReviewSerializer, ConversationSerializer, MessageSerializer, DeliveryTrackingSerializer
)
from django.utils import timezone
from django.conf import settings
from django.db.models import Q, F, Avg, Sum, Count
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.cache import cache
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
import datetime
import decimal
from decimal import Decimal


@api_view(['GET'])
@ensure_csrf_cookie
def csrf_token(request):
    return Response({'detail': 'CSRF cookie set'})


def get_badge(rank):
    if rank == 1:
        return {'name': 'Gold', 'emoji': '🏆', 'color': '#FFD700'}
    elif rank == 2:
        return {'name': 'Silver', 'emoji': '🥈', 'color': '#C0C0C0'}
    elif rank == 3:
        return {'name': 'Bronze', 'emoji': '🥉', 'color': '#CD7F32'}
    elif rank <= 10:
        return {'name': 'Elite', 'emoji': '⭐', 'color': '#22c55e'}
    elif rank <= 25:
        return {'name': 'Pro', 'emoji': '🔥', 'color': '#a855f7'}
    else:
        return {'name': 'Rising', 'emoji': '📈', 'color': '#888'}


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
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.request.method not in ['GET', 'HEAD', 'OPTIONS']:
            return [IsAdminUser()]
        return [AllowAny()]


_last_cleanup_time = None


def cleanup_expired_juggles():
    global _last_cleanup_time
    now = timezone.now()
    if _last_cleanup_time and (now - _last_cleanup_time).total_seconds() < 60:
        return
    _last_cleanup_time = now

    active_sessions = JuggleSession.objects.filter(is_active=True).select_related('user', 'product').order_by('start_time')

    processed_users = {}

    for session in active_sessions:
        user = session.user
        if user.id not in processed_users:
            processed_users[user.id] = float(user.get_calculated_cb())

        cost = float(session.product.base_price)
        if processed_users[user.id] >= cost:
            processed_users[user.id] -= cost
        else:
            session.is_active = False
            session.save(update_fields=['is_active'])

            user.reserved_cb = max(Decimal('0'), user.reserved_cb - session.product.base_price)
            user.save(update_fields=['reserved_cb'])

            product = session.product
            if not product.active_sessions.filter(is_active=True).exists() and product.status == 'JUGGLED':
                product.status = 'AVAILABLE'
                product.save(update_fields=['status'])


class ProductViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_queryset(self):
        queryset = Product.objects.all().order_by('-id')
        if self.action not in ['list', 'retrieve', 'prototype_feed', 'buyer_market', 'fuzzy_search', 'buy_direct'] and not self.request.user.is_staff:
            queryset = queryset.filter(seller=self.request.user)
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        return queryset.select_related('seller', 'category').prefetch_related('images', 'variants')

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_anonymous:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Authentication required.")

        allow_juggling = self.request.data.get('allow_juggling', True)
        
        if allow_juggling and user.seller_status != 'VERIFIED':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seller accounts must be approved by admin before listing products for juggling.")

        serializer.save(seller=user, status='AVAILABLE')

    @action(detail=False, methods=['get'])
    def prototype_feed(self, request):
        cleanup_expired_juggles()

        if request.user.is_anonymous:
            current_cb = 0.0
        else:
            user_data = UserSerializer(request.user).data
            current_cb = float(user_data['current_cb'])

        products = Product.objects.filter(status__in=['AVAILABLE', 'JUGGLED'], allow_juggling=True).order_by('-id')

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='buyer_market')
    def buyer_market(self, request):
        cleanup_expired_juggles()

        search = request.query_params.get('search', '').strip()
        category = request.query_params.get('category', '').strip()
        brand = request.query_params.get('brand', '').strip()
        min_price = request.query_params.get('min_price', '').strip()
        max_price = request.query_params.get('max_price', '').strip()

        products = Product.objects.filter(
            Q(status='JUGGLED') | Q(status='AVAILABLE', allow_juggling=False)
        ).prefetch_related('active_sessions__user').order_by('-id')

        if search:
            search_terms = search.split()
            query = Q()
            for term in search_terms:
                query |= (
                    Q(name__icontains=term) |
                    Q(brand__icontains=term) |
                    Q(description__icontains=term) |
                    Q(category__name__icontains=term)
                )
            products = products.filter(query)

        if category and category != 'All':
            products = products.filter(category__name__icontains=category)

        if brand:
            products = products.filter(brand__iexact=brand)

        if min_price:
            try:
                products = products.filter(base_price__gte=float(min_price))
            except ValueError:
                pass

        if max_price:
            try:
                products = products.filter(base_price__lte=float(max_price))
            except ValueError:
                pass

        deals = []
        for product in products:
            if product.allow_juggling:
                sessions = product.active_sessions.filter(
                    is_active=True, expires_at__gt=timezone.now()
                ).select_related('user')

                groups = {}
                for s in sessions:
                    if s.user.get_calculated_cb() < float(product.base_price):
                        continue

                    key = (s.user.id, float(s.markup_price))
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

        from .serializers import DealSerializer
        paginator = LargeResultsSetPagination()
        page = paginator.paginate_queryset(deals, request)
        if page is not None:
            serializer = DealSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = DealSerializer(deals, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='fuzzy_search')
    def fuzzy_search(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})

        def levenshtein(s1, s2):
            if len(s1) < len(s2):
                return levenshtein(s2, s1)
            if len(s2) == 0:
                return len(s1)
            prev_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                curr_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = prev_row[j + 1] + 1
                    deletions = curr_row[j] + 1
                    substitutions = prev_row[j] + (c1 != c2)
                    curr_row.append(min(insertions, deletions, substitutions))
                prev_row = curr_row
            return prev_row[-1]

        products = Product.objects.filter(
            Q(status='JUGGLED') | Q(status='AVAILABLE', allow_juggling=False)
        )[:200]

        scored = []
        query_lower = query.lower()
        for product in products:
            name_lower = product.name.lower()
            brand_lower = (product.brand or '').lower()
            desc_lower = (product.description or '').lower()

            score = 0
            if query_lower in name_lower:
                score += 100
            if query_lower in brand_lower:
                score += 80
            if query_lower in desc_lower:
                score += 40

            if score == 0:
                for word in query_lower.split():
                    if word in name_lower:
                        score += 30
                    elif word in brand_lower:
                        score += 20

                    name_dist = levenshtein(word, name_lower[:len(word)])
                    if name_dist <= 2:
                        score += 50 - (name_dist * 10)

            if score > 0:
                scored.append((score, product))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [s[1] for s in scored[:20]]

        from .serializers import ProductSerializer
        return Response({
            'results': ProductSerializer(results, many=True).data
        })

    @action(detail=True, methods=['post'])
    def buy_direct(self, request, pk=None):
        product = self.get_object()

        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response({"error": "Quantity must be a valid integer"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)

        if product.status == 'SOLD' or product.stock < quantity:
            return Response({"error": "Product is sold out or insufficient stock"}, status=status.HTTP_400_BAD_REQUEST)

        buyer = request.user
        if buyer.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        total_price = product.base_price * quantity

        if buyer.actual_balance < total_price:
            return Response({"error": f"Insufficient balance. Required: ETB {total_price}, Available: ETB {buyer.actual_balance}"}, status=status.HTTP_400_BAD_REQUEST)

        settings_obj = GlobalSettings.get_settings()
        fee_rate = settings_obj.site_fee_percentage / Decimal('100.0')
        site_fee = total_price * fee_rate
        seller_revenue = total_price - site_fee

        with transaction.atomic():
            User.objects.filter(id=buyer.id).update(
                actual_balance=F('actual_balance') - total_price
            )

            seller = product.seller
            if seller:
                seller.credit_balance(seller_revenue)

            GlobalSettings.objects.filter(id=1).update(
                total_site_profit=F('total_site_profit') + site_fee
            )

            Product.objects.filter(id=product.id).update(
                stock=F('stock') - quantity
            )

            product.refresh_from_db()
            if product.stock <= 0:
                product.status = 'SOLD'
                product.save(update_fields=['status'])
                product.active_sessions.filter(is_active=True).update(is_active=False)

        return Response({
            "success": f"Purchased {quantity} {product.name}(s) directly from {seller.username if seller else 'System'} for ETB {total_price}.",
            "product_status": product.status,
            "remaining_stock": product.stock
        })

    @action(detail=False, methods=['get'])
    def my_products(self, request):
        user = request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        products = Product.objects.filter(seller=user).order_by('-id')
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class JuggleViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = JuggleSession.objects.all()
    serializer_class = JuggleSessionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in ['update', 'partial_update', 'destroy'] and not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.is_anonymous:
            raise PermissionDenied("Authentication required")
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def buy_item(self, request, pk=None):
        base_session = self.get_object()

        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response({"error": "Quantity must be a valid integer"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)

        buyer = request.user
        if buyer.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

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
        total_cost = product.base_price * quantity

        if buyer.actual_balance < total_cost:
            return Response({"error": f"Insufficient balance. Required: ETB {total_cost}, Available: ETB {buyer.actual_balance}"}, status=status.HTTP_400_BAD_REQUEST)

        profit_per_item = base_session.markup_price - product.base_price
        total_profit = profit_per_item * quantity
        juggler = base_session.user

        settings_obj = GlobalSettings.get_settings()
        fee_rate = settings_obj.site_fee_percentage / Decimal('100.0')
        site_fee = total_profit * fee_rate
        juggler_profit = total_profit - site_fee

        with transaction.atomic():
            User.objects.filter(id=buyer.id).update(
                actual_balance=F('actual_balance') - total_cost
            )

            session_ids = [s.id for s in matching_sessions]
            JuggleSession.objects.filter(id__in=session_ids).update(is_active=False)

            juggler.credit_balance(juggler_profit)
            User.objects.filter(id=juggler.id).update(
                reserved_cb=F('reserved_cb') - (product.base_price * quantity)
            )

            GlobalSettings.objects.filter(id=1).update(
                total_site_profit=F('total_site_profit') + site_fee
            )

            Product.objects.filter(id=product.id).update(
                stock=F('stock') - quantity
            )

            product.refresh_from_db()
            if product.stock <= 0:
                product.status = 'SOLD'
                product.save(update_fields=['status'])

                other_active = product.active_sessions.filter(is_active=True)
                other_ids = list(other_active.values_list('id', flat=True))
                if other_ids:
                    JuggleSession.objects.filter(id__in=other_ids).update(is_active=False)
                    users_with_sessions = JuggleSession.objects.filter(id__in=other_ids).values_list('user_id', flat=True).distinct()
                    for uid in users_with_sessions:
                        User.objects.filter(id=uid).update(
                            reserved_cb=F('reserved_cb') - product.base_price
                        )

        return Response({
            "success": f"Purchased {quantity} from {juggler.username}. Total profit of {total_profit} ETB sent to their safe balance.",
            "product_status": product.status,
            "remaining_stock": product.stock
        })

    @action(detail=True, methods=['post'])
    def cancel_juggle(self, request, pk=None):
        session = self.get_object()
        if not session.is_active:
            return Response({"error": "Session is already inactive"}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user

        if session.user != user:
            return Response({"error": "You do not own this session"}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            session.is_active = False
            session.save(update_fields=['is_active'])

            user.reserved_cb = max(Decimal('0'), user.reserved_cb - session.product.base_price)
            user.save(update_fields=['reserved_cb'])

            product = session.product
            if not product.active_sessions.filter(is_active=True).exists() and product.status == 'JUGGLED':
                product.status = 'AVAILABLE'
                product.save(update_fields=['status'])

        return Response({"success": "Juggle session cancelled. Virtual power released."})

    @action(detail=False, methods=['get'])
    def my_juggles(self, request):
        cleanup_expired_juggles()
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user

        juggles = JuggleSession.objects.filter(
            user=user,
            is_active=True,
            expires_at__gt=timezone.now()
        ).select_related('product', 'product__category')

        serializer = JuggleSessionSerializer(juggles, many=True)
        data = []
        for j, j_data in zip(juggles, serializer.data):
            j_data['product'] = ProductSerializer(j.product).data
            data.append(j_data)

        return Response(data)

    @action(detail=False, methods=['post'])
    def start_juggle(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user

        product_id = request.data.get('product_id')
        markup_price = request.data.get('markup_price')

        try:
            slots = int(request.data.get('slots', 1))
        except (ValueError, TypeError):
            return Response({"error": "Slots must be a valid integer"}, status=status.HTTP_400_BAD_REQUEST)

        if slots < 1:
            return Response({"error": "Must juggle at least 1 slot"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, TypeError):
            return Response({"error": "Product not available for juggling"}, status=status.HTTP_400_BAD_REQUEST)

        if product.status == 'SOLD' or product.stock <= 0:
            return Response({"error": "Product not available for juggling"}, status=status.HTTP_400_BAD_REQUEST)

        active_count = product.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).count()
        remaining = product.stock - active_count
        if remaining < slots:
            return Response({"error": f"Only {remaining} slots remaining for this prototype. You requested {slots}."}, status=status.HTTP_400_BAD_REQUEST)

        user_data = UserSerializer(user).data
        current_cb = float(user_data['current_cb'])
        total_required = float(product.base_price) * slots

        if current_cb < total_required:
            return Response({
                "error": f"Insufficient Virtual Power. Juggling {slots} slots requires {total_required} ETB, but you have {current_cb} ETB."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            markup_decimal = Decimal(str(markup_price))
        except (ValueError, TypeError, decimal.InvalidOperation):
            return Response({"error": "Markup price must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)

        if markup_decimal <= product.base_price:
            return Response({"error": "Markup price must be higher than base price"}, status=status.HTTP_400_BAD_REQUEST)

        expires_at = timezone.now() + datetime.timedelta(days=36525)

        with transaction.atomic():
            sessions_created = []
            for _ in range(slots):
                session = JuggleSession.objects.create(
                    user=user,
                    product=product,
                    markup_price=markup_decimal,
                    expires_at=expires_at
                )
                sessions_created.append(session)

            User.objects.filter(id=user.id).update(
                reserved_cb=F('reserved_cb') + (product.base_price * slots)
            )

            if product.status != 'JUGGLED':
                product.status = 'JUGGLED'
                product.save(update_fields=['status'])

            Notification.create(
                user=user,
                notification_type='JUGGLE_CLAIMED',
                title='Juggles Created',
                message=f'{slots} slots created for "{product.name}" at ETB {markup_decimal} each.'
            )

        return Response(JuggleSessionSerializer(sessions_created[0]).data, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['me', 'leaderboard', 'login_user', 'signup_user', 'logout_user', 'forgot_password']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response([])

        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(business_name__icontains=query) |
            Q(seller_full_name__icontains=query)
        ).exclude(id=request.user.id).order_by('username')[:20]

        return Response([
            {
                'id': user.id,
                'username': user.username,
                'business_name': user.business_name or '',
                'is_juggler': user.is_juggler,
                'is_seller_verified': user.is_seller_verified,
            }
            for user in users
        ])

    @action(detail=False, methods=['get'])
    def me(self, request):
        cleanup_expired_juggles()
        settings = GlobalSettings.get_settings()
        now = timezone.now()
        elapsed = (now - settings.last_reset_time).total_seconds()
        PHASE_DURATION = 300.0
        seconds_until_next_change = int(PHASE_DURATION - (elapsed % PHASE_DURATION))

        if request.user.is_anonymous:
            return Response({
                "error": "Not authenticated",
                "seconds_until_next_change": seconds_until_next_change
            }, status=status.HTTP_401_UNAUTHORIZED)

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
        update_session_auth_hash(request, user)
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
        user.is_seller_verified = False
        user.save()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['get'])
    def pending_sellers(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        pending = User.objects.filter(seller_status='PENDING')
        serializer = UserSerializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='seller_analytics')
    def seller_analytics(self, request):
        user = request.user
        if user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

        from django.db.models import Sum, Count, Q
        from django.utils import timezone
        import datetime

        products = Product.objects.filter(seller=user)
        transactions = Transaction.objects.filter(user=user)

        total_revenue = transactions.filter(
            transaction_type='SALE'
        ).aggregate(total=Sum('amount'))['total'] or 0

        today = timezone.now().date()
        daily_sales = []
        for i in range(30):
            day = today - datetime.timedelta(days=i)
            day_start = timezone.make_aware(datetime.datetime.combine(day, datetime.time.min))
            day_end = timezone.make_aware(datetime.datetime.combine(day, datetime.time.max))
            day_revenue = transactions.filter(
                transaction_type='SALE',
                created_at__range=(day_start, day_end)
            ).aggregate(total=Sum('amount'))['total'] or 0
            day_count = transactions.filter(
                transaction_type='SALE',
                created_at__range=(day_start, day_end)
            ).count()
            daily_sales.append({
                'date': day.strftime('%b %d'),
                'revenue': float(day_revenue),
                'orders': day_count
            })
        daily_sales.reverse()

        category_breakdown = products.values('category__name').annotate(
            count=Count('id'),
            revenue=Sum('base_price')
        ).order_by('-revenue')

        status_breakdown = {
            'available': products.filter(status='AVAILABLE').count(),
            'juggled': products.filter(status='JUGGLED').count(),
            'sold': products.filter(status='SOLD').count(),
            'expired': products.filter(status='EXPIRED').count(),
        }

        avg_order_value = transactions.filter(transaction_type='SALE').aggregate(
            avg=Sum('amount') / Count('id')
        )['avg'] or 0

        return Response({
            'total_revenue': float(total_revenue),
            'total_products': products.count(),
            'total_orders': transactions.filter(transaction_type='SALE').count(),
            'avg_order_value': float(avg_order_value),
            'daily_sales': daily_sales,
            'category_breakdown': [
                {'name': c['category__name'] or 'Uncategorized', 'count': c['count'], 'revenue': float(c['revenue'] or 0)}
                for c in category_breakdown
            ],
            'status_breakdown': status_breakdown
        })

    @action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        cache_key = 'juggler_leaderboard'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        jugglers = User.objects.filter(is_juggler=True).order_by('-deals_completed')[:50]

        leaderboard_data = []
        for rank, juggler in enumerate(jugglers, 1):
            cb_power = juggler.get_calculated_cb()
            earnings = Transaction.objects.filter(
                transaction_type='JUGGLE_PROFIT',
                user=juggler
            ).aggregate(total=Sum('amount'))['total'] or 0

            success_rate = 100
            if juggler.deals_completed > 0:
                successful = JuggleSession.objects.filter(
                    user=juggler, is_active=False
                ).count()
                success_rate = min(100, int((successful / max(juggler.deals_completed, 1)) * 100))

            leaderboard_data.append({
                'rank': rank,
                'id': juggler.id,
                'username': juggler.username,
                'business_name': juggler.business_name or juggler.username,
                'deals_completed': juggler.deals_completed,
                'pyramid_tier': juggler.pyramid_tier,
                'cb_power': float(cb_power),
                'actual_balance': float(juggler.actual_balance),
                'earnings': float(earnings),
                'success_rate': success_rate,
                'badge': get_badge(rank)
            })

        response_data = {
            'leaderboard': leaderboard_data,
            'total_jugglers': User.objects.filter(is_juggler=True).count()
        }
        cache.set(cache_key, response_data, 300)
        return Response(response_data)

    @action(detail=True, methods=['post'])
    def review_seller(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)
        user = self.get_object()
        rev_action = request.data.get('action')

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
            amount = Decimal(str(amount))
        except (ValueError, TypeError, decimal.InvalidOperation):
            return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"error": "Amount must be a positive number"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.credit_balance(amount)
        user.refresh_from_db()
        return Response(UserSerializer(user).data)

    @action(detail=False, methods=['post'])
    def become_juggler(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user

        if user.is_juggler:
            return Response({"error": "You are already a juggler"}, status=status.HTTP_400_BAD_REQUEST)

        if settings.PAYMENT_MODE != 'mock' and not user.email:
            return Response({"error": "Email is required for payment. Please update your email first."}, status=status.HTTP_400_BAD_REQUEST)

        if settings.PAYMENT_MODE == 'mock':
            user.is_juggler = True
            user.save(update_fields=['is_juggler'])
            Notification.create(
                user=user,
                notification_type='SYSTEM',
                title='Development payment accepted',
                message='Juggler access was enabled using the local development payment simulator.'
            )
            return Response({"success": "Development payment accepted", "is_juggler": True})

        from .chapa import chapa
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        payment_result = chapa.initialize_payment(
            amount=Decimal('10.00'),
            email=user.email,
            phone_number=user.phone_number,
            first_name=user.first_name or user.username,
            last_name=user.last_name or '',
            title="Juggler Access Fee",
            return_url=f"{frontend_url}/account?payment=juggler_success",
             callback_url=f"{getattr(settings, 'SITE_URL', 'http://localhost:8000')}/api/users/chapa_callback/"
        )

        if payment_result.get('success'):
            return Response({
                "success": "Payment initialized",
                "checkout_url": payment_result.get('checkout_url'),
                "tx_ref": payment_result.get('tx_ref')
            })
        else:
            return Response({
                "error": payment_result.get('error', 'Payment failed. Please try again.')
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def deposit(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user

        if settings.PAYMENT_MODE != 'mock' and not user.email:
            return Response({"error": "Email is required for payment. Please update your email first."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(request.data.get('amount', 0)))
        except (ValueError, TypeError):
            return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"error": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)

        if amount > Decimal('100000'):
            return Response({"error": "Maximum deposit is ETB 100,000"}, status=status.HTTP_400_BAD_REQUEST)

        if settings.PAYMENT_MODE == 'mock':
            reference = f'MOCK_DEPOSIT_{timezone.now().strftime("%Y%m%d%H%M%S%f")}'
            user.credit_balance(amount)
            Transaction.create(user, 'DEPOSIT', amount, 'Development payment simulator deposit', reference_id=reference)
            user.refresh_from_db()
            return Response({
                "success": "Development deposit completed",
                "mock": True,
                "balance": str(user.actual_balance),
            })

        from .chapa import chapa
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

        payment_result = chapa.initialize_payment(
            amount=amount,
            email=user.email,
            phone_number=user.phone_number,
            first_name=user.first_name or user.username,
            last_name=user.last_name or '',
            title="Account Deposit",
            return_url=f"{frontend_url}/account?payment=deposit_success",
             callback_url=f"{getattr(settings, 'SITE_URL', 'http://localhost:8000')}/api/users/chapa_callback/"
        )

        if payment_result.get('success'):
            return Response({
                "success": "Payment initialized",
                "checkout_url": payment_result.get('checkout_url'),
                "tx_ref": payment_result.get('tx_ref')
            })
        else:
            return Response({
                "error": payment_result.get('error', 'Payment failed. Please try again.')
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def withdraw(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        user = request.user

        try:
            amount = Decimal(str(request.data.get('amount', 0)))
        except (ValueError, TypeError):
            return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"error": "Amount must be positive"}, status=status.HTTP_400_BAD_REQUEST)

        if amount > user.actual_balance:
            return Response({
                "error": f"Insufficient balance. Available: ETB {user.actual_balance}"
            }, status=status.HTTP_400_BAD_REQUEST)

        phone_number = request.data.get('phone_number', '').strip()
        if not phone_number:
            return Response({"error": "Phone number is required for withdrawal"}, status=status.HTTP_400_BAD_REQUEST)

        from .chapa import chapa
        transfer_result = chapa.initiate_transfer(
            amount=amount,
            recipient_phone=phone_number
        )

        if transfer_result.get('success'):
            user.actual_balance = F('actual_balance') - amount
            user.save(update_fields=['actual_balance'])
            user.refresh_from_db()
            Notification.create(
                user=user,
                notification_type='WITHDRAWAL',
                title='Withdrawal Processed',
                message=f'ETB {amount:.2f} has been sent to {phone_number}.'
            )
            Transaction.create(user, 'WITHDRAWAL', -amount, f'Withdrawal to {phone_number}')
            return Response({
                "success": "Withdrawal initiated successfully",
                "reference": transfer_result.get('reference'),
                "balance": str(user.actual_balance)
            })
        else:
            return Response({
                "error": transfer_result.get('error', 'Withdrawal failed. Please try again.')
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def chapa_callback(self, request):
        from .chapa import chapa
        from django.views.decorators.csrf import csrf_exempt
        from django.http import JsonResponse

        tx_ref = request.data.get('tx_ref')
        if not tx_ref:
            return Response({"error": "Missing tx_ref"}, status=status.HTTP_400_BAD_REQUEST)

        verification = chapa.verify_payment(tx_ref)

        if verification.get('success') and verification.get('status') == 'success':
            if Transaction.objects.filter(reference_id=tx_ref).exists():
                return Response({'success': 'Payment already processed'})
            if tx_ref.startswith('THE_JUGGLE_'):
                try:
                    user = User.objects.get(email=verification.get('email'))
                    amount = Decimal(str(verification.get('amount', 0)))
                    user.credit_balance(amount)
                    Notification.create(
                        user=user,
                        notification_type='DEPOSIT',
                        title='Deposit Received',
                        message=f'ETB {amount:.2f} has been added to your account.'
                    )
                    Transaction.create(user, 'DEPOSIT', amount, 'Chapa deposit', reference_id=tx_ref)
                    return Response({"success": "Payment verified and credited"})
                except User.DoesNotExist:
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            elif tx_ref.startswith('JUGGLER_'):
                try:
                    user = User.objects.get(email=verification.get('email'))
                    user.is_juggler = True
                    user.save(update_fields=['is_juggler'])
                    Notification.create(
                        user=user,
                        notification_type='SYSTEM',
                        title='Welcome to The Juggle!',
                        message='You are now a Juggler! Start claiming products and earning profits.'
                    )
                    return Response({"success": "Juggler status activated"})
                except User.DoesNotExist:
                    return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({"status": "ignored"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def logout_user(self, request):
        logout(request)
        return Response({"success": "Logged out successfully"})

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def signup_user(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({"error": "All fields are required"}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({"error": "Password must be at least 8 characters long"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(username=username, email=email, password=password)
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception:
            return Response({"error": "Failed to create user. Please try again."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def login_user(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            login(request, user)
            return Response(UserSerializer(user).data)
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)


class AdminDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        from django.db.models import Sum, Count, Avg
        from datetime import timedelta

        total_users = User.objects.count()
        total_jugglers = User.objects.filter(is_juggler=True).count()
        total_sellers = User.objects.filter(seller_status='VERIFIED').count()
        pending_sellers = User.objects.filter(seller_status='PENDING').count()
        total_products = Product.objects.count()
        active_products = Product.objects.filter(status='ACTIVE').count()
        juggled_products = Product.objects.filter(status='JUGGLED').count()
        sold_products = Product.objects.filter(status='SOLD').count()
        total_revenue = GlobalSettings.objects.aggregate(total=Sum('total_site_profit'))['total'] or 0
        active_pyramids = Pyramid.objects.filter(status='ACTIVE').count()
        completed_pyramids = Pyramid.objects.filter(status='COMPLETED').count()
        total_juggles = JuggleSession.objects.count()
        active_juggles = JuggleSession.objects.filter(is_active=True).count()

        now = timezone.now()
        daily_stats = []
        for i in range(30):
            day = now - timedelta(days=29 - i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_users = User.objects.filter(date_joined__range=(day_start, day_end)).count()
            day_products = Product.objects.filter(created_at__range=(day_start, day_end)).count()
            daily_stats.append({
                'date': day_start.strftime('%b %d'),
                'users': day_users,
                'products': day_products
            })

        return Response({
            'total_users': total_users,
            'total_jugglers': total_jugglers,
            'total_sellers': total_sellers,
            'pending_sellers': pending_sellers,
            'total_products': total_products,
            'active_products': active_products,
            'juggled_products': juggled_products,
            'sold_products': sold_products,
            'total_revenue': float(total_revenue),
            'active_pyramids': active_pyramids,
            'completed_pyramids': completed_pyramids,
            'total_juggles': total_juggles,
            'active_juggles': active_juggles,
            'daily_stats': daily_stats
        })


class CartViewSet(viewsets.ModelViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [AllowAny]
    serializer_class = CartItemSerializer
    pagination_class = None

    def get_queryset(self):
        if self.request.user.is_anonymous:
            return CartItem.objects.none()
        return CartItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.is_anonymous:
            raise PermissionDenied("Authentication required")
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def update_quantity(self, request, pk=None):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        cart_item = self.get_object()

        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response({"error": "Quantity must be a valid integer"}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=status.HTTP_400_BAD_REQUEST)

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
        try:
            quantity = int(request.data.get('quantity', 1))
        except (ValueError, TypeError):
            return Response({'error': 'Quantity must be a valid integer'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity < 1:
            return Response({'error': 'Quantity must be at least 1'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(id=product_id)
        except (Product.DoesNotExist, TypeError):
            return Response({"error": "Product not found"}, status=status.HTTP_400_BAD_REQUEST)

        selected_offer = None
        if offer_id and offer_id != 'direct':
            try:
                selected_offer = JuggleSession.objects.get(id=offer_id)
            except (JuggleSession.DoesNotExist, TypeError):
                return Response({"error": "Offer not found"}, status=status.HTTP_400_BAD_REQUEST)

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
        items = CartItem.objects.filter(user=user).select_related('product', 'selected_offer', 'selected_offer__user')
        if not items.exists():
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for item in items:
                product = item.product
                quantity = item.quantity

                if product.stock < quantity:
                    return Response(
                        {'error': f"Insufficient stock for {product.name}. Available: {product.stock}, Requested: {quantity}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if item.selected_offer:
                    juggler = item.selected_offer.user
                    total_price = item.selected_offer.markup_price * quantity

                    if user.actual_balance < total_price:
                        return Response(
                            {'error': f"Insufficient balance for {product.name}. Required: ETB {total_price}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    settings_obj = GlobalSettings.get_settings()
                    fee_rate = settings_obj.site_fee_percentage / Decimal('100.0')
                    profit = (item.selected_offer.markup_price - product.base_price) * quantity
                    site_fee = profit * fee_rate
                    juggler_profit = profit - site_fee

                    User.objects.filter(id=user.id).update(
                        actual_balance=F('actual_balance') - total_price
                    )
                    juggler.credit_balance(juggler_profit)
                    User.objects.filter(id=juggler.id).update(
                        reserved_cb=F('reserved_cb') - (product.base_price * quantity)
                    )
                    GlobalSettings.objects.filter(id=1).update(
                        total_site_profit=F('total_site_profit') + site_fee
                    )

                    juggler.deals_completed += 1
                    juggler.save(update_fields=['deals_completed'])

                    JuggleSession.objects.filter(
                        id=item.selected_offer.id
                    ).update(is_active=False)

                    Notification.create(
                        user=juggler,
                        notification_type='SALE',
                        title='Product Sold!',
                        message=f'Your juggle for "{product.name}" was purchased! You earned ETB {juggler_profit:.2f} profit.'
                    )
                    Notification.create(
                        user=user,
                        notification_type='PAYMENT_SENT',
                        title='Purchase Complete',
                        message=f'You purchased "{product.name}" for ETB {total_price:.2f}.'
                    )

                    Transaction.create(user, 'PURCHASE', -total_price, f'Purchased "{product.name}" via juggle')
                    Transaction.create(juggler, 'JUGGLE_PROFIT', juggler_profit, f'Profit from juggling "{product.name}"')
                else:
                    total_price = product.base_price * quantity

                    if user.actual_balance < total_price:
                        return Response(
                            {'error': f"Insufficient balance for {product.name}. Required: ETB {total_price}"},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    settings_obj = GlobalSettings.get_settings()
                    fee_rate = settings_obj.site_fee_percentage / Decimal('100.0')
                    site_fee = total_price * fee_rate
                    seller_revenue = total_price - site_fee

                    User.objects.filter(id=user.id).update(
                        actual_balance=F('actual_balance') - total_price
                    )
                    if product.seller:
                        product.seller.credit_balance(seller_revenue)
                        Notification.create(
                            user=product.seller,
                            notification_type='SALE',
                            title='Product Sold!',
                            message=f'Your product "{product.name}" was purchased directly for ETB {total_price:.2f}. Revenue: ETB {seller_revenue:.2f}.'
                        )
                    GlobalSettings.objects.filter(id=1).update(
                        total_site_profit=F('total_site_profit') + site_fee
                    )

                    Notification.create(
                        user=user,
                        notification_type='PAYMENT_SENT',
                        title='Purchase Complete',
                        message=f'You purchased "{product.name}" for ETB {total_price:.2f}.'
                    )

                    Transaction.create(user, 'PURCHASE', -total_price, f'Purchased "{product.name}" directly')
                    if product.seller:
                        Transaction.create(product.seller, 'SALE', seller_revenue, f'Sale of "{product.name}"')

                Product.objects.filter(id=product.id).update(
                    stock=F('stock') - quantity
                )
                product.refresh_from_db()
                if product.stock <= 0:
                    product.status = 'SOLD'
                    product.save(update_fields=['status'])
                    product.active_sessions.filter(is_active=True).update(is_active=False)

            items.delete()

        return Response({'success': 'Checkout successful! Products are on their way.'})


class NotificationViewSet(viewsets.ViewSet):
    authentication_classes = [SessionAuthentication, BasicAuthentication]
    permission_classes = [AllowAny]

    def list(self, request):
        if request.user.is_anonymous:
            return Response({
                'notifications': [],
                'unread_count': 0
            })
        notifications = Notification.objects.filter(user=request.user)[:50]
        serializer = NotificationSerializer(notifications, many=True)
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        notification_id = request.data.get('id')
        if notification_id:
            Notification.objects.filter(id=notification_id, user=request.user).update(is_read=True)
        return Response({'success': True})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        if request.user.is_anonymous:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'success': True})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        if request.user.is_anonymous:
            return Response({'unread_count': 0})
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class TransactionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        transactions = Transaction.objects.filter(user=request.user)[:100]
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(Q(buyer=user) | Q(seller=user) | Q(juggler=user))

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user, status='PENDING')

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        if not (request.user.is_staff or order.seller == request.user or order.juggler == request.user):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get('status')
        
        valid_statuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])
        
        Notification.create(
            user=order.buyer,
            notification_type='SYSTEM',
            title=f'Order #{order.id} Updated',
            message=f'Your order status has been updated to {new_status}.'
        )
        
        return Response({'success': f'Order status updated to {new_status}'})

    @action(detail=True, methods=['post'])
    def add_tracking(self, request, pk=None):
        order = self.get_object()
        if not (request.user.is_staff or order.seller == request.user):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        tracking_number = request.data.get('tracking_number', '')
        order.tracking_number = tracking_number
        order.status = 'SHIPPED'
        order.save(update_fields=['tracking_number', 'status', 'updated_at'])
        
        Notification.create(
            user=order.buyer,
            notification_type='SYSTEM',
            title=f'Order #{order.id} Shipped',
            message=f'Tracking number: {tracking_number}'
        )
        
        return Response({'success': 'Tracking number added'})


class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        product_id = self.request.query_params.get('product')
        if product_id:
            return Review.objects.filter(product_id=product_id)
        return Review.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def product_reviews(self, request):
        product_id = request.query_params.get('product')
        if not product_id:
            return Response({'error': 'Product ID required'}, status=status.HTTP_400_BAD_REQUEST)

        reviews = Review.objects.filter(product_id=product_id)
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0

        return Response({
            'reviews': ReviewSerializer(reviews, many=True).data,
            'average_rating': round(avg_rating, 1),
            'total_reviews': reviews.count()
        })


class ConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    def create(self, request):
        user = request.user
        other_user_id = request.data.get('user_id')
        product_id = request.data.get('product_id')

        if not other_user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        existing = Conversation.objects.filter(participants=user).filter(participants=other_user)
        if product_id:
            existing = existing.filter(product_id=product_id)
        existing = existing.first()

        if existing:
            return Response(ConversationSerializer(existing, context={'request': request}).data)

        conversation = Conversation.objects.create(product_id=product_id)
        conversation.participants.add(user, other_user)
        return Response(ConversationSerializer(conversation, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all()

        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

        return Response(MessageSerializer(messages, many=True).data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        content = request.data.get('content', '').strip()

        if not content:
            return Response({'error': 'Message content required'}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )

        recipient = conversation.participants.exclude(id=request.user.id).first()
        if recipient:
            Notification.create(
                user=recipient,
                notification_type='SYSTEM',
                title=f'New message from {request.user.username}',
                message=content[:220]
            )

        conversation.save()

        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        total = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False
        ).exclude(sender=request.user).count()

        return Response({'unread_count': total})


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        conversation_id = self.request.query_params.get('conversation')
        queryset = Message.objects.filter(conversation__participants=self.request.user)
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        return queryset

    def perform_create(self, serializer):
        conversation = serializer.validated_data['conversation']
        if not conversation.participants.filter(id=self.request.user.id).exists():
            raise PermissionDenied("You are not a participant in this conversation")
        serializer.save(sender=self.request.user)


class DeliveryTrackingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DeliveryTrackingSerializer

    def get_queryset(self):
        user = self.request.user
        order_id = self.request.query_params.get('order')
        queryset = DeliveryTracking.objects.filter(
            Q(order__buyer=user) | Q(order__seller=user) | Q(updated_by=user)
        ).order_by('-created_at')
        if order_id:
            return queryset.filter(order_id=order_id)
        return queryset

    def perform_create(self, serializer):
        order_id = self.request.data.get('order')
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Order not found")

        if not (self.request.user.is_staff or order.seller == self.request.user or order.buyer == self.request.user):
            raise PermissionDenied("You are not associated with this order")

        tracking = serializer.save(updated_by=self.request.user)

        status_map = {
            'PICKED_UP': 'SHIPPED',
            'IN_TRANSIT': 'SHIPPED',
            'OUT_FOR_DELIVERY': 'SHIPPED',
            'DELIVERED': 'DELIVERED',
            'FAILED': 'CANCELLED',
        }
        order_status = status_map.get(tracking.status)
        if order_status:
            order.status = order_status
            if tracking.status == 'DELIVERED':
                order.delivered_at = timezone.now()
            order.save(update_fields=['status', 'updated_at'])

    @action(detail=False, methods=['get'])
    def by_tracking_number(self, request):
        tracking_number = request.query_params.get('tracking_number')
        if not tracking_number:
            return Response({'error': 'tracking_number required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(tracking_number=tracking_number)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        updates = DeliveryTracking.objects.filter(order=order).order_by('-created_at')
        return Response({
            'order': OrderSerializer(order).data,
            'tracking_updates': DeliveryTrackingSerializer(updates, many=True).data
        })

    @action(detail=False, methods=['post'])
    def add_update(self, request):
        user = request.user
        order_id = request.data.get('order')
        tracking_status = request.data.get('status')
        location = request.data.get('location', '')
        description = request.data.get('description', '')

        if not order_id or not tracking_status:
            return Response({'error': 'order and status required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if not (order.seller == user or order.buyer == user or user.is_staff):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        tracking = DeliveryTracking.objects.create(
            order=order,
            status=tracking_status,
            location=location,
            description=description,
            updated_by=user
        )

        status_map = {
            'PICKED_UP': 'SHIPPED',
            'IN_TRANSIT': 'SHIPPED',
            'OUT_FOR_DELIVERY': 'SHIPPED',
            'DELIVERED': 'DELIVERED',
            'FAILED': 'CANCELLED',
        }
        order_status = status_map.get(tracking_status)
        if order_status:
            order.status = order_status
            if tracking_status == 'DELIVERED':
                order.delivered_at = timezone.now()
            order.save(update_fields=['status', 'updated_at'])

        return Response(DeliveryTrackingSerializer(tracking).data, status=status.HTTP_201_CREATED)
