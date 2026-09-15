import os
import django
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Category, Product, JuggleSession, Pyramid, BALANCE_CAP

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
    test_seller, _ = User.objects.get_or_create(username='goat_seller', defaults={'email':'seller@goat.com', 'is_juggler': True, 'actual_balance': Decimal('100.00')})
    juggler_1, _ = User.objects.get_or_create(username='power_juggler', defaults={'email': 'p1@jug.com', 'is_juggler': True, 'actual_balance': Decimal('500.00')})
    juggler_2, _ = User.objects.get_or_create(username='hype_beast', defaults={'email': 'hb@jug.com', 'is_juggler': True, 'actual_balance': Decimal('500.00')})

    for u in [test_seller, juggler_1, juggler_2]:
        if u.actual_balance < Decimal('10.00'):
            u.actual_balance = Decimal('100.00')
            u.save(update_fields=['actual_balance'])
        if u.actual_balance > BALANCE_CAP:
            overflow = u.actual_balance - BALANCE_CAP
            u.actual_balance = BALANCE_CAP
            u.pending_balance += overflow
            u.save(update_fields=['actual_balance', 'pending_balance'])
            Pyramid.objects.create(owner=u, overflow_amount=overflow)

    goat_products = [
        # Sneakers (High Demand)
        {'name': "Air Jordan 1 Retro High OG 'Chicago Lost & Found'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 35000, 'img': 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=750'},
        {'name': "Yeezy Boost 350 V2 'Zebra'", 'brand': 'Yeezy', 'cat': c_sneakers, 'price': 22000, 'img': 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=750'},
        {'name': "Nike SB Dunk Low 'Travis Scott'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 85000, 'img': 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=750'},
        {'name': "Off-White x Air Jordan 4 Retro 'Sail'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 95000, 'img': 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=750'},
        {'name': "New Balance 990v6 'Grey'", 'brand': 'New Balance', 'cat': c_sneakers, 'price': 15000, 'img': 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=750'},
        {'name': "Nike Air Max 1 '86 Big Bubble", 'brand': 'Nike', 'cat': c_sneakers, 'price': 12000, 'img': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=750'},
        {'name': "Air Jordan 4 Retro 'Military Black'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 18000, 'img': 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=750'},
        {'name': "Air Jordan 1 Retro High 'Travis Scott Mocha'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 150000, 'img': 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=750'},
        {'name': "Yeezy Boost 700 'Wave Runner'", 'brand': 'Yeezy', 'cat': c_sneakers, 'price': 35000, 'img': 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=750'},
        {'name': "Nike Dunk Low 'Panda'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 15000, 'img': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=750'},
        {'name': "Louis Vuitton Trainer 'Monogram White'", 'brand': 'Louis Vuitton', 'cat': c_sneakers, 'price': 120000, 'img': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=750'},
        {'name': "Balenciaga Triple S 'Clear Sole'", 'brand': 'Balenciaga', 'cat': c_sneakers, 'price': 90000, 'img': 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=750'},
        {'name': "Off-White x Air Force 1 'Brooklyn'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 140000, 'img': 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=750'},
        {'name': "Asics Gel-Kayano 14 'JJJJound'", 'brand': 'Asics', 'cat': c_sneakers, 'price': 45000, 'img': 'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=750'},
        {'name': "Air Jordan 11 Retro 'Cool Grey'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 35000, 'img': 'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=750'},
        {'name': "Adidas Samba OG 'Cloud White'", 'brand': 'Adidas', 'cat': c_sneakers, 'price': 12000, 'img': 'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=750'},
        {'name': "Air Jordan 3 Retro 'White Cement Reimagined'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 38000, 'img': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=750'},
        {'name': "Travis Scott x SB Dunk 'JackBoys'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 160000, 'img': 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=750'},
        {'name': "Yeezy Slide 'Onyx'", 'brand': 'Yeezy', 'cat': c_sneakers, 'price': 8000, 'img': 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=750'},
        {'name': "Nike Air Max 95 'Neon'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 22000, 'img': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=750'},
        {'name': "New Balance 2002R 'Protection Pack Rain Cloud'", 'brand': 'New Balance', 'cat': c_sneakers, 'price': 25000, 'img': 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=750'},

        # Streetwear
        {'name': "Supreme Box Logo Hoodie 'Heather Grey'", 'brand': 'Supreme', 'cat': c_streetwear, 'price': 28000, 'img': 'https://images.unsplash.com/photo-1556821840-3a63f7560066?w=750'},
        {'name': "Fear of God Essentials Hoodie 'Black'", 'brand': 'Fear of God', 'cat': c_streetwear, 'price': 8000, 'img': 'https://images.unsplash.com/photo-1556821840-3a63f7560066?w=750'},
        {'name': "Travis Scott Cactus Jack x McDonald's Crewneck", 'brand': 'Travis Scott', 'cat': c_streetwear, 'price': 11000, 'img': 'https://images.unsplash.com/photo-1578768079470-4e6e8b8e2b1d?w=750'},
        {'name': "Supreme x The North Face Nuptse Jacket", 'brand': 'Supreme', 'cat': c_streetwear, 'price': 85000, 'img': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=750'},
        {'name': "Kaws x Uniqlo 'Tokyo First' Tee", 'brand': 'Kaws', 'cat': c_streetwear, 'price': 3000, 'img': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=750'},
        {'name': "Stussy 8-Ball Fleece Reversible Jacket", 'brand': 'Stussy', 'cat': c_streetwear, 'price': 28000, 'img': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=750'},
        {'name': "Fear of God Essentials Knit Hoodie", 'brand': 'Fear of God', 'cat': c_streetwear, 'price': 15000, 'img': 'https://images.unsplash.com/photo-1556821840-3a63f7560066?w=750'},
        {'name': "Off-White Industrial Belt", 'brand': 'Off-White', 'cat': c_streetwear, 'price': 22000, 'img': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=750'},
        {'name': "Palace Tri-Ferg Tee Black", 'brand': 'Palace', 'cat': c_streetwear, 'price': 8000, 'img': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=750'},
        {'name': "Travis Scott Astroworld Tour Hoodie", 'brand': 'Travis Scott', 'cat': c_streetwear, 'price': 18000, 'img': 'https://images.unsplash.com/photo-1578768079470-4e6e8b8e2b1d?w=750'},
        {'name': "BAPE Shark Full Zip Hoodie", 'brand': 'BAPE', 'cat': c_streetwear, 'price': 40000, 'img': 'https://images.unsplash.com/photo-1556821840-3a63f7560066?w=750'},
        {'name': "Corteiz RTW Windbreaker", 'brand': 'Corteiz', 'cat': c_streetwear, 'price': 25000, 'img': 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=750'},
        {'name': "Hidden NY Paisley Socks", 'brand': 'Hidden NY', 'cat': c_streetwear, 'price': 2500, 'img': 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c87?w=750'},

        # Watches
        {'name': "Rolex Submariner Date 'Hulk' 116610LV", 'brand': 'Rolex', 'cat': c_watches, 'price': 850000, 'img': 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=750'},
        {'name': "Audemars Piguet Royal Oak 'Blue Dial'", 'brand': 'Audemars Piguet', 'cat': c_watches, 'price': 1200000, 'img': 'https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=750'},
        {'name': "Patek Philippe Nautilus 5711/1A", 'brand': 'Patek Philippe', 'cat': c_watches, 'price': 8000000, 'img': 'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=750'},
        {'name': "Rolex Daytona 'Panda' 116500LN", 'brand': 'Rolex', 'cat': c_watches, 'price': 3200000, 'img': 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=750'},
        {'name': "Audemars Piguet Royal Oak Chronograph", 'brand': 'Audemars Piguet', 'cat': c_watches, 'price': 4500000, 'img': 'https://images.unsplash.com/photo-1585123334904-845d60e97b29?w=750'},
        {'name': "Rolex GMT-Master II 'Pepsi'", 'brand': 'Rolex', 'cat': c_watches, 'price': 2100000, 'img': 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=750'},
        {'name': "Omega Speedmaster Moonwatch", 'brand': 'Omega', 'cat': c_watches, 'price': 550000, 'img': 'https://images.unsplash.com/photo-1614164185125-e5c3e4e3a5e5?w=750'},
        {'name': "Cartier Santos De Cartier Large", 'brand': 'Cartier', 'cat': c_watches, 'price': 650000, 'img': 'https://images.unsplash.com/photo-1599946347371-68eb76b1d4af?w=750'},
        {'name': "Casio G-Shock 'CasiOak' Black", 'brand': 'G-Shock', 'cat': c_watches, 'price': 12000, 'img': 'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=750'},

        # Bags
        {'name': "Hermès Birkin 25 'Togo Black'", 'brand': 'Hermès', 'cat': c_bags, 'price': 950000, 'img': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=750'},
        {'name': "Telfar Shopping Bag 'Medium Black'", 'brand': 'Telfar', 'cat': c_bags, 'price': 18000, 'img': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=750'},
        {'name': "Chanel Classic Flap Bag Medium", 'brand': 'Chanel', 'cat': c_bags, 'price': 800000, 'img': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=750'},
        {'name': "Hermès Kelly 25 Epsom", 'brand': 'Hermès', 'cat': c_bags, 'price': 1200000, 'img': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=750'},
        {'name': "Goyard Saint Louis Tote PM", 'brand': 'Goyard', 'cat': c_bags, 'price': 180000, 'img': 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=750'},
        {'name': "Dior Saddle Bag Oblique", 'brand': 'Dior', 'cat': c_bags, 'price': 250000, 'img': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=750'},
        {'name': "Prada Re-Edition 2005 Nylon Bag", 'brand': 'Prada', 'cat': c_bags, 'price': 150000, 'img': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=750'},
        {'name': "Bottega Veneta Cassette Bag", 'brand': 'Bottega Veneta', 'cat': c_bags, 'price': 220000, 'img': 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=750'},
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
