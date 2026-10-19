"""Reproduce the catalogue radio-transient plane from the vendored review data.

Adapted from nandarea/LPT_Review_2026, commit 06351511c146739fb006b37a193d25038d14aa87.
See data/radio_transient_plane/README.md for references and measurement conventions.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "radio_transient_plane"
LPT_COLOR = "#13835b"


def transient_coordinates(frequency_ghz, width_s, flux_jy, distance_kpc):
    """Return nu W [GHz s] and S_nu d^2 [Jy kpc^2], without a 4 pi factor."""
    frequency_ghz, width_s, flux_jy, distance_kpc = np.broadcast_arrays(
        frequency_ghz, width_s, flux_jy, distance_kpc
    )
    for values in (frequency_ghz, width_s, flux_jy, distance_kpc):
        if not np.all(np.isfinite(values) & (values > 0)):
            raise ValueError("Frequency, pulse width, flux and distance must be finite and positive")
    return frequency_ghz * width_s, flux_jy * distance_kpc**2


def make_radio_transient_plane():
    """Draw the review comparison populations and literature-backed LPT additions."""
    upstream = DATA / "upstream"
    background = pd.read_csv(upstream / "input_data_keane_plot.csv")
    # The upstream column header is wrong: these numbers are already Jy kpc^2.
    background = background.rename(columns={"ergs s-1 hz-1": "Jy kpc2"})
    fig, ax = plt.subplots(figsize=(14, 9), dpi=220)
    ax.set(xscale="log", yscale="log", xlim=(1e-9, 1e10), ylim=(1e-10, 1e17))

    # Same light-travel-time brightness-temperature convention as the review.
    # 2 k_B (GHz)^2 / (Jy kpc^2) = 2.8999e-18 K^-1 s^-2.
    x = np.logspace(-9, 10, 500)
    tb_coefficient = 2 * 1.380649e-23 * 1e18 / (1e-26 * 3.085677581491367e19**2)
    ax.fill_between(x, 1e-10, 1e12 * tb_coefficient * x**2, color="#e0fafa", zorder=-10)
    for power in range(4, 41, 4):
        ax.plot(x, 10.0**power * tb_coefficient * x**2,
                color="0.55", lw=0.6, ls=(0, (1, 7)), zorder=-9)
    temperature_labels = []
    for power, xpos in [(4, 1e8), (12, 3e5), (20, 1e3), (28, 8)]:
        temperature_labels.append(ax.annotate(
            rf"$10^{{{power}}}$ K", xy=(xpos, 10.0**power * tb_coefficient * xpos**2),
            xytext=(0, 5), textcoords="offset points", fontsize=11, color="0.3",
            rotation_mode="anchor", va="bottom",
        ))

    # Reference class styles, with labels moved clear of the additional LPTs.
    classes = [
        ("psrs_2", "Pulsars", "black", ".", 9, 4e-5, 5e-5),
        ("crab_nanogiant", "Nano pulses", "dimgray", "X", 24, 4e-9, 8e5),
        ("rrats_nohead", "RRATs", "gray", "o", 15, 0.08, 0.05),
        ("solar_vals", "Solar flares", "#8b8037", "o", 20, 1, 2e-6),
        ("GRPs_vals", "Giant pulses", "dimgray", ".", 12, 3e-6, 4),
        ("misc", "Low-mass stars", "saddlebrown", "o", 20, 5, 8e-9),
        ("jupyter", "Jupiter", "#987546", "o", 24, 0.005, 5e-10),
        ("frbs_vals_to_plot", "Fast radio bursts", "#193b86", "*", 34, 1e-4, 4e15),
        ("Gosia_RSCVn2", "RS CVn", "tomato", "o", 20, 1e6, 0.001),
        ("Gosia_Novae2", "Novae", "firebrick", "o", 20, 1e7, 0.1),
        ("Gosia_MagCV2", "Magnetic CVs", "#b84444", "o", 20, 1e4, 5e-5),
        ("gw170817", "GW170817", "#ad5caa", "o", 24, 4e7, 3e4),
        ("Gosia_SN2", "Supernovae", "purple", "o", 24, 1e8, 2e7),
        ("Gosia_GRB2", "GRBs", "blueviolet", "o", 24, 2e7, 8e11),
        ("Gosia_AGN_QSO_Blazar_TDE2", "AGN / blazars", "#ad536b", "o", 24, 2e6, 1e16),
        ("Gosia_flare_stars2", None, "saddlebrown", "o", 20, 0, 0),
        ("SGR1935+2154", None, "royalblue", "*", 65, 0, 0),
    ]
    for key, label, color, marker, size, label_x, label_y in classes:
        rows = background[background["source"] == key]
        ax.scatter(rows["GHz s"], rows["Jy kpc2"], color=color,
                   marker=marker, s=size, alpha=0.7, linewidths=0.3, zorder=1)
        if label:
            ax.text(label_x, label_y, label if label in {"RRATs", "GRBs", "RS CVn"} else label.upper(),
                    color=color, fontsize=11)

    magnetars = pd.read_csv(upstream / "Radio_magnetar_data.txt", sep=";")
    mx, my = transient_coordinates(magnetars["nu (GHz)"], magnetars["Width [s]"],
                                   magnetars["Jy"], magnetars["Distance (kpc)"])
    ax.scatter(mx, my, color="royalblue", marker="*", s=65, alpha=0.85, zorder=3)
    ax.text(0.00155, 1e5, "RADIO MAGNETARS", color="royalblue", fontsize=11)

    nimmo = upstream / "kenzie_nimo"
    for name, distance in [("crab_giant.txt", 2), ("crab_giant.ip.txt", 2),
                           ("frb121102.txt", 972e3), ("frb180916.txt", 149e3),
                           ("frb190711.txt", 2700e3), ("frb180916_micro.txt", 149e3),
                           ("m81_nano.txt", 3.6e3)]:
        values = np.loadtxt(nimmo / name, ndmin=2)
        nx, ny = transient_coordinates(values[:, 0], values[:, 1] * 1e-3,
                                       values[:, 2] / values[:, 1], distance)
        crab = name.startswith("crab")
        ax.scatter(nx, ny, color="dimgray" if crab else "#193b86",
                   marker="." if crab else "*", s=10 if crab else 24,
                   alpha=0.25 if crab else 0.65, zorder=0 if crab else 2)
    for name, color, marker, size in [("crab_nano.txt", "dimgray", "X", 24),
                                       ("sgr1935.txt", "royalblue", "*", 65)]:
        values = np.loadtxt(nimmo / name, ndmin=2)
        # The magnetar table has y then x; the nanoshot table has x then y.
        px, py = (values[:, 1], values[:, 0]) if name == "sgr1935.txt" else values.T
        ax.scatter(px, py, color=color, marker=marker, s=size, alpha=0.8, zorder=3)
    xrb = np.loadtxt(upstream / "Gosia_XRB2", usecols=(1, 6, 8))
    ax.scatter(xrb[:, 0] * xrb[:, 2] * 86400, xrb[:, 1] * 1.05026e-20,
               color="orange", s=24, alpha=0.45)
    ax.text(5e5, 8e3, "X-RAY BINARIES", color="#bc7900", fontsize=11)
    ax.scatter([84, 41.34], [1.46e-4, 6.7e-4], color="#d3a81b", marker="X", s=65,
               edgecolor="0.4", linewidth=0.4, zorder=4)
    ax.text(20, 1e-5, "WD PULSARS", color="#987000", fontsize=11)

    pulses = pd.read_csv(upstream / "lpt_pulses.csv")
    gcrt = background[background["source"] == "grt"]
    lpt_x = [*pulses["x"], *gcrt["GHz s"], 0.077]
    lpt_y = [*pulses["y"], *gcrt["Jy kpc2"], 50]

    additions = pd.read_csv(DATA / "additional_lpt_pulses.csv")
    for row in additions.itertuples(index=False):
        # Retain distance bounds without inventing a preferred distance.
        distances = np.unique([row.distance_min_kpc, row.distance_max_kpc])
        px, py = transient_coordinates(row.frequency_ghz, row.width_s, row.flux_jy,
                                       distances)
        lpt_x.extend(px)
        lpt_y.extend(py)

    # ASKAP J1745-5051 is omitted because its distance is poorly constrained;
    # the retained pulse data and 0.4--9.1 kpc bounds are documented in the notes.
    ax.scatter(lpt_x, lpt_y, color=LPT_COLOR, marker="X", s=33,
               edgecolor="white", linewidth=0.25, alpha=0.9, zorder=5)
    ax.text(0.25, 2e3, "LONG-PERIOD TRANSIENTS", color=LPT_COLOR, fontsize=12)

    ax.set_xlabel(r"Observing frequency $\times$ pulse width, $\nu W$ (GHz s)", fontsize=13)
    ax.set_ylabel(r"$S_\nu d^2$ (Jy kpc$^2$)", fontsize=13)
    ax.tick_params(which="both", direction="in", top=True, right=True, labelsize=10)
    fig.tight_layout()
    # Match the displayed slope after layout, including the log-axis aspect ratio.
    guide_points = ax.transData.transform([[1, tb_coefficient * 1e20],
                                          [10, tb_coefficient * 1e22]])
    delta = guide_points[1] - guide_points[0]
    angle = np.degrees(np.arctan2(delta[1], delta[0]))
    for label in temperature_labels:
        label.set_rotation(angle)
    return fig


if __name__ == "__main__":
    figure = make_radio_transient_plane()
    output = ROOT / "images" / "radio_transient_plane.png"
    figure.savefig(output, bbox_inches="tight")
    plt.close(figure)
    print(f"Saved {output}")
