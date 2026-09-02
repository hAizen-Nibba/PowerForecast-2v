import unittest
import math
from api.calculate import compute_bill, parse_finite_float

class TestCalculateAPI(unittest.TestCase):
    def test_compute_bill_valid(self):
        res = compute_bill(100, 7.12, 10.0)
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 100.0)
        self.assertEqual(res["input"]["generation_rate"], 7.12)
        self.assertEqual(res["input"]["other_charges"], 10.0)
        self.assertGreater(res["summary"]["total_bill"], 0)

    def test_compute_bill_defaults(self):
        res = compute_bill(None)
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 0.0)

    def test_parse_finite_float_invalid_type(self):
        with self.assertRaises(ValueError):
            parse_finite_float("invalid_string", "kwh")

    def test_parse_finite_float_nan(self):
        with self.assertRaises(ValueError):
            parse_finite_float(float('nan'), "kwh")

    def test_parse_finite_float_inf(self):
        with self.assertRaises(ValueError):
            parse_finite_float(float('inf'), "kwh")

    def test_parse_finite_float_negative(self):
        with self.assertRaises(ValueError):
            parse_finite_float(-10, "kwh")

    def test_parse_finite_float_exceeds_max(self):
        with self.assertRaises(ValueError):
            parse_finite_float(10000000, "kwh", max_val=1000000.0)

if __name__ == "__main__":
    unittest.main()
