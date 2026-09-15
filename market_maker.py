import os
import django
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random
import time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession


def run_market_maker():
    print("Starting Market Maker Bot...")
    juggler_pool = list(User.objects.filter(is_juggler=True))
    if not juggler_pool:
        print("No jugglers found. Exiting.")
        return

    products = list(Product.objects.filter(is_limited=True))
    if not products:
        print("No limited products found. Exiting.")
        return

    print("Market Maker running. Injecting live volatility every 15 seconds...")
    try:
        while True:
            now = timezone.now()
            JuggleSession.objects.filter(expires_at__lt=now - timedelta(minutes=5)).delete()

            drop_count = random.randint(2, 5)
            for _ in range(drop_count):
                product = random.choice(products)
                juggler = random.choice(juggler_pool)
                markup = float(product.base_price) * random.uniform(1.05, 1.4)

                lifespan = random.randint(30, 300)

                JuggleSession.objects.create(
                    user=juggler,
                    product=product,
                    markup_price=Decimal(str(round(markup, 2))),
                    start_time=now,
                    expires_at=now + timedelta(seconds=lifespan),
                    is_active=True
                )
                print(f"[MARKET TILE] Dropped {product.name} (Markup: {round(markup, 2)}, Expiring in {lifespan}s)")

            time.sleep(8)
    except KeyboardInterrupt:
        print("Market Maker stopped.")


if __name__ == '__main__':
    run_market_maker()
