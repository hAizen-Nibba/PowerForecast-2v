import unittest
from api.send_email import render_template, get_sender_email

class TestSendEmailAPI(unittest.TestCase):

    def test_household_invite_template(self):
        data = {
            "inviterName": "Juan Dela Cruz",
            "inviteCode": "PF-HH-9921",
            "inviteLink": "https://powerforecast.ph/#/signup?invite=PF-HH-9921"
        }
        subject, html = render_template("household_invite", data)
        self.assertIn("Juan Dela Cruz", subject)
        self.assertIn("PF-HH-9921", html)
        self.assertIn("Power", html)
        self.assertIn("Forecast", html)
        self.assertIn("https://raw.githubusercontent.com/hAizen-Nibba/PowerForecast-2v/main/public/Assets/LOGO.png", html)

    def test_budget_alert_template(self):
        data = {
            "userName": "Maria",
            "currentKwh": "215",
            "budgetLimitKwh": "250",
            "percentConsumed": "86%",
            "projectedBill": "₱3,150.00"
        }
        subject, html = render_template("budget_alert", data)
        self.assertIn("86%", subject)
        self.assertIn("Maria", html)
        self.assertIn("215 kWh", html)
        self.assertIn("₱3,150.00", html)

    def test_surge_alert_template(self):
        data = {
            "currentWatts": "3200",
            "thresholdWatts": "2500",
            "timestamp": "14:30 PM"
        }
        subject, html = render_template("surge_alert", data)
        self.assertIn("3200W", subject)
        self.assertIn("3200 Watts", html)
        self.assertIn("2500 Watts", html)

    def test_test_email_template(self):
        data = {
            "recipient": "admin@example.com",
            "timestamp": "2026-09-29 20:00:00",
            "note": "Unit test check"
        }
        subject, html = render_template("test_email", data)
        self.assertIn("Delivery Test Successful", subject)
        self.assertIn("admin@example.com", html)
        self.assertIn("Unit test check", html)

    def test_default_sender_email(self):
        sender = get_sender_email()
        self.assertTrue(len(sender) > 0)
        self.assertIn("@", sender)

    def test_recipient_validation_and_sender_enforcement(self):
        from api.send_email import handler
        import io
        import json
        from unittest.mock import patch, MagicMock

        # Mock handler to test POST validation
        mock_handler = MagicMock(spec=handler)
        mock_wfile = io.BytesIO()
        mock_handler.wfile = mock_wfile

        # Test valid recipient is processed and custom sender in payload is overridden
        valid_payload = json.dumps({
            "to": "test@example.com",
            "from": "hacker@spoofeddomain.com",
            "subject": "Test",
            "text": "Hello"
        }).encode('utf-8')
        mock_handler.rfile = io.BytesIO(valid_payload)
        mock_handler.headers = {'Content-Length': str(len(valid_payload))}

        with patch('api.send_email.get_resend_api_key', return_value='re_fake_12345'), \
             patch('urllib.request.urlopen') as mock_urlopen:

            mock_resp = MagicMock()
            mock_resp.read.return_value = json.dumps({"id": "msg_123"}).encode('utf-8')
            mock_urlopen.return_value.__enter__.return_value = mock_resp

            # Execute do_POST
            handler.do_POST(mock_handler)

            # Check that urllib request sent server-controlled from address, not hacker@spoofeddomain.com
            self.assertTrue(mock_urlopen.called)
            req = mock_urlopen.call_args[0][0]
            sent_data = json.loads(req.data.decode('utf-8'))
            self.assertNotEqual(sent_data.get('from'), 'hacker@spoofeddomain.com')
            self.assertIn('comugallery.me', sent_data.get('from', ''))

if __name__ == '__main__':
    unittest.main()
