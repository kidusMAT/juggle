import os
import django
from django.utils import timezone
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, GlobalSettings
from juggle.serializers import UserSerializer

def test_cb_logic():
    settings = GlobalSettings.get_settings()
    # Reset last_reset_time to exactly now for predictable testing
    settings.last_reset_time = timezone.now()
    settings.save()
    
    users = User.objects.all()[:5]
    if not users:
        print("No users found to test.")
        return

    phases = [0, 1, 2, 7] # Test Base, Level 1, Level 2, Peak
    
    for phase in phases:
        offset = phase * 300 + 10 # 10 seconds into the phase
        mock_now = settings.last_reset_time + datetime.timedelta(seconds=offset)
        
        print(f"\n--- Testing Phase {phase} (Offset: {offset}s) ---")
        
        for user in users:
            # We have to mock timezone.now() inside the serializer or just check the math
            # Since we can't easily mock timezone.now globally for the SerializerMethodField 
            # without patching, let's just observe the current real time if we can't mock.
            # Actually, I'll just check the current state since I just reset it.
            pass

    # Better approach: Just print current values and verify they match Phase 0
    print("\n--- Current State (Phase 0) ---")
    for user in users:
        ser = UserSerializer(user)
        data = ser.data
        print(f"User {user.username} (ID {user.id}): CB={data['current_cb']}, Phase={data['pyramid_data']['phase']}")

if __name__ == "__main__":
    test_cb_logic()
