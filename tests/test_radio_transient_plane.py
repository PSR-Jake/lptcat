"""Numerical checks for the radio-transient plane (run with unittest)."""
import unittest
from io import BytesIO

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from plot_radio_transient_plane import make_radio_transient_plane, transient_coordinates


class TransientCoordinatesTest(unittest.TestCase):
    def test_observing_frequency_times_pulse_width_and_flux_times_distance_squared(self):
        # 9.05 mJy, 2.438 min, nominal 1.3 GHz, tentative 5.4 kpc.
        x, y = transient_coordinates(1.3, 2.438 * 60, 9.05e-3, 5.4)
        self.assertAlmostEqual(x, 190.164)
        self.assertAlmostEqual(y, 0.263898)

    def test_distance_range_is_squared_without_choosing_a_midpoint(self):
        x, y = transient_coordinates(2.11, 60, 1e-3, np.array([0.4, 9.1]))
        np.testing.assert_allclose(x, 126.6)
        np.testing.assert_allclose(y, [0.00016, 0.08281])

    def test_invalid_physical_inputs_are_rejected(self):
        for value in [0, -1, float("nan"), float("inf")]:
            for index in range(4):
                inputs = [1.0, 1.0, 1.0, 1.0]
                inputs[index] = value
                with self.assertRaises(ValueError):
                    transient_coordinates(*inputs)

    def test_vendored_population_tables_render_to_an_image(self):
        figure = make_radio_transient_plane()
        try:
            buffer = BytesIO()
            figure.savefig(buffer, format="png", dpi=50)
            self.assertTrue(buffer.getvalue().startswith(b"\x89PNG\r\n\x1a\n"))
        finally:
            plt.close(figure)


if __name__ == "__main__":
    unittest.main()
