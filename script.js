d3.csv("LPTs.csv").then(data => {

  // Columns to hide completely
  const hiddenCols = [
    "Gal_l_err",
    "Gal_b_err",
    "Pdot_ul",
    "Pdot_err",
    "DM_err",
    "RM_err"
  ];

  // Output column order & labels
  const columns = [
  { key: "Name", label: "Name", sortable: true },
  { key: "ID", label: "ID", sortable: true },
  { key: "R.A. (J2000)", label: "R.A. (J2000)", sortable: true },
  { key: "Dec. (J2000)", label: "Dec. (J2000)", sortable: true },
  { key: "Gal_l (deg)", label: "l (deg)", sortable: true },
  { key: "Gal_b (deg)", label: "b (deg)", sortable: true },
  { key: "Period (min)", label: "Period (min)", sortable: true },
  { key: "Pdot", label: "Ṗ (s s⁻¹)", sortable: false },
  { key: "DM", label: "DM (pc cm⁻³)", sortable: true },
  { key: "RM", label: "RM (rad m⁻²)", sortable: true },
  { key: "Duty cycle", label: "Duty cycle", sortable: false },
  { key: "Notes", label: "Notes", sortable: false },
  { key: "References", label: "References", sortable: false }
];

// function toSuperscript(n) {
//   const map = { "-":"⁻","0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹" };
//   return String(n).split("").map(c => map[c] ?? c).join("");
// }

function toSuperscript(exp) {
  return `<sup>${exp}</sup>`;
}

function formatSci(x, sig = 2) {
  if (!x || x === "-" || isNaN(x)) return null;

  const exp = Math.floor(Math.log10(Math.abs(x)));
  const mant = (x / Math.pow(10, exp)).toFixed(sig - 1);
  return { mant, exp };
}

function formatReference(ref) {
  if (!ref || ref === "-") return ref;

  // Split multiple references by semicolon
  const entries = ref.split(";").map(e => e.trim()).filter(Boolean);

  const links = entries.map(entry => {
    // Expect format: label:arxivID
    const [label, arxiv] = entry.split(":").map(s => s.trim());
    if (!label || !arxiv) return entry;

    return `<a href="https://arxiv.org/abs/${arxiv}" target="_blank" title="arXiv:${arxiv}">${label}</a>`;
  });

  return links.join(", ");
}
  
  // Process rows
  const processed = data.map(d => {

    // ---- Gal_l with error ----
    let gal_l = "-";
    
    const l_val = d["Gal_l (deg)"];
    const l_err = d["Gal_l_err"];
    
    if (l_val && l_val !== "-") {
      if (l_err && l_err !== "-") {
        const valStr = String(l_val);
        const errNum = parseFloat(l_err);
    
        // number of decimals in the value
        const decimals = (valStr.split(".")[1] || "").length;
    
        // scale error to last digit
        const scaledErr = Math.round(errNum * Math.pow(10, decimals));
    
        gal_l = `${valStr}(${scaledErr})`;
      } else {
        gal_l = l_val;
      }
    }

    // ---- Gal_b with error ----
    let gal_b = "-";
    
    const b_val = d["Gal_b (deg)"];
    const b_err = d["Gal_b_err"];
    
    if (b_val && b_val !== "-") {
      if (b_err && b_err !== "-") {
        const valStr = String(b_val);
        const errNum = parseFloat(b_err);
    
        // number of decimals in the value
        const decimals = (valStr.split(".")[1] || "").length;
    
        // scale error to last digit
        const scaledErr = Math.round(errNum * Math.pow(10, decimals));
    
        gal_b = `${valStr}(${scaledErr})`;
      } else {
        gal_b = b_val;
      }
    }

    // ---- Pdot combination ----
    let pdot = "-";
    
    const ul = d["Pdot_ul"];
    const val = d["Pdot (s/s)"];
    const err = d["Pdot_err"];
    
    if (val && val !== "-") {
      const sci = formatSci(val, 2);
      const { mant, exp } = sci;
    
      if (ul === "True") {
        pdot = `&lt;${mant}×10${toSuperscript(exp)}`;
      } 
      else if (ul === "False" && err && err !== "-") {
        const errScaled = (parseFloat(err) / Math.pow(10, exp)).toFixed(1);
        pdot = `${mant}(${errScaled})×10${toSuperscript(exp)}`;
      } 
      else {
        pdot = `${mant}×10${toSuperscript(exp)}`;
      }
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
      ["Gal_l (deg)"]: gal_l,
      ["Gal_b (deg)"]: gal_b,
      Pdot: pdot,
      DM: dm,
      RM: rm,
      References: formatReference(d["References"])
    };
  });

  // ---- State ----
  let currentData = [...processed];
  let sortState = { key: null, asc: true };
  
  // ---- Build table header (click to sort) ----
  const thead = d3.select("#lpt-table thead").append("tr");

  columns.forEach(col => {
  const th = thead.append("th").text(col.label);

  if (col.sortable) {
    th
      .classed("sortable", true)
      .append("span")
      .attr("class", "sort-symbol")
      .html(" ▲");

    th
      .style("cursor", "pointer")
      .on("click", () => sortBy(col.key));
  }
});

  function updateSortSymbols() {
  d3.selectAll("th .sort-symbol")
    .html(" ▲")
    .classed("active", false);

  if (!sortState.key) return;

  const idx = columns.findIndex(c => c.key === sortState.key);
  if (idx < 0 || !columns[idx].sortable) return;

  const symbol = sortState.asc ? " ▲" : " ▼";

  d3.select(d3.selectAll("th").nodes()[idx])
    .select(".sort-symbol")
    .html(symbol)
    .classed("active", true);
}
  
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
    updateSortSymbols();
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

document.querySelectorAll(".toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {

    // Update button state
    document.querySelectorAll(".toggle-btn")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.target;

    // Toggle figures
    document.querySelectorAll(".sky-figure").forEach(img => {
      img.classList.toggle(
        "hidden",
        img.dataset.figure !== target
      );
    });
  });
});

// const N_sources = d3.selectAll("#lpt-table tbody tr").size();

// const tooltip = document.getElementById("figure-tooltip");
// tooltip.textContent = `N = ${N_sources} sources`;
