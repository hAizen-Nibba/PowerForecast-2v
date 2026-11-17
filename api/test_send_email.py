import unittest
import json
from unittest.mock import patch, MagicMock
from api.send_email import render_template, get_sender_email, is_valid_email, handler

class TestSendEmailAPI(unittest.TestCase):

    def setUp(self):
        self.mock_wfile = MagicMock()
        self.handler = handler.__new__(handler)
        self.handler.headers = {'Content-Length': '0'}
        self.handler.rfile = MagicMock()
        self.handler.wfile = self.mock_wfile
        self.handler.send_response = MagicMock()
        self.handler.send_header = MagicMock()
        self.handler.end_headers = MagicMock()

    def test_is_valid_email(self):
        self.assertTrue(is_valid_email("user@example.com"))
        self.assertTrue(is_valid_email("john.doe+tag@sub.domain.co.uk"))
        self.assertFalse(is_valid_email("invalid-email"))
        self.assertFalse(is_valid_email("user@"))
        self.assertFalse(is_valid_email("<script>alert(1)</script>"))
        self.assertFalse(is_valid_email(12345))

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

    @patch('api.send_email.get_resend_api_key', return_value='re_fake_key_12345')
    def test_invalid_recipient_rejection(self, mock_key):
        body_data = {
            "to": "invalid-email-address",
            "subject": "Test"
        }
        json_bytes = json.dumps(body_data).encode('utf-8')
        self.handler.headers = {'Content-Length': str(len(json_bytes))}
        self.handler.rfile.read.return_value = json_bytes

        self.handler.do_POST()
        self.handler.send_response.assert_called_with(400)

    def test_payload_too_large_rejection(self):
        # 1.5MB exceeds 1MB cap
        self.handler.headers = {'Content-Length': str(1500000)}
        self.handler.do_POST()
        self.handler.send_response.assert_called_with(413)

    @patch('api.send_email.get_resend_api_key', return_value='re_fake_key_12345')
    @patch('urllib.request.urlopen')
    def test_sender_address_enforcement(self, mock_urlopen, mock_key):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"id": "msg_123"}).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        body_data = {
            "to": "user@example.com",
            "from": "spoofed@attacker.com",
            "subject": "Hello"
        }
        json_bytes = json.dumps(body_data).encode('utf-8')
        self.handler.headers = {'Content-Length': str(len(json_bytes))}
        self.handler.rfile.read.return_value = json_bytes

        self.handler.do_POST()

        req = mock_urlopen.call_args[0][0]
        req_body = json.loads(req.data.decode('utf-8'))
        self.assertNotEqual(req_body.get("from"), "spoofed@attacker.com")
        self.assertEqual(req_body.get("from"), get_sender_email())

if __name__ == '__main__':
    unittest.main()
