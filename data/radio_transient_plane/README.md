# Radio-transient-plane data

The website figure is generated offline by `plot_radio_transient_plane.py`, also
accessible from the radio-transient-plane section of `LPT_plots.ipynb`.
Inputs were checked on **2026-10-15**. The main catalogue `LPTs.csv` is unchanged.

## Provenance and reproduction

The plotting code and comparison populations are adapted from
[Nanda Rea's Figure 1 notebook](https://github.com/nandarea/LPT_Review_2026/blob/06351511c146739fb006b37a193d25038d14aa87/Figure1_RadioTransientPlane_LPTreview/Radio_transient_plane_Nanda.ipynb)
in `nandarea/LPT_Review_2026`, pinned to commit
`06351511c146739fb006b37a193d25038d14aa87` (repository head dated 2026-06-03).
The review itself appeared in January 2026 and was revised in February;
discovery-paper dates, rather than observing epochs, define newer sources here.
The consumed upstream inputs are copied unchanged under `upstream/`, together
with the repository's CC0-1.0 license. No upstream notebook is executed at runtime.

Please cite [Keane (2018)](https://ui.adsabs.harvard.edu/abs/2018NatAs...2..865K/abstract)
and [Rea, Hurley-Walker & Caleb (2026)](https://arxiv.org/abs/2601.10393), as requested
by the upstream authors. Their background compilation also credits
[Nimmo et al. (2022)](https://doi.org/10.1038/s41550-021-01569-9),
[Hurley-Walker et al. (2022)](https://arxiv.org/abs/2503.08033),
[Rea et al. (2022)](https://arxiv.org/abs/2210.01903), and
[Wang et al. (2025)](https://arxiv.org/abs/2411.16606).
Cite the original papers for any individual source used in research.

Run from the repository root:

```sh
python plot_radio_transient_plane.py
python -m unittest discover -s tests
```

Requires NumPy, pandas, and Matplotlib. The script locates its data relative to
its own file and writes `images/radio_transient_plane.png`.

## Axes and interpretation

- Horizontal: observing frequency in **GHz** times **pulse width in seconds**.
  The repetition/spin/orbital period is not used.
- Vertical: **Sν d² in Jy kpc²**, a spectral pseudo-luminosity. There is no
  4π factor. We omit the upstream secondary axis to avoid confusing this proxy
  with isotropic spectral luminosity (which would be 4π Sν d² after conversion).
- The upstream `input_data_keane_plot.csv` column headed `ergs s-1 hz-1` already
  contains Jy kpc², as explicitly noted in the original notebook. We relabel it
  without converting the numbers. The separate X-ray binary and Nimmo tables
  retain the notebook's conversions and adopted distances.
- Dotted lines and shading follow the review's light-travel-time convention,
  `Sν d² = 2 k_B Tb (ν W)²`, with the appropriate GHz/Jy/kpc unit conversion.
  The shaded region has Tb below 10¹² K. This uses the observed width as a
  light-crossing scale; it is not a measurement of an LPT emission-region size.
- Inputs are heterogeneous: effective widths, FWHM, and tabulated durations
  coexist. Mean-profile peaks and tabulated Stokes I pulse fluxes are explicitly
  identified below. These are representative observations, not a uniform or
  complete pulse census. No bolometric luminosity or spectral correction is made.

The adaptation retains the review populations and hard-coded WD-pulsar points.
It plots the review's 218-row LPT pulse table once; the duplicate GLEAM-X table
overlay in the original notebook is not drawn a second time. The separately
hard-coded GLEAM-X point (0.077 GHz s, 50 Jy kpc²) is retained. The background is
not a fresh survey of all classes of radio transients.

All LPT measurements use the same green cross, with no individual-source labels
or connecting lines. Where a distance range is supplied, crosses mark its two
bounds for the same measurement; these are not independent detections. A single
adopted distance gives one cross. No midpoint or preferred distance is invented.

## Added pulse measurements

`additional_lpt_pulses.csv` contains the explicit physical inputs, reference URL,
and interpretation for each representative added pulse. Distances are not
estimated from the catalogue DM by this script.

| Source | Adopted inputs and provenance |
| --- | --- |
| ASKAP J1755−2527 | [McSweeney et al. (2025), Table 3](https://arxiv.org/abs/2507.14448): ASKAP MJD 59965, 888 MHz, 0.184 Jy, unscattered Gaussian σ = 29.1 s, converted to FWHM = 68.526 s. The 4.7 kpc YMW16 distance follows [Dobie et al. (2024)](https://arxiv.org/abs/2406.12352). |
| CHIME J0630+25 | [Dong et al., Table 1 and distance discussion](https://arxiv.org/abs/2407.07480): burst 59341A, effective width 600 ms, fluence 800 Jy ms, so peak flux = 1.333 Jy. We use the 600 MHz centre of the 400–800 MHz band and plot the endpoints of the published 0.07–0.48 kpc **95.4% distance interval**, not a 1σ error bar. |
| ASKAP J1839−0756 | [Lee et al. (2025), Table 1 and Figure 4](https://arxiv.org/abs/2501.09133): the same 2024-02-18 main pulse at UHF (816 MHz, 1.8 Jy, FWHM 286.4 s) and S band (2187.5 MHz, 0.10 Jy, FWHM 148.4 s). The 3.7–4.2 kpc bounds span the two DM models, not a statistical interval. |
| CHIME/ILT J1634+44 | [Dong et al. (2025), Table 2 and Appendix A.2](https://arxiv.org/abs/2507.05139): CHIME/Pulsar burst MJD 60336.66665, effective width 400 ms, peak Stokes I flux 12 Jy, nominal band centre 600 MHz. Bounds use this paper's 1.4–3.0 kpc NE2001/YMW16 estimates. |
| LPT J1555−5631 | [Hyman et al. (2026), Table 2 and Section II.2](https://arxiv.org/abs/2609.34102): mean-profile MP/IP peaks 9.05/9.04 mJy and FWHM 2.438/0.663 min. Nominal frequency 1.3 GHz represents the combined ASKAP 1.367 GHz and MeerKAT L-band profile; it is not an independently fitted effective frequency. The **tentative** 5.4 kpc distance comes from neighbouring pulsars with comparable RM. The same green cross is used as for all other LPTs; no uncertainty interval is invented. |

### Retained data: ASKAP J1745−5051 (not plotted)

`j1745_pulses.csv` is an unchanged copy of
[`Supplementary_Table_1.csv`, Zenodo record 17365566](https://zenodo.org/records/17365566)
for [Rose et al. (2026)](https://arxiv.org/abs/2606.04232). The record also contains
the authors' dynamic-spectrum data and is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit Rose et al. and
the linked Zenodo record when reusing these pulse data.

The source is currently omitted from the radio-transient plane because the
paper's conservative **0.4–9.1 kpc** distance bounds leave its pseudo-luminosity
poorly constrained. Both formerly plotted distance endpoints for all 61 pulse
rows are removed. The unchanged 62-row raw table remains available for provenance;
it includes `obs2`, identified as quiescent in the paper. The main catalogue entry
is retained.

## Catalogue coverage and omissions

The inherited review pulse table covers GLEAM-X J1627−5235, GPM J1839−10,
ASKAP J1935+2148, ILT J1101+5521, and ASKAP/DART J1832−0911. The upstream `grt`
background point represents GCRT J1745−3009; its assumed distance is inherited
from the review compilation and is not independently established here.
Together with the five sources added above, **11 of the current 17 catalogue
sources** are represented. The following are intentionally not placed at an
invented distance or paired with an unrelated pulse measurement:

| Source | Reason and reference |
| --- | --- |
| ASKAP J1745−5051 | Omitted because the conservative 0.4–9.1 kpc distance bounds in [Rose et al. (2026)](https://arxiv.org/abs/2606.04232) leave its position on the vertical axis poorly constrained. The raw pulse data are retained as described above. |
| GLEAM-X J0704−37 | Absent from the upstream Figure 1 pulse table. The [discovery paper](https://arxiv.org/abs/2408.15757) reports a 30 s discovery pulse at 103–134 MHz and an adopted 1.5 ± 0.5 kpc distance, but no tabulated peak flux for that pulse. A matched calibrated pulse measurement is needed to add it. |
| ASKAP J1448−6856 | No robust distance: [discovery](https://arxiv.org/abs/2507.13453) and [2026 optical follow-up, Section 3.3](https://arxiv.org/abs/2609.35980). The latter gives donor-model-dependent limits and a 1 kpc illustrative SED model, not a measured distance. |
| ASKAP J1424−6126 | [Pritchard et al. (2026)](https://arxiv.org/abs/2603.07857) report DM ≈ 1400 pc cm⁻³ but explicitly allow intrinsic frequency-dependent morphology to mimic dispersion. No usable distance is supplied; we do not derive one from that ambiguous DM. |
| ASKAP J1651−4505 | [Wang et al. (2026), Section 4.1.1](https://arxiv.org/abs/2606.20067): no measurable DM or counterpart distance. |
| ASKAP J1700−4457 | [Wang et al. (2026), Section 4.1.2](https://arxiv.org/abs/2606.20067): no usable distance. |

Measurement/flux uncertainties are not drawn as a uniform error model: the
original sample has no such model, and the quoted bounds have different meanings.
Consult the row notes and original papers before using these points quantitatively.
