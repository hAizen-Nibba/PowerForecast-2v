import unittest
from api.calculate import compute_bill, validate_number

class TestCalculateApi(unittest.TestCase):
    def test_compute_bill_valid(self):
        res = compute_bill(100, 7.12, 10)
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 100.0)
        self.assertEqual(res["input"]["generation_rate"], 7.12)
        self.assertEqual(res["input"]["other_charges"], 10.0)
        self.assertIn("total_bill", res["summary"])

    def test_compute_bill_defaults(self):
        res = compute_bill()
        self.assertTrue(res["success"])
        self.assertEqual(res["input"]["kwh"], 0.0)
        self.assertEqual(res["input"]["generation_rate"], 7.12)
        self.assertEqual(res["input"]["other_charges"], 0.0)

    def test_negative_values(self):
        with self.assertRaises(ValueError) as ctx:
            compute_bill(-100, 7.12, 0)
        self.assertIn("cannot be negative", str(ctx.exception))

    def test_invalid_types(self):
        with self.assertRaises(ValueError) as ctx:
            compute_bill("abc", 7.12, 0)
        self.assertIn("Invalid numeric value", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            compute_bill(True, 7.12, 0)
        self.assertIn("Invalid type", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            compute_bill([123], 7.12, 0)
        self.assertIn("Invalid type", str(ctx.exception))

    def test_nan_and_infinity(self):
        with self.assertRaises(ValueError) as ctx:
            compute_bill(float('nan'), 7.12, 0)
        self.assertIn("must be a finite number", str(ctx.exception))

        with self.assertRaises(ValueError) as ctx:
            compute_bill(float('inf'), 7.12, 0)
        self.assertIn("must be a finite number", str(ctx.exception))

if __name__ == '__main__':
    unittest.main()
