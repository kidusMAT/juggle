import hashlib
import hmac
import json
import time
import requests
from decimal import Decimal
from django.conf import settings


class TeleBirrPayment:
    """
    TeleBirr H5 Payment Integration
    
    In production, replace sandbox URLs with real TeleBirr API endpoints
    and add your app credentials to settings.py.
    """
    
    SANDBOX_BASE_URL = "https://app.moneypass.et/payment/gateway"
    PRODUCTION_BASE_URL = "https://app.telebirr.et/payment/gateway"
    
    def __init__(self):
        self.app_id = getattr(settings, 'TELEBIRR_APP_ID', 'sandbox_app_id')
        self.app_key = getattr(settings, 'TELEBIRR_APP_KEY', 'sandbox_app_key')
        self.short_code = getattr(settings, 'TELEBIRR_SHORT_CODE', 'sandbox_short_code')
        self.private_key = getattr(settings, 'TELEBIRR_PRIVATE_KEY', '')
        self.is_sandbox = getattr(settings, 'TELEBIRR_SANDBOX', True)
        self.base_url = self.SANDBOX_BASE_URL if self.is_sandbox else self.PRODUCTION_BASE_URL
    
    def generate_transaction_id(self):
        return f"TJB{int(time.time() * 1000)}"
    
    def initiate_payment(self, amount, phone_number, subject="Juggler Access Fee"):
        """
        Initiate a TeleBirr payment request.
        
        In sandbox mode, this simulates a successful payment.
        In production, this would call the real TeleBirr API.
        """
        transaction_id = self.generate_transaction_id()
        
        if self.is_sandbox:
            return {
                "success": True,
                "transaction_id": transaction_id,
                "status": "SUCCESS",
                "message": "Sandbox payment simulated successfully",
                "amount": str(amount),
                "phone_number": phone_number,
                "timestamp": int(time.time())
            }
        
        payload = {
            "appId": self.app_id,
            "appKey": self.app_key,
            "shortCode": self.short_code,
            "transactionId": transaction_id,
            "amount": str(amount),
            "phoneNumber": phone_number,
            "subject": subject,
            "callbackUrl": f"{getattr(settings, 'SITE_URL', 'http://localhost:8000')}/api/payments/telebirr/callback/",
            "returnUrl": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/account?payment=success",
            "timeout": 300
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/checkout/initialize",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "transaction_id": transaction_id,
                    "status": "PENDING",
                    "payment_url": data.get("paymentUrl"),
                    "message": "Payment initiated. Please complete on your phone."
                }
            else:
                return {
                    "success": False,
                    "error": f"Payment gateway returned {response.status_code}"
                }
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Payment gateway error: {str(e)}"
            }
    
    def verify_payment(self, transaction_id):
        """
        Verify payment status with TeleBirr.
        
        In sandbox mode, always returns success.
        """
        if self.is_sandbox:
            return {
                "success": True,
                "status": "SUCCESS",
                "transaction_id": transaction_id
            }
        
        try:
            response = requests.get(
                f"{self.base_url}/transaction/{transaction_id}",
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "status": data.get("status", "PENDING"),
                    "transaction_id": transaction_id
                }
            else:
                return {
                    "success": False,
                    "error": f"Verification failed with status {response.status_code}"
                }
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Verification error: {str(e)}"
            }


telebirr = TeleBirrPayment()