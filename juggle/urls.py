from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, JuggleViewSet, UserViewSet, CartViewSet, CategoryViewSet, NotificationViewSet, AdminDashboardViewSet, TransactionViewSet, OrderViewSet, ReviewViewSet, ConversationViewSet, MessageViewSet, DeliveryTrackingViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'juggle', JuggleViewSet)
router.register(r'users', UserViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'categories', CategoryViewSet)
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'admin', AdminDashboardViewSet, basename='admin')
router.register(r'transactions', TransactionViewSet, basename='transactions')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'reviews', ReviewViewSet, basename='reviews')
router.register(r'conversations', ConversationViewSet, basename='conversations')
router.register(r'messages', MessageViewSet, basename='messages')
router.register(r'delivery-tracking', DeliveryTrackingViewSet, basename='delivery-tracking')

urlpatterns = [
    path('', include(router.urls)),
]
