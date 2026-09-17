from django.test import TestCase
from decimal import Decimal
from juggle.models import User, Product, JuggleSession, Pyramid, Order, Review, Conversation, Message, DeliveryTracking
from juggle.models import BALANCE_CAP


class UserModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            actual_balance=Decimal('1000.00')
        )

    def test_user_creation(self):
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertFalse(self.user.is_juggler)
        self.assertEqual(self.user.pyramid_tier, 100)

    def test_get_calculated_cb(self):
        cb = self.user.get_calculated_cb()
        self.assertIsInstance(cb, Decimal)

    def test_get_available_cb(self):
        cb = self.user.get_available_cb()
        self.assertIsInstance(cb, Decimal)

    def test_balance_cap(self):
        self.user.actual_balance = Decimal('15000.00')
        self.user.save()
        self.assertEqual(self.user.actual_balance, BALANCE_CAP)

    def test_get_pyramid_tiers(self):
        tiers = self.user.get_pyramid_tiers()
        self.assertEqual(tiers, [100, 50, 25, 12, 8, 4, 2, 1])


class ProductModelTest(TestCase):
    def setUp(self):
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='sellerpass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            brand='Test Brand',
            description='Test Description',
            base_price=Decimal('100.00'),
            seller=self.seller,
            stock=10,
            status='AVAILABLE'
        )

    def test_product_creation(self):
        self.assertEqual(self.product.name, 'Test Product')
        self.assertEqual(self.product.base_price, Decimal('100.00'))
        self.assertEqual(self.product.status, 'AVAILABLE')

    def test_product_str(self):
        self.assertEqual(str(self.product), 'Test Product')


class PyramidModelTest(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner',
            email='owner@example.com',
            password='ownerpass123'
        )
        self.pyramid = Pyramid.objects.create(
            owner=self.owner,
            overflow_amount=Decimal('1000.00'),
            status='ACTIVE'
        )

    def test_pyramid_creation(self):
        self.assertEqual(self.pyramid.owner, self.owner)
        self.assertEqual(self.pyramid.overflow_amount, Decimal('1000.00'))

    def test_is_full(self):
        self.assertFalse(self.pyramid.is_full)


class OrderModelTest(TestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='buyerpass123'
        )
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='sellerpass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            base_price=Decimal('100.00'),
            seller=self.seller,
            stock=10
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            product=self.product,
            quantity=2,
            total_price=Decimal('200.00'),
            status='PENDING'
        )

    def test_order_creation(self):
        self.assertEqual(self.order.buyer, self.buyer)
        self.assertEqual(self.order.total_price, Decimal('200.00'))
        self.assertEqual(self.order.status, 'PENDING')

    def test_order_str(self):
        self.assertIn('Order #', str(self.order))


class ReviewModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='reviewer',
            email='reviewer@example.com',
            password='reviewerpass123'
        )
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='sellerpass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            base_price=Decimal('100.00'),
            seller=self.seller
        )
        self.review = Review.objects.create(
            user=self.user,
            product=self.product,
            rating=5,
            comment='Great product!'
        )

    def test_review_creation(self):
        self.assertEqual(self.review.rating, 5)
        self.assertEqual(self.review.comment, 'Great product!')

    def test_review_str(self):
        self.assertIn('5 stars', str(self.review))


class ConversationModelTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='pass123'
        )
        self.conversation = Conversation.objects.create()
        self.conversation.participants.add(self.user1, self.user2)

    def test_conversation_creation(self):
        self.assertEqual(self.conversation.participants.count(), 2)

    def test_get_other_participant(self):
        other = self.conversation.get_other_participant(self.user1)
        self.assertEqual(other, self.user2)


class MessageModelTest(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='pass123'
        )
        self.conversation = Conversation.objects.create()
        self.conversation.participants.add(self.user1, self.user2)
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Hello!'
        )

    def test_message_creation(self):
        self.assertEqual(self.message.content, 'Hello!')
        self.assertEqual(self.message.sender, self.user1)
        self.assertFalse(self.message.is_read)

    def test_message_str(self):
        self.assertIn('Hello!', str(self.message))


class DeliveryTrackingModelTest(TestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='pass123'
        )
        self.seller = User.objects.create_user(
            username='seller',
            email='seller@example.com',
            password='pass123'
        )
        self.product = Product.objects.create(
            name='Test Product',
            base_price=Decimal('100.00'),
            seller=self.seller
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            product=self.product,
            quantity=1,
            total_price=Decimal('100.00'),
            status='SHIPPED'
        )
        self.tracking = DeliveryTracking.objects.create(
            order=self.order,
            status='PICKED_UP',
            location='Warehouse',
            description='Package picked up',
            updated_by=self.seller
        )

    def test_tracking_creation(self):
        self.assertEqual(self.tracking.status, 'PICKED_UP')
        self.assertEqual(self.tracking.location, 'Warehouse')

    def test_tracking_str(self):
        self.assertIn('PICKED_UP', str(self.tracking))
