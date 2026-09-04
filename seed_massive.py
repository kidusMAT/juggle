import os
import django
from django.utils import timezone
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Category, Product, JuggleSession

def seed():
    print("Preparing to dump a massive amount of high-end GOAT-style products...")

    c_sneakers, _ = Category.objects.get_or_create(name='Sneakers')
    c_bags, _ = Category.objects.get_or_create(name='Designer Bags')
    c_watches, _ = Category.objects.get_or_create(name='Watches')
    c_streetwear, _ = Category.objects.get_or_create(name='Streetwear')
    c_art, _ = Category.objects.get_or_create(name='Collectibles & Art')

    test_seller, _ = User.objects.get_or_create(username='volume_seller', defaults={'email':'mass_seller@goat.com', 'is_juggler': True})
    juggler_pool = []
    for i in range(1, 6):
        user, _ = User.objects.get_or_create(username=f'pro_juggler_{i}', defaults={'email': f'pj{i}@jug.com', 'is_juggler': True})
        juggler_pool.append(user)

    # A massive array of products covering multiple categories
    massive_products = [
        # --- SNEAKERS ---
        {'name': "Air Jordan 4 Retro 'Military Black'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 18000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/072/862/001/original/711220_00.png.png?action=crop&width=750'},
        {'name': "Air Jordan 1 Retro High 'Travis Scott Mocha'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 150000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/020/860/190/original/507810_00.png.png?action=crop&width=750'},
        {'name': "Yeezy Boost 700 'Wave Runner'", 'brand': 'Yeezy', 'cat': c_sneakers, 'price': 35000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/009/246/871/original/251390_00.png.png?action=crop&width=750'},
        {'name': "Nike Dunk Low 'Panda'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 15000, 'img': 'https://image.goat.com/transform/v1/attachments/product_template_pictures/images/051/147/439/original/738053_00.png.png?action=crop&width=750'},
        {'name': "Louis Vuitton Trainer 'Monogram White'", 'brand': 'Louis Vuitton', 'cat': c_sneakers, 'price': 120000, 'img': ''},
        {'name': "Balenciaga Triple S 'Clear Sole'", 'brand': 'Balenciaga', 'cat': c_sneakers, 'price': 90000, 'img': ''},
        {'name': "Off-White x Air Force 1 'Brooklyn'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 140000, 'img': ''},
        {'name': "Asics Gel-Kayano 14 'JJJJound'", 'brand': 'Asics', 'cat': c_sneakers, 'price': 45000, 'img': ''},
        {'name': "Air Jordan 11 Retro 'Cool Grey'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 35000, 'img': ''},
        {'name': "Adidas Samba OG 'Cloud White'", 'brand': 'Adidas', 'cat': c_sneakers, 'price': 12000, 'img': ''},
        {'name': "Air Jordan 3 Retro 'White Cement Reimagined'", 'brand': 'Jordan', 'cat': c_sneakers, 'price': 38000, 'img': ''},
        {'name': "Travis Scott x SB Dunk 'JackBoys'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 160000, 'img': ''},
        {'name': "Yeezy Slide 'Onyx'", 'brand': 'Yeezy', 'cat': c_sneakers, 'price': 8000, 'img': ''},
        {'name': "Nike Air Max 95 'Neon'", 'brand': 'Nike', 'cat': c_sneakers, 'price': 22000, 'img': ''},
        {'name': "New Balance 2002R 'Protection Pack Rain Cloud'", 'brand': 'New Balance', 'cat': c_sneakers, 'price': 25000, 'img': ''},

        # --- STREETWEAR ---
        {'name': "Supreme x The North Face Nuptse Jacket", 'brand': 'Supreme', 'cat': c_streetwear, 'price': 85000, 'img': ''},
        {'name': "Kaws x Uniqlo 'Tokyo First' Tee", 'brand': 'Kaws', 'cat': c_streetwear, 'price': 3000, 'img': ''},
        {'name': "Stussy 8-Ball Fleece Reversible Jacket", 'brand': 'Stussy', 'cat': c_streetwear, 'price': 28000, 'img': ''},
        {'name': "Fear of God Essentials Knit Hoodie", 'brand': 'Fear of God', 'cat': c_streetwear, 'price': 15000, 'img': ''},
        {'name': "Off-White Industrial Belt", 'brand': 'Off-White', 'cat': c_streetwear, 'price': 22000, 'img': ''},
        {'name': "Palace Tri-Ferg Tee Black", 'brand': 'Palace', 'cat': c_streetwear, 'price': 8000, 'img': ''},
        {'name': "Travis Scott Astroworld Tour Hoodie", 'brand': 'Travis Scott', 'cat': c_streetwear, 'price': 18000, 'img': ''},
        {'name': "BAPE Shark Full Zip Hoodie", 'brand': 'BAPE', 'cat': c_streetwear, 'price': 40000, 'img': ''},
        {'name': "Corteiz RTW Windbreaker", 'brand': 'Corteiz', 'cat': c_streetwear, 'price': 25000, 'img': ''},
        {'name': "Hidden NY Paisley Socks", 'brand': 'Hidden NY', 'cat': c_streetwear, 'price': 2500, 'img': ''},

        # --- WATCHES ---
        {'name': "Patek Philippe Nautilus 5711/1A", 'brand': 'Patek Philippe', 'cat': c_watches, 'price': 8000000, 'img': ''},
        {'name': "Rolex Daytona 'Panda' 116500LN", 'brand': 'Rolex', 'cat': c_watches, 'price': 3200000, 'img': ''},
        {'name': "Audemars Piguet Royal Oak Chronograph", 'brand': 'Audemars Piguet', 'cat': c_watches, 'price': 4500000, 'img': ''},
        {'name': "Rolex GMT-Master II 'Pepsi'", 'brand': 'Rolex', 'cat': c_watches, 'price': 2100000, 'img': ''},
        {'name': "Omega Speedmaster Moonwatch", 'brand': 'Omega', 'cat': c_watches, 'price': 550000, 'img': ''},
        {'name': "Cartier Santos De Cartier Large", 'brand': 'Cartier', 'cat': c_watches, 'price': 650000, 'img': ''},
        {'name': "Casio G-Shock 'CasiOak' Black", 'brand': 'G-Shock', 'cat': c_watches, 'price': 12000, 'img': ''},

        # --- DESIGNER BAGS ---
        {'name': "Chanel Classic Flap Bag Medium", 'brand': 'Chanel', 'cat': c_bags, 'price': 800000, 'img': ''},
        {'name': "Hermès Kelly 25 Epsom", 'brand': 'Hermès', 'cat': c_bags, 'price': 1200000, 'img': ''},
        {'name': "Goyard Saint Louis Tote PM", 'brand': 'Goyard', 'cat': c_bags, 'price': 180000, 'img': ''},
        {'name': "Dior Saddle Bag Oblique", 'brand': 'Dior', 'cat': c_bags, 'price': 250000, 'img': ''},
        {'name': "Prada Re-Edition 2005 Nylon Bag", 'brand': 'Prada', 'cat': c_bags, 'price': 150000, 'img': ''},
        {'name': "Bottega Veneta Cassette Bag", 'brand': 'Bottega Veneta', 'cat': c_bags, 'price': 220000, 'img': ''},

        # --- ART & COLLECTIBLES ---
        {'name': "Kaws Companion Flayed Brown (Open Edition)", 'brand': 'Kaws', 'cat': c_art, 'price': 120000, 'img': ''},
        {'name': "Bearbrick 1000% 'Van Gogh Museum'", 'brand': 'Medicom Toy', 'cat': c_art, 'price': 85000, 'img': ''},
        {'name': "Takashi Murakami 'Flower Ball' Print", 'brand': 'Murakami', 'cat': c_art, 'price': 350000, 'img': ''},
        {'name': "Daniel Arsham 'Eroded Porsche 911'", 'brand': 'Daniel Arsham', 'cat': c_art, 'price': 180000, 'img': ''},
        {'name': "Supreme Pinball Machine (Stern)", 'brand': 'Supreme', 'cat': c_art, 'price': 2500000, 'img': ''},
        {'name': "First Edition Charizard PSA 10", 'brand': 'Pokemon', 'cat': c_art, 'price': 5000000, 'img': ''},
    ]

    now = timezone.now()

    count1, count2 = 0, 0

    for idx, p_data in enumerate(massive_products):
        # 40% Standard Items, 60% Live Juggles
        is_juggled = random.random() < 0.6
        markup_base = p_data['price'] * random.uniform(1.05, 1.3) # Give varying markups

        product = Product.objects.create(
            name=p_data['name'],
            brand=p_data['brand'],
            description=f"100% Authentic {p_data['brand']}. Fully verified.",
            base_price=p_data['price'],
            category=p_data['cat'],
            image_url=p_data['img'],
            delivery_type=random.choice(['ABET', 'SELLER']),
            delivery_fee=random.choice([150.00, 250.00, 0.00]),
            allow_juggling=is_juggled,
            is_limited=True,
            stock=random.randint(1, 10),
            seller=test_seller if not is_juggled else None
        )

        if is_juggled:
            count1 += 1
            juggler = random.choice(juggler_pool)
            
            # Massive variance in times: Some under 1m (Urgent), some up to 30m (Trending)
            expires_in_secs = random.randint(30, 1800)
            
            # Force at least 5 highly urgent ones
            if count1 <= 5:
                 expires_in_secs = random.randint(15, 59)

            JuggleSession.objects.create(
                user=juggler,
                product=product,
                markup_price=int(markup_base),
                start_time=now,
                expires_at=now + timedelta(seconds=expires_in_secs),
                is_active=True
            )
        else:
            count2 += 1

    print(f"Total Juggled Inserted: {count1}")
    print(f"Total Direct Items Inserted: {count2}")
    print("Massive Expansion Complete!")

if __name__ == '__main__':
    seed()
