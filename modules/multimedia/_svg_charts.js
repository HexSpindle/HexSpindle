// SVG chart rendering with d3 7.9.0 inside a nodom document.
let libs = null;
async function load() {
  if (!libs) {
    libs = Promise.all([import('./_d3.mjs'), import('./_nodom.mjs'), import('./_d3_hexbin.mjs')])
      .then(([d3, nodom, hexbin]) => ({ d3: d3.default, nodom: nodom.default, d3hexbin: hexbin.default }));
  }
  return libs;
}

const CHAR_REP = { 'Space': ' ', 'Comma': ',', 'Semi-colon': ';', 'Colon': ':', 'Tab': '\t', 'Line feed': '\n', 'CRLF': '\r\n' };

function escapeHtml(str) {
  const HTML_CHARS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '`': '&#x60;', '\u0000': '' };
  return str ? str.replace(/[&<>"'`\u0000]/g, m => HTML_CHARS[m]) : str;
}

function getValues(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded, length) {
  let headings;
  const values = [];
  input.split(recordDelimiter).forEach((row, rowIndex) => {
    const split = row.split(fieldDelimiter);
    if (split.length !== length) throw new Error(`Each row must have length ${length}.`);
    if (columnHeadingsAreIncluded && rowIndex === 0) headings = split;
    else values.push(split);
  });
  return { headings, values };
}

function getScatterValues(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded) {
  let { headings, values } = getValues(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded, 2);
  if (headings) headings = { x: headings[0], y: headings[1] };
  values = values.map(row => {
    const x = parseFloat(row[0]), y = parseFloat(row[1]);
    if (Number.isNaN(x)) throw new Error('Values must be numbers in base 10.');
    if (Number.isNaN(y)) throw new Error('Values must be numbers in base 10.');
    return [x, y];
  });
  return { headings, values };
}

function getScatterValuesWithColour(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded) {
  let { headings, values } = getValues(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded, 3);
  if (headings) headings = { x: headings[0], y: headings[1] };
  values = values.map(row => {
    const x = parseFloat(row[0]), y = parseFloat(row[1]), colour = row[2];
    if (Number.isNaN(x)) throw new Error('Values must be numbers in base 10.');
    if (Number.isNaN(y)) throw new Error('Values must be numbers in base 10.');
    return [x, y, escapeHtml(colour)];
  });
  return { headings, values };
}

function getSeriesValues(input, recordDelimiter, fieldDelimiter) {
  const { values } = getValues(input, recordDelimiter, fieldDelimiter, false, 3);
  let xValues = new Set();
  const series = Object.create(null);
  values.forEach(row => {
    const serie = row[0], xVal = row[1], val = parseFloat(row[2]);
    if (Number.isNaN(val)) throw new Error('Values must be numbers in base 10.');
    xValues.add(xVal);
    if (typeof series[serie] === 'undefined') series[serie] = Object.create(null);
    series[serie][xVal] = val;
  });
  xValues = new Array(...xValues);
  const seriesList = [];
  for (const seriesName of Object.keys(series)) seriesList.push({ name: seriesName, data: series[seriesName] });
  return { xValues, series: seriesList };
}

function newSvg(d3, nodom, width, height) {
  const document = new nodom.Document();
  return d3.select(document.createElement('svg'))
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`);
}

function axesAndLabels(d3, svg, marginedSpace, xAxis, yAxis, margin, width, height, dimension, xLabel, yLabel) {
  marginedSpace.append('g')
    .attr('class', 'axis axis--y')
    .call(d3.axisLeft(yAxis).tickSizeOuter(-width));
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left)
    .attr('x', -(height / 2))
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .text(yLabel);
  marginedSpace.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', 'translate(0,' + height + ')')
    .call(d3.axisBottom(xAxis).tickSizeOuter(-height));
  svg.append('text')
    .attr('x', width / 2)
    .attr('y', dimension)
    .style('text-anchor', 'middle')
    .text(xLabel);
}

const MARGIN = { top: 10, right: 0, bottom: 40, left: 30 };

// ---- HeatmapChart.mjs
function getHeatmapPacking(d3, values, vBins, hBins) {
  const xBounds = d3.extent(values, d => d[0]), yBounds = d3.extent(values, d => d[1]), bins = [];
  if (xBounds[0] === xBounds[1]) throw new Error('Cannot pack points. There is no difference between the minimum and maximum X coordinate.');
  if (yBounds[0] === yBounds[1]) throw new Error('Cannot pack points. There is no difference between the minimum and maximum Y coordinate.');
  for (let y = 0; y < vBins; y++) {
    bins.push([]);
    for (let x = 0; x < hBins; x++) {
      const item = [];
      item.y = y;
      item.x = x;
      bins[y].push(item);
    }
  }
  const epsilon = 0.000000001;
  values.forEach(v => {
    const fractionOfY = (v[1] - yBounds[0]) / ((yBounds[1] + epsilon) - yBounds[0]),
      fractionOfX = (v[0] - xBounds[0]) / ((xBounds[1] + epsilon) - xBounds[0]),
      y = Math.floor(vBins * fractionOfY),
      x = Math.floor(hBins * fractionOfX);
    bins[y][x].push({ x: v[0], y: v[1] });
  });
  return bins;
}

export async function heatmapSvg(input, args) {
  const { d3, nodom } = await load();
  const recordDelimiter = CHAR_REP[args[0]], fieldDelimiter = CHAR_REP[args[1]],
    vBins = args[2], hBins = args[3], columnHeadingsAreIncluded = args[4],
    drawEdges = args[7], minColour = args[8], maxColour = args[9], dimension = 500;
  if (vBins <= 0) throw new Error('Number of vertical bins must be greater than 0');
  if (hBins <= 0) throw new Error('Number of horizontal bins must be greater than 0');
  let xLabel = args[5], yLabel = args[6];
  const { headings, values } = getScatterValues(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded);
  if (headings) { xLabel = headings.x; yLabel = headings.y; }

  const svg = newSvg(d3, nodom, dimension, dimension);
  const margin = MARGIN,
    width = dimension - margin.left - margin.right,
    height = dimension - margin.top - margin.bottom,
    binWidth = width / hBins,
    binHeight = height / vBins,
    marginedSpace = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const bins = getHeatmapPacking(d3, values, vBins, hBins),
    maxCount = Math.max(...bins.map(row => Math.max(...row.map(cell => cell.length))));
  const xAxis = d3.scaleLinear().domain(d3.extent(values, d => d[0])).range([0, width]);
  const yAxis = d3.scaleLinear().domain(d3.extent(values, d => d[1])).range([height, 0]);
  const colour = d3.scaleSequential(d3.interpolateLab(minColour, maxColour)).domain([0, maxCount]);

  marginedSpace.append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height);
  marginedSpace.append('g')
    .attr('class', 'bins')
    .attr('clip-path', 'url(#clip)')
    .selectAll('g')
    .data(bins)
    .enter()
    .append('g')
    .selectAll('rect')
    .data(d => d)
    .enter()
    .append('rect')
    .attr('x', d => binWidth * d.x)
    .attr('y', d => (height - binHeight * (d.y + 1)))
    .attr('width', binWidth)
    .attr('height', binHeight)
    .attr('fill', d => colour(d.length))
    .attr('stroke', drawEdges ? 'rgba(0, 0, 0, 0.5)' : 'none')
    .attr('stroke-width', drawEdges ? '0.5' : 'none')
    .append('title')
    .text(d => {
      const count = d.length, perc = 100.0 * d.length / values.length;
      return `Count: ${count}\n
                               Percentage: ${perc.toFixed(2)}%\n
                    `.replace(/\s{2,}/g, '\n');
    });

  axesAndLabels(d3, svg, marginedSpace, xAxis, yAxis, margin, width, height, dimension, xLabel, yLabel);
  return svg._groups[0][0].outerHTML;
}

// ---- HexDensityChart.mjs
function getEmptyHexagons(d3, centres, radius) {
  const emptyCentres = [],
    boundingRect = [d3.extent(centres, d => d.x), d3.extent(centres, d => d.y)],
    hexagonCenterToEdge = Math.cos(2 * Math.PI / 12) * radius,
    hexagonEdgeLength = Math.sin(2 * Math.PI / 12) * radius;
  let indent = false;
  for (let y = boundingRect[1][0]; y <= boundingRect[1][1] + radius; y += hexagonEdgeLength + radius) {
    for (let x = boundingRect[0][0]; x <= boundingRect[0][1] + radius; x += 2 * hexagonCenterToEdge) {
      let cx = x;
      const cy = y;
      if (indent && x >= boundingRect[0][1]) break;
      if (indent) cx += hexagonCenterToEdge;
      emptyCentres.push({ x: cx, y: cy });
    }
    indent = !indent;
  }
  return emptyCentres;
}

export async function hexDensitySvg(input, args) {
  const { d3, nodom, d3hexbin } = await load();
  const recordDelimiter = CHAR_REP[args[0]], fieldDelimiter = CHAR_REP[args[1]],
    packRadius = args[2], drawRadius = args[3], columnHeadingsAreIncluded = args[4],
    drawEdges = args[7], minColour = args[8], maxColour = args[9], drawEmptyHexagons = args[10], dimension = 500;
  let xLabel = args[5], yLabel = args[6];
  const { headings, values } = getScatterValues(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded);
  if (headings) { xLabel = headings.x; yLabel = headings.y; }

  const svg = newSvg(d3, nodom, dimension, dimension);
  const margin = MARGIN,
    width = dimension - margin.left - margin.right,
    height = dimension - margin.top - margin.bottom,
    marginedSpace = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const hexbin = d3hexbin.hexbin().radius(packRadius).extent([0, 0], [width, height]);
  const hexPoints = hexbin(values), maxCount = Math.max(...hexPoints.map(b => b.length));
  const xExtent = d3.extent(hexPoints, d => d.x), yExtent = d3.extent(hexPoints, d => d.y);
  xExtent[0] -= 2 * packRadius;
  xExtent[1] += 3 * packRadius;
  yExtent[0] -= 2 * packRadius;
  yExtent[1] += 2 * packRadius;
  const xAxis = d3.scaleLinear().domain(xExtent).range([0, width]);
  const yAxis = d3.scaleLinear().domain(yExtent).range([height, 0]);
  const colour = d3.scaleSequential(d3.interpolateLab(minColour, maxColour)).domain([0, maxCount]);

  marginedSpace.append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height);

  if (drawEmptyHexagons) {
    marginedSpace.append('g')
      .attr('class', 'empty-hexagon')
      .selectAll('path')
      .data(getEmptyHexagons(d3, hexPoints, packRadius))
      .enter()
      .append('path')
      .attr('d', d => `M${xAxis(d.x)},${yAxis(d.y)} ${hexbin.hexagon(drawRadius)}`)
      .attr('fill', () => colour(0))
      .attr('stroke', drawEdges ? 'black' : 'none')
      .attr('stroke-width', drawEdges ? '0.5' : 'none')
      .append('title')
      .text(d => {
        const count = 0, perc = 0;
        return `Count: ${count}\n
                                Percentage: ${perc.toFixed(2)}%\n
                                Center: ${d.x.toFixed(2)}, ${d.y.toFixed(2)}\n
                        `.replace(/\s{2,}/g, '\n');
      });
  }

  marginedSpace.append('g')
    .attr('class', 'hexagon')
    .attr('clip-path', 'url(#clip)')
    .selectAll('path')
    .data(hexPoints)
    .enter()
    .append('path')
    .attr('d', d => `M${xAxis(d.x)},${yAxis(d.y)} ${hexbin.hexagon(drawRadius)}`)
    .attr('fill', d => colour(d.length))
    .attr('stroke', drawEdges ? 'black' : 'none')
    .attr('stroke-width', drawEdges ? '0.5' : 'none')
    .append('title')
    .text(d => {
      const count = d.length,
        perc = 100.0 * d.length / values.length,
        CX = d.x, CY = d.y,
        xMin = Math.min(...d.map(p => p[0])), xMax = Math.max(...d.map(p => p[0])),
        yMin = Math.min(...d.map(p => p[1])), yMax = Math.max(...d.map(p => p[1]));
      return `Count: ${count}\n
                               Percentage: ${perc.toFixed(2)}%\n
                               Center: ${CX.toFixed(2)}, ${CY.toFixed(2)}\n
                               Min X: ${xMin.toFixed(2)}\n
                               Max X: ${xMax.toFixed(2)}\n
                               Min Y: ${yMin.toFixed(2)}\n
                               Max Y: ${yMax.toFixed(2)}
                    `.replace(/\s{2,}/g, '\n');
    });

  axesAndLabels(d3, svg, marginedSpace, xAxis, yAxis, margin, width, height, dimension, xLabel, yLabel);
  return svg._groups[0][0].outerHTML;
}

// ---- ScatterChart.mjs
export async function scatterSvg(input, args) {
  const { d3, nodom } = await load();
  const recordDelimiter = CHAR_REP[args[0]], fieldDelimiter = CHAR_REP[args[1]],
    columnHeadingsAreIncluded = args[2], fillColour = escapeHtml(args[5]),
    radius = args[6], colourInInput = args[7], dimension = 500;
  let xLabel = args[3], yLabel = args[4];
  const dataFunction = colourInInput ? getScatterValuesWithColour : getScatterValues;
  const { headings, values } = dataFunction(input, recordDelimiter, fieldDelimiter, columnHeadingsAreIncluded);
  if (headings) { xLabel = headings.x; yLabel = headings.y; }

  const svg = newSvg(d3, nodom, dimension, dimension);
  const margin = MARGIN,
    width = dimension - margin.left - margin.right,
    height = dimension - margin.top - margin.bottom,
    marginedSpace = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const xExtent = d3.extent(values, d => d[0]), xDelta = xExtent[1] - xExtent[0],
    yExtent = d3.extent(values, d => d[1]), yDelta = yExtent[1] - yExtent[0],
    xAxis = d3.scaleLinear().domain([xExtent[0] - (0.1 * xDelta), xExtent[1] + (0.1 * xDelta)]).range([0, width]),
    yAxis = d3.scaleLinear().domain([yExtent[0] - (0.1 * yDelta), yExtent[1] + (0.1 * yDelta)]).range([height, 0]);

  marginedSpace.append('clipPath').attr('id', 'clip').append('rect').attr('width', width).attr('height', height);
  marginedSpace.append('g')
    .attr('class', 'points')
    .attr('clip-path', 'url(#clip)')
    .selectAll('circle')
    .data(values)
    .enter()
    .append('circle')
    .attr('cx', d => xAxis(d[0]))
    .attr('cy', d => yAxis(d[1]))
    .attr('r', () => radius)
    .attr('fill', d => (colourInInput ? d[2] : fillColour))
    .attr('stroke', 'rgba(0, 0, 0, 0.5)')
    .attr('stroke-width', '0.5')
    .append('title')
    .text(d => {
      const x = d[0], y = d[1];
      return `X: ${x}\n
                               Y: ${y}\n
                    `.replace(/\s{2,}/g, '\n');
    });

  axesAndLabels(d3, svg, marginedSpace, xAxis, yAxis, margin, width, height, dimension, xLabel, yLabel);
  return svg._groups[0][0].outerHTML;
}

// ---- SeriesChart.mjs
function clearD3BoundData(node) {
  delete node.__data__;
  if (!node.childNodes) return;
  node.childNodes.forEach(clearD3BoundData);
}

export async function seriesSvg(input, args) {
  const { d3, nodom } = await load();
  const recordDelimiter = CHAR_REP[args[0]], fieldDelimiter = CHAR_REP[args[1]],
    xLabel = args[2], pipRadius = args[3],
    seriesColours = args[4].split(',').map(colour => escapeHtml(colour)),
    svgWidth = 500, interSeriesPadding = 20, xAxisHeight = 50, seriesLabelWidth = 50, seriesHeight = 100,
    seriesWidth = svgWidth - seriesLabelWidth - interSeriesPadding;

  const { xValues, series } = getSeriesValues(input, recordDelimiter, fieldDelimiter),
    allSeriesHeight = Object.keys(series).length * (interSeriesPadding + seriesHeight),
    svgHeight = allSeriesHeight + xAxisHeight + interSeriesPadding;

  const svg = newSvg(d3, nodom, svgWidth, svgHeight);
  const xAxis = d3.scalePoint().domain(xValues).range([0, seriesWidth]);
  svg.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(${seriesLabelWidth}, ${xAxisHeight})`)
    .call(d3.axisTop(xAxis).tickValues(xValues.filter((x, i) =>
      [0, Math.round(xValues.length / 2), xValues.length - 1].indexOf(i) >= 0)));
  svg.append('text')
    .attr('x', svgWidth / 2)
    .attr('y', xAxisHeight / 2)
    .style('text-anchor', 'middle')
    .text(xLabel);

  const tooltipText = {}, tooltipAreaWidth = seriesWidth / xValues.length;
  xValues.forEach(x => {
    const tooltip = [];
    series.forEach(serie => {
      const y = serie.data[x];
      if (typeof y === 'undefined') return;
      tooltip.push(`${serie.name}: ${y}`);
    });
    tooltipText[x] = tooltip.join('\n');
  });

  const chartArea = svg.append('g').attr('transform', `translate(${seriesLabelWidth}, ${xAxisHeight})`);
  chartArea
    .append('g')
    .selectAll('rect')
    .data(xValues)
    .enter()
    .append('rect')
    .attr('x', x => xAxis(x) - (tooltipAreaWidth / 2))
    .attr('y', 0)
    .attr('width', tooltipAreaWidth)
    .attr('height', allSeriesHeight)
    .attr('stroke', 'none')
    .attr('fill', 'transparent')
    .append('title')
    .text(x => `${x}\n
                    --\n
                    ${tooltipText[x]}\n
                `.replace(/\s{2,}/g, '\n'));

  const yAxesArea = svg.append('g').attr('transform', `translate(0, ${xAxisHeight})`);
  series.forEach((serie, seriesIndex) => {
    const yExtent = d3.extent(Object.values(serie.data)),
      yAxis = d3.scaleLinear().domain(yExtent).range([seriesHeight, 0]);
    const seriesGroup = chartArea
      .append('g')
      .attr('transform', `translate(0, ${seriesHeight * seriesIndex + interSeriesPadding * (seriesIndex + 1)})`);
    let path = '';
    xValues.forEach((x, xIndex) => {
      let nextX = xValues[xIndex + 1], y = serie.data[x], nextY = serie.data[nextX];
      if (typeof y === 'undefined' || typeof nextY === 'undefined') return;
      x = xAxis(x); nextX = xAxis(nextX);
      y = yAxis(y); nextY = yAxis(nextY);
      path += `M ${x} ${y} L ${nextX} ${nextY} z `;
    });
    seriesGroup
      .append('path')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', seriesColours[seriesIndex % seriesColours.length])
      .attr('stroke-width', '1');
    xValues.forEach(x => {
      const y = serie.data[x];
      if (typeof y === 'undefined') return;
      seriesGroup
        .append('circle')
        .attr('cx', xAxis(x))
        .attr('cy', yAxis(y))
        .attr('r', pipRadius)
        .attr('fill', seriesColours[seriesIndex % seriesColours.length])
        .append('title')
        .text(() => `${x}\n
                            --\n
                            ${tooltipText[x]}\n
                        `.replace(/\s{2,}/g, '\n'));
    });
    yAxesArea
      .append('g')
      .attr('transform', `translate(${seriesLabelWidth - interSeriesPadding}, ${seriesHeight * seriesIndex + interSeriesPadding * (seriesIndex + 1)})`)
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(yAxis).ticks(5));
    yAxesArea
      .append('g')
      .attr('transform', `translate(0, ${seriesHeight / 2 + seriesHeight * seriesIndex + interSeriesPadding * (seriesIndex + 1)})`)
      .append('text')
      .style('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .text(serie.name);
  });

  clearD3BoundData(svg.node());
  return svg._groups[0][0].outerHTML;
}
