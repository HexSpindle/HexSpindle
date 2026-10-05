import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';
import { RECORD_DELIMITERS, FIELD_DELIMITERS, getScatterValues, getScatterValuesWithColour, drawAxes } from './_charts.js';

module('Scatter chart',
  'Plots two-variable (x, y) data as points on a graph. Input is one record per line, fields ' +
  'separated by the chosen delimiter (e.g. "1,2" per line for simple x,y data).',
  [
    A.select('Record delimiter', Object.keys(RECORD_DELIMITERS)),
    A.select('Field delimiter', Object.keys(FIELD_DELIMITERS)),
    A.boolean('Use first row as column headers', true),
    A.string('X label', ''),
    A.string('Y label', ''),
    A.string('Colour', 'black'),
    A.number('Point radius', 4, 0.5),
    A.boolean('Use colour from third column', false),
  ],
  (input, recordDelimName, fieldDelimName, headersIncluded, xLabelArg, yLabelArg, fillColour, radius, colourInInput) => {
    const recordDelim = RECORD_DELIMITERS[recordDelimName], fieldDelim = FIELD_DELIMITERS[fieldDelimName];
    const dataFn = colourInInput ? getScatterValuesWithColour : getScatterValues;
    const { headings, values } = dataFn(input, recordDelim, fieldDelim, headersIncluded);

    const xLabel = headings ? headings.x : xLabelArg;
    const yLabel = headings ? headings.y : yLabelArg;

    const dimension = 500;
    const margin = { top: 10, right: 10, bottom: 50, left: 45 };
    const width = dimension - margin.left - margin.right;
    const height = dimension - margin.top - margin.bottom;

    const xs = values.map(v => v[0]), ys = values.map(v => v[1]);
    let [xMin, xMax] = [Math.min(...xs), Math.max(...xs)];
    let [yMin, yMax] = [Math.min(...ys), Math.max(...ys)];
    const xPad = (xMax - xMin) * 0.1 || 1, yPad = (yMax - yMin) * 0.1 || 1;
    xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;

    const xScale = x => margin.left + ((x - xMin) / (xMax - xMin)) * width;
    const yScale = y => margin.top + height - ((y - yMin) / (yMax - yMin)) * height;

    const canvas = new OffscreenCanvas(dimension, dimension);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, dimension, dimension);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 0.5;
    for (const v of values) {
      ctx.fillStyle = colourInInput ? (v[2] || fillColour) : fillColour;
      ctx.beginPath();
      ctx.arc(xScale(v[0]), yScale(v[1]), radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    drawAxes(ctx, { x0: margin.left, y0: margin.top, width, height, xDomain: [xMin, xMax], yDomain: [yMin, yMax], xLabel, yLabel });

    return canvasToPng(canvas);
  }, { text: true });
