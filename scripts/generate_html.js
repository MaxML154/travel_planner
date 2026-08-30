#!/usr/bin/env node
/**
 * Dark-card trip HTML renderer.
 * Usage: node scripts/generate_html.js plan.json out.html
 */
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) {
  console.error('usage: node generate_html.js plan.json out.html');
  process.exit(2);
}

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets', 'style.css'), 'utf8');
const mapEngine = fs.readFileSync(path.join(root, 'assets', 'map-engine.js'), 'utf8');
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const trip = normalize(raw);
const html = render(trip, css, mapEngine);
fs.writeFileSync(outputPath, html, 'utf8');
console.log('HTML:', outputPath);

function normalize(data) {
  if (Array.isArray(data.days) && data.days.length) {
    return fillDefaults(data);
  }
  const days = (data.itinerary || []).map((d) => ({
    date: d.date,
    theme: d.theme || '',
    summary: d.summary || '',
    slots: (d.timeline || []).map((s) => ({
      time: s.time,
      type: s.type === 'meal' ? 'dining' : s.type === 'poi' ? 'attraction' : s.type,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      address: s.address || '',
      metro: s.metro || '',
      price: s.price != null ? (typeof s.price === 'number' ? '¥' + s.price : s.price) : (s.ticket != null ? (s.ticket ? '¥' + s.ticket : '免费') : ''),
      rating: s.rating,
      review: s.desc || s.review || '',
      image: s.image_url || s.image || '',
      source: s.source || '',
      recommended_dishes: s.recommended_dishes || [],
      xiaohongshu: s.xiaohongshu || null,
    })),
  }));
  return fillDefaults({
    title: data.title || ((data.city || '') + ((data.dayCount || days.length) ? (data.dayCount || days.length) + '日游' : '')),
    city: data.city,
    days: days,
    startDate: data.startDate || (data.dates && data.dates[0]) || '',
    dates: data.dates,
    transport_mode: data.transport_mode,
    origin: data.origin,
    destination: data.destination,
    budget: data.budget,
    disclaimer: data.disclaimer,
    preTrip: data.preTrip || {},
    weather: data.weather,
    reminders: data.reminders || [],
    hotelAreas: data.hotelAreas || (data.hotel ? [{
      name: data.hotel.name,
      reason: data.hotel.note || '',
      options: [data.hotel],
    }] : []),
    costs: data.costs,
    tips: data.tips || [],
  });
}

