import json
import math
from http.server import BaseHTTPRequestHandler

def compute_bill(kwh, gen_rate=7.12, other_charges=0.0):
    try:
        kwh = float(kwh) if kwh is not None else 0.0
        gen_rate = float(gen_rate) if gen_rate is not None else 7.12
        other_charges = float(other_charges) if other_charges is not None else 0.0
    except (ValueError, TypeError):
        return None, "Invalid parameter type: numeric values required."

    if any(math.isnan(v) or math.isinf(v) for v in (kwh, gen_rate, other_charges)):
        return None, "Invalid parameter: NaN or Infinity values are not allowed."

    if kwh < 0 or gen_rate < 0 or other_charges < 0:
        return None, "Invalid parameter: input parameters must be non-negative."

    if kwh > 1_000_000 or gen_rate > 10_000 or other_charges > 1_000_000:
        return None, "Invalid parameter: value exceeds maximum allowed limits."

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
    effective_rate = round(total_bill / kwh, 4) if kwh > 0 else 0.0

    return {
        "success": True,
        "input": {"kwh": kwh, "generation_rate": gen_rate, "other_charges": other_charges},
        "summary": {
            "total_bill": total_bill,
            "energy_cost": energy_amount,
            "other_charges": other_charges,
            "effective_rate_per_kwh": effective_rate
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
    }, None

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

        result, err = compute_bill(kwh, gen_rate, other_charges)

        if err:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": err}).encode('utf-8'))
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
