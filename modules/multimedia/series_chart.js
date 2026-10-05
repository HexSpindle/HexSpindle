import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';
import { RECORD_DELIMITERS, FIELD_DELIMITERS, getSeriesValues } from './_charts.js';

module('Series chart',
  'Draws one or more time/line series as connected points. Input is one record per line of ' +
  '"series name, x value, y value" (fields separated by the chosen delimiter) - x values are treated ' +
  'as categorical labels (shared across series) rather than a numeric axis. Each ' +
  'series gets its own small sub-chart stacked vertically. Rendered directly onto a canvas and ' +
  'rasterised to PNG',
  [
    A.select('Record delimiter', Object.keys(RECORD_DELIMITERS)),
    A.select('Field delimiter', Object.keys(FIELD_DELIMITERS)),
    A.string('X label', ''),
    A.number('Point radius', 2, 0),
    A.string('Series colours', 'mediumseagreen, dodgerblue, tomato'),
  ],
  (input, recordDelimName, fieldDelimName, xLabel, pointRadius, seriesColoursArg) => {
    const recordDelim = RECORD_DELIMITERS[recordDelimName], fieldDelim = FIELD_DELIMITERS[fieldDelimName];
    const seriesColours = seriesColoursArg.split(',').map(c => c.trim()).filter(Boolean);
    if (!seriesColours.length) seriesColours.push('black');

    const { xValues, series } = getSeriesValues(input, recordDelim, fieldDelim);

    const svgWidth = 500;
    const interSeriesPadding = 20;
    const xAxisHeight = 40;
    const seriesLabelWidth = 70;
    const seriesHeight = 100;
    const seriesWidth = svgWidth - seriesLabelWidth - interSeriesPadding;
    const allSeriesHeight = series.length * (interSeriesPadding + seriesHeight);
    const svgHeight = allSeriesHeight + xAxisHeight + interSeriesPadding;

    const canvas = new OffscreenCanvas(svgWidth, svgHeight);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, svgWidth, svgHeight);

    const xScale = i => xValues.length > 1 ? (seriesWidth * i) / (xValues.length - 1) : seriesWidth / 2;

    ctx.fillStyle = '#333';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const tickIndices = [...new Set([0, Math.round((xValues.length - 1) / 2), xValues.length - 1])];
    for (const i of tickIndices) {
      if (i < 0 || i >= xValues.length) continue;
      ctx.fillText(String(xValues[i]), seriesLabelWidth + xScale(i), xAxisHeight - 4);
    }
    ctx.textBaseline = 'middle';
    ctx.fillText(xLabel, svgWidth / 2, xAxisHeight / 2);

    series.forEach((serie, seriesIndex) => {
      const colour = seriesColours[seriesIndex % seriesColours.length];
      const yVals = xValues.map(x => serie.data[x]).filter(v => v !== undefined);
      const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
      const yRange = (yMax - yMin) || 1;
      const yScale = v => seriesHeight - ((v - yMin) / yRange) * seriesHeight;

      const top = xAxisHeight + interSeriesPadding + seriesIndex * (seriesHeight + interSeriesPadding);

      ctx.strokeStyle = colour;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < xValues.length; i++) {
        const v = serie.data[xValues[i]];
        if (v === undefined) { started = false; continue; }
        const x = seriesLabelWidth + xScale(i), y = top + yScale(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = colour;
      for (let i = 0; i < xValues.length; i++) {
        const v = serie.data[xValues[i]];
        if (v === undefined) continue;
        const x = seriesLabelWidth + xScale(i), y = top + yScale(v);
        if (pointRadius > 0) {
          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(seriesLabelWidth, top); ctx.lineTo(seriesLabelWidth, top + seriesHeight);
      ctx.stroke();
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(formatNum(yMax), seriesLabelWidth - 4, top);
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatNum(yMin), seriesLabelWidth - 4, top + seriesHeight);

      ctx.save();
      ctx.translate(14, top + seriesHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '11px sans-serif';
      ctx.fillText(serie.name, 0, 0);
      ctx.restore();
    });

    return canvasToPng(canvas);
  }, { text: true });

function formatNum(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
