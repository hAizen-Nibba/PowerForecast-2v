# Alias router for /api/email pointing to send_email handler
import sys

if __name__ == 'email' and not hasattr(sys.modules.get('email'), 'message'):
    import importlib
    for path in sys.path:
        if path and path != '.' and not path.endswith('/api') and path != '/app':
            try:
                spec = importlib.machinery.PathFinder.find_spec('email', [path])
                if spec and spec.origin and 'api/email.py' not in spec.origin:
                    mod = spec.loader.load_module('email')
                    sys.modules['email'] = mod
                    globals().update(mod.__dict__)
                    break
            except Exception:
                pass

from api.send_email import handler

__all__ = ['handler']
