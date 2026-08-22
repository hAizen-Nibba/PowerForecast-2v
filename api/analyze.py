import json
import os
import re
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler

def get_gemini_api_keys():
    keys = []
    
    def add_key(val):
        if not val or not isinstance(val, str):
            return
        if any(c in val for c in [',', ';', '\n', '\r']):
            for sub in re.split(r'[,;\n\r]+', val):
                add_key(sub)
            return
        clean = val.strip().strip('"').strip("'")
        if clean and clean not in keys:
            keys.append(clean)

    add_key(os.environ.get('GEMINI_API_KEYS', ''))

    prefixes = [
        'GEMINI_API_KEY',
        'GEMINI_API_KEY_FALLBACK',
        'GEMINI_API_KEY_BACKUP',
        'GEMINI_API_BACKUP_KEY',
        'GOOGLE_API_KEY',
        'GOOGLE_GEMINI_API_KEY'
    ]
    for p in prefixes:
        add_key(os.environ.get(p, ''))
        for i in range(1, 11):
            add_key(os.environ.get(f"{p}_{i}", ''))

    for k, v in os.environ.items():
        if re.match(r'^(GEMINI|GOOGLE)_.*API_?KEY.*$', k, re.IGNORECASE):
            add_key(v)

    return keys

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

        images = payload.get('images', [])
        image_base64 = payload.get('imageBase64')
        mime_type = payload.get('mimeType', 'image/jpeg')
        prompt = payload.get('prompt')
        preset = payload.get('preset', 'specs')
        model = payload.get('model', 'gemini-2.5-flash')

        api_keys = get_gemini_api_keys()

        if not api_keys:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "No Gemini API key configured on server."}).encode('utf-8'))
            return

        # Prepare multimodal parts
        parts = []
        if prompt:
            parts.append({"text": prompt})
        else:
            default_prompt = (
                "You are an expert electrical appliance energy auditor in the Philippines. "
                "Analyze the provided image(s) (which may include energy rating guide labels, yellow Energy Guide tags, nameplates, or appliance full views). "
                "Extract the following exact fields in JSON: "
                "1. brand (string) "
                "2. model (string) "
                "3. category (string: Air Conditioners, Refrigerating Appliances, Television Sets, Electric Fans, Clothes Washing Machines, Lighting Products, or Other) "
                "4. power_watts (number: wattage rating in Watts) "
                "5. voltage (number: voltage rating, typically 230V in Philippines) "
                "6. monthly_kwh (number: monthly energy consumption if listed on Energy Guide label) "
                "7. energy_rating (string: CSPF, EER, or star rating) "
                "8. star_rating (number: 1 to 5 stars if visible) "
                "Return clean JSON only."
            )
            parts.append({"text": default_prompt})

        if images and isinstance(images, list):
            for img in images:
                b64 = img.get('base64', '')
                mt = img.get('mimeType', 'image/jpeg')
                if b64:
                    parts.append({
                        "inline_data": {
                            "mime_type": mt,
                            "data": b64
                        }
                    })
        elif image_base64:
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": image_base64
                }
            })

        req_body = json.dumps({
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }).encode('utf-8')

        # Multi-key fallback execution
        last_error = None
        for key in api_keys:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            req = urllib.request.Request(url, data=req_body, headers={'Content-Type': 'application/json'})
            try:
                with urllib.request.urlopen(req, timeout=25) as resp:
                    resp_data = resp.read().decode('utf-8')
                    parsed = json.loads(resp_data)
                    raw_text = parsed.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": True,
                        "raw_markdown": raw_text,
                        "data": json.loads(raw_text) if raw_text.startswith('{') else {}
                    }).encode('utf-8'))
                    return
            except Exception as e:
                last_error = str(e)
                continue

        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": f"All Gemini API keys failed: {last_error}"}).encode('utf-8'))
