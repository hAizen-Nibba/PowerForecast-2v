import unittest
import math
from api.calculate import compute_bill

class TestCalculateAPI(unittest.TestCase):

    def test_valid_input(self):
        result, err = compute_bill(100, 7.12, 0.0)
        self.assertIsNone(err)
        self.assertTrue(result["success"])
        self.assertEqual(result["input"]["kwh"], 100.0)
        self.assertGreater(result["summary"]["total_bill"], 0)
        self.assertGreater(result["summary"]["effective_rate_per_kwh"], 0)

    def test_zero_kwh(self):
        result, err = compute_bill(0, 7.12, 0.0)
        self.assertIsNone(err)
        self.assertTrue(result["success"])
        self.assertEqual(result["summary"]["effective_rate_per_kwh"], 0.0)

    def test_fractional_kwh(self):
        result, err = compute_bill(0.5, 7.12, 0.0)
        self.assertIsNone(err)
        self.assertTrue(result["success"])
        # Effective rate for 0.5 kWh should equal total_bill / 0.5, not total_bill / 1
        expected_rate = round(result["summary"]["total_bill"] / 0.5, 4)
        self.assertEqual(result["summary"]["effective_rate_per_kwh"], expected_rate)

    def test_invalid_type_string(self):
        result, err = compute_bill("invalid_string", 7.12, 0.0)
        self.assertIsNone(result)
        self.assertIn("Invalid parameter type", err)

    def test_invalid_type_list(self):
        result, err = compute_bill([100], 7.12, 0.0)
        self.assertIsNone(result)
        self.assertIn("Invalid parameter type", err)

    def test_negative_kwh(self):
        result, err = compute_bill(-10, 7.12, 0.0)
        self.assertIsNone(result)
        self.assertIn("non-negative", err)

    def test_nan_input(self):
        result, err = compute_bill(float('nan'), 7.12, 0.0)
        self.assertIsNone(result)
        self.assertIn("NaN or Infinity", err)

    def test_infinity_input(self):
        result, err = compute_bill(float('inf'), 7.12, 0.0)
        self.assertIsNone(result)
        self.assertIn("NaN or Infinity", err)

    def test_exceed_max_limits(self):
        result, err = compute_bill(2_000_000, 7.12, 0.0)
        self.assertIsNone(result)
        self.assertIn("exceeds maximum allowed limits", err)

if __name__ == '__main__':
    unittest.main()
