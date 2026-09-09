import unittest
import math
from api.calculate import compute_bill, _to_safe_float

class TestCalculateAPI(unittest.TestCase):

    def test_safe_float_conversion(self):
        self.assertEqual(_to_safe_float(100, 0.0), 100.0)
        self.assertEqual(_to_safe_float("250.5", 0.0), 250.5)
        self.assertEqual(_to_safe_float(None, 10.0), 10.0)
        self.assertEqual(_to_safe_float("invalid", 5.0), 5.0)
        self.assertEqual(_to_safe_float([1, 2], 5.0), 5.0)
        self.assertEqual(_to_safe_float(-50.0, 0.0), 0.0)
        self.assertEqual(_to_safe_float(float('nan'), 0.0), 0.0)
        self.assertEqual(_to_safe_float(float('inf'), 0.0), 0.0)

    def test_compute_bill_valid_input(self):
        result = compute_bill(200, 7.12, 100.0)
        self.assertTrue(result["success"])
        self.assertEqual(result["input"]["kwh"], 200.0)
        self.assertEqual(result["input"]["generation_rate"], 7.12)
        self.assertEqual(result["input"]["other_charges"], 100.0)
        self.assertGreater(result["summary"]["total_bill"], 0)

    def test_compute_bill_zero_kwh(self):
        result = compute_bill(0, 7.12, 0)
        self.assertTrue(result["success"])
        self.assertEqual(result["summary"]["total_bill"], 0.0)
        self.assertEqual(result["summary"]["effective_rate_per_kwh"], 0.0)

    def test_compute_bill_invalid_types(self):
        result = compute_bill("invalid_string", "bad_rate", "not_a_number")
        self.assertTrue(result["success"])
        self.assertEqual(result["input"]["kwh"], 0.0)
        self.assertEqual(result["input"]["generation_rate"], 7.12)
        self.assertEqual(result["input"]["other_charges"], 0.0)

    def test_compute_bill_negative_inputs(self):
        result = compute_bill(-500, -10, -50)
        self.assertTrue(result["success"])
        self.assertEqual(result["input"]["kwh"], 0.0)
        self.assertEqual(result["input"]["generation_rate"], 0.0)
        self.assertEqual(result["input"]["other_charges"], 0.0)

    def test_compute_bill_nan_inf_inputs(self):
        result = compute_bill(float('nan'), float('inf'), float('nan'))
        self.assertTrue(result["success"])
        self.assertEqual(result["input"]["kwh"], 0.0)
        self.assertEqual(result["input"]["generation_rate"], 7.12)
        self.assertEqual(result["input"]["other_charges"], 0.0)

if __name__ == '__main__':
    unittest.main()
