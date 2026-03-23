import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import User, GlobalSettings

def test_pyramid_logic():
    print("--- Testing Pyramid Logic ---")
    try:
        user = User.objects.first()
        if not user:
            print("No users found.")
            return

        pool = GlobalSettings.get_current_pool()
        print(f"Current Pool: {pool}")
        
        info = user.get_pyramid_info()
        print(f"Current Phase: {info['current_phase']}")
        print(f"User Rank: {info['user_rank']}")
        
        cb = user.get_calculated_cb()
        print(f"User RAW CB: {cb}")
        
        print("--- API Logic Success ---")
    except Exception as e:
        print(f"--- FAILED: {str(e)} ---")
        sys.exit(1)

if __name__ == "__main__":
    test_pyramid_logic()
