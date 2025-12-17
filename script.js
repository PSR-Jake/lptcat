Papa.parse("LPTs.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
  complete: function (results) {

    const headers = results.meta.fields;
    const data = results.data;

    const table = document.getElementById("lpt-table");

    // --- Define column mapping explicitly (IMPORTANT) ---
    const valueErrorMap = {
      "R.A. (J2000)": "RA_err_ss.ss",
      "Dec. (J2000)": "Dec_err_arcsec",
      "DM (pc/cm^3)": "DM_err",
      "RM (rad/m^2)": "RM_err"
    };

    // Columns to hide entirely
    const hiddenColumns = new Set([
      "RA_err_ss.ss",
      "Dec_err_arcsec",
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

        // value ± error formatting
        if (valueErrorMap[h] && row[valueErrorMap[h]]) {
          td.textContent = `${row[h]} ± ${row[valueErrorMap[h]]}`;
        } else {
          td.textContent = row[h] ?? "";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
  }
});
