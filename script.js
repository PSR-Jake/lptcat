let tableData = [];
let headers = [];
let sortKey = null;
let sortAsc = true;

fetch("LPTs.csv")
  .then(r => r.text())
  .then(text => {
    const lines = text.trim().split("\n");
    headers = lines[0].split(",");

    tableData = lines.slice(1).map(l => {
      const cols = l.split(",");
      const obj = {};
      headers.forEach((h, i) => obj[h] = cols[i] || "");
      return obj;
    });

    renderTable(tableData);
    setupSearch();
  });

function renderTable(data) {
  const table = document.getElementById("lpt-table");
  table.innerHTML = "";

  // header
  const thead = document.createElement("thead");
  const hrow = document.createElement("tr");

  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h + " ⇅";
    th.style.cursor = "pointer";
    th.onclick = () => sortBy(h);
    hrow.appendChild(th);
  });

  thead.appendChild(hrow);
  table.appendChild(thead);

  // body
  const tbody = document.createElement("tbody");

  data.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");

      if (h === "Reference" && row[h]) {
        row[h].split(";").forEach(ref => {
          const a = document.createElement("a");
          a.href = `https://arxiv.org/abs/${ref.trim()}`;
          a.textContent = ref.trim();
          a.target = "_blank";
          a.style.marginRight = "6px";
          td.appendChild(a);
        });
      } else {
        td.textContent = row[h];
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

function sortBy(key) {
  if (sortKey === key) sortAsc = !sortAsc;
  else {
    sortKey = key;
    sortAsc = true;
  }

  tableData.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    const na = parseFloat(av);
    const nb = parseFloat(bv);

    if (!isNaN(na) && !isNaN(nb))
      return sortAsc ? na - nb : nb - na;

    return sortAsc
      ? av.localeCompare(bv)
      : bv.localeCompare(av);
  });

  renderTable(tableData);
}

function setupSearch() {
  const input = document.getElementById("search");
  input.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();
    const filtered = tableData.filter(r =>
      Object.values(r).some(v => v.toLowerCase().includes(q))
    );
    renderTable(filtered);
  });
}

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
