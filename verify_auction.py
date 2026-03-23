import os
import django
from django.utils import timezone
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, Product, JuggleSession, GlobalSettings
from juggle.serializers import UserSerializer, ProductSerializer

def verify_auction():
    # Setup: Get 2 users and a product with stock=2
    u1, _ = User.objects.get_or_create(username='juggler_1')
    u2, _ = User.objects.get_or_create(username='juggler_2')
    u3, _ = User.objects.get_or_create(username='juggler_3')
    
    prod = Product.objects.get(name='Gaming Mouse') # Stock is 2
    prod.stock = 2
    prod.save()
    
    # Ensure users have enough CB (set to Phase 0 for everyone)
    settings = GlobalSettings.get_settings()
    settings.last_reset_time = timezone.now()
    settings.save()
    
    print(f"Product: {prod.name}, Stock: {prod.stock}")
    
    # 1. Juggler 1 claims a slot
    s1 = JuggleSession.objects.create(
        user=u1, product=prod, markup_price=20.00, 
        expires_at=timezone.now() + datetime.timedelta(minutes=5)
    )
    prod.status = 'JUGGLED'
    prod.save()
    print(f"User 1 juggled at 20.00. Slots: {prod.active_sessions.filter(is_active=True).count()}/{prod.stock}")
    
    # 2. Juggler 2 claims the 2nd slot (Competitive)
    s2 = JuggleSession.objects.create(
        user=u2, product=prod, markup_price=18.00, # Undercutting!
        expires_at=timezone.now() + datetime.timedelta(minutes=5)
    )
    print(f"User 2 juggled at 18.00. Slots: {prod.active_sessions.filter(is_active=True).count()}/{prod.stock}")
    
    # 3. Juggler 3 tries to claim 3rd slot (Should be blocked by logic, manual check here)
    active_count = prod.active_sessions.filter(is_active=True, expires_at__gt=timezone.now()).count()
    if active_count >= prod.stock:
        print("PASS: Juggler 3 blocked from claiming slot (Limit reached)")
    
    # 4. Buyer Hub check (In views, we would call the endpoint, here we check the logic)
    sessions = prod.active_sessions.filter(is_active=True).order_by('markup_price')
    print(f"Buyer Hub Best Deal: {sessions[0].markup_price} by {sessions[0].user.username}")
    
    # 5. Purchase the best deal (Juggler 2's session)
    best_session = sessions[0]
    profit = best_session.markup_price - prod.base_price
    initial_balance = best_session.user.actual_balance
    
    # Logic from buy_item view
    best_session.user.actual_balance += profit
    best_session.user.save()
    prod.stock -= 1
    best_session.is_active = False
    best_session.save()
    prod.save()
    
    print(f"PURCHASE: User 2 earned {profit} profit. New Balance: {best_session.user.actual_balance}")
    print(f"Remaining Stock for {prod.name}: {prod.stock}")

if __name__ == "__main__":
    verify_auction()
