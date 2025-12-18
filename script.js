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

  // Handle upper limits like "< 1.2e-15"
  let prefix = "";
  let v = value.toString().trim();

  if (v.startsWith("<")) {
    prefix = "< ";
    v = v.replace("<", "").trim();
  }

  // Match scientific notation
  const match = v.match(/^([-+]?\d*\.?\d+)[eE]([-+]?\d+)$/);
  if (!match) return value;

  const mantissa = match[1];
  const exponent = parseInt(match[2], 10);

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

  const expStr = exponent
    .toString()
    .split("")
    .map(c => superscripts[c] || "")
    .join("");

  return `${prefix}${mantissa}×10${expStr}`;
}
  
  // Process rows
  const processed = data.map(d => {

    // ---- Pdot combination ----
    let pdot;
    
    if (d["Pdot_ul"] === "True") {
      pdot = "< " + formatSci(d["Pdot (s/s)"]);
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
