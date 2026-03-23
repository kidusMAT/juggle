from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, JuggleViewSet, UserViewSet, CartViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'juggle', JuggleViewSet)
router.register(r'users', UserViewSet)
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'categories', CategoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
