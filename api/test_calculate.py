import unittest
import math
from api.calculate import compute_bill, parse_non_negative_float

class TestCalculateAPI(unittest.TestCase):
    def test_compute_bill_valid(self):
        res = compute_bill(100, 7.12, 0.0)
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 100.0)
        self.assertGreater(res["summary"]["total_bill"], 0)

    def test_compute_bill_defaults(self):
        res = compute_bill(0)
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 0.0)
        self.assertEqual(res["summary"]["total_bill"], 0.0)

    def test_parse_non_negative_float_invalid_string(self):
        with self.assertRaises(ValueError) as ctx:
            parse_non_negative_float("invalid", "kwh")
        self.assertIn("must be a valid numeric value", str(ctx.exception))

    def test_parse_non_negative_float_boolean(self):
        with self.assertRaises(ValueError) as ctx:
            parse_non_negative_float(True, "kwh")
        self.assertIn("cannot be a boolean value", str(ctx.exception))

    def test_parse_non_negative_float_negative(self):
        with self.assertRaises(ValueError) as ctx:
            parse_non_negative_float(-50, "kwh")
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_parse_non_negative_float_nan_inf(self):
        with self.assertRaises(ValueError) as ctx:
            parse_non_negative_float(float('nan'), "kwh")
        self.assertIn("must be a finite number", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            parse_non_negative_float(float('inf'), "kwh")
        self.assertIn("must be a finite number", str(ctx.exception))

    def test_parse_non_negative_float_exceeds_limit(self):
        with self.assertRaises(ValueError) as ctx:
            parse_non_negative_float(20000000.0, "kwh")
        self.assertIn("exceeds maximum allowable limit", str(ctx.exception))

if __name__ == "__main__":
    unittest.main()
