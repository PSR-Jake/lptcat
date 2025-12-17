fetch("LPTs.csv")
  .then(res => res.text())
  .then(text => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    const table = document.getElementById("lpt-table");

    // Header
    const thead = document.createElement("thead");
    const hrow = document.createElement("tr");
    headers.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    lines.slice(1).forEach(line => {
      const row = document.createElement("tr");
      const cols = line.split(",");
      cols.forEach((c, i) => {
        const td = document.createElement("td");

        if (headers[i] === "Reference" && c) {
          c.split(";").forEach(ref => {
            const a = document.createElement("a");
            a.href = `https://arxiv.org/abs/${ref.trim()}`;
            a.textContent = ref.trim();
            a.target = "_blank";
            a.style.marginRight = "6px";
            td.appendChild(a);
          });
        } else {
          td.textContent = c;
        }

        row.appendChild(td);
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Search
    document.getElementById("search").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      [...tbody.rows].forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
      });
    });
  });
