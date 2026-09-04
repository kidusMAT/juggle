import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Category, Product, JuggleSession

def seed():
    print("Clearing old mock products that were spawned by previous seeders...")
    Product.objects.filter(is_limited=True).delete() # Or just add over them? Let's just create new ones and keep old ones if they are legit.
    # Actually let's just create new specific GOAT ones
    print("Seeding GOAT-style marketplace items...")

    # Ensure Categories
    c_sneakers, _ = Category.objects.get_or_create(name='Sneakers')
    c_bags, _ = Category.objects.get_or_create(name='Designer Bags')
    c_watches, _ = Category.objects.get_or_create(name='Watches')
    c_streetwear, _ = Category.objects.get_or_create(name='Streetwear')

    # Get a seller user to own the direct listings
    test_seller, _ = User.objects.get_or_create(username='goat_seller', defaults={'email':'seller@goat.com', 'is_juggler': True})
    juggler_1, _ = User.objects.get_or_create(username='power_juggler', defaults={'email': 'p1@jug.com', 'is_juggler': True})
    juggler_2, _ = User.objects.get_or_create(username='hype_beast', defaults={'email': 'hb@jug.com', 'is_juggler': True})

    goat_products = [
        # Sneakers (High Demand)
        {'name': "Air Jordan 1 Retro High OG 'Chicago Lost & Found'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 35000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/078/053/433/original/1029259_00.png.png?action=crop&width=750'},
        {'name': "Yeezy Boost 350 V2 'Zebra'", 'brand': 'Yeezy', 'cat': c_sneakers, 'price': 22000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/008/654/900/original/130198_00.png.png?action=crop&width=750'},
        {'name': "Nike SB Dunk Low 'Travis Scott'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 85000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/033/553/262/original/582697_00.png.png?action=crop&width=750'},
        {'name': "Off-White x Air Jordan 4 Retro 'Sail'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 95000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/039/990/690/original/629230_00.png.png?action=crop&width=750'},
        {'name': "New Balance 990v6 'Grey'", 'brand': 'New Balance', 'cat': c_sneakers, 'price': 15000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/077/893/819/original/994680_00.png.png?action=crop&width=750'},
        {'name': "Nike Air Max 1 '86 Big Bubble", 'brand': 'Nike', 'cat': c_sneakers, 'price': 12000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/085/848/330/original/1155986_00.png.png?action=crop&width=750'},

        # Streetwear
        {'name': "Supreme Box Logo Hoodie 'Heather Grey'", 'brand': 'Supreme', 'cat': c_streetwear, 'price': 28000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/064/813/678/original/sup_bogo_hw21_gry.png?action=crop&width=750'},
        {'name': "Fear of God Essentials Hoodie 'Black'", 'brand': 'Fear of God', 'cat': c_streetwear, 'price': 8000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/080/067/834/original/1077759_00.png.png?action=crop&width=750'},
        {'name': "Travis Scott Cactus Jack x McDonald's Crewneck", 'brand': 'Travis Scott', 'cat': c_streetwear, 'price': 11000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/042/679/119/original/663806_00.png.png?action=crop&width=750'},

        # Watches
        {'name': "Rolex Submariner Date 'Hulk' 116610LV", 'brand': 'Rolex', 'cat': c_watches, 'price': 850000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/072/859/824/original/711200_00.png.png?action=crop&width=750'},
        {'name': "Audemars Piguet Royal Oak 'Blue Dial'", 'brand': 'Audemars Piguet', 'cat': c_watches, 'price': 1200000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/072/861/292/original/711210_00.png.png?action=crop&width=750'},

        # Bags
        {'name': "Hermès Birkin 25 'Togo Black'", 'brand': 'Hermès', 'cat': c_bags, 'price': 950000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/072/862/001/original/711220_00.png.png?action=crop&width=750'},
        {'name': "Telfar Shopping Bag 'Medium Black'", 'brand': 'Telfar', 'cat': c_bags, 'price': 18000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/041/192/433/original/652033_00.png.png?action=crop&width=750'},
    ]

    now = timezone.now()

    # Clear previously seeded goat products to avoid massive duplication
    Product.objects.filter(name__icontains="Rolex").delete()
    Product.objects.filter(name__icontains="Yeezy").delete()
    Product.objects.filter(name__icontains="Air Jordan").delete()
    Product.objects.filter(name__icontains="Supreme").delete()

    for idx, p_data in enumerate(goat_products):
        # 30% chance to be a standard listing, 70% chance to be juggled
        is_juggled = random.random() < 0.7
        markup_base = p_data['price'] * 1.1

        product = Product.objects.create(
            name=p_data['name'],
            brand=p_data['brand'],
            description=f"Authentic {p_data['name']} verified by our experts.",
            base_price=p_data['price'],
            category=p_data['cat'],
            image_url=p_data['img'],
            delivery_type='ABET',
            delivery_fee=250.00,
            allow_juggling=is_juggled,
            is_limited=True,
            stock=random.randint(1, 5),
            seller=test_seller if not is_juggled else None
        )

        if is_juggled:
            juggler = random.choice([juggler_1, juggler_2])
            # Spread expirations from 30 seconds to 5 minutes so we can see "Expiring Soon" vs "Trending"
            expires_in_secs = random.randint(20, 300)
            
            # Make the first two items highly urgent for the UI to showcase "Urgent Deals"
            if idx in [0, 1]:
                expires_in_secs = random.randint(15, 45)

            JuggleSession.objects.create(
                user=juggler,
                product=product,
                markup_price=markup_base + random.randint(500, 2000),
                start_time=now,
                expires_at=now + timedelta(seconds=expires_in_secs),
                is_active=True
            )

    print("GOAT Seeding complete. High priority items created.")

if __name__ == '__main__':
    seed()
