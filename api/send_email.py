import json
import os
import html
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler

def _esc(val):
    if val is None:
        return ""
    return html.escape(str(val))

def get_resend_api_key():
    """
    Retrieves the Resend API Key from environment variables.
    """
    key = os.environ.get('RESEND_API_KEY') or os.environ.get('VITE_RESEND_API_KEY') or ''
    return key.strip().strip('"').strip("'")

def get_sender_email():
    """
    Retrieves the configured sender email or defaults to Resend development onboarding domain.
    """
    sender = os.environ.get('RESEND_FROM_EMAIL') or os.environ.get('VITE_RESEND_FROM_EMAIL') or ''
    sender = sender.strip().strip('"').strip("'")
    if not sender:
        return 'PowerForecast <noreply@comugallery.me>'
    return sender

def render_template(template_type, data):
    """
    Renders responsive, branded PowerForecast HTML emails for supported transactional types.
    Modern light branding matching Stack Template / Google Stitch design guidelines.
    """
    brand_emerald = "#059669"
    page_bg = "#f4f4f5"
    card_bg = "#ffffff"
    border_color = "#e4e4e7"
    text_main = "#09090b"
    text_muted = "#52525b"
    logo_url = "https://raw.githubusercontent.com/hAizen-Nibba/PowerForecast-2v/main/public/Assets/LOGO.png"

    base_header = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, table, td {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }}
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: {page_bg}; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: {page_bg}; padding: 36px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: {card_bg}; border: 1px solid {border_color}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
              
              <!-- Header with Logo and Brand -->
              <tr>
                <td style="padding: 24px 32px 20px 32px; border-bottom: 1px solid #f4f4f5; background-color: #ffffff;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="vertical-align: middle; width: 42px;">
                        <img src="{logo_url}" alt="PowerForecast Logo" width="36" height="36" style="display: block; border-radius: 8px; border: 1px solid #e4e4e7;" />
                      </td>
                      <td style="vertical-align: middle; padding-left: 12px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="font-size: 19px; font-weight: 800; color: #09090b; letter-spacing: -0.3px;">
                              Power<span style="color: #10b981;">Forecast</span>
                            </td>
                            <td style="padding-left: 10px;">
                              <span style="font-size: 10px; font-weight: 700; background-color: #ecfdf5; color: #047857; padding: 3px 8px; border-radius: 999px; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid #a7f3d0;">
                                Energy Intelligence
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="font-size: 11px; font-weight: 500; color: #71717a; letter-spacing: 0.2px; padding-top: 2px;">
                              Smart Energy Monitoring & Bill Forecasting
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 32px 32px 24px 32px; color: {text_main};">
    """

    base_footer = f"""
                </td>
              </tr>

              <!-- Footer with Security Notice -->
              <tr>
                <td style="padding: 20px 32px 24px 32px; border-top: 1px solid #f4f4f5; background-color: #fafafa;">
                  <div style="font-size: 12px; line-height: 1.5; color: #71717a; margin-bottom: 8px;">
                    🛡️ This operational notification was dispatched via PowerForecast SMTP & Resend Delivery Engine.
                  </div>
                  <div style="font-size: 11px; line-height: 1.5; color: #a1a1aa;">
                    Sender: <strong style="color: #71717a;">noreply@comugallery.me</strong> &bull; © 2026 PowerForecast Refine. All rights reserved.
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    if template_type == 'household_invite':
        raw_inviter_name = str(data.get('inviterName', 'A household member'))
        inviter_name = _esc(raw_inviter_name)
        invite_code = _esc(data.get('inviteCode', 'PF-HH-0000'))
        invite_link = _esc(data.get('inviteLink', 'https://powerforecast.ph'))
        
        subject = f"⚡ You've been invited by {raw_inviter_name} to join PowerForecast Household"
        content = f"""
          <h1 style="font-size: 22px; font-weight: 800; color: {text_main}; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.3px;">
            Household Energy Team Invitation
          </h1>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            <strong style="color: {text_main};">{inviter_name}</strong> has invited you to join their smart household energy profile on PowerForecast.
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px 20px;">
            <tr>
              <td align="center">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px;">Your Household Join Code</div>
                <div style="font-size: 26px; font-weight: 800; letter-spacing: 3px; color: #047857; font-family: 'JetBrains Mono', 'Courier New', monospace;">{invite_code}</div>
              </td>
            </tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius: 8px; background-color: #09090b;">
                      <a href="{invite_link}" target="_blank" rel="noopener noreferrer" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; display: inline-block; letter-spacing: 0.2px; background-color: #09090b; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
                        Accept Invitation & Join
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 16px; margin-top: 20px;">
            <div style="font-size: 11px; font-weight: 600; color: #71717a; margin-bottom: 4px;">Or copy and paste this link in your browser:</div>
            <a href="{invite_link}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #09090b; word-break: break-all; text-decoration: underline;">{invite_link}</a>
          </div>
        """
        return subject, base_header + content + base_footer

    elif template_type == 'budget_alert':
        raw_percent_consumed = str(data.get('percentConsumed', '80%'))
        user_name = _esc(data.get('userName', 'User'))
        current_kwh = _esc(data.get('currentKwh', '0'))
        budget_limit_kwh = _esc(data.get('budgetLimitKwh', '0'))
        percent_consumed = _esc(raw_percent_consumed)
        projected_bill = _esc(data.get('projectedBill', '₱0.00'))

        subject = f"⚠️ Alert: PowerForecast Monthly Budget Threshold Reached ({raw_percent_consumed})"
        content = f"""
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <strong style="color: #b91c1c; font-size: 13px; letter-spacing: 0.5px;">ENERGY BUDGET THRESHOLD WARNING</strong>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: {text_main}; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.3px;">
            Hello {user_name},
          </h1>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            Your household electricity consumption has reached <strong style="color: #dc2626;">{percent_consumed}</strong> of your monthly target.
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">Current Accumulated Usage:</td>
              <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: #09090b;">{current_kwh} kWh</td>
            </tr>
            <tr style="border-top: 1px solid #f4f4f5;">
              <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">Monthly Target Budget:</td>
              <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: #09090b;">{budget_limit_kwh} kWh</td>
            </tr>
            <tr style="border-top: 1px solid #f4f4f5;">
              <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">Projected End-of-Month Bill:</td>
              <td style="padding: 12px 18px; font-size: 16px; font-weight: 800; text-align: right; color: #047857;">{projected_bill}</td>
            </tr>
          </table>
          <p style="font-size: 14px; line-height: 1.6; color: {text_muted}; margin-bottom: 0;">
            💡 <strong>Smart Tip:</strong> Shifting major inductive loads (air conditioning, washing machine, electric stove) away from peak hours can curb higher tier electricity rates.
          </p>
        """
        return subject, base_header + content + base_footer

    elif template_type == 'surge_alert':
        raw_current_watts = str(data.get('currentWatts', '2500'))
        current_watts = _esc(raw_current_watts)
        threshold_watts = _esc(data.get('thresholdWatts', '2000'))
        timestamp = _esc(data.get('timestamp', 'Just now'))

        subject = f"⚡ Critical Surge Alert: {raw_current_watts}W Wattage Spike Detected"
        content = f"""
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <strong style="color: #b45309; font-size: 13px; letter-spacing: 0.5px;">HIGH CONCURRENT POWER SURGE</strong>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: {text_main}; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.3px;">
            Active Load Warning
          </h1>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            Your active telemetry monitor registered concurrent appliance wattage of <strong style="color: #d97706;">{current_watts} Watts</strong> at {timestamp}, exceeding your threshold limit of {threshold_watts} Watts.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 14px; color: #334155; line-height: 1.6;">
            Please check active high-draw equipment such as air conditioning units, induction cooktops, or electric water heaters running simultaneously.
          </div>
        """
        return subject, base_header + content + base_footer

    elif template_type == 'test_email':
        recipient = _esc(data.get('recipient', 'Administrator'))
        timestamp = _esc(data.get('timestamp', 'Now'))
        note = _esc(data.get('note', 'Resend SMTP & Delivery Test Successful'))

        subject = "⚡ PowerForecast SMTP & Resend Delivery Test Successful"
        content = f"""
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
            <strong style="color: #047857; font-size: 13px; letter-spacing: 0.5px;">✓ SMTP DELIVERY TEST PASSED</strong>
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: {text_main}; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.3px;">
            Connection Verified!
          </h1>
          <p style="font-size: 15px; line-height: 1.6; color: {text_muted}; margin-bottom: 20px;">
            This test email confirms that your <strong>PowerForecast Resend Delivery Engine</strong> and <strong>Custom Domain SMTP</strong> (<code style="color: #047857;">noreply@comugallery.me</code>) are operational and delivering worldwide.
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">Target Recipient:</td>
              <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: #09090b;">{recipient}</td>
            </tr>
            <tr style="border-top: 1px solid #f4f4f5;">
              <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">Dispatched At:</td>
              <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: #09090b;">{timestamp}</td>
            </tr>
            <tr style="border-top: 1px solid #f4f4f5;">
              <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">Diagnostics Note:</td>
              <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: #047857;">{note}</td>
            </tr>
          </table>
        """
        return subject, base_header + content + base_footer

    # Default fallback
    raw_subject = str(data.get('subject', 'PowerForecast Notification'))
    subject = raw_subject
    content = f"""
      <h1 style="font-size: 22px; font-weight: 800; color: {text_main}; margin-top: 0; margin-bottom: 12px; letter-spacing: -0.3px;">
        {_esc(raw_subject)}
      </h1>
      <div style="font-size: 15px; line-height: 1.6; color: {text_muted};">
        {_esc(data.get('content', 'Notification from PowerForecast.'))}
      </div>
    """
    return subject, base_header + content + base_footer


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        api_key = get_resend_api_key()
        has_key = bool(api_key and len(api_key) > 5)
        sender = get_sender_email()

        res = {
            "status": "ok",
            "hasApiKey": has_key,
            "senderEmail": sender,
            "service": "Resend SMTP & REST Dispatcher",
            "supportedTemplates": ["household_invite", "budget_alert", "surge_alert", "test_email", "custom"]
        }
        self.wfile.write(json.dumps(res).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ''

        try:
            payload = json.loads(raw_body) if raw_body else {}
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": f"Invalid JSON body: {str(e)}"}).encode('utf-8'))
            return

        api_key = get_resend_api_key()
        if not api_key:
            self.send_response(503)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": "RESEND_API_KEY is not configured on the server. Please add your Resend API key to environment variables.",
                "code": "MISSING_RESEND_API_KEY"
            }).encode('utf-8'))
            return

        to_recipient = payload.get('to')
        if not to_recipient:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": "Missing 'to' recipient parameter."}).encode('utf-8'))
            return

        recipients = [to_recipient] if isinstance(to_recipient, str) else to_recipient
        from_email = payload.get('from') or get_sender_email()
        template_type = payload.get('type')
        template_data = payload.get('data', {})

        if template_type:
            computed_subject, computed_html = render_template(template_type, template_data)
            subject = payload.get('subject') or computed_subject
            html = payload.get('html') or computed_html
        else:
            subject = payload.get('subject', 'Notification from PowerForecast')
            html = payload.get('html', f"<p>{payload.get('text', 'No content provided.')}</p>")

        resend_payload = {
            "from": from_email,
            "to": recipients,
            "subject": subject,
            "html": html,
        }

        if payload.get('text'):
            resend_payload["text"] = payload.get('text')

        # Forward request to Resend API
        req_data = json.dumps(resend_payload).encode('utf-8')
        req = urllib.request.Request(
            'https://api.resend.com/emails',
            data=req_data,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 PowerForecast/3.4'
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body) if res_body else {}
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "id": res_json.get("id"),
                    "recipient": recipients,
                    "subject": subject
                }).encode('utf-8'))

        except urllib.error.HTTPError as http_err:
            error_body = http_err.read().decode('utf-8') if http_err.fp else str(http_err)
            try:
                error_json = json.loads(error_body)
            except Exception:
                error_json = {"message": error_body}

            self.send_response(http_err.code if http_err.code in [400, 401, 403, 422, 500] else 500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": error_json.get("message") or f"Resend API error: {http_err.reason}",
                "details": error_json,
                "code": "RESEND_HTTP_ERROR"
            }).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": f"Internal email dispatcher error: {str(e)}",
                "code": "DISPATCHER_ERROR"
            }).encode('utf-8'))
