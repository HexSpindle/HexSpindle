import { module } from './_cat.js';
import { A } from '../../core/registry.js';
import { canvasToPng } from './_img.js';

const FORMATS = ['Degrees Minutes Seconds', 'Degrees Decimal Minutes', 'Decimal Degrees', 'Geohash',
  'Military Grid Reference System', 'Ordnance Survey National Grid', 'Universal Transverse Mercator'];
const DELIMS = ['Auto', 'Direction Preceding', 'Direction Following', '\\n', 'Comma', 'Semi-colon', 'Colon'];

async function toLatLong(input, inFormat, inDelim) {
  const { convertCoordinates } = await import('./_coords.js');
  let latLong;
  try {
    latLong = convertCoordinates(input, inFormat, inDelim, 'Decimal Degrees', 'Comma', 'None', 5);
  } catch (error) {
    throw new Error(String(error));
  }
  latLong = latLong.replace(/[,]$/, '');
  latLong = latLong.replace(/°/g, '');
  const coords = latLong.split(',').map(v => v.trim());
  if (coords.length !== 2 || coords.some(v => v === '' || isNaN(Number(v)))) {
    throw new Error(`Could not show coordinates '${latLong}' on the map. Expected a latitude and longitude pair - check that the input format and delimiter are correct.`);
  }
  return latLong;
}

module('Show on map',
  "Converts a co-ordinate to decimal degrees for display on a map. Supported input formats: Degrees " +
  'Minutes Seconds (DMS), Degrees Decimal Minutes (DDM), Decimal Degrees (DD), Geohash, Military Grid ' +
  'Reference System (MGRS), Ordnance Survey National Grid (OSNG) and Universal Transverse Mercator (UTM). ' +
  "Output 'Co-ordinates' (default) is the 'latitude,longitude' " +
  "string, which a web page can show on a live OpenStreetMap/Leaflet map. That map needs a " +
  "network connection and tile service, so HexSpindle does not embed it; 'PNG map' instead draws the point " +
  'on a plain, labelled equirectangular lat/lon grid (no coastlines or geography), using the two grid/size ' +
  'arguments.',
  [
    A.number('Grid line spacing (degrees)', 30, 5, 90),
    A.number('Image size (px)', 500, 200, 2000),
    A.select('Input Format', ['Auto', ...FORMATS]),
    A.select('Input Delimiter', DELIMS),
    A.select('Output', ['Co-ordinates', 'PNG map']),
  ],
  async (input, gridSpacing, size, inFormat, inDelim, output) => {
    if (output !== 'PNG map') {
      return input.replace(/\s+/g, '') !== '' ? toLatLong(input, inFormat, inDelim) : input;
    }
    if (!input.replace(/\s+/g, '')) throw new Error('No input. Provide a latitude/longitude pair, e.g. "51.5074, -0.1278".');
    const [lat, lon] = (await toLatLong(input, inFormat, inDelim)).split(',').map(Number);
    const coord = { lat, lon };
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
