d3.csv("LPTs.csv").then(data => {

  // Columns to hide completely
  const hiddenCols = [
    "Gal_l_err",
    "Gal_b_err",
    "Pdot_ul",
    "DM_err",
    "RM_err"
  ];

  // Output column order & labels
  const columns = [
    { key: "Name", label: "Name" },
    { key: "ID", label: "ID" },
    { key: "R.A. (J2000)", label: "R.A. (J2000)" },
    { key: "Dec. (J2000)", label: "Dec. (J2000)" },
    { key: "Gal_l (deg)", label: "l (deg)" },
    { key: "Gal_b (deg)", label: "b (deg)" },
    { key: "Period (min)", label: "Period (min)" },
    { key: "Pdot", label: "Ṗ (s s⁻¹)" },
    { key: "DM", label: "DM (pc cm⁻³)" },
    { key: "RM", label: "RM (rad m⁻²)" },
    { key: "Duty cycle", label: "Duty cycle" },
    { key: "Notes", label: "Notes" },
    { key: "Reference", label: "Reference" }
  ];

function formatSci(value) {
  if (!value) return value;

  let v = value.toString().trim();
  let prefix = "";

  // Handle upper limits
  if (v.startsWith("<")) {
    prefix = "< ";
    v = v.replace("<", "").trim();
  }

  // Superscript map
  const superscripts = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹"
  };

  const toSuperscript = exp =>
    exp
      .toString()
      .split("")
      .map(c => superscripts[c] || "")
      .join("");

  // ---- Case 1: 5.2(1.1)e-12 ----
  let match = v.match(
    /^([-+]?\d*\.?\d+)\((\d*\.?\d+)\)[eE]([-+]?\d+)$/
  );

  if (match) {
    const val = match[1];
    const err = match[2];
    const exp = match[3];
    return `${prefix}(${val} ± ${err})×10${toSuperscript(exp)}`;
  }

  // ---- Case 2: 1.2e-15 ----
  match = v.match(/^([-+]?\d*\.?\d+)[eE]([-+]?\d+)$/);

  if (match) {
    const val = match[1];
    const exp = match[2];
    return `${prefix}${val}×10${toSuperscript(exp)}`;
  }

  // ---- Fallback (already formatted or non-numeric) ----
  return value;
}

function formatReference(ref) {
  if (!ref || ref === "-") return ref;

  const r = ref.trim();

  // DOI
  if (r.startsWith("10.")) {
    return `<a href="https://doi.org/${r}" target="_blank">${r}</a>`;
  }

  // arXiv
  if (r.toLowerCase().startsWith("arxiv")) {
    const id = r.split(":")[1];
    return `<a href="https://arxiv.org/abs/${id}" target="_blank">${r}</a>`;
  }

  // ADS bibcode (19 chars, common pattern)
  if (r.length === 19 && r.match(/^\d{4}[A-Za-z.&]{5}\d{4}[A-Za-z]$/)) {
    return `<a href="https://ui.adsabs.harvard.edu/abs/${r}" target="_blank">${r}</a>`;
  }

  // Already a URL
  if (r.startsWith("http")) {
    return `<a href="${r}" target="_blank">${r}</a>`;
  }

  return r;
}
  
  // Process rows
  const processed = data.map(d => {

    // ---- Pdot combination ----
    let pdot;
    
    if (d["Pdot_ul"] === "True") {
      pdot = "<" + formatSci(d["Pdot (s/s)"]);
    } else {
      pdot = formatSci(d["Pdot (s/s)"]);
    }

    // ---- DM ± DM_err ----
    let dm;
    const dmVal = d["DM (pc/cm^3)"]?.trim();
    const dmErr = d["DM_err"]?.trim();
    
    if (!dmVal || dmVal === "-") {
      // Missing or unavailable DM
      dm = dmVal || "-";
    } else if (dmErr && dmErr !== "-") {
      // Measured DM with uncertainty
      dm = `${dmVal} ± ${dmErr}`;
    } else {
      // Measured DM but no uncertainty provided
      dm = dmVal;
    }

    // ---- RM ± RM_err ----
    let rm;
    const rmVal = d["RM (rad/m^2)"]?.trim();
    const rmErr = d["RM_err"]?.trim();
    
    if (!rmVal || rmVal === "-") {
      rm = rmVal || "-";
    } else if (rmErr && rmErr !== "-") {
      rm = `${rmVal} ± ${rmErr}`;
    } else {
      rm = rmVal;
    }

    return {
      ...d,
      Pdot: pdot,
      DM: dm,
      RM: rm,
      Reference: formatReference(d["Reference"])
    };
  });

  // ---- State ----
  let currentData = [...processed];
  let sortState = { key: null, asc: true };
  
  // ---- Build table header (click to sort) ----
  const thead = d3.select("#lpt-table thead").append("tr");
  
  columns.forEach(col => {
    thead
      .append("th")
      .text(col.label)
      .style("cursor", "pointer")
      .on("click", () => sortBy(col.key));
  });
  
  const tbody = d3.select("#lpt-table tbody");
  
  // ---- Render table ----
  function renderTable(data) {
    tbody.selectAll("tr").remove();
  
    data.forEach(row => {
      const tr = tbody.append("tr");
      columns.forEach(col => {
        tr.append("td").html(row[col.key] ?? "");
      });
    });
  }
  
  // ---- Sorting logic ----
  function sortBy(key) {
    if (sortState.key === key) {
      sortState.asc = !sortState.asc;
    } else {
      sortState.key = key;
      sortState.asc = true;
    }
  
    currentData.sort((a, b) => {
      let va = a[key] ?? "";
      let vb = b[key] ?? "";
  
      va = stripFormatting(va);
      vb = stripFormatting(vb);
  
      const na = parseFloat(va);
      const nb = parseFloat(vb);
  
      if (!isNaN(na) && !isNaN(nb)) {
        return sortState.asc ? na - nb : nb - na;
      }
  
      return sortState.asc
        ? va.localeCompare(vb)
        : vb.localeCompare(va);
    });
  
    renderTable(currentData);
  }
  
  // ---- Global search ----
  d3.select("#searchBox").on("input", function () {
    const term = this.value.toLowerCase();
  
    currentData = processed.filter(row =>
      columns.some(col =>
        (row[col.key] ?? "")
          .toString()
          .toLowerCase()
          .includes(term)
      )
    );
  
    renderTable(currentData);
  });
  
  // ---- Strip formatting for numeric sorting ----
  function stripFormatting(value) {
    return value
      .toString()
      .replace(/[×±()<>]/g, "")
      .replace(/10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, "")
      .trim();
  }
  
  // ---- Initial render ----
  renderTable(currentData);

});

d3.csv("updates.csv").then(updates => {
  const list = d3.select("#update-list");

  updates
    .slice(-5)
    // .reverse()
    .forEach(u => {
      list.append("li")
        .html(`<strong>${u.Date}</strong>: ${u.Description}`);
    });
});
