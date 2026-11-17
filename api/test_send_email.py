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

    def test_html_injection_sanitization(self):
        # Verify malicious payload injection across templates is neutralized
        data = {
            "inviterName": "<script>alert('xss')</script>John",
            "inviteCode": "<code>\"onload=\"alert(1)</code>",
            "inviteLink": "javascript:alert(1)"
        }
        _, html_out = render_template("household_invite", data)
        self.assertNotIn("<script>", html_out)
        self.assertIn("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;John", html_out)
        self.assertNotIn("javascript:alert(1)", html_out)
        self.assertNotIn("onload=\"alert(1)", html_out)

        budget_data = {
            "userName": "<img src=x onerror=alert(1)>",
            "percentConsumed": "80%<script>bad()</script>",
            "projectedBill": "₱1,000<b onmouseover=bad()>"
        }
        _, budget_html = render_template("budget_alert", budget_data)
        self.assertNotIn("<img src=x", budget_html)
        self.assertNotIn("<script>bad()</script>", budget_html)
        self.assertNotIn("<b onmouseover=", budget_html)
        self.assertIn("&lt;img src=x onerror=alert(1)&gt;", budget_html)

if __name__ == '__main__':
    unittest.main()
