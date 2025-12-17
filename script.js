let rawData = [];
let headers = [];
let sortKey = null;
let sortAsc = true;

fetch("LPTs.csv")
  .then(res => res.text())
  .then(text => {
    const lines = text.trim().split("\n");
    headers = lines[0].split(",").map(h => h.trim());

    rawData = lines.slice(1).map(line => {
      const cols = line.split(",");
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = cols[i]?.trim() || "";
      });
      return obj;
    });

    renderTable(rawData);
  });

function formatValue(row, key) {
  // Integrate RA ± RA_err
  if (key === "RA" && row["RA_err"]) {
    return `${row.RA} ± ${row.RA_err}`;
  }

  // Integrate Dec ± Dec_err
  if (key === "Dec" && row["Dec_err"]) {
    return `${row.Dec} ± ${row.Dec_err}`;
  }

  // Reference column: clickable arXiv links
  if (key === "Reference" && row[key]) {
    return row[key]
      .split(";")
      .map(r =>
        `<a href="https://arxiv.org/abs/${r.trim()}" target="_blank">${r.trim()}</a>`
      )
      .join(", ");
  }

  return row[key];
}

function visibleHeaders() {
  return headers.filter(h =>
    !h.endsWith("_err") &&          // hide all error columns
    h !== "Gal_l_err" &&
    h !== "Gal_b_err"
  );
}

function renderTable(data) {
  const table = document.getElementById("lpt-table");
  table.innerHTML = "";

  // Header
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");

  visibleHeaders().forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.cursor = "pointer";
    th.onclick = () => sortBy(h);
    tr.appendChild(th);
  });

  thead.appendChild(tr);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  data.forEach(row => {
    const tr = document.createElement("tr");
    visibleHeaders().forEach(h => {
      const td = document.createElement("td");
      td.innerHTML = formatValue(row, h);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

function sortBy(key) {
  if (sortKey === key) {
    sortAsc = !sortAsc;
  } else {
    sortKey = key;
    sortAsc = true;
  }

  const sorted = [...rawData].sort((a, b) => {
    const av = a[key] || "";
    const bv = b[key] || "";

    const na = parseFloat(av);
    const nb = parseFloat(bv);

    if (!isNaN(na) && !isNaN(nb)) {
      return sortAsc ? na - nb : nb - na;
    }
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  renderTable(sorted);
}
