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

  // Process rows
  const processed = data.map(d => {

    // ---- Pdot combination ----
    let pdot;
    
    if (d["Pdot_ul"] === "True") {
      pdot = "< " + d["Pdot (s/s)"];
    } else {
      pdot = d["Pdot (s/s)"];
    }

    // ---- DM ± DM_err ----
    let dm = d["DM (pc/cm^3)"];
    if (d["DM_err"]) {
      dm = `${dm} ± ${d["DM_err"]}`;
    }

    // ---- RM ± RM_err ----
    let rm = d["RM (rad/m^2)"];
    if (d["RM_err"]) {
      rm = `${rm} ± ${d["RM_err"]}`;
    }

    return {
      ...d,
      Pdot: pdot,
      DM: dm,
      RM: rm
    };
  });

  // ---- Build table header ----
  const thead = d3.select("#lpt-table thead").append("tr");
  columns.forEach(col => {
    thead.append("th").text(col.label);
  });

  // ---- Build table body ----
  const tbody = d3.select("#lpt-table tbody");

  processed.forEach(row => {
    const tr = tbody.append("tr");
    columns.forEach(col => {
      tr.append("td").html(row[col.key] ?? "");
    });
  });

});
