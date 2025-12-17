document.addEventListener("DOMContentLoaded", () => {
  const table = document.getElementById("lpt-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  const searchInput = document.getElementById("search");

  let data = [];
  let headers = [];
  let sortKey = null;
  let sortAsc = true;

  /* ===============================
     Utility functions
  =============================== */

  function sexagesimalToDegrees(decStr) {
    if (!decStr || !decStr.includes(":")) return NaN;
    const sign = decStr.trim().startsWith("-") ? -1 : 1;
    const parts = decStr.replace(/[+-]/, "").split(":").map(Number);
    return sign * (parts[0] + parts[1] / 60 + parts[2] / 3600);
  }

  function formatRADec(val, errArcsec, type, decVal = null) {
    if (!val || !errArcsec || errArcsec === "-" || errArcsec === "") return val;

    const err = parseFloat(errArcsec);
    if (isNaN(err)) return val;

    // Declination: arcsec uncertainty
    if (type === "Dec") {
      return `${val}(${err}″)`;
    }

    // Right Ascension: convert arcsec → seconds of time
    if (type === "RA" && decVal) {
      const decDeg = sexagesimalToDegrees(decVal);
      if (isNaN(decDeg)) return val;
      const errSec = err / (15 * Math.cos((decDeg * Math.PI) / 180));
      return `${val}(${errSec.toFixed(3)}s)`;
    }

    return val;
  }

  function formatValueError(val, err) {
    if (!val || val === "-" || !err || err === "-") return val;

    const v = parseFloat(val);
    const e = parseFloat(err);
    if (isNaN(v) || isNaN(e)) return val;

    const vDec = (val.split(".")[1] || "").length;
    const eDec = (err.split(".")[1] || "").length;
    const decimals = Math.max(vDec, eDec);

    return `${v.toFixed(decimals)}(${e
      .toFixed(decimals)
      .replace(/^0\./, "")})`;
  }

  /* ===============================
     Render table
  =============================== */

  function renderTable(rows) {
    tbody.innerHTML = "";

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      headers.forEach((h) => {
        if (h.endsWith("_err")) return;

        const td = document.createElement("td");
        let value = row[h];

        if (h === "R.A. (J2000)") {
          value = formatRADec(
            row[h],
            row["R.A._err"],
            "RA",
            row["Dec. (J2000)"]
          );
        } else if (h === "Dec. (J2000)") {
          value = formatRADec(row[h], row["Dec._err"], "Dec");
        } else if (row[`${h}_err`]) {
          value = formatValueError(row[h], row[`${h}_err`]);
        }

        // Reference column → clickable arXiv links
        if (h.toLowerCase().includes("reference") && value) {
          value.split(";").forEach((r, i) => {
            const a = document.createElement("a");
            a.href = `https://arxiv.org/abs/${r.trim()}`;
            a.target = "_blank";
            a.textContent = r.trim();
            a.style.marginRight = "0.5em";
            td.appendChild(a);
          });
        } else {
          td.textContent = value || "–";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function renderHeader() {
    thead.innerHTML = "";
    const tr = document.createElement("tr");

    headers.forEach((h) => {
      if (h.endsWith("_err")) return;

      const th = document.createElement("th");
      th.textContent = h;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => {
        sortAsc = sortKey === h ? !sortAsc : true;
        sortKey = h;
        sortAndRender();
      });

      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  function sortAndRender() {
    let rows = [...data];

    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey] || "";
        const bv = b[sortKey] || "";
        const na = parseFloat(av);
        const nb = parseFloat(bv);

        if (!isNaN(na) && !isNaN(nb)) {
          return sortAsc ? na - nb : nb - na;
        }
        return sortAsc
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      });
    }

    const q = searchInput.value.toLowerCase();
    rows = rows.filter((r) =>
      Object.values(r).some((v) =>
        v && v.toLowerCase().includes(q)
      )
    );

    renderTable(rows);
  }

  /* ===============================
     Load CSV
  =============================== */

  fetch("LPTs.csv")
    .then((res) => res.text())
    .then((text) => {
      const lines = text.split("\n").filter(Boolean);
      headers = lines[0].split(",").map((h) => h.trim());

      data = lines.slice(1).map((line) => {
        const cols = line.split(",");
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i]?.trim()));
        return obj;
      });

      renderHeader();
      sortAndRender();
    });

  searchInput.addEventListener("input", sortAndRender);
});
