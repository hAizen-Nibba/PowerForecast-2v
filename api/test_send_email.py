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


from unittest.mock import patch, MagicMock
import json
import api.send_email as send_email

class TestSendEmailSecurity(unittest.TestCase):

    def setUp(self):
        self.mock_wfile = MagicMock()
        self.handler = send_email.handler.__new__(send_email.handler)
        self.handler.headers = {'Content-Length': '0'}
        self.handler.rfile = MagicMock()
        self.handler.wfile = self.mock_wfile
        self.handler.send_response = MagicMock()
        self.handler.send_header = MagicMock()
        self.handler.end_headers = MagicMock()

    def test_invalid_json_body_error_sanitization(self):
        invalid_body = b"NOT_VALID_JSON{{"
        self.handler.headers = {'Content-Length': str(len(invalid_body))}
        self.handler.rfile.read.return_value = invalid_body

        self.handler.do_POST()

        self.handler.send_response.assert_called_with(400)
        written_bytes = b"".join(call[0][0] for call in self.mock_wfile.write.call_args_list)
        resp_data = json.loads(written_bytes.decode('utf-8'))

        self.assertFalse(resp_data.get("success"))
        self.assertEqual(resp_data.get("error"), "Invalid JSON payload format.")
        # Ensure internal exception strings/details are not disclosed
        self.assertNotIn("Expecting value", resp_data.get("error"))

    @patch('api.send_email.get_resend_api_key', return_value='re_fake_api_key_12345')
    @patch('api.send_email.get_sender_email', return_value='PowerForecast <noreply@comugallery.me>')
    @patch('urllib.request.urlopen')
    def test_sender_email_spoofing_prevention(self, mock_urlopen, mock_sender, mock_key):
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps({"id": "msg_123"}).encode('utf-8')
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        payload = {
            "to": "user@example.com",
            "from": "attacker-spoofed@malicious-domain.com",
            "subject": "Test",
            "text": "Hello"
        }
        raw_payload = json.dumps(payload).encode('utf-8')
        self.handler.headers = {'Content-Length': str(len(raw_payload))}
        self.handler.rfile.read.return_value = raw_payload

        self.handler.do_POST()

        self.assertTrue(mock_urlopen.called)
        req = mock_urlopen.call_args[0][0]
        sent_body = json.loads(req.data.decode('utf-8'))

        # Verify from address was forced to server configured sender, ignoring spoofed 'from'
        self.assertEqual(sent_body["from"], "PowerForecast <noreply@comugallery.me>")
        self.assertNotEqual(sent_body["from"], "attacker-spoofed@malicious-domain.com")


if __name__ == '__main__':
    unittest.main()
