import json
from http.server import BaseHTTPRequestHandler

def compute_bill(kwh, gen_rate=7.12, other_charges=0.0):
    kwh = float(kwh or 0)
    gen_rate = float(gen_rate or 7.12)
    other_charges = float(other_charges or 0)

    # 1. Generation
    gen_cost = round(kwh * gen_rate, 2)
    trans_cost = round(kwh * 0.9421, 2)
    sys_loss_cost = round(kwh * 0.6120, 2)

    # 2. Distribution
    dist_cost = round(kwh * 1.2504, 2)
    meter_supply = round(kwh * 0.7408 + (0 if kwh == 0 else 22.35), 2)

    # 3. Taxes & VAT
    vat = round((gen_cost + trans_cost + sys_loss_cost + dist_cost + meter_supply) * 0.12, 2)
    lft = round(kwh * 0.05, 2)
    gov_taxes = round(vat + lft, 2)

    # 4. Universal & Subsidies
    universal = round(kwh * 0.2282, 2)
    fit_all = round(kwh * 0.0838, 2)
    subsidies = round(universal + fit_all, 2)

    energy_amount = round(gen_cost + trans_cost + sys_loss_cost + dist_cost + meter_supply + gov_taxes + subsidies, 2)
    total_bill = round(energy_amount + other_charges, 2)

    return {
        "success": True,
        "input": {"kwh": kwh, "generation_rate": gen_rate, "other_charges": other_charges},
        "summary": {
            "total_bill": total_bill,
            "energy_cost": energy_amount,
            "other_charges": other_charges,
            "effective_rate_per_kwh": round(total_bill / max(1, kwh), 4)
        },
        "itemized": {
            "generation_charge": gen_cost,
            "transmission_charge": trans_cost,
            "system_loss_charge": sys_loss_cost,
            "distribution_charge": dist_cost,
            "metering_supply_charge": meter_supply,
            "government_taxes_and_vat": gov_taxes,
            "universal_charges_and_fitall": subsidies
        }
    }

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}

        kwh = payload.get('kwh', 0)
        gen_rate = payload.get('generation_rate', 7.12)
        other_charges = payload.get('other_charges', 0.0)

        result = compute_bill(kwh, gen_rate, other_charges)

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
