const SKY_MAP_LAYOUT = {
  width: 900,
  height: 520,
  margin: {
    top: 42,
    right: 60,
    bottom: 66,
    left: 72
  },
  maxZoom: 10
};

const SKY_MERIDIANS = d3.range(-150, 151, 30);
const SKY_PARALLELS = [-60, -30, 0, 30, 60];

const SKY_MAP_DEFINITIONS = {
  galactic: {
    xLabel: "Galactic Longitude l",
    yLabel: "Galactic Latitude b",
    tickLabel: value => `${value}°`,
    coordinates(row) {
      const lon = parseFloat(row["Gal_l (deg)"]);
      const lat = parseFloat(row["Gal_b (deg)"]);

      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

      return {
        lon: wrapLongitude(lon),
        lat
      };
    }
  },
  equatorial: {
    xLabel: "Right Ascension (J2000)",
    yLabel: "Declination",
    tickLabel: value => `${positiveModulo(-value, 360) / 15}h`,
    coordinates(row) {
      const ra = parseRightAscension(row["R.A. (J2000)"]);
      const dec = parseDeclination(row["Dec. (J2000)"]);

      if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;

      return {
        lon: wrapLongitude(-ra),
        lat: dec
      };
    }
  }
};

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function wrapLongitude(value) {
  return positiveModulo(value + 180, 360) - 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function stripMeasurement(value) {
  return (value || "")
    .toString()
    .replace(/\([^)]*\)/g, "")
    .replace(/−/g, "-")
    .trim();
}

function parseRightAscension(value) {
  const cleanValue = stripMeasurement(value);
  const [hours = 0, minutes = 0, seconds = 0] = cleanValue
    .split(":")
    .map(Number);

  return 15 * (hours + minutes / 60 + seconds / 3600);
}

function parseDeclination(value) {
  const cleanValue = stripMeasurement(value);
  const [degreesValue = "0", minutesValue = "0", secondsValue = "0"] = cleanValue.split(":");
  const sign = degreesValue.trim().startsWith("-") ? -1 : 1;
  const degrees = Math.abs(parseFloat(degreesValue));
  const minutes = parseFloat(minutesValue);
  const seconds = parseFloat(secondsValue);

  return sign * (degrees + minutes / 60 + seconds / 3600);
}

function createSkyGeometry() {
  const plotWidth = SKY_MAP_LAYOUT.width - SKY_MAP_LAYOUT.margin.left - SKY_MAP_LAYOUT.margin.right;
  const plotHeight = SKY_MAP_LAYOUT.height - SKY_MAP_LAYOUT.margin.top - SKY_MAP_LAYOUT.margin.bottom;
  const scale = Math.min(
    plotWidth / (4 * Math.SQRT2),
    plotHeight / (2 * Math.SQRT2)
  );

  return {
    centerX: SKY_MAP_LAYOUT.margin.left + plotWidth / 2,
    centerY: SKY_MAP_LAYOUT.margin.top + plotHeight / 2,
    radiusX: 2 * Math.SQRT2 * scale,
    radiusY: Math.SQRT2 * scale,
    scale
  };
}

function solveMollweideTheta(phi) {
  if (Math.abs(Math.abs(phi) - Math.PI / 2) < 1e-8) {
    return phi;
  }

  let theta = phi;

  for (let index = 0; index < 12; index += 1) {
    const numerator = 2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(phi);
    const denominator = 2 + 2 * Math.cos(2 * theta);
    theta -= numerator / denominator;
  }

  return theta;
}

function projectSkyCoordinate(lon, lat, geometry) {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const theta = solveMollweideTheta(phi);
  const x = (2 * Math.SQRT2 * lambda * Math.cos(theta)) / Math.PI;
  const y = Math.SQRT2 * Math.sin(theta);

  return {
    x: geometry.centerX + x * geometry.scale,
    y: geometry.centerY - y * geometry.scale
  };
}

