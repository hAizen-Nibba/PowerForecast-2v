import unittest
from api.analyze import sanitize_model, sanitize_preset

class TestAnalyzeSanitization(unittest.TestCase):
    def test_valid_model(self):
        self.assertEqual(sanitize_model('gemini-2.0-flash'), 'gemini-2.0-flash')
        self.assertEqual(sanitize_model('gemini-1.5-pro'), 'gemini-1.5-pro')

    def test_invalid_model_injection_fallback(self):
        # Path traversal & query string injection attempts
        self.assertEqual(sanitize_model('../v1/models'), 'gemini-2.0-flash')
        self.assertEqual(sanitize_model('gemini-2.0-flash?key=injected'), 'gemini-2.0-flash')
        self.assertEqual(sanitize_model('model; rm -rf'), 'gemini-2.0-flash')
        self.assertEqual(sanitize_model(123), 'gemini-2.0-flash')
        self.assertEqual(sanitize_model(None), 'gemini-2.0-flash')

    def test_valid_preset(self):
        self.assertEqual(sanitize_preset('specs'), 'specs')
        self.assertEqual(sanitize_preset('energy_guide'), 'energy_guide')
        self.assertEqual(sanitize_preset('inverter_check'), 'inverter_check')

    def test_invalid_preset_injection_fallback(self):
        # Prompt injection / characters fallback
        self.assertEqual(sanitize_preset('specs; drop table'), 'specs')
        self.assertEqual(sanitize_preset('preset<script>'), 'specs')
        self.assertEqual(sanitize_preset('a' * 35), 'specs')
        self.assertEqual(sanitize_preset(None), 'specs')

if __name__ == '__main__':
    unittest.main()