function fillDefaults(t) {
  t.title = t.title || '旅行计划';
  t.preTrip = t.preTrip || {};
  t.reminders = t.reminders || [];
  t.hotelAreas = t.hotelAreas || [];
  t.tips = t.tips || [];
  t.days = Array.isArray(t.days) ? t.days : [];
  t.dayCount = t.dayCount || t.days.length;
  t.disclaimer = t.disclaimer || '本计划基于查询当日数据，价格、天气、营业时间可能变化，出行前请再次确认。';
  if (!t.startDate && t.days[0] && t.days[0].date) t.startDate = t.days[0].date;
  return t;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stars(r) {
  if (r == null || r === '') return '';
  const n = Math.round(Number(r));
  if (!n) return '';
  return '⭐'.repeat(Math.min(5, Math.max(1, n))) + ' ' + Number(r).toFixed(1) + '分';
}

function weatherLine(t) {
  if (t.preTrip.weather) return t.preTrip.weather;
  const w = t.weather || {};
  if (w.forecast && w.forecast.length) {
    return w.forecast.map((f) => {
      const range = [f.temp_low, f.temp_high].filter(Boolean).join('-');
      return [f.date, f.weather, range].filter(Boolean).join(' ');
    }).join('；');
  }
  return w.note || '行程日若超出预报窗，出发前再查';
}

function budgetLine(t) {
  if (t.preTrip.budget) return t.preTrip.budget;
  const c = t.costs;
  if (!c) return t.budget != null ? ('预算 ¥' + t.budget) : '';
  return `餐饮¥${c.dining || 0} · 门票¥${c.tickets || 0} · 交通¥${c.transport || 0} · 住宿¥${c.lodging || 0} · 合计¥${c.total || 0}`
    + (t.budget != null ? ` / 预算¥${t.budget}` : '');
}

function renderReminders(t) {
  if (!t.reminders.length) return '<p class="todo-text">无额外待办</p>';
  return '<div id="pretrip-checklist"></div>';
}

function renderKnow(t) {
  const w = weatherLine(t);
  const b = budgetLine(t);
  const park = t.preTrip.parking || t.transport_mode || '';
  const vehicle = t.preTrip.vehicle || '';
  return `
    <section class="card">
      <h3>📋 行前须知</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 16px;">
        <div>
          <h4 style="color: var(--accent-teal); font-size: 14px; margin-bottom: 8px;">预算参考</h4>
          <p style="margin-bottom: 8px; font-size: 13px;">${esc(b).replace(/\n/g, '<br>')}</p>
        </div>
        <div>
          <h4 style="color: var(--accent-gold); font-size: 14px; margin-bottom: 8px;">🌦️ 天气提醒</h4>
          <p style="margin-bottom: 8px; font-size: 13px;">${esc(w)}</p>
        </div>
        <div>
          <h4 style="color: var(--accent-green); font-size: 14px; margin-bottom: 8px;">出行方式</h4>
          <p style="margin-bottom: 8px; font-size: 13px;">${[vehicle, park, t.origin && ('起：' + t.origin), t.destination && ('终：' + t.destination)].filter(Boolean).map(esc).join('<br>') || '见日程'}</p>
        </div>
      </div>
    </section>`;
}

function renderHotels(t) {
  if (!t.hotelAreas.length) return '';
  const blocks = t.hotelAreas.map((area) => {
    const opts = (area.options || [area]).map((h) => `
          <div class="hotel-option">
            <div class="hotel-name">${esc(h.name)}</div>
            <div style="margin-bottom: 8px;">
              <div class="hotel-price">${esc(h.price || h.price_per_night && ('¥' + h.price_per_night + '/晚') || '')}</div>
              ${h.tier ? `<span class="hotel-tier">${esc(h.tier)}</span>` : ''}
            </div>
            <div class="hotel-note">${esc(h.note || h.address || '')}</div>
          </div>`).join('');
    return `
      <div class="hotel-area">
        <h3>${esc(area.name)}</h3>
        ${area.reason ? `<div class="hotel-reason"><strong>为何选择：</strong>${esc(area.reason)}</div>` : ''}
        <div class="hotel-grid">${opts}</div>
      </div>`;
  }).join('');
  return `
    <section class="hotel-section card">
      <h2>🏨 酒店推荐</h2>
      ${blocks}
    </section>`;
}

function slotBody(s) {
  const img = s.image
    ? `<img src="${esc(s.image)}" alt="${esc(s.name)}" style="width:100%;max-width:600px;height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px;" onerror="this.style.display='none'">`
    : '';
  const dishes = (s.recommended_dishes || []).length
    ? '推荐菜：' + (s.recommended_dishes).slice(0, 6).join('、')
    : '';
  const xhs = s.xiaohongshu && s.xiaohongshu.tips ? s.xiaohongshu.tips : '';
  const extra = [s.review, s.address && ('地址：' + s.address), s.metro, dishes, xhs].filter(Boolean).map(esc).join('<br>');
  const rating = stars(s.rating);
  const tags = [];
  const t = (s.type || '').toLowerCase();
  if (t === 'dining' || t === 'meal') tags.push('<span class="tag dining">餐饮</span>');
  if (s.price) tags.push(`<span class="tag price">${esc(s.price)}</span>`);
  if (t === 'hotel') tags.push('<span class="tag">住宿</span>');
  if (t === 'transit') tags.push('<span class="tag">交通</span>');
  return `
            <div class="timeline-content">
              ${img}${extra}
              ${rating ? `<div class="timeline-rating">${rating}</div>` : ''}
              ${tags.length ? `<div class="timeline-tags">${tags.join('')}</div>` : ''}
            </div>`;
}

function renderDays(t) {
  return t.days.map((day, i) => {
    const items = (day.slots || []).filter((s) => (s.type || '') !== 'dining-alt').map((s) => `
          <div class="timeline-item">
            <div class="timeline-time">${esc(s.time || '')}</div>
            <div class="timeline-title">${esc(s.name || '')}</div>
            ${slotBody(s)}
          </div>`).join('');
    const alts = (day.slots || []).filter((s) => (s.type || '') === 'dining-alt');
    const altBlock = alts.length
      ? `<p style="font-size:13px;color:var(--text-tertiary);margin-top:12px;">备选：${alts.map((s) => esc(s.name) + (s.price ? '（' + esc(s.price) + '）' : '')).join(' · ')}</p>`
      : '';
    return `
    <section class="day-section">
      <div class="card">
        <div class="day-header">
          <div>
            <div class="day-date">${esc(day.date || '')} · Day ${i + 1}</div>
            <div class="day-theme">${esc(day.theme || '')}</div>
          </div>
          <div class="day-summary">${esc(day.summary || '')}</div>
        </div>
        <div class="timeline">${items}</div>
        ${altBlock}
      </div>
    </section>`;
  }).join('\n');
}

function renderTips(t) {
  if (!t.tips.length) return '';
  return `
    <section class="tips-section">
      <h2>💡 行程建议</h2>
      <div class="tips-list">
        ${t.tips.map((tip) => `<div class="tip-item">${esc(tip)}</div>`).join('')}
      </div>
    </section>`;
}

function renderCosts(t) {
  const c = t.costs;
  if (!c) return '';
  return `
    <section class="card">
      <h3>预计开销</h3>
      <p style="font-size:13px;">餐饮 ¥${esc(c.dining)} · 门票 ¥${esc(c.tickets)} · 交通 ¥${esc(c.transport)} · 住宿 ¥${esc(c.lodging)} · <strong>合计 ¥${esc(c.total)}</strong>
      ${t.budget != null ? `（预算 ¥${esc(t.budget)}，剩余 ¥${esc(c.surplus != null ? c.surplus : '')}）` : ''}</p>
    </section>`;
}

function mapPoints(t) {
  const pts = [];
  t.days.forEach((day) => {
    (day.slots || []).forEach((s) => {
      if ((s.type || '') === 'dining-alt') return;
      const lat = Number(s.lat);
      const lng = Number(s.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      pts.push({ lat, lng, name: s.name, time: s.time, type: s.type || 'attraction' });
    });
  });
  return pts;
}

function render(t, cssText, engine) {
  const tripJson = JSON.stringify({
    title: t.title,
    startDate: t.startDate,
    disclaimer: t.disclaimer,
    preTrip: t.preTrip,
    reminders: t.reminders,
    hotelAreas: t.hotelAreas,
    tips: t.tips,
    days: t.days,
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0a0e13">
  <title>${esc(t.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css">
  <style>
${cssText}
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero__content">
      <div class="date-badge">${esc(t.transport_mode || '旅行计划')}</div>
      <h1>${esc(t.title)}</h1>
      <p class="subtitle">${esc((t.days[0] && t.days[t.days.length - 1]) ? ((t.days[0].date || '') + ' – ' + (t.days[t.days.length - 1].date || '')) : '')}</p>
    </div>
  </header>
  <main class="container">
    <div id="travel-map" class="loading">加载地图中...</div>
    <section class="pretrip-section">
      <div class="card">
        <h2>出发前提醒</h2>
        ${renderReminders(t)}
      </div>
    </section>
    ${renderKnow(t)}
    ${renderCosts(t)}
    ${renderHotels(t)}
    ${renderDays(t)}
    ${renderTips(t)}
    <div class="disclaimer"><strong>⚖️ 免责声明：</strong>${esc(t.disclaimer)}</div>
  </main>
  <footer>
    <p>由 travel-planner 生成 · <a href="javascript:window.print()">打印此页面</a></p>
    <p>地图 © OpenStreetMap · 大陆节点跳转高德，境外跳转 Google</p>
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js"></script>
  <script id="trip-data" type="application/json">
${tripJson}
  </script>
  <script>
    function computeReminders(startDateISO, items) {
      return (items || []).map(function (it) {
        var d = new Date(startDateISO + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() - (it.leadDays || 0));
        return { item: it.item, leadDays: it.leadDays || 0, deadline: d.toISOString().slice(0, 10) };
      }).sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; });
    }
    function escapeHTML(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function renderChecklistHTML(reminders) {
      var lis = reminders.map(function (r) {
        return '<li class="todo-item"><input type="checkbox"> <span class="todo-deadline">'
          + r.deadline + '前</span> <span class="todo-text">' + escapeHTML(r.item)
          + (r.leadDays ? '（建议提前' + r.leadDays + '天）' : '') + '</span></li>';
      }).join('');
      return '<ul class="pretrip-todo">' + lis + '</ul>';
    }
  </script>
  <script>
${engine}
  </script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      var el = document.getElementById('trip-data');
      if (!el) return;
      var trip;
      try { trip = JSON.parse(el.textContent); } catch (e) { return; }
      if (trip.reminders && trip.reminders.length && trip.startDate) {
        var box = document.getElementById('pretrip-checklist');
        if (box) box.innerHTML = renderChecklistHTML(computeReminders(trip.startDate, trip.reminders));
      }
      var allPoints = ${JSON.stringify(mapPoints(t))};
      if (allPoints.length) {
        try { initTravelMap('travel-map', allPoints); }
        catch (e) {
          var m = document.getElementById('travel-map');
          if (m) m.innerHTML = '<p style="padding:20px">地图加载失败</p>';
        }
      } else {
        var m = document.getElementById('travel-map');
        if (m) m.innerHTML = '<p style="padding:20px">行程缺少坐标，无法绘制地图</p>';
      }
    });
  </script>
</body>
</html>
`;
}