function rotateSkyCoordinate(lon, lat, rotation) {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambdaRotation = (rotation.lambda * Math.PI) / 180;
  const phiRotation = (rotation.phi * Math.PI) / 180;

  const x = Math.cos(phi) * Math.cos(lambda);
  const y = Math.cos(phi) * Math.sin(lambda);
  const z = Math.sin(phi);

  const xLongitude = x * Math.cos(lambdaRotation) - y * Math.sin(lambdaRotation);
  const yLongitude = x * Math.sin(lambdaRotation) + y * Math.cos(lambdaRotation);
  const zLongitude = z;

  const xLatitude = xLongitude * Math.cos(phiRotation) + zLongitude * Math.sin(phiRotation);
  const yLatitude = yLongitude;
  const zLatitude = -xLongitude * Math.sin(phiRotation) + zLongitude * Math.cos(phiRotation);

  return {
    lon: (Math.atan2(yLatitude, xLatitude) * 180) / Math.PI,
    lat: (Math.asin(clamp(zLatitude, -1, 1)) * 180) / Math.PI
  };
}

function projectRotatedCoordinate(coordinates, geometry, state) {
  const rotated = rotateSkyCoordinate(coordinates.lon, coordinates.lat, state.rotation);

  return projectSkyCoordinate(rotated.lon, rotated.lat, {
    ...geometry,
    scale: geometry.scale * state.zoom
  });
}

function formatLatitudeLabel(value) {
  return `${value}°`;
}

function hideTooltip(tooltip) {
  if (!tooltip) return;

  tooltip.hidden = true;
  tooltip.classList.remove("below");
}

function hideAllSkyMapTooltips() {
  document.querySelectorAll(".sky-tooltip").forEach(tooltip => {
    hideTooltip(tooltip);
  });

  d3.selectAll(".sky-map-source").classed("is-active", false);
}

