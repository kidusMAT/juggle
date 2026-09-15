from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Product


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'seller_status', 'is_seller_verified', 'is_staff')
    list_filter = ('seller_status', 'is_seller_verified', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'business_name')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Seller Information', {'fields': ('business_name', 'seller_full_name', 'seller_phone', 'tin_number', 'seller_status', 'is_seller_verified')}),
        ('Verification Documents', {'fields': ('business_license', 'id_proof', 'bank_details_proof', 'address_proof', 'vat_registration', 'import_license')}),
        ('Balances & Pyramid', {'fields': ('actual_balance', 'pending_balance', 'reserved_cb', 'deals_completed')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Seller Info', {'fields': ('email',)}),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'seller', 'base_price', 'status')
    list_filter = ('status', 'category')
    search_fields = ('name', 'seller__username')
