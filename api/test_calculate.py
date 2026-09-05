import unittest
import math
from api.calculate import compute_bill, validate_number

class TestCalculateApi(unittest.TestCase):
    def test_valid_compute_bill(self):
        res = compute_bill(250, 7.12, 0.0)
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 250)
        self.assertGreater(res["summary"]["total_bill"], 0)

    def test_invalid_string_input(self):
        with self.assertRaises(ValueError):
            compute_bill("invalid_kwh", 7.12, 0.0)

    def test_boolean_input(self):
        with self.assertRaises(ValueError):
            compute_bill(True, 7.12, 0.0)

    def test_negative_input(self):
        with self.assertRaises(ValueError):
            compute_bill(-50, 7.12, 0.0)

    def test_nan_input(self):
        with self.assertRaises(ValueError):
            compute_bill(float("nan"), 7.12, 0.0)

    def test_infinity_input(self):
        with self.assertRaises(ValueError):
            compute_bill(float("inf"), 7.12, 0.0)

    test_exceeds_max = lambda self: self.assertRaises(ValueError, compute_bill, 2000000, 7.12, 0.0)

if __name__ == "__main__":
    unittest.main()
