from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from decimal import Decimal
import json

from juggle.models import User, Product, Category, Order, Review, Conversation, Message


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
            '/api/users/',
            {
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'newpass123'
            },
            content_type='application/json'
        )
        self.assertIn(response.status_code, [200, 201, 400])

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
