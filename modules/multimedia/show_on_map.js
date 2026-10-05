import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';

function parseCoordPart(str) {
  let s = str.trim();
  let dir = '';
  if (/^[NSEWnsew]/.test(s)) { dir = s[0].toUpperCase(); s = s.slice(1); }
  else if (/[NSEWnsew]$/.test(s)) { dir = s[s.length - 1].toUpperCase(); s = s.slice(0, -1); }
  s = s.replace(/[°'′"″]/g, ' ').trim();
  const nums = s.split(/\s+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some(Number.isNaN)) return null;
  const [deg, min = 0, sec = 0] = nums;
  let value = Math.abs(deg) + min / 60 + sec / 3600;
  if (deg < 0 || dir === 'S' || dir === 'W') value = -value;
  return value;
}

function parseLatLon(input) {
  let parts = input.split(/[,;\n\t]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length !== 2) parts = input.trim().split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseCoordPart(parts[0]), lon = parseCoordPart(parts[1]);
  if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
}

module('Show on map',
  "Renders a latitude/longitude coordinate as a marker on a plain, labelled lat/lon grid, output as a " +
  "standalone PNG. This is a deliberately simplified stand-in for 'Show on map', which " +
  'embeds an interactive Leaflet map with live OpenStreetMap tiles in the browser - that requires a ' +
  'network connection and an actual map/tile library, neither of which is practical to reproduce ' +
  'headlessly or offline here, and OSM tiles cannot be vendored into this project. There is no real ' +
  'coastline or geography drawn, just an equirectangular degree grid with the point marked on it. ' +
  'Coordinate parsing is also narrower: only Decimal Degrees (DD) and Degrees ' +
  "[Decimal] Minutes [Seconds] (DDM/DMS, with N/S/E/W suffixes or signed numbers) are supported - " +
  "Geohash, MGRS, OSNG and UTM are not implemented; convert those to decimal degrees first (e.g. with another tool).",
  [A.number('Grid line spacing (degrees)', 30, 5, 90), A.number('Image size (px)', 500, 200, 2000)],
  (input, gridSpacing, size) => {
    if (!input.replace(/\s+/g, '')) throw new Error('No input. Provide a latitude/longitude pair, e.g. "51.5074, -0.1278".');
    const coord = parseLatLon(input);
    if (!coord) throw new Error('Could not parse a latitude/longitude pair. Expected e.g. "51.5074, -0.1278" or "51 30 26 N, 0 7 39 W".');
    if (coord.lat < -90 || coord.lat > 90) throw new Error('Latitude must be between -90 and 90.');
    if (coord.lon < -180 || coord.lon > 180) throw new Error('Longitude must be between -180 and 180.');

    const margin = 30;
    const mapW = size - margin * 2;
    const mapH = size / 2;
    const w = size, h = mapH + margin * 2 + 10;

    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#eef3f7';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfe3ef';
    ctx.fillRect(margin, margin, mapW, mapH);

    const xOf = lon => margin + ((lon + 180) / 360) * mapW;
    const yOf = lat => margin + ((90 - lat) / 180) * mapH;

    ctx.strokeStyle = '#9ab4c4';
    ctx.fillStyle = '#44607a';
    ctx.font = '10px sans-serif';
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += gridSpacing) {
      const x = xOf(lon);
      ctx.beginPath(); ctx.moveTo(x, margin); ctx.lineTo(x, margin + mapH); ctx.stroke();
      ctx.fillText(`${lon}°`, x + 2, margin + mapH + 12);
    }
    for (let lat = -90; lat <= 90; lat += gridSpacing) {
      const y = yOf(lat);
      ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(margin + mapW, y); ctx.stroke();
      ctx.fillText(`${lat}°`, 2, y - 2);
    }

    ctx.strokeStyle = '#5b7a90';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(margin, yOf(0)); ctx.lineTo(margin + mapW, yOf(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xOf(0), margin); ctx.lineTo(xOf(0), margin + mapH); ctx.stroke();
    ctx.strokeStyle = '#44607a';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin, margin, mapW, mapH);

    const mx = xOf(coord.lon), my = yOf(coord.lat);
    ctx.strokeStyle = '#d6273e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my);
    ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my + 10);
    ctx.stroke();
    ctx.fillStyle = '#d6273e';
    ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#1a2733';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${coord.lat.toFixed(5)}, ${coord.lon.toFixed(5)}`, margin, 18);

    return canvasToPng(canvas);
  }, { text: true });
