import os

def get_allowed_origin(origin):
    """
    Security: Validates request origin against allowed origins list or standard domain patterns.
    Prevents overly permissive CORS wildcard headers (*) from exposing API endpoints.
    """
    if not origin:
        return None

    env_allowed = os.environ.get('ALLOWED_ORIGINS', '')
    if env_allowed:
        allowed_list = [o.strip() for o in env_allowed.split(',') if o.strip()]
        if origin in allowed_list:
            return origin
        return None

    # Default fallback origin rules for PowerForecast deployment and local development
    clean_origin = origin.strip().lower()
    if clean_origin.startswith('http://localhost:') or clean_origin.startswith('http://127.0.0.1:'):
        return origin
    if clean_origin.endswith('.vercel.app') or clean_origin == 'https://vercel.app':
        return origin

    return None

def send_cors_headers(handler_inst, methods='GET, POST, OPTIONS'):
    """
    Security: Sets strict, origin-validated CORS headers instead of wildcards.
    """
    origin = handler_inst.headers.get('Origin', '')
    allowed = get_allowed_origin(origin)
    if allowed:
        handler_inst.send_header('Access-Control-Allow-Origin', allowed)
        handler_inst.send_header('Vary', 'Origin')
    handler_inst.send_header('Access-Control-Allow-Methods', methods)
    handler_inst.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
