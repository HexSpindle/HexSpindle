export const RECORD_DELIMITERS = { 'Line feed': '\n', 'CRLF': '\r\n' };
export const FIELD_DELIMITERS = { 'Space': ' ', 'Comma': ',', 'Semi-colon': ';', 'Colon': ':', 'Tab': '\t' };

function splitRows(input, recordDelim) {
  const rows = input.split(recordDelim);
  if (rows.length && rows[rows.length - 1] === '') rows.pop();
  return rows;
}

function getValues(input, recordDelim, fieldDelim, headersIncluded, length) {
  let headings;
  const values = [];
  splitRows(input, recordDelim).forEach((row, i) => {
    const split = row.split(fieldDelim);
    if (split.length !== length) {
      throw new Error(`Each row must have ${length} field(s) separated by the field delimiter (row ${i + 1}: "${row}").`);
    }
    if (headersIncluded && i === 0) headings = split;
    else values.push(split);
  });
  return { headings, values };
}

export function getScatterValues(input, recordDelim, fieldDelim, headersIncluded) {
  let { headings, values } = getValues(input, recordDelim, fieldDelim, headersIncluded, 2);
  if (headings) headings = { x: headings[0], y: headings[1] };
  values = values.map(row => {
    const x = parseFloat(row[0]), y = parseFloat(row[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) throw new Error('Values must be numbers in base 10.');
    return [x, y];
  });
  if (!values.length) throw new Error('No data rows found.');
  return { headings, values };
}

export function getScatterValuesWithColour(input, recordDelim, fieldDelim, headersIncluded) {
  let { headings, values } = getValues(input, recordDelim, fieldDelim, headersIncluded, 3);
  if (headings) headings = { x: headings[0], y: headings[1] };
  values = values.map(row => {
    const x = parseFloat(row[0]), y = parseFloat(row[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) throw new Error('Values must be numbers in base 10.');
    return [x, y, row[2]];
  });
  if (!values.length) throw new Error('No data rows found.');
  return { headings, values };
}

export function getSeriesValues(input, recordDelim, fieldDelim) {
  const { values } = getValues(input, recordDelim, fieldDelim, false, 3);
  const xValues = [];
  const seriesData = Object.create(null);
  for (const row of values) {
    const [name, xVal, yStr] = row;
    const y = parseFloat(yStr);
    if (Number.isNaN(y)) throw new Error('Values must be numbers in base 10.');
    if (!xValues.includes(xVal)) xValues.push(xVal);
    if (!seriesData[name]) seriesData[name] = Object.create(null);
    seriesData[name][xVal] = y;
  }
  const series = Object.keys(seriesData).map(name => ({ name, data: seriesData[name] }));
  if (!series.length) throw new Error('No data rows found.');
  return { xValues, series };
}

let probeCtx = null;
export function cssColorToRgb(str) {
  if (!probeCtx) probeCtx = new OffscreenCanvas(1, 1).getContext('2d');
  probeCtx.clearRect(0, 0, 1, 1);
  probeCtx.fillStyle = '#000';
  probeCtx.fillStyle = str;
  probeCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

export function lerpColor(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const ca = cssColorToRgb(a), cb = cssColorToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

export function formatTick(n) {
  if (Number.isInteger(n)) return String(n);
  const r = Math.round(n * 100) / 100;
  return String(r);
}

export function drawAxes(ctx, { x0, y0, width, height, xDomain, yDomain, xLabel, yLabel, ticks = 5 }) {
  ctx.save();
  ctx.strokeStyle = '#333';
  ctx.fillStyle = '#333';
  ctx.lineWidth = 1;
  ctx.font = '11px sans-serif';
  ctx.beginPath();
  ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + height); ctx.lineTo(x0 + width, y0 + height);
  ctx.stroke();

  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= ticks; i++) {
    const v = yDomain[0] + (yDomain[1] - yDomain[0]) * (i / ticks);
    const y = y0 + height - (height * i / ticks);
    ctx.beginPath(); ctx.moveTo(x0 - 3, y); ctx.lineTo(x0, y); ctx.stroke();
    ctx.fillText(formatTick(v), x0 - 6, y);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 0; i <= ticks; i++) {
    const v = xDomain[0] + (xDomain[1] - xDomain[0]) * (i / ticks);
    const x = x0 + (width * i / ticks);
    ctx.beginPath(); ctx.moveTo(x, y0 + height); ctx.lineTo(x, y0 + height + 3); ctx.stroke();
    ctx.fillText(formatTick(v), x, y0 + height + 6);
  }

  if (yLabel) {
    ctx.save();
    ctx.translate(12, y0 + height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }
  if (xLabel) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(xLabel, x0 + width / 2, y0 + height + 32);
  }
  ctx.restore();
}

function cubeRound(x, y, z) {
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const xDiff = Math.abs(rx - x), yDiff = Math.abs(ry - y), zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return [rx, rz];
}

export function pixelToHex(x, y, radius) {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / radius;
  const r = (2 / 3 * y) / radius;
  const [rq, rr] = cubeRound(q, -q - r, r);
  return [rq, rr];
}

export function hexToPixel(q, r, radius) {
  const x = radius * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = radius * (1.5 * r);
  return [x, y];
}

export function hexbin(points, radius) {
  const bins = new Map();
  for (const p of points) {
    const [q, r] = pixelToHex(p[0], p[1], radius);
    const id = `${q},${r}`;
    let bin = bins.get(id);
    if (!bin) {
      const [cx, cy] = hexToPixel(q, r, radius);
      bin = { q, r, x: cx, y: cy, points: [] };
      bins.set(id, bin);
    }
    bin.points.push(p);
  }
  return [...bins.values()];
}

export function hexagonPath(ctx, cx, cy, radius) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
