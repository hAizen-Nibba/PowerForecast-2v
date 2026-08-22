import json
from http.server import BaseHTTPRequestHandler

DEFAULT_RATES = {
    "effective_month": "August 2026",
    "generation_rate_per_kwh": 7.1200,
    "transmission_rate_per_kwh": 0.9421,
    "system_loss_rate_per_kwh": 0.6120,
    "distribution_rate_per_kwh": 1.2504,
    "universal_charges_per_kwh": 0.2282,
    "fit_all_per_kwh": 0.0838,
    "vat_rate_percent": 12.0
}

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(DEFAULT_RATES).encode('utf-8'))
