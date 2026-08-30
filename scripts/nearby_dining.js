#!/usr/bin/env node
/**
 * Amap around-search shortlist for restaurants.
 * Usage:
 *   node nearby_dining.js --location=114.0855,22.5470 --radius=1000 --min-rating=4.3 --limit=2
 * location is lng,lat (GCJ-02). Prints JSON only on stdout.
 */
const https = require('https');

function args() {
  const o = { radius: 1000, minRating: 4.3, limit: 2, keywords: '餐厅', types: '050000' };
  process.argv.slice(2).forEach((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (!m) return;
    const k = m[1];
    const v = m[2];
    if (k === 'location') o.location = v;
    else if (k === 'radius') o.radius = Number(v);
    else if (k === 'min-rating') o.minRating = Number(v);
    else if (k === 'limit') o.limit = Number(v);
    else if (k === 'keywords') o.keywords = v;
    else if (k === 'types') o.types = v;
    else if (k === 'city') o.city = v;
  });
  if (Number.isFinite(o.radius)) o.radius = Math.min(1000, Math.max(200, o.radius));
  return o;
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', (c) => { d += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const a = args();
  const key = process.env.AMAP_WEBSERVICE_KEY || process.env.AMAP_KEY;
  if (!a.location) {
    console.error('need --location=lng,lat');
    process.exit(2);
  }
  if (!key) {
    console.error('need AMAP_WEBSERVICE_KEY');
    process.exit(2);
  }
  const params = new URLSearchParams({
    key,
    location: a.location,
    keywords: a.keywords,
    types: a.types,
    radius: String(a.radius),
    offset: '25',
    page: '1',
    extensions: 'all',
    sortrule: 'weight',
  });
  const url = 'https://restapi.amap.com/v3/place/around?' + params.toString();
  const data = await get(url);
  if (data.status !== '1') {
    console.error(JSON.stringify({ ok: false, info: data.info, infocode: data.infocode }));
    process.exit(1);
  }
  const pois = (data.pois || []).map((p) => {
    const rating = Number((p.biz_ext && p.biz_ext.rating) || p.rating || 0);
    const [lng, lat] = String(p.location || '').split(',').map(Number);
    const cost = (p.biz_ext && p.biz_ext.cost) || '';
    return {
      name: p.name,
      address: p.address,
      lng, lat,
      rating,
      cost,
      tel: p.tel || '',
      type: p.type,
      distance_m: Number(p.distance || 0),
      id: p.id,
    };
  }).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.rating >= a.minRating)
    .sort((x, y) => (y.rating - x.rating) || (x.distance_m - y.distance_m))
    .slice(0, a.limit);

  process.stdout.write(JSON.stringify({
    ok: true,
    center: a.location,
    min_rating: a.minRating,
    count: pois.length,
    shops: pois,
  }, null, 2));
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
