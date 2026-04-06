// Normalized hotspot positions for the current exported sky-map PNGs.
const SKY_MAP_POINTS = {
  galactic: [
    { id: "LPT J1745-3009", x: 0.505959, y: 0.524319 },
    { id: "LPT J1627-5235", x: 0.441536, y: 0.535588 },
    { id: "LPT J1839-1031", x: 0.562684, y: 0.532646 },
    { id: "LPT J1935+2148", x: 0.648172, y: 0.517281 },
    { id: "LPT J1755-2527", x: 0.518706, y: 0.522214 },
    { id: "LPT J0636+2526", x: 0.090847, y: 0.482742 },
    { id: "LPT J1101+5521", x: 0.765709, y: 0.236412 },
    { id: "LPT J0704-3706", x: 0.240002, y: 0.595628 },
    { id: "LPT J1832-0911", x: 0.56371, y: 0.520927 },
    { id: "LPT J1839-0756", x: 0.568533, y: 0.527142 },
    { id: "LPT J1634+4450", x: 0.6502, y: 0.296833 },
    { id: "LPT J1448-6856", x: 0.395172, y: 0.567391 },
    { id: "LPT J1424-6126", x: 0.396015, y: 0.524359 }
  ],
  equatorial: [
    { id: "LPT J1745-3009", x: 0.731172, y: 0.686857 },
    { id: "LPT J1627-5235", x: 0.723978, y: 0.798835 },
    { id: "LPT J1839-1031", x: 0.715619, y: 0.579952 },
    { id: "LPT J1935+2148", x: 0.675393, y: 0.400642 },
    { id: "LPT J1755-2527", x: 0.730851, y: 0.661805 },
    { id: "LPT J0636+2526", x: 0.28949, y: 0.381045 },
    { id: "LPT J1101+5521", x: 0.228492, y: 0.231194 },
    { id: "LPT J0704-3706", x: 0.288309, y: 0.722983 },
    { id: "LPT J1832-0911", x: 0.720371, y: 0.572529 },
    { id: "LPT J1839-0756", x: 0.716011, y: 0.565638 },
    { id: "LPT J1634+4450", x: 0.741853, y: 0.280995 },
    { id: "LPT J1448-6856", x: 0.697632, y: 0.868562 },
    { id: "LPT J1424-6126", x: 0.743203, y: 0.838206 }
  ]
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hideSkyOverlayState(overlay) {
  const tooltip = overlay.querySelector(".sky-tooltip");
  const marker = overlay.querySelector(".sky-active-marker");

  tooltip.hidden = true;
  tooltip.classList.remove("below");
  marker.hidden = true;
  marker.classList.remove("square");
  overlay.style.cursor = "default";
}

function showSkyOverlayState(overlay, point, xPx, yPx) {
  const tooltip = overlay.querySelector(".sky-tooltip");
  const marker = overlay.querySelector(".sky-active-marker");
  const bounds = overlay.getBoundingClientRect();
  const padding = 12;

  marker.hidden = false;
  marker.classList.toggle("square", point.isBinary);
  marker.style.left = `${point.x * 100}%`;
  marker.style.top = `${point.y * 100}%`;

  tooltip.textContent = point.name;
  tooltip.hidden = false;

  const tooltipHalfWidth = tooltip.offsetWidth / 2;
  const left = clamp(
    xPx,
    tooltipHalfWidth + padding,
    bounds.width - tooltipHalfWidth - padding
  );
  const placeBelow = yPx < tooltip.offsetHeight + 20;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${placeBelow ? yPx + 10 : yPx - 10}px`;
  tooltip.classList.toggle("below", placeBelow);

  overlay.style.cursor = "pointer";
}

function bindSkyOverlay(overlay, points) {
  if (!overlay || points.length === 0) return;

  function findNearestPoint(clientX, clientY) {
    const bounds = overlay.getBoundingClientRect();
    const xPx = clientX - bounds.left;
    const yPx = clientY - bounds.top;
    const threshold = window.matchMedia("(pointer: coarse)").matches ? 18 : 12;

    let nearest = null;

    points.forEach(point => {
      const pointXPx = point.x * bounds.width;
      const pointYPx = point.y * bounds.height;
      const distance = Math.hypot(pointXPx - xPx, pointYPx - yPx);

      if (!nearest || distance < nearest.distance) {
        nearest = { point, distance, xPx: pointXPx, yPx: pointYPx };
      }
    });

    if (!nearest || nearest.distance > threshold) {
      hideSkyOverlayState(overlay);
      return;
    }

    showSkyOverlayState(overlay, nearest.point, nearest.xPx, nearest.yPx);
  }

  overlay.addEventListener("mousemove", event => {
    findNearestPoint(event.clientX, event.clientY);
  });

  overlay.addEventListener("click", event => {
    findNearestPoint(event.clientX, event.clientY);
  });

  overlay.addEventListener("mouseleave", () => {
    hideSkyOverlayState(overlay);
  });
}

function initializeSkyMaps(rows) {
  const rowsById = new Map(rows.map(row => [row.ID, row]));

  Object.entries(SKY_MAP_POINTS).forEach(([mapName, points]) => {
    const overlay = document.querySelector(`.sky-overlay[data-overlay="${mapName}"]`);

    if (!overlay) return;

    const resolvedPoints = points
      .map(point => {
        const row = rowsById.get(point.id);

        if (!row) return null;

        return {
          ...point,
          name: row.Name,
          isBinary: /binary/i.test(row.Notes || "")
        };
      })
      .filter(Boolean);

    bindSkyOverlay(overlay, resolvedPoints);
  });
}

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
  initializeSkyMaps(data);

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
    document.querySelectorAll(".sky-panel").forEach(panel => {
      panel.classList.toggle(
        "hidden",
        panel.dataset.figure !== target
      );
    });

    document.querySelectorAll(".sky-overlay").forEach(overlay => {
      hideSkyOverlayState(overlay);
    });
  });
});

// const N_sources = d3.selectAll("#lpt-table tbody tr").size();

// const tooltip = document.getElementById("figure-tooltip");
// tooltip.textContent = `N = ${N_sources} sources`;
