# LPT-Cat  
**Long-Period Radio Transient Catalog**

<img src="lptcat-logo.png" alt="LPT-Cat logo" width="120">

LPT-Cat is a curated, literature-based catalog of **long-period radio transients (LPTs)** — a recently recognized and still mysterious population of radio sources characterized by **minute- to hour-long periodicities**.

The catalog compiles published LPTs from the literature and presents their key observational properties in a searchable, web-based format.

🌐 **Live site:** https://psr-jake.github.io/lptcat/

---

## Contents

The catalog includes, when available:

- Source name
- Equatorial and Galactic coordinates (with uncertainties)
- Spin period and spin-down constraints
- Dispersion measure (DM) and rotation measure (RM)
- Duty cycle
- Notes
- Discovery and follow-up references

Measurement uncertainties and upper limits on spin-down rates are quoted at the **1σ level** when available.  

---

## Repository Structure
```
lptcat/  
├── index.html          # Main webpage  
├── style.css           # Styling and layout  
├── script.js           # Table rendering, search, and interactivity  
├── LPTs.csv            # Main catalog data  
├── updates.csv         # Update history  
├── lpt_distribution.png  
├── lptcat-logo.png  
├── icon.png  
└── README.md  
```
---

## Usage

### View the catalog
Simply visit the live site:

👉 https://psr-jake.github.io/lptcat/

### Download the data
The full catalog is available as a CSV file:

- `LPTs.csv`

---

## Citation & Acknowledgement

If you use information from **LPT-Cat** in your research, please:

1. **Cite the original discovery and follow-up papers** listed in the *References* column of the table.
2. Acknowledge the use of this catalog by giving the catalog web address (https://psr-jake.github.io/lptcat/).

Thank you!

---

## Contributing

Corrections, new sources, or missing information are very welcome.

If you notice:
- Errors in source parameters
- Missing literature
- New LPT discoveries

please contact:

📧 **zhao27[AT]tsinghua.edu.cn**

or open an issue / pull request on GitHub.

---

## Maintainer

**Jiaqi (Jake) Zhao**  
Postdoctoral Fellow  
Tsinghua University  

🔗 Personal website: https://psr-jake.github.io  

---

## License

This project is intended for **academic and research use**.  
All source data remain subject to the licenses and citation requirements of the original publications.
