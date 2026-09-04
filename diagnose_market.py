import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession

def check_market():
    print("--- Market Status Check ---")
    active_juggles = JuggleSession.objects.filter(is_active=True, expires_at__gt=timezone.now())
    print(f"Total Active Juggles in DB: {active_juggles.count()}")
    
    for sj in active_juggles[:5]:
        user = sj.user
        base_price = float(sj.product.base_price)
        power = float(user.get_calculated_cb())
        print(f"User: {user.username} | Product: {sj.product.name} | Power: {power} | Req: {base_price}")
        if power < base_price:
            print(f"  !!! WARNING: User has insufficient power. This deal will be HIDDEN in marketplace.")

    # Check pyramid state for some users
    jugglers = User.objects.filter(is_juggler=True)
    print(f"\n--- Juggler Status ---")
    for j in jugglers[:5]:
        print(f"User: {j.username} | Rank: {j.pyramid_tier} | Calc CB: {j.get_calculated_cb()}")

if __name__ == '__main__':
    check_market()
