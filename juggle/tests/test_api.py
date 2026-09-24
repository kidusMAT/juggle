from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
import json

from juggle.models import User, Product, Category, Order, Review, Conversation, Message, DeliveryTracking


class APITestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            actual_balance=Decimal('1000.00')
        )
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='sellerpass123',
            seller_status='VERIFIED'
        )
        self.category = Category.objects.create(name='Electronics')
        self.product = Product.objects.create(
            name='Test Phone',
            brand='TestBrand',
            description='A test phone',
            base_price=Decimal('500.00'),
            seller=self.seller,
            category=self.category,
            stock=10,
            status='AVAILABLE'
        )


class AuthenticationTests(APITestCase):
    def test_signup(self):
        response = self.client.post(
            '/api/users/signup_user/',
            {
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'newpass123'
            },
            content_type='application/json'
        )
        self.assertIn(response.status_code, [200, 201])

    def test_login(self):
        response = self.client.post(
            '/api/users/login_user/',
            {
                'username': 'testuser',
                'password': 'testpass123'
            },
            content_type='application/json'
        )
        self.assertIn(response.status_code, [200, 201])

    def test_me_endpoint(self):
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, 200)

    # ── New required coverage ─────────────────────────────────────────────────

    def test_logged_in_session_persists_on_refresh(self):
        """After login, subsequent requests (simulating a refresh) remain
        authenticated because the session cookie is sent automatically."""
        # Simulate a page-load /me/ call immediately after login
        login_res = self.client.post(
            '/api/users/login_user/',
            {'username': 'testuser', 'password': 'testpass123'},
            content_type='application/json'
        )
        self.assertEqual(login_res.status_code, 200)

        # The client keeps the session cookie; this simulates /me/ on hard refresh
        me_res = self.client.get('/api/users/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data['username'], 'testuser')

    def test_login_then_navigation_stays_authenticated(self):
        """After login, navigating to other API endpoints still returns
        authenticated responses (session persists across calls)."""
        self.client.post(
            '/api/users/login_user/',
            {'username': 'testuser', 'password': 'testpass123'},
            content_type='application/json'
        )
        # Simulate the Navbar calling /me/ after navigating to /juggler
        me_res = self.client.get('/api/users/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.data['id'], self.user.id)

        # Simulate cart fetch on the new page
        cart_res = self.client.get('/api/cart/')
        self.assertEqual(cart_res.status_code, 200)

    def test_logout_clears_session(self):
        """After logout, /me/ must return 401, confirming the session was
        invalidated server-side."""
        self.client.login(username='testuser', password='testpass123')

        # Verify authenticated
        self.assertEqual(self.client.get('/api/users/me/').status_code, 200)

        # Logout
        logout_res = self.client.post('/api/users/logout_user/')
        self.assertEqual(logout_res.status_code, 200)

        # Session must be invalid now
        me_res = self.client.get('/api/users/me/')
        self.assertEqual(me_res.status_code, 401)

    def test_expired_or_invalid_session_returns_401(self):
        """A request with no valid session (unauthenticated client) receives
        a 401 from /me/, which is the signal that triggers the Login UI."""
        # New client with no cookies — simulates expired / missing session
        from django.test import Client
        fresh_client = Client()
        response = fresh_client.get('/api/users/me/')
        self.assertEqual(response.status_code, 401)
        self.assertIn('error', response.data)

    def test_development_deposit_uses_local_payment_simulator(self):
        from django.test import override_settings
        with override_settings(PAYMENT_MODE='mock'):
            self.client.login(username='testuser', password='testpass123')
            response = self.client.post(
                '/api/users/deposit/',
                {'amount': '25.00'},
                content_type='application/json'
            )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['mock'])
        self.user.refresh_from_db()
        self.assertEqual(self.user.actual_balance, Decimal('1025.00'))


class ProductTests(APITestCase):
    def test_list_products(self):
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)

    def test_get_product(self):
        response = self.client.get(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['name'], 'Test Phone')

    def test_buyer_market(self):
        response = self.client.get('/api/products/buyer_market/')
        self.assertEqual(response.status_code, 200)

    def test_fuzzy_search(self):
        response = self.client.get('/api/products/fuzzy_search/?q=phone')
        self.assertEqual(response.status_code, 200)


class CartTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client.login(username='testuser', password='testpass123')

    def test_add_to_cart(self):
        response = self.client.post(
            '/api/cart/',
            {
                'product': self.product.id,
                'quantity': 1
            },
            content_type='application/json'
        )
        self.assertIn(response.status_code, [200, 201])

    def test_list_cart(self):
        response = self.client.get('/api/cart/')
        self.assertEqual(response.status_code, 200)


class OrderTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client.login(username='testuser', password='testpass123')
        self.order = Order.objects.create(
            buyer=self.user,
            seller=self.seller,
            product=self.product,
            quantity=1,
            total_price=Decimal('500.00'),
            status='PENDING'
        )

    def test_list_orders(self):
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, 200)

    def test_get_order(self):
        response = self.client.get(f'/api/orders/{self.order.id}/')
        self.assertEqual(response.status_code, 200)


class ReviewTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client.login(username='testuser', password='testpass123')

    def test_create_review(self):
        response = self.client.post(
            '/api/reviews/',
            {
                'product': self.product.id,
                'rating': 5,
                'comment': 'Great product!'
            },
            content_type='application/json'
        )
        self.assertIn(response.status_code, [200, 201])

    def test_product_reviews(self):
        response = self.client.get(f'/api/reviews/product_reviews/?product={self.product.id}')
        self.assertEqual(response.status_code, 200)


class ConversationTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client.login(username='testuser', password='testpass123')

    def test_create_conversation(self):
        response = self.client.post(
            '/api/conversations/',
            {
                'user_id': self.seller.id
            },
            content_type='application/json'
        )
        self.assertIn(response.status_code, [200, 201])

    def test_list_conversations(self):
        response = self.client.get('/api/conversations/')
        self.assertEqual(response.status_code, 200)


class LeaderboardTests(APITestCase):
    def test_leaderboard(self):
        response = self.client.get('/api/users/leaderboard/')
        self.assertEqual(response.status_code, 200)


class DeliveryTrackingTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client.login(username='testuser', password='testpass123')
        self.order = Order.objects.create(
            buyer=self.user,
            seller=self.seller,
            product=self.product,
            quantity=1,
            total_price=Decimal('500.00'),
            status='SHIPPED',
            tracking_number='TRK123456'
        )

    def test_list_tracking(self):
        response = self.client.get('/api/delivery-tracking/')
        self.assertEqual(response.status_code, 200)

    def test_search_by_tracking_number(self):
        response = self.client.get('/api/delivery-tracking/by_tracking_number/?tracking_number=TRK123456')
        self.assertEqual(response.status_code, 200)


class ObjectPermissionRegressionTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.other = User.objects.create_user(username='other', password='otherpass123')
        self.client.login(username='testuser', password='testpass123')

    def test_non_owner_cannot_modify_product(self):
        response = self.client.patch(
            f'/api/products/{self.product.id}/',
            {'name': 'stolen'},
            content_type='application/json'
        )
        self.assertIn(response.status_code, [403, 404])
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, 'Test Phone')

    def test_non_participant_cannot_read_conversation_messages(self):
        conversation = Conversation.objects.create()
        conversation.participants.add(self.seller, self.other)
        Message.objects.create(conversation=conversation, sender=self.seller, content='private')
        response = self.client.get(f'/api/messages/?conversation={conversation.id}')
        self.assertIn(response.status_code, [403, 404])

    def test_non_party_cannot_read_order_tracking(self):
        order = Order.objects.create(
            buyer=self.other,
            seller=self.seller,
            product=self.product,
            quantity=1,
            total_price=Decimal('500.00'),
            tracking_number='PRIVATE-1'
        )
        DeliveryTracking.objects.create(order=order, status='PICKED_UP', updated_by=self.seller)
        response = self.client.get(f'/api/delivery-tracking/?order={order.id}')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_anonymous_cannot_mutate_categories(self):
        self.client.logout()
        response = self.client.post('/api/categories/', {'name': 'Injected'}, content_type='application/json')
        self.assertIn(response.status_code, [401, 403])

    def test_invalid_cart_quantity_returns_400(self):
        response = self.client.post(
            '/api/cart/add_to_cart/',
            {'product_id': self.product.id, 'quantity': 'not-a-number'},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)


class AdminTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        self.client.login(username='admin', password='adminpass123')

    def test_admin_stats(self):
        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, 200)

    def test_pending_sellers(self):
        response = self.client.get('/api/users/pending_sellers/')
        self.assertEqual(response.status_code, 200)
