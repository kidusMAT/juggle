from decimal import Decimal
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from juggle.models import Category, JuggleSession, Product, User


class Command(BaseCommand):
    help = "Seed a large buyer-market dataset with alternating direct supply and active juggles."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=3000)
        parser.add_argument("--reset", action="store_true", help="Remove this command's previous seed before recreating it.")

    def handle(self, *args, **options):
        count = max(1, options["count"])
        marker = "[market-scale]"
        categories = [
            "Sneakers", "Streetwear", "Bags", "Watches", "Beauty", "Home", "Electronics", "Accessories"
        ]
        brands = [
            "Nile Studio", "Addis Works", "Common Ground", "North Block", "Meridian Supply",
            "Aster Goods", "Blue Nile", "Rift Valley", "Kora House", "Eastline"
        ]
        product_types = [
            "Runner", "Utility Tote", "Field Watch", "Logo Crew", "Everyday Set",
            "Travel Pack", "Studio Lamp", "Court Low", "Cargo Pant", "Trail Shell"
        ]

        with transaction.atomic():
            if options["reset"]:
                Product.objects.filter(description__startswith=marker).delete()

            category_map = {
                name: Category.objects.get_or_create(name=name)[0] for name in categories
            }
            sellers = []
            for index in range(1, 9):
                seller, _ = User.objects.get_or_create(
                    username=f"market_scale_seller_{index}",
                    defaults={"email": f"market-scale-{index}@example.test", "is_juggler": True},
                )
                sellers.append(seller)

            existing = Product.objects.filter(description__startswith=marker).count()
            to_create = max(0, count - existing)
            products = []
            for index in range(existing + 1, existing + to_create + 1):
                is_juggled = index % 4 != 0  # 75% live juggles, 25% direct supply.
                price = Decimal(900 + ((index * 137) % 24000))
                category_name = categories[(index - 1) % len(categories)]
                brand = brands[(index - 1) % len(brands)]
                product_type = product_types[(index - 1) % len(product_types)]
                products.append(Product(
                    name=f"{brand} {product_type} {index:04d}",
                    brand=brand,
                    description=f"{marker} Deployment-scale listing {index}. A realistic marketplace record for load and pagination testing.",
                    base_price=price,
                    category=category_map[category_name],
                    attributes={"size": ["S", "M", "L"], "color": ["black", "stone", "green"][index % 3]},
                    delivery_type="ABET" if index % 3 else "SELLER",
                    delivery_fee=Decimal(150 if index % 3 else 0),
                    status="JUGGLED" if is_juggled else "AVAILABLE",
                    allow_juggling=is_juggled,
                    is_limited=index % 9 == 0,
                    stock=4 + (index % 18),
                    seller=None if is_juggled else sellers[index % len(sellers)],
                ))
            Product.objects.bulk_create(products, batch_size=500)

            juggled_products = Product.objects.filter(description__startswith=marker, status="JUGGLED").order_by("id")
            now = timezone.now()
            active_product_ids = set(JuggleSession.objects.filter(
                product__in=juggled_products, is_active=True, expires_at__gt=now
            ).values_list("product_id", flat=True))
            sessions = []
            for index, product in enumerate(juggled_products):
                if product.id in active_product_ids:
                    continue
                juggler = sellers[index % len(sellers)]
                sessions.append(JuggleSession(
                    user=juggler,
                    product=product,
                    markup_price=(product.base_price * Decimal("1.12")).quantize(Decimal("0.01")),
                    start_time=now,
                    expires_at=now + timedelta(days=30),
                    is_active=True,
                ))
            JuggleSession.objects.bulk_create(sessions, batch_size=500)

        total = Product.objects.filter(description__startswith=marker).count()
        direct = Product.objects.filter(description__startswith=marker, status="AVAILABLE").count()
        juggled = Product.objects.filter(description__startswith=marker, status="JUGGLED").count()
        self.stdout.write(self.style.SUCCESS(
            f"Seeded {total:,} market products: {direct:,} direct and {juggled:,} juggled."
        ))