function positionTooltip(tooltip, stage, label, x, y) {
  const bounds = stage.getBoundingClientRect();
  const padding = 12;

  tooltip.textContent = label;
  tooltip.hidden = false;

  const tooltipHalfWidth = tooltip.offsetWidth / 2;
  const left = clamp(
    x,
    tooltipHalfWidth + padding,
    bounds.width - tooltipHalfWidth - padding
  );
  const placeBelow = y < tooltip.offsetHeight + 24;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${placeBelow ? y + 10 : y - 10}px`;
  tooltip.classList.toggle("below", placeBelow);
}

function buildSegmentedPath(points, geometry, zoom, lineGenerator) {
  const horizontalThreshold = geometry.radiusX * zoom * 0.95;
  const verticalThreshold = geometry.radiusY * zoom * 1.1;
  const segments = [];
  let segment = [];

  points.forEach(point => {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      if (segment.length > 1) {
        segments.push(segment);
      }
      segment = [];
      return;
    }

    if (segment.length > 0) {
      const previousPoint = segment[segment.length - 1];
      const deltaX = Math.abs(point.x - previousPoint.x);
      const deltaY = Math.abs(point.y - previousPoint.y);

      if (deltaX > horizontalThreshold || deltaY > verticalThreshold) {
        if (segment.length > 1) {
          segments.push(segment);
        }
        segment = [];
      }
    }

    segment.push(point);
  });

  if (segment.length > 1) {
    segments.push(segment);
  }

  return segments.map(segmentPoints => lineGenerator(segmentPoints)).join(" ");
}

function renderSkyMap(mapName, points, counts) {
  const panel = document.querySelector(`.sky-panel[data-figure="${mapName}"]`);

  if (!panel) return;

  const svgNode = panel.querySelector(`.sky-map[data-map="${mapName}"]`);
  const stage = panel.querySelector(".sky-map-stage");
  const tooltip = panel.querySelector(`.sky-tooltip[data-tooltip="${mapName}"]`);
  const zoomReadout = panel.querySelector(`.sky-map-zoom-readout[data-zoom-readout="${mapName}"]`);
  const resetButton = panel.querySelector(`.sky-reset-btn[data-reset-map="${mapName}"]`);

  if (!svgNode || !stage || !tooltip || !zoomReadout || !resetButton) return;

  const definition = SKY_MAP_DEFINITIONS[mapName];
  const geometry = createSkyGeometry();
  const clipId = `sky-map-clip-${mapName}`;
  const svg = d3.select(svgNode);
  const line = d3.line()
    .x(point => point.x)
    .y(point => point.y);
  const state = {
    zoom: 1,
    rotation: {
      lambda: 0,
      phi: 0
    }
  };

  svg.selectAll("*").remove();
  svg
    .attr("viewBox", `0 0 ${SKY_MAP_LAYOUT.width} ${SKY_MAP_LAYOUT.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  svg.append("ellipse")
    .attr("class", "sky-map-boundary-fill")
    .attr("cx", geometry.centerX)
    .attr("cy", geometry.centerY)
    .attr("rx", geometry.radiusX)
    .attr("ry", geometry.radiusY);

  svg.append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("ellipse")
    .attr("cx", geometry.centerX)
    .attr("cy", geometry.centerY)
    .attr("rx", geometry.radiusX)
    .attr("ry", geometry.radiusY);

  const clippedViewport = svg.append("g")
    .attr("clip-path", `url(#${clipId})`);

  const scene = clippedViewport.append("g");

  const meridianPaths = scene.append("g")
    .selectAll(".sky-map-graticule-meridian")
    .data(SKY_MERIDIANS)
    .enter()
    .append("path")
    .attr("class", "sky-map-graticule");

  const parallelValues = SKY_PARALLELS.filter(lat => lat !== 0);

  const parallelPaths = scene.append("g")
    .selectAll(".sky-map-graticule-parallel")
    .data(parallelValues)
    .enter()
    .append("path")
    .attr("class", "sky-map-graticule");

  const baselinePath = scene.append("path")
    .attr("class", "sky-map-baseline");

  const sources = scene.append("g")
    .selectAll(".sky-map-source")
    .data(points, point => point.id)
    .enter()
    .append("g")
    .attr("class", point => `sky-map-source${point.isBinary ? " is-binary" : ""}`)
    .attr("data-source-id", point => point.id)
    .attr("data-source-name", point => point.name)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", point => point.name);

  sources.each(function appendMarker(point) {
    const marker = d3.select(this);

    if (point.isBinary) {
      marker.append("rect")
        .attr("class", "sky-map-source-visible")
        .attr("x", -5.5)
        .attr("y", -5.5)
        .attr("width", 11)
        .attr("height", 11)
        .attr("rx", 2);
    } else {
      marker.append("circle")
        .attr("class", "sky-map-source-visible")
        .attr("r", 5.4);
    }

    marker.append("circle")
      .attr("class", "sky-map-source-hit")
      .attr("r", 14);
  });

  const tickLabelLayer = svg.append("g");
  const parallelLabels = svg.append("g");
  let isDragging = false;

  function activateSource(point) {
    hideAllSkyMapTooltips();
    sources.classed("is-active", source => source.id === point.id);

    const projected = projectRotatedCoordinate(point[mapName], geometry, state);
    const x = (projected.x / SKY_MAP_LAYOUT.width) * stage.clientWidth;
    const y = (projected.y / SKY_MAP_LAYOUT.height) * stage.clientHeight;

    positionTooltip(tooltip, stage, point.name, x, y);
  }

  function deactivateSources() {
    sources.classed("is-active", false);
    hideTooltip(tooltip);
  }

  function findNearestSource(event) {
    if (isDragging) return;

    const [pointerX, pointerY] = d3.pointer(event, svgNode);
    const pointerModeThreshold = window.matchMedia("(pointer: coarse)").matches ? 20 : 12;
    const threshold = pointerModeThreshold * (SKY_MAP_LAYOUT.width / stage.clientWidth);
    let nearestSource = null;

    points.forEach(point => {
      const projected = projectRotatedCoordinate(point[mapName], geometry, state);
      const x = projected.x;
      const y = projected.y;
      const distance = Math.hypot(x - pointerX, y - pointerY);

      if (!nearestSource || distance < nearestSource.distance) {
        nearestSource = {
          point,
          distance
        };
      }
    });

    if (!nearestSource || nearestSource.distance > threshold) {
      deactivateSources();
      return;
    }

    activateSource(nearestSource.point);
  }

  svg
    .on("mousemove", findNearestSource)
    .on("mouseleave", deactivateSources);

  sources
    .on("focus", (_, point) => {
      activateSource(point);
    })
    .on("blur", deactivateSources)
    .on("keydown", function handleSourceKey(event) {
      if (event.key === "Escape") {
        hideAllSkyMapTooltips();
        this.blur();
      }
    });

  svg.append("ellipse")
    .attr("class", "sky-map-boundary")
    .attr("cx", geometry.centerX)
    .attr("cy", geometry.centerY)
    .attr("rx", geometry.radiusX)
    .attr("ry", geometry.radiusY);

  svg.append("text")
    .attr("class", "sky-map-title")
    .attr("x", SKY_MAP_LAYOUT.width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .text(`N_LPT = ${counts.total}`);

  svg.append("text")
    .attr("class", "sky-map-subtitle")
    .attr("x", SKY_MAP_LAYOUT.width / 2)
    .attr("y", 46)
    .attr("text-anchor", "middle")
    .text(`${counts.binary} WD-M dwarf binaries | ${counts.unknown} unknown progenitors`);

  svg.append("text")
    .attr("class", "sky-map-axis-label")
    .attr("x", SKY_MAP_LAYOUT.width / 2)
    .attr("y", SKY_MAP_LAYOUT.height - 18)
    .attr("text-anchor", "middle")
    .text(definition.xLabel);

  svg.append("text")
    .attr("class", "sky-map-axis-label")
    .attr("transform", `translate(24, ${SKY_MAP_LAYOUT.height / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text(definition.yLabel);

  const legend = svg.append("g")
    .attr("transform", `translate(${SKY_MAP_LAYOUT.width - 185}, 68)`);

  legend.append("circle")
    .attr("cx", 6)
    .attr("cy", 6)
    .attr("r", 5.2)
    .attr("class", "sky-map-source-visible");

  legend.append("text")
    .attr("class", "sky-map-legend-label")
    .attr("x", 20)
    .attr("y", 10)
    .text("Unknown");

  legend.append("rect")
    .attr("x", 0)
    .attr("y", 22)
    .attr("width", 12)
    .attr("height", 12)
    .attr("rx", 2)
    .attr("class", "sky-map-source-visible")
    .style("fill", "teal");

  legend.append("text")
    .attr("class", "sky-map-legend-label")
    .attr("x", 20)
    .attr("y", 32)
    .text("WD-M dwarf");

  function buildCurve(constant, type) {
    const values = type === "meridian"
      ? d3.range(-90, 91, 2)
      : d3.range(-180, 181, 4);

    return values.map(value => {
      const coordinates = type === "meridian"
        ? { lon: constant, lat: value }
        : { lon: value, lat: constant };

      return projectRotatedCoordinate(coordinates, geometry, state);
    });
  }

  function buildLongitudeLabelData() {
    return SKY_MERIDIANS
      .map(value => {
        const curve = buildCurve(value, "meridian");
        const bottomPoint = curve.reduce((best, point) => (
          !best || point.y > best.y ? point : best
        ), null);

        if (!bottomPoint) return null;

        return {
          value,
          x: clamp(bottomPoint.x, SKY_MAP_LAYOUT.margin.left, SKY_MAP_LAYOUT.width - SKY_MAP_LAYOUT.margin.right),
          y: geometry.centerY + geometry.radiusY + 25
        };
      })
      .filter(Boolean);
  }

  function buildLatitudeLabelData() {
    return SKY_PARALLELS.map(value => {
      const curve = buildCurve(value, "parallel");
      const leftPoint = curve.reduce((best, point) => (
        !best || point.x < best.x ? point : best
      ), null);

      if (!leftPoint) return null;

      return {
        value,
        x: clamp(leftPoint.x - 12, 18, SKY_MAP_LAYOUT.width - 18),
        y: clamp(leftPoint.y + 4, SKY_MAP_LAYOUT.margin.top + 8, SKY_MAP_LAYOUT.height - SKY_MAP_LAYOUT.margin.bottom)
      };
    }).filter(Boolean);
  }

  function renderScene() {
    const meridianData = SKY_MERIDIANS.map(value => ({
      value,
      curve: buildCurve(value, "meridian")
    }));
    const parallelData = parallelValues.map(value => ({
      value,
      curve: buildCurve(value, "parallel")
    }));

    meridianPaths.attr("d", item => {
      const curve = meridianData.find(entry => entry.value === item).curve;
      return buildSegmentedPath(curve, geometry, state.zoom, line);
    });
    parallelPaths.attr("d", item => {
      const curve = parallelData.find(entry => entry.value === item).curve;
      return buildSegmentedPath(curve, geometry, state.zoom, line);
    });
    baselinePath.attr("d", buildSegmentedPath(buildCurve(0, "parallel"), geometry, state.zoom, line));

    sources.attr("transform", point => {
      const projected = projectRotatedCoordinate(point[mapName], geometry, state);
      return `translate(${projected.x}, ${projected.y})`;
    });

    const longitudeLabels = buildLongitudeLabelData();
    const latitudeLabels = buildLatitudeLabelData();

    tickLabelLayer.selectAll("text")
      .data(longitudeLabels, item => item.value)
      .join("text")
      .attr("class", "sky-map-tick-label")
      .attr("text-anchor", "middle")
      .attr("x", item => item.x)
      .attr("y", item => item.y)
      .text(item => definition.tickLabel(item.value));

    parallelLabels.selectAll("text")
      .data(latitudeLabels, item => item.value)
      .join("text")
      .attr("class", "sky-map-grid-label")
      .attr("text-anchor", "end")
      .attr("x", item => item.x)
      .attr("y", item => item.y)
      .text(item => formatLatitudeLabel(item.value));

    zoomReadout.textContent = `${state.zoom.toFixed(1)}x`;
  }

  const drag = d3.drag()
    .on("start", () => {
      isDragging = true;
      svg.classed("is-dragging", true);
      hideAllSkyMapTooltips();
    })
    .on("drag", event => {
      const lonPerPixel = 360 / (2 * geometry.radiusX * state.zoom);
      const latPerPixel = 180 / (2 * geometry.radiusY * state.zoom);

      state.rotation.lambda = wrapLongitude(state.rotation.lambda + event.dx * lonPerPixel);
      state.rotation.phi = clamp(state.rotation.phi + event.dy * latPerPixel, -85, 85);

      renderScene();
    })
    .on("end", () => {
      isDragging = false;
      svg.classed("is-dragging", false);
    });

  svg.call(drag);
  svg.on("wheel", event => {
    event.preventDefault();
    hideAllSkyMapTooltips();

    const zoomFactor = Math.exp(-event.deltaY * 0.0015);
    state.zoom = clamp(state.zoom * zoomFactor, 1, SKY_MAP_LAYOUT.maxZoom);

    renderScene();
  }, { passive: false });

  resetButton.addEventListener("click", () => {
    hideAllSkyMapTooltips();
    state.zoom = 1;
    state.rotation.lambda = 0;
    state.rotation.phi = 0;
    renderScene();
  });

  renderScene();
}

function initializeSkyMaps(rows) {
  const skyPoints = rows
    .map(row => {
      const galactic = SKY_MAP_DEFINITIONS.galactic.coordinates(row);
      const equatorial = SKY_MAP_DEFINITIONS.equatorial.coordinates(row);

      if (!galactic || !equatorial) return null;

      return {
        id: row.ID,
        name: row.Name,
        isBinary: /binary/i.test(row.Notes || ""),
        galactic,
        equatorial
      };
    })
    .filter(Boolean);

  const counts = {
    total: skyPoints.length,
    binary: skyPoints.filter(point => point.isBinary).length
  };

  counts.unknown = counts.total - counts.binary;

  Object.keys(SKY_MAP_DEFINITIONS).forEach(mapName => {
    renderSkyMap(mapName, skyPoints, counts);
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

    hideAllSkyMapTooltips();
  });
});

// const N_sources = d3.selectAll("#lpt-table tbody tr").size();

// const tooltip = document.getElementById("figure-tooltip");
// tooltip.textContent = `N = ${N_sources} sources`;
