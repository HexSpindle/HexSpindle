import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';
import { RECORD_DELIMITERS, FIELD_DELIMITERS, getScatterValues, lerpColor, drawAxes, hexbin, hexagonPath } from './_charts.js';

module('Hex Density chart',
  'Groups (x, y) data into hexagonal bins and colours each hexagon by how many points fall inside it ' +
  '- a 2D histogram, useful for showing the distribution of far more points than could be plotted ' +
  'individually. Input is one record per line, fields separated by the chosen delimiter.',
  [
    A.select('Record delimiter', Object.keys(RECORD_DELIMITERS)),
    A.select('Field delimiter', Object.keys(FIELD_DELIMITERS)),
    A.number('Pack radius', 25, 2),
    A.number('Draw radius', 15, 1),
    A.boolean('Use first row as column headers', true),
    A.string('X label', ''),
    A.string('Y label', ''),
    A.boolean('Draw hexagon edges', false),
    A.string('Min colour value', 'white'),
    A.string('Max colour value', 'black'),
  ],
  (input, recordDelimName, fieldDelimName, packRadius, drawRadius, headersIncluded, xLabelArg, yLabelArg, drawEdges, minColour, maxColour) => {
    const recordDelim = RECORD_DELIMITERS[recordDelimName], fieldDelim = FIELD_DELIMITERS[fieldDelimName];
    const { headings, values } = getScatterValues(input, recordDelim, fieldDelim, headersIncluded);
    const xLabel = headings ? headings.x : xLabelArg;
    const yLabel = headings ? headings.y : yLabelArg;

    const dimension = 500;
    const margin = { top: 10, right: 10, bottom: 50, left: 45 };
    const width = dimension - margin.left - margin.right;
    const height = dimension - margin.top - margin.bottom;

    const xs = values.map(v => v[0]), ys = values.map(v => v[1]);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const xRange = (xMax - xMin) || 1, yRange = (yMax - yMin) || 1;

    const toPixel = ([x, y]) => [
      ((x - xMin) / xRange) * width,
      height - ((y - yMin) / yRange) * height,
    ];
    const pixelPoints = values.map(toPixel);
    const bins = hexbin(pixelPoints, packRadius);
    const maxCount = Math.max(...bins.map(b => b.points.length));

    const canvas = new OffscreenCanvas(dimension, dimension);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dimension, dimension);

    ctx.save();
    ctx.translate(margin.left, margin.top);
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    for (const bin of bins) {
      hexagonPath(ctx, bin.x, bin.y, drawRadius);
      ctx.fillStyle = lerpColor(minColour, maxColour, maxCount > 0 ? bin.points.length / maxCount : 0);
      ctx.fill();
      if (drawEdges) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    ctx.restore();

    drawAxes(ctx, { x0: margin.left, y0: margin.top, width, height, xDomain: [xMin, xMax], yDomain: [yMin, yMax], xLabel, yLabel });

    return canvasToPng(canvas);
  }, { text: true });
