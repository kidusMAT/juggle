import os
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import Product, User, GlobalSettings, Pyramid, BALANCE_CAP, PYRAMID_CAPACITY
from django.utils import timezone
from django.contrib.auth.hashers import make_password


def seed():
    hashed_pwd = make_password('password123')
    existing_usernames = set(User.objects.values_list('username', flat=True))
    users_to_create = [
        User(username=f'juggler_{i}', password=hashed_pwd, actual_balance=Decimal('10.00'))
        for i in range(1, 1001) if f'juggler_{i}' not in existing_usernames
    ]
    if users_to_create:
        User.objects.bulk_create(users_to_create)
    print(f"1000 users seeded")

    admin_user, _ = User.objects.get_or_create(
        username='admin',
        defaults={
            'password': hashed_pwd,
            'is_staff': True,
            'is_superuser': True,
            'actual_balance': BALANCE_CAP,
        }
    )
    if not admin_user.check_password('password123'):
        admin_user.set_password('password123')
        admin_user.save()
    print("Admin user ensured")

    capped_user, created = User.objects.get_or_create(
        username='capped_user',
        defaults={
            'password': hashed_pwd,
            'actual_balance': BALANCE_CAP,
            'pending_balance': Decimal('5000.00'),
        }
    )
    if created:
        pyramid = Pyramid.objects.create(
            owner=capped_user,
            overflow_amount=Decimal('5000.00'),
            status='ACTIVE',
        )
        participants = list(User.objects.exclude(id=capped_user.id).order_by('?')[:500])
        pyramid.participants.set(participants)
        print(f"Capped user created with pending 5000 ETB, pyramid has {pyramid.participants.count()} participants")
    else:
        print("Capped user already exists")

    products = [
        {"name": "iPhone 15 Pro", "brand": "Apple", "description": "Titanium build, A17 Pro chip.", "base_price": Decimal('4000.00'), "stock": 8},
        {"name": "Galaxy S24 Ultra", "brand": "Samsung", "description": "AI-powered, 200MP camera.", "base_price": Decimal('3800.00'), "stock": 10},
        {"name": "Air Max Pulse", "brand": "Nike", "description": "Next-gen Air cushioning.", "base_price": Decimal('800.00'), "stock": 25},
        {"name": "WH-1000XM5", "brand": "Sony", "description": "Leading noise cancellation.", "base_price": Decimal('1200.00'), "stock": 12},
        {"name": "MacBook Air M3", "brand": "Apple", "description": "Amazingly thin and fast.", "base_price": Decimal('6000.00'), "stock": 6},
        {"name": "Tesla Model 3 Toy", "brand": "Tesla", "description": "Electric dream in pocket size.", "base_price": Decimal('150.00'), "stock": 50},
        {"name": "Retro Camera", "brand": "Fujifilm", "description": "Classic aesthetic, modern tech.", "base_price": Decimal('950.00'), "stock": 15},
        {"name": "Speedster Pro", "brand": "Specialized", "description": "Carbon fiber racing bike.", "base_price": Decimal('2500.00'), "stock": 5},
        {"name": "Smart Watch Ultra", "brand": "Apple", "description": "Rugged and capable.", "base_price": Decimal('3200.00'), "stock": 12},
        {"name": "Gaming Console X", "brand": "Microsoft", "description": "The most powerful console.", "base_price": Decimal('2200.00'), "stock": 15},
        {"name": "iPad Pro 12.9 M2", "brand": "Apple", "description": "Liquid Retina XDR display.", "base_price": Decimal('5500.00'), "stock": 8},
        {"name": "Galaxy Z Fold 5", "brand": "Samsung", "description": "Foldable smartphone, 7.6 inch.", "base_price": Decimal('7000.00'), "stock": 4},
        {"name": "PS5 Slim Digital", "brand": "Sony", "description": "Slimmer, lighter PS5.", "base_price": Decimal('1800.00'), "stock": 20},
        {"name": "Nintendo Switch OLED", "brand": "Nintendo", "description": "Vibrant OLED screen.", "base_price": Decimal('1500.00'), "stock": 18},
        {"name": "AirPods Pro 2", "brand": "Apple", "description": "Adaptive audio, USB-C.", "base_price": Decimal('900.00'), "stock": 30},
        {"name": "Bose QuietComfort Ultra", "brand": "Bose", "description": "Immersive spatial audio.", "base_price": Decimal('1400.00'), "stock": 10},
        {"name": "DJI Mini 4 Pro", "brand": "DJI", "description": "4K HDR drone, 34 min flight.", "base_price": Decimal('3500.00'), "stock": 6},
        {"name": "Kindle Scribe", "brand": "Amazon", "description": "10.2 inch, stylus included.", "base_price": Decimal('1600.00'), "stock": 14},
        {"name": "LG C3 55 OLED", "brand": "LG", "description": "4K OLED, Dolby Vision.", "base_price": Decimal('8000.00'), "stock": 3},
        {"name": "Sonos Era 300", "brand": "Sonos", "description": "Spatial audio speaker.", "base_price": Decimal('2000.00'), "stock": 8},
        {"name": "Dyson V15 Detect", "brand": "Dyson", "description": "Laser-guided cordless vacuum.", "base_price": Decimal('2800.00'), "stock": 7},
        {"name": "GoPro Hero 12", "brand": "GoPro", "description": "5.3K video, HyperSmooth 6.", "base_price": Decimal('1300.00'), "stock": 16},
        {"name": "Garmin Fenix 7X", "brand": "Garmin", "description": "Solar-powered GPS watch.", "base_price": Decimal('3000.00'), "stock": 9},
        {"name": "Le Creuset Dutch Oven", "brand": "Le Creuset", "description": "Enameled cast iron, 5.5 qt.", "base_price": Decimal('1100.00'), "stock": 12},
        {"name": "Ray-Ban Meta Glasses", "brand": "Ray-Ban", "description": "Smart glasses with AI.", "base_price": Decimal('1800.00'), "stock": 10},
        {"name": "NVIDIA RTX 4070", "brand": "NVIDIA", "description": "12GB GDDR6X graphics card.", "base_price": Decimal('2500.00'), "stock": 5},
        {"name": "Razer Blade 16", "brand": "Razer", "description": "RTX 4090, Mini LED display.", "base_price": Decimal('12000.00'), "stock": 2},
        {"name": "Samsung 990 Pro 2TB", "brand": "Samsung", "description": "NVMe SSD, 7450 MB/s.", "base_price": Decimal('900.00'), "stock": 25},
        {"name": "Logitech MX Master 3S", "brand": "Logitech", "description": "Wireless ergonomic mouse.", "base_price": Decimal('400.00'), "stock": 35},
        {"name": "Anker 737 Power Bank", "brand": "Anker", "description": "24000mAh, 140W output.", "base_price": Decimal('600.00'), "stock": 20},
        {"name": "JBL Charge 5", "brand": "JBL", "description": "Waterproof Bluetooth speaker.", "base_price": Decimal('500.00'), "stock": 22},
        {"name": "Fitbit Charge 6", "brand": "Fitbit", "description": "Advanced fitness tracker.", "base_price": Decimal('700.00'), "stock": 18},
        {"name": "Instant Pot Duo Plus", "brand": "Instant Pot", "description": "9-in-1 pressure cooker.", "base_price": Decimal('450.00'), "stock": 20},
        {"name": "iRobot Roomba j7+", "brand": "iRobot", "description": "Self-emptying robot vacuum.", "base_price": Decimal('3500.00'), "stock": 4},
        {"name": "Osprey Atmos 65", "brand": "Osprey", "description": "Premium hiking backpack.", "base_price": Decimal('800.00'), "stock": 10},
        {"name": "Hydro Flask 32oz", "brand": "Hydro Flask", "description": "Insulated stainless steel.", "base_price": Decimal('150.00'), "stock": 40},
        {"name": "Breville Barista Express", "brand": "Breville", "description": "Espresso machine with grinder.", "base_price": Decimal('2200.00'), "stock": 6},
        {"name": "Weber Spirit II E-310", "brand": "Weber", "description": "3-burner gas grill.", "base_price": Decimal('4000.00'), "stock": 3},
        {"name": "Patagonia Nano Puff", "brand": "Patagonia", "description": "Recycled insulation jacket.", "base_price": Decimal('600.00'), "stock": 15},
        {"name": "The North Face Nuptse", "brand": "The North Face", "description": "700-fill down jacket.", "base_price": Decimal('900.00'), "stock": 12},
    ]

    for p in products:
        Product.objects.update_or_create(
            name=p['name'],
            defaults={
                'brand': p['brand'],
                'description': p['description'],
                'base_price': p['base_price'],
                'stock': p.get('stock', 1)
            }
        )
    print("Products seeded with brands")

    settings = GlobalSettings.get_settings()
    settings.last_reset_time = timezone.now()
    settings.save()
    print("Global settings reset")


if __name__ == "__main__":
    seed()
