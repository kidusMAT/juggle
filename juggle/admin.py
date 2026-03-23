from django.contrib import admin
from .models import User, Product

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'seller_status', 'is_seller_verified')
    list_filter = ('seller_status', 'is_seller_verified')
    search_fields = ('username', 'email', 'business_name')
    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Seller Information', {'fields': ('business_name', 'seller_full_name', 'seller_phone', 'tin_number', 'seller_status', 'is_seller_verified')}),
        ('Verification Documents', {'fields': ('business_license', 'id_proof', 'bank_details_proof', 'address_proof', 'vat_registration', 'import_license')}),
        ('Balances', {'fields': ('actual_balance', 'reserved_cb')}),
    )

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'seller', 'base_price', 'status')
    list_filter = ('status', 'category')
    search_fields = ('name', 'seller__username')
