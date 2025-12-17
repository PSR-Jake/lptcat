Papa.parse("LPTs.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {

    const headers = results.meta.fields;
    const data = results.data;

    const table = document.getElementById("lpt-table");

    // Columns to hide entirely
    const hiddenColumns = new Set([
      "RA_err",
      "Dec_err",
      "DM_err",
      "RM_err",
      "Gal_l_err",
      "Gal_b_err"
    ]);

    const visibleHeaders = headers.filter(h => !hiddenColumns.has(h));

    // ---------- Build table header ----------
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");

    visibleHeaders.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      trHead.appendChild(th);
    });

    thead.appendChild(trHead);
    table.appendChild(thead);

    // ---------- Build table body ----------
    const tbody = document.createElement("tbody");

    data.forEach(row => {
      const tr = document.createElement("tr");

      visibleHeaders.forEach(h => {
        const td = document.createElement("td");

        // RA ± error
        if (h === "RA" && row.RA_err) {
          td.textContent = `${row.RA} ± ${row.RA_err}`;
        }
        // Dec ± error
        else if (h === "Dec" && row.Dec_err) {
          td.textContent = `${row.Dec} ± ${row.Dec_err}`;
        }
        // DM ± error
        else if (h === "DM" && row.DM_err) {
          td.textContent = `${row.DM} ± ${row.DM_err}`;
        }
        // RM ± error
        else if (h === "RM" && row.RM_err) {
          td.textContent = `${row.RM} ± ${row.RM_err}`;
        }
        // Everything else
        else {
          td.textContent = row[h] ?? "";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  }
});
