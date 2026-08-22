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
        model = payload.get('model', 'gemini-2.0-flash')

        api_keys = get_gemini_api_keys()

        if not api_keys:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": "No Gemini API key configured on server. Please add GEMINI_API_KEY to your Vercel Environment Variables."
            }).encode('utf-8'))
            return

        # Prepare multimodal parts
        parts = []
        if prompt:
            parts.append({"text": prompt})
        else:
            default_prompt = (
                "You are ApplianceSpec AI, an expert electrical energy auditor specialized in Philippine DOE Energy Guide labels and technical specification nameplates.\n"
                "Analyze the provided image(s) (which may show energy labels, nameplates, or appliance body). "
                "Extract and reconcile all technical electrical data into clean JSON with these exact keys:\n"
                "{\n"
                '  "brand": "Exact brand string (e.g. Astron, Standard, Asahi, Carrier, Panasonic, LG, Sharp, Daikin, Samsung, Condura, etc.)",\n'
                '  "model": "Exact model number or code (e.g. BRONCO 18, BR-000993)",\n'
                '  "category": "Air Conditioners | Refrigerating Appliances | Television Sets | Electric Fans | Clothes Washing Machines | Lighting Products | Other",\n'
                '  "power_watts": number (e.g. 70 for fan, 1050 for AC, 120 for ref),\n'
                '  "voltage": number (e.g. 230),\n'
                '  "monthly_kwh": number (e.g. 16.8 for 70W fan @ 8h/day, 240 for 1000W AC),\n'
                '  "energy_rating": "e.g. 5-Star DOE or CSPF rating or PS Quality Mark",\n'
                '  "star_rating": number (1 to 5),\n'
                '  "room_location": "Living Room | Master Bedroom | Kitchen | Laundry Area | Home Office",\n'
                '  "confidence": "high | medium | low",\n'
                '  "notes": "Detailed engineering audit notes describing detected ratings, serials, and efficiency analysis."\n'
                "}\n"
                "Preset: " + str(preset) + "\n"
                "Respond ONLY with valid JSON inside a ```json ``` code block."
            )
            parts.append({"text": default_prompt})

        if images and isinstance(images, list):
            for img in images:
                b64 = img.get('base64', '')
                mt = img.get('mimeType', 'image/jpeg')
                if b64:
                    clean_b64 = re.sub(r'^data:image\/[a-zA-Z]+;base64,', '', b64)
                    parts.append({
                        "inline_data": {
                            "mime_type": mt,
                            "data": clean_b64
                        }
                    })
        elif image_base64:
            clean_b64 = re.sub(r'^data:image\/[a-zA-Z]+;base64,', '', image_base64)
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": clean_b64
                }
            })

        req_body = json.dumps({
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json"
            }
        }).encode('utf-8')

        # Multi-model and Multi-key fallback execution
        models_to_try = [model, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro']
        # Deduplicate while preserving order
        ordered_models = []
        for m in models_to_try:
            if m and m not in ordered_models:
                ordered_models.append(m)

        last_error = None
        for current_model in ordered_models:
            for key in api_keys:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={key}"
                req = urllib.request.Request(url, data=req_body, headers={'Content-Type': 'application/json'})
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        resp_data = resp.read().decode('utf-8')
                        parsed = json.loads(resp_data)
                        raw_text = parsed.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '{}')
                        
                        # Parse extracted JSON
                        json_match = re.search(r'```json\s*([\s\S]*?)\s*```', raw_text)
                        clean_json_str = json_match.group(1) if json_match else raw_text
                        extracted_data = {}
                        try:
                            extracted_data = json.loads(clean_json_str)
                        except Exception:
                            pass

                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({
                            "success": True,
                            "source": "gemini_multimodal_api",
                            "model_used": current_model,
                            "raw_markdown": raw_text,
                            "data": extracted_data
                        }).encode('utf-8'))
                        return
                except Exception as e:
                    last_error = str(e)
                    continue

        self.send_response(500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({"error": f"Google Gemini Vision API error: {last_error}"}).encode('utf-8'))
