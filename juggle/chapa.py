import hashlib
import hmac
import json
import time
import requests
from decimal import Decimal
from django.conf import settings


class ChapaPayment:
    """
    Chapa Payment Gateway Integration
    
    Supports: TeleBirr, CBE Birr, Amole, and other Ethiopian payment methods.
    
    Setup:
    1. Register at https://developer.chapa.co
    2. Get your public_key and secret_key
    3. Add to settings.py:
       CHAPA_PUBLIC_KEY = 'your_public_key'
       CHAPA_SECRET_KEY = 'your_secret_key'
       CHAPA_ENCRYPTION_KEY = 'your_encryption_key' (optional)
    """
    
    BASE_URL = "https://api.chapa.co/v1"
    
    def __init__(self):
        self.public_key = getattr(settings, 'CHAPA_PUBLIC_KEY', 'CHAPUBK_TEST_xxxxx')
        self.secret_key = getattr(settings, 'CHAPA_SECRET_KEY', 'CHASECK_TEST_xxxxx')
        self.encryption_key = getattr(settings, 'CHAPA_ENCRYPTION_KEY', '')
    
    def _headers(self):
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }
    
    def generate_tx_ref(self, prefix="THE_JUGGLE"):
        return f"{prefix}_{int(time.time() * 1000)}"
    
    def initialize_payment(self, amount, email, phone_number=None, first_name=None, last_name=None, title="Payment", return_url=None, callback_url=None):
        """
        Initialize a Chapa payment session.
        
        Returns checkout URL for user to complete payment.
        """
        tx_ref = self.generate_tx_ref()
        
        payload = {
            "amount": str(amount),
            "currency": "ETB",
            "email": email,
            "tx_ref": tx_ref,
            "title": title,
            "description": f"Payment for {title}",
        }
        
        if phone_number:
            payload["phone_number"] = phone_number
        if first_name:
            payload["first_name"] = first_name
        if last_name:
            payload["last_name"] = last_name
        if return_url:
            payload["return_url"] = return_url
        if callback_url:
            payload["callback_url"] = callback_url
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/transaction/initialize",
                json=payload,
                headers=self._headers(),
                timeout=30
            )
            
            data = response.json()
            
            if response.status_code == 200 and data.get("status") == "success":
                return {
                    "success": True,
                    "tx_ref": tx_ref,
                    "checkout_url": data["data"]["checkout_url"],
                    "message": "Payment initialized"
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Payment initialization failed"),
                    "tx_ref": tx_ref
                }
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Payment gateway error: {str(e)}"
            }
    
    def verify_payment(self, tx_ref):
        """
        Verify a Chapa payment by transaction reference.
        """
        try:
            response = requests.get(
                f"{self.BASE_URL}/transaction/verify/{tx_ref}",
                headers=self._headers(),
                timeout=30
            )
            
            data = response.json()
            
            if response.status_code == 200 and data.get("status") == "success":
                payment_data = data.get("data", {})
                return {
                    "success": True,
                    "status": payment_data.get("status", "pending"),
                    "tx_ref": tx_ref,
                    "amount": payment_data.get("amount"),
                    "currency": payment_data.get("currency"),
                    "payment_method": payment_data.get("payment_method"),
                    "created_at": payment_data.get("created_at"),
                    "updated_at": payment_data.get("updated_at")
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Verification failed")
                }
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Verification error: {str(e)}"
            }
    
    def initiate_transfer(self, amount, recipient_phone, bank_code=" TéléBirr", bank_name="telebirr"):
        """
        Initiate a transfer (withdrawal) to a recipient.
        
        Note: Transfers require Chapa business account with transfer capabilities.
        """
        reference = self.generate_tx_ref("WD")
        
        payload = {
            "amount": str(amount),
            "currency": "ETB",
            "bank_code": bank_code,
            "account_number": recipient_phone,
            "reference": reference,
            "description": "Withdrawal from The Juggle"
        }
        
        try:
            response = requests.post(
                f"{self.BASE_URL}/transfers",
                json=payload,
                headers=self._headers(),
                timeout=30
            )
            
            data = response.json()
            
            if response.status_code == 200 and data.get("status") == "success":
                return {
                    "success": True,
                    "reference": reference,
                    "message": "Transfer initiated successfully"
                }
            else:
                return {
                    "success": False,
                    "error": data.get("message", "Transfer failed")
                }
        except requests.RequestException as e:
            return {
                "success": False,
                "error": f"Transfer error: {str(e)}"
            }


chapa = ChapaPayment()