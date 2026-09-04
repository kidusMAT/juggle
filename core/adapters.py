from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model

class AutoConnectSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        # If the user is already connected to this social account, do nothing
        if sociallogin.is_existing:
            return

        # If there is no email configured with this provider, do nothing
        if not sociallogin.user.email:
            return

        User = get_user_model()
        
        # Look for an existing user with the same email
        existing_user = User.objects.filter(email=sociallogin.user.email).first()
        if existing_user:
            # Connect the new social account to the existing local user
            sociallogin.connect(request, existing_user)

from allauth.account.adapter import DefaultAccountAdapter

class MyAccountAdapter(DefaultAccountAdapter):
    def is_safe_url(self, url):
        if url and url.startswith('http://localhost:5173'):
            return True
        return super().is_safe_url(url)
