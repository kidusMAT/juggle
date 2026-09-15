from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.contrib.auth import get_user_model
from django.contrib import messages


class AutoConnectSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        if sociallogin.is_existing:
            return

        if not sociallogin.user.email:
            return

        User = get_user_model()

        existing_user = User.objects.filter(email=sociallogin.user.email).first()
        if existing_user and existing_user != request.user:
            messages.warning(
                request,
                "A social account cannot be linked to another user's account. "
                "Please log in first if you want to connect."
            )
            return

        if existing_user and existing_user == request.user:
            sociallogin.connect(request, existing_user)


from allauth.account.adapter import DefaultAccountAdapter


class MyAccountAdapter(DefaultAccountAdapter):
    def is_safe_url(self, url):
        if not url:
            return False
        from urllib.parse import urlparse
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https', ''):
            return False
        if parsed.netloc and parsed.netloc not in ('localhost:5173', 'localhost', '127.0.0.1:5173', '127.0.0.1'):
            return False
        if '..' in parsed.path:
            return False
        return True
