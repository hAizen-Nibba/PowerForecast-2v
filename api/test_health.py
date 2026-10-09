import json
import unittest
from unittest.mock import MagicMock, patch

import api.health as health


class TestHealthHandlerSecurity(unittest.TestCase):
    def setUp(self):
        self.mock_wfile = MagicMock()
        self.handler = health.handler.__new__(health.handler)
        self.handler.headers = {}
        self.handler.wfile = self.mock_wfile
        self.handler.send_response = MagicMock()
        self.handler.send_header = MagicMock()
        self.handler.end_headers = MagicMock()

    @patch('api.health.get_gemini_api_keys', return_value=['key_1', 'key_2'])
    def test_health_response_does_not_leak_env_var_names(self, mock_keys):
        self.handler.do_GET()

        # Capture response payload written to wfile
        self.assertTrue(self.mock_wfile.write.called)
        written_bytes = self.mock_wfile.write.call_args[0][0]
        data = json.loads(written_bytes.decode('utf-8'))

        # Verify operational keys are present
        self.assertEqual(data.get('status'), 'ok')
        self.assertTrue(data.get('serverHasKey'))
        self.assertEqual(data.get('keyCount'), 2)

        # Assert internal env var disclosure fields are NOT in response
        self.assertNotIn('detectedSources', data)
        self.assertNotIn('keyNameDetected', data)


if __name__ == '__main__':
    unittest.main()
