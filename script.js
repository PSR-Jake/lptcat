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

const SKY_MAP_DEFINITIONS = {
  galactic: {
    xLabel: "Galactic Longitude l",
    yLabel: "Galactic Latitude b",
    longitudeLabelLatitude: 0,
    tickLabel: formatGalacticLongitudeLabel,
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
    longitudeLabelLatitude: 0,
    tickLabel: formatRightAscensionLabel,
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

let jumpToCatalogRow = null;

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function wrapLongitude(value) {
  return positiveModulo(value + 180, 360) - 180;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getAdaptiveAngularStep(zoom) {
  if (zoom >= 7) return 5;
  if (zoom >= 4) return 10;
  if (zoom >= 2) return 15;
  return 30;
}

function getLongitudeLabelLatitude(rotationPhi, step) {
  const snappedLatitude = Math.round(rotationPhi / step) * step;

  return clamp(snappedLatitude, -90 + step, 90 - step);
}

function buildMeridianValues(step) {
  return d3.range(-180, 180, step);
}

function buildParallelValues(step) {
  return d3.range(-90 + step, 90, step);
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

function isPointInsideEllipse(point, geometry) {
  const normalizedX = (point.x - geometry.centerX) / geometry.radiusX;
  const normalizedY = (point.y - geometry.centerY) / geometry.radiusY;

  return normalizedX ** 2 + normalizedY ** 2 <= 1.0005;
}

function getLeftEllipseBoundaryX(y, geometry) {
  const normalizedY = clamp((y - geometry.centerY) / geometry.radiusY, -1, 1);
  const radialTerm = Math.max(0, 1 - normalizedY ** 2);

  return geometry.centerX - geometry.radiusX * Math.sqrt(radialTerm);
}

function formatRightAscensionLabel(value) {
  const totalMinutes = Math.round((positiveModulo(-value, 360) / 15) * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h${String(minutes).padStart(2, "0")}m`;
}

function formatGalacticLongitudeLabel(value) {
  if (value === -180) {
    return "180°";
  }

  return `${value}°`;
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

  const meridianPathLayer = scene.append("g");
  const parallelPathLayer = scene.append("g");

  const baselinePath = scene.append("path")
    .attr("class", "sky-map-baseline");

  const longitudeLabelLayer = scene.append("g");
  const latitudeLabelLayer = svg.append("g");

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

  function openSourceInTable(point) {
    activateSource(point);

    if (typeof jumpToCatalogRow === "function") {
      jumpToCatalogRow(point.id);
    }
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
    .on("click", (event, point) => {
      event.stopPropagation();
      openSourceInTable(point);
    })
    .on("focus", (_, point) => {
      activateSource(point);
    })
    .on("blur", deactivateSources)
    .on("keydown", function handleSourceKey(event, point) {
      if (event.key === "Escape") {
        hideAllSkyMapTooltips();
        this.blur();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openSourceInTable(point);
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

  function buildLongitudeLabelData(meridianValues, labelLatitude) {
    return meridianValues
      .map(value => {
        const anchorCoordinates = {
          lon: value,
          lat: labelLatitude
        };
        const anchorPoint = projectRotatedCoordinate(anchorCoordinates, geometry, state);

        return {
          value,
          x: anchorPoint.x,
          y: anchorPoint.y
        };
      })
      .filter(Boolean);
  }

  function buildLatitudeLabelData(parallelValues) {
    return parallelValues.map(value => {
      const visibleCurve = buildCurve(value, "parallel")
        .filter(point => isPointInsideEllipse(point, geometry));
      const leftPoint = visibleCurve.reduce((best, point) => (
        !best || point.x < best.x ? point : best
      ), null);

      if (!leftPoint) return null;

      return {
        value,
        x: clamp(getLeftEllipseBoundaryX(leftPoint.y, geometry) - 8, 14, SKY_MAP_LAYOUT.width - 14),
        y: leftPoint.y
      };
    }).filter(Boolean);
  }

  function renderScene() {
    const angularStep = getAdaptiveAngularStep(state.zoom);
    const meridianValues = buildMeridianValues(angularStep);
    const parallelValues = buildParallelValues(angularStep);
    const secondaryParallelValues = parallelValues.filter(value => value !== 0);
    const longitudeLabelLatitude = getLongitudeLabelLatitude(state.rotation.phi, angularStep);
    const meridianData = meridianValues.map(value => ({
      value,
      curve: buildCurve(value, "meridian")
    }));
    const parallelData = secondaryParallelValues.map(value => ({
      value,
      curve: buildCurve(value, "parallel")
    }));

    meridianPathLayer.selectAll("path")
      .data(meridianData, item => item.value)
      .join("path")
      .attr("class", "sky-map-graticule")
      .attr("d", item => buildSegmentedPath(item.curve, geometry, state.zoom, line));

    parallelPathLayer.selectAll("path")
      .data(parallelData, item => item.value)
      .join("path")
      .attr("class", "sky-map-graticule")
      .attr("d", item => buildSegmentedPath(item.curve, geometry, state.zoom, line));

    baselinePath.attr("d", buildSegmentedPath(buildCurve(0, "parallel"), geometry, state.zoom, line));

    sources.attr("transform", point => {
      const projected = projectRotatedCoordinate(point[mapName], geometry, state);
      return `translate(${projected.x}, ${projected.y})`;
    });

    const longitudeLabels = buildLongitudeLabelData(meridianValues, longitudeLabelLatitude);
    const latitudeLabels = buildLatitudeLabelData(parallelValues);

    longitudeLabelLayer.selectAll("text")
      .data(longitudeLabels, item => item.value)
      .join("text")
      .attr("class", "sky-map-tick-label")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("x", item => item.x)
      .attr("y", item => item.y)
      .text(item => definition.tickLabel(item.value));

    latitudeLabelLayer.selectAll("text")
      .data(latitudeLabels, item => item.value)
      .join("text")
      .attr("class", "sky-map-grid-label")
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
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
  let highlightedRowTimeout = null;
  const searchBox = d3.select("#searchBox");
  
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

  function makeTableRowId(sourceId) {
    const slug = String(sourceId || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `catalog-row-${slug}`;
  }

  function compareRows(a, b) {
    if (!sortState.key) return 0;

    let va = a[sortState.key] ?? "";
    let vb = b[sortState.key] ?? "";

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
  }

  function getFilteredData() {
    const term = searchBox.property("value").toLowerCase().trim();

    if (!term) {
      return [...processed];
    }

    return processed.filter(row =>
      columns.some(col =>
        (row[col.key] ?? "")
          .toString()
          .toLowerCase()
          .includes(term)
      )
    );
  }
  
  // ---- Render table ----
  function renderTable(data) {
    tbody.selectAll("tr").remove();
  
    data.forEach(row => {
      const tr = tbody.append("tr")
        .attr("id", makeTableRowId(row.ID))
        .attr("data-source-id", row.ID)
        .attr("tabindex", -1);

      columns.forEach(col => {
        tr.append("td").html(row[col.key] ?? "");
      });
    });
  }

  function refreshTable() {
    currentData = getFilteredData();

    if (sortState.key) {
      currentData.sort(compareRows);
    }

    renderTable(currentData);
    updateSortSymbols();
  }

  function highlightTableRow(rowNode) {
    tbody.selectAll("tr").classed("is-target-row", false);
    rowNode.classList.add("is-target-row");

    if (highlightedRowTimeout) {
      window.clearTimeout(highlightedRowTimeout);
    }

    highlightedRowTimeout = window.setTimeout(() => {
      rowNode.classList.remove("is-target-row");
    }, 2400);
  }

  function jumpToTableRow(sourceId) {
    const rowId = makeTableRowId(sourceId);
    let rowNode = document.getElementById(rowId);

    if (!rowNode) {
      if (searchBox.property("value")) {
        searchBox.property("value", "");
      }

      refreshTable();
      rowNode = document.getElementById(rowId);
    }

    if (!rowNode) return;

    rowNode.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    highlightTableRow(rowNode);
  }
  
  // ---- Sorting logic ----
  function sortBy(key) {
    if (sortState.key === key) {
      sortState.asc = !sortState.asc;
    } else {
      sortState.key = key;
      sortState.asc = true;
    }

    refreshTable();
  }
  
  // ---- Global search ----
  searchBox.on("input", function () {
    refreshTable();
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
  refreshTable();
  jumpToCatalogRow = jumpToTableRow;
  initializeSkyMaps(data);

});

d3.csv("updates.csv").then(updates => {
  const list = d3.select("#update-list");
  const maxVisibleUpdates = 5;
  const latestUpdates = updates
    .slice()
    // Dates are stored as YYYY-MM-DD, so string sorting matches chronology.
    .sort((a, b) => b.Date.localeCompare(a.Date))
    .slice(0, maxVisibleUpdates);

  latestUpdates
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
