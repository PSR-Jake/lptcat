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
     CONFIG
  =============================== */
  // Do not show errors for these columns
  const IGNORE_ERROR_FOR = ["gal_l", "gal_b"];

  /* ===============================
     CSV parsing (safe)
  =============================== */
  function parseCSVLine(line) {
    const out = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        out.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    out.push(current.trim());
    return out;
  }

  /* ===============================
     Header detection
  =============================== */
  function findHeader(patterns) {
    return headers.find(h =>
      patterns.some(p => h.toLowerCase().includes(p))
    );
  }

  function shouldIgnoreError(header) {
    return IGNORE_ERROR_FOR.some(k =>
      header.toLowerCase().includes(k)
    );
  }

  /* ===============================
     Formatting helpers
  =============================== */
  function formatValueError(val, err) {
    if (!val || !err || val === "-" || err === "-") return val;

    const v = parseFloat(val);
    const e = parseFloat(err);
    if (isNaN(v) || isNaN(e)) return val;

    const d = Math.max(
      (val.split(".")[1] || "").length,
      (err.split(".")[1] || "").length
    );

    return `${v.toFixed(d)}(${e.toFixed(d).replace(/^0\./, "")})`;
  }

  function formatDec(val, errArcsec) {
    if (!val || !errArcsec || errArcsec === "-") return val;
    const e = parseFloat(errArcsec);
    if (isNaN(e)) return val;
    return `${val}(${e}″)`;
  }

  /* ===============================
     Render functions
  =============================== */
  function renderHeader(displayHeaders) {
    thead.innerHTML = "";
    const tr = document.createElement("tr");

    displayHeaders.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      th.style.cursor = "pointer";
      th.onclick = () => {
        sortAsc = sortKey === h ? !sortAsc : true;
        sortKey = h;
        sortAndRender(displayHeaders);
      };
      tr.appendChild(th);
    });

    thead.appendChild(tr);
  }

  function renderTable(rows, displayHeaders, raCol, raErrCol, decCol, decErrCol) {
    tbody.innerHTML = "";

    rows.forEach(row => {
      const tr = document.createElement("tr");

      displayHeaders.forEach(h => {
        const td = document.createElement("td");
        let val = row[h];

        if (h === raCol && row[raErrCol]) {
          // RA errors already in seconds of time
          val = formatValueError(val, row[raErrCol]);
        } else if (h === decCol && row[decErrCol]) {
          val = formatDec(val, row[decErrCol]);
        } else if (
          !shouldIgnoreError(h) &&
          row[`${h}_err`]
        ) {
          val = formatValueError(val, row[`${h}_err`]);
        }

        if (h.toLowerCase().includes("ref") && val) {
          val.split(";").forEach(r => {
            const a = document.createElement("a");
            a.href = `https://arxiv.org/abs/${r.trim()}`;
            a.target = "_blank";
            a.textContent = r.trim();
            a.style.marginRight = "0.5em";
            td.appendChild(a);
          });
        } else {
          td.textContent = val || "–";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function sortAndRender(displayHeaders) {
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
    rows = rows.filter(r =>
      Object.values(r).some(v => v && v.toLowerCase().includes(q))
    );

    renderTable(
      rows,
      displayHeaders,
      raCol,
      raErrCol,
      decCol,
      decErrCol
    );
  }

  /* ===============================
     Load CSV
  =============================== */
  let raCol, raErrCol, decCol, decErrCol, displayHeaders;

  fetch("LPTs.csv")
    .then(r => r.text())
    .then(text => {
      const lines = text.split("\n").filter(Boolean);
      headers = parseCSVLine(lines[0]);

      data = lines.slice(1).map(line => {
        const cols = parseCSVLine(line);
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i]));
        return obj;
      });

      raCol = findHeader(["ra"]);
      decCol = findHeader(["dec"]);
      raErrCol = findHeader(["ra_err", "ra error", "e_ra"]);
      decErrCol = findHeader(["dec_err", "dec error", "e_dec"]);

      displayHeaders = headers.filter(
        h => !h.toLowerCase().includes("err")
      );

      renderHeader(displayHeaders);
      sortAndRender(displayHeaders);
    });

  searchInput.addEventListener("input", () => sortAndRender(displayHeaders));
});

/* ===== Updates ===== */

fetch("updates.csv")
  .then(r => r.text())
  .then(text => {
    const lines = text.trim().split("\n").slice(1);
    const ul = document.getElementById("updates");

    lines.slice(0, 5).forEach(l => {
      const [date, desc] = l.split(",");
      const li = document.createElement("li");
      li.innerHTML = `<strong>${date}</strong>: ${desc}`;
      ul.appendChild(li);
    });
  });
