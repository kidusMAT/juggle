import os
import django
from django.utils import timezone
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, GlobalSettings
from juggle.serializers import UserSerializer

def test_rotation():
    settings = GlobalSettings.get_settings()
    settings.last_reset_time = timezone.now()
    settings.save()
    
    users = User.objects.all()[:5]
    if not users: return

    print("=== Phase Sequence Simulation (User 1) ===")
    for phase in range(8):
        # Calculate time at start of this phase
        elapsed = phase * 300 + 1
        
        # We simulate the calculation logic directly for the trace
        session_id = 0
        current_phase = phase
        BOX_SIZE = 1000
        
        for user in users:
            user_rank = (user.id + session_id) % BOX_SIZE
            val = 0.0
            TIERS = [(1000, 10), (100, 100), (40, 500), (20, 1000), (10, 2500), (5, 5000), (2, 7500), (1, 10000)]
            limit, tier_val = TIERS[current_phase]
            if user_rank < limit: val = tier_val
            
            if user.id == 1: # Trace User 1
                 print(f"Phase {current_phase} (min {phase*5}): {val} ETB (Rank {user_rank})")

    print("\n=== Session Rotation (Peak Winners) ===")
    for session in range(5):
        # At Phase 7, only user_rank < 1 wins
        session_id = session
        winner_id = (0 - session_id) % BOX_SIZE
        print(f"Session {session}: Peak winner will be user with ID {winner_id}")

if __name__ == "__main__":
    test_rotation()
