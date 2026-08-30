#!/usr/bin/env node
/**
 * 现代化旅行规划 HTML 报告生成器
 * 基于 Tailwind CSS + Alpine.js + ECharts + Leaflet
 * 参考旅行 App UI 最佳实践
 */

const fs = require('fs');
const path = require('path');

// 命令行参数
const inputPath = process.argv[2] || 'plan.json';
const outputPath = process.argv[3] || 'plan.html';

// 读取数据
let planData;
try {
    planData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
} catch (error) {
    console.error(`❌ 读取 ${inputPath} 失败:`, error.message);
    process.exit(1);
}

// 生成 HTML
const html = generateHTML(planData);
fs.writeFileSync(outputPath, html, 'utf-8');

console.log(`✓ HTML 报告已生成: ${outputPath}`);
console.log(`  在浏览器中打开: file:///${path.resolve(outputPath).replace(/\\/g, '/')}`);

/**
 * 生成完整 HTML
 */
function generateHTML(data) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.city} ${data.days}日游 · 旅行规划</title>

    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>

    <!-- ECharts -->
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>

    <!-- Leaflet.js -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9/dist/leaflet.js"></script>

    <style>
        [x-cloak] { display: none !important; }

        /* 深色主题变量 */
        :root {
            --bg-gradient-start: #eff6ff;
            --bg-gradient-mid: #ffffff;
            --bg-gradient-end: #faf5ff;
            --card-bg: #ffffff;
            --card-border: #e5e7eb;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --header-gradient: linear-gradient(to right, #2563eb, #9333ea, #ec4899);
            --timeline-line: linear-gradient(to bottom, #3b82f6, #8b5cf6);
        }

        [data-theme="dark"] {
            --bg-gradient-start: #0f172a;
            --bg-gradient-mid: #1e293b;
            --bg-gradient-end: #1e1b4b;
            --card-bg: #1e293b;
            --card-border: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --header-gradient: linear-gradient(to right, #1e40af, #7e22ce, #be185d);
            --timeline-line: linear-gradient(to bottom, #3b82f6, #8b5cf6);
        }

        body {
            background: linear-gradient(to bottom right, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end));
            color: var(--text-primary);
            transition: background 0.3s ease, color 0.3s ease;
        }

        .card {
            background: var(--card-bg);
            border-color: var(--card-border);
            transition: background 0.3s ease, border-color 0.3s ease;
        }

        .text-secondary {
            color: var(--text-secondary);
        }

        /* 自定义滚动条 */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        [data-theme="dark"] ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }

        /* Timeline 连接线 */
        .timeline-line {
            position: absolute;
            left: 19px;
            top: 40px;
            bottom: -20px;
            width: 2px;
            background: var(--timeline-line);
        }

        .timeline-line:last-child { display: none; }

        /* 主题切换按钮 */
        .theme-toggle {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: var(--card-bg);
            border: 2px solid var(--card-border);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            transition: transform 0.2s, box-shadow 0.2s;
            z-index: 100;
        }

        .theme-toggle:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        #travel-map { height: 520px; width: 100%; border-radius: 1rem; z-index: 1; }
        .route-pin { background: transparent; border: none; }
        .route-pin__num {
            display: flex; align-items: center; justify-content: center;
            width: 28px; height: 28px; border-radius: 50%;
            background: #2563eb; color: #fff; font-size: 12px; font-weight: 700;
            box-shadow: 0 2px 6px rgba(0,0,0,.25);
        }
        .route-pin--meal .route-pin__num { background: #ec4899; }
        .route-pin--hotel .route-pin__num { background: #f59e0b; }
        .route-pin--transit .route-pin__num { background: #64748b; }
    </style>
</head>

<body class="bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen" x-data="travelApp()" :data-theme="theme">
    ${generateHeader(data)}
    ${generateTabs()}
    ${generateContent(data)}
    ${generateThemeToggle()}
    ${generateScript(data)}
</body>
</html>`;
}

/**
 * 生成顶部 Hero
 */
function generateHeader(data) {
    const { city, days, budget, costs } = data;
    const percentage = ((costs.total / budget) * 100).toFixed(1);

    return `
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-16 shadow-xl">
        <div class="container mx-auto px-4 max-w-6xl">
            <div class="text-center mb-10">
                <h1 class="text-5xl font-bold mb-3">🎒 ${city} ${days}日游</h1>
                <p class="text-blue-100 text-lg">${data.dates ? data.dates.join(' · ') : '智能规划 · 精选推荐'}</p>
                ${data.origin ? `<p class="text-blue-100/90 text-sm mt-2">起终点 ${data.origin} · ${data.transport_mode || '公共交通'}</p>` : ''}
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                    <div class="text-sm opacity-90 mb-1">预算</div>
                    <div class="text-3xl font-bold">¥${budget}</div>
                </div>
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                    <div class="text-sm opacity-90 mb-1">消费</div>
                    <div class="text-3xl font-bold text-yellow-300">¥${costs.total}</div>
                    <div class="text-xs mt-1">${percentage}%</div>
                </div>
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                    <div class="text-sm opacity-90 mb-1">剩余</div>
                    <div class="text-3xl font-bold text-green-300">¥${costs.surplus}</div>
                </div>
                <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20">
                    <div class="text-sm opacity-90 mb-1">天数</div>
                    <div class="text-3xl font-bold">${days} 天</div>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * 生成标签页
 */
function generateTabs() {
    return `
    <!-- Tabs Navigation -->
    <div class="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div class="container mx-auto px-4 max-w-6xl">
            <div class="flex space-x-1">
                <button @click="activeTab = 'itinerary'"
                        :class="activeTab === 'itinerary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'"
                        class="px-6 py-4 font-medium transition-colors hover:text-blue-600">
                    📅 行程
                </button>
                <button @click="activeTab = 'restaurants'"
                        :class="activeTab === 'restaurants' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'"
                        class="px-6 py-4 font-medium transition-colors hover:text-blue-600">
                    🍴 美食
                </button>
                <button @click="activeTab = 'budget'"
                        :class="activeTab === 'budget' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'"
                        class="px-6 py-4 font-medium transition-colors hover:text-blue-600">
                    💰 预算
                </button>
                <button @click="activeTab = 'map'"
                        :class="activeTab === 'map' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'"
                        class="px-6 py-4 font-medium transition-colors hover:text-blue-600">
                    🗺️ 地图
                </button>
                <button @click="activeTab = 'weather'"
                        :class="activeTab === 'weather' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'"
                        class="px-6 py-4 font-medium transition-colors hover:text-blue-600">
                    🌤️ 天气
                </button>
            </div>
        </div>
    </div>`;
}

/**
 * 生成主要内容
 */
function generateContent(data) {
    return `
    <div class="container mx-auto px-4 py-8 max-w-6xl">
        ${generateItineraryTab(data)}
        ${generateRestaurantsTab(data)}
        ${generateMapTab(data)}
        ${generateBudgetTab(data)}
        ${generateWeatherTab(data)}
    </div>`;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function mealDishes(meal) {
    if (meal.recommended_dishes && meal.recommended_dishes.length) return meal.recommended_dishes;
    if (meal.xiaohongshu && meal.xiaohongshu.recommended_dishes) return meal.xiaohongshu.recommended_dishes;
    return [];
}

function renderTimelineSlot(slot) {
    const type = slot.type || 'poi';
    const time = slot.time || '';
    const color = type === 'meal' ? 'bg-pink-500' : type === 'hotel' ? 'bg-amber-500' : type === 'transit' ? 'bg-slate-500' : 'bg-blue-500';
    const titlePrefix = type === 'meal' ? '🍴' : type === 'hotel' ? '🏨' : type === 'transit' ? '🚇' : '📍';
    const dishes = mealDishes(slot);

    return `
                <div class="relative mb-6">
                    <div class="timeline-line"></div>
                    <div class="absolute left-0 top-0 w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
                        ${escapeHtml(time)}
                    </div>
                    <div class="ml-6 card rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow ${type === 'meal' ? 'border border-pink-100' : ''}">
                        ${slot.image_url ? `<img src="${escapeHtml(slot.image_url)}" alt="${escapeHtml(slot.name)}" class="w-full h-48 object-cover rounded-xl mb-4" onerror="this.style.display='none'">` : ''}
                        <h3 class="text-xl font-bold text-gray-800 mb-2">${titlePrefix} ${escapeHtml(slot.name)}</h3>
                        ${slot.meal ? `<div class="text-sm text-pink-600 font-medium mb-2">${escapeHtml(slot.meal)}</div>` : ''}
                        ${slot.desc ? `<p class="text-gray-600 mb-3">${escapeHtml(slot.desc)}</p>` : ''}
                        ${slot.rating ? `<div class="text-yellow-500 mb-3">${'⭐'.repeat(Math.min(5, Math.floor(Number(slot.rating) || 0)))} ${slot.rating}分${slot.reviews ? ` <span class="text-gray-500 text-sm">(${slot.reviews}评价)</span>` : ''}</div>` : ''}
                        <div class="flex gap-2 flex-wrap mb-3">
                            ${slot.ticket !== undefined && slot.ticket !== null && type !== 'meal' && type !== 'hotel' ? `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${slot.ticket === 0 ? '免费' : '¥' + slot.ticket}</span>` : ''}
                            ${slot.price ? `<span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">${type === 'hotel' ? '每晚 ¥' : '人均 ¥'}${slot.price}</span>` : ''}
                            ${slot.hours ? `<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">${slot.hours}小时</span>` : ''}
                            ${slot.cuisine ? `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${escapeHtml(slot.cuisine)}</span>` : ''}
                            ${slot.source ? `<span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">${escapeHtml(slot.source)}</span>` : ''}
                        </div>
                        ${dishes.length ? `
                        <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-3">
                            <div class="font-bold text-red-600 mb-2">${slot.xiaohongshu ? '小红书推荐菜' : '推荐菜'}</div>
                            <div class="flex flex-wrap gap-2">
                                ${dishes.slice(0, 6).map(dish => `<span class="px-3 py-1 bg-white border border-red-200 rounded-full text-sm">${escapeHtml(dish)}</span>`).join('')}
                            </div>
                            ${slot.xiaohongshu && slot.xiaohongshu.notes_count ? `<div class="text-xs text-red-500 mt-2">来自 ${slot.xiaohongshu.notes_count} 条小红书笔记</div>` : ''}
                        </div>` : ''}
                        <div class="text-sm text-gray-600 space-y-1">
                            ${slot.address ? `<div>📍 ${escapeHtml(slot.address)}</div>` : ''}
                            ${slot.metro ? `<div>🚇 ${escapeHtml(slot.metro)}</div>` : ''}
                        </div>
                        ${slot.booking_url || slot.url ? `<a href="${escapeHtml(slot.booking_url || slot.url)}" target="_blank" class="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium">查看详情 →</a>` : ''}
                    </div>
                </div>`;
}

/**
 * 生成行程标签页
 */
function generateItineraryTab(data) {
    const { itinerary } = data;

    let html = `
    <!-- 行程标签页 -->
    <div x-show="activeTab === 'itinerary'" x-cloak>`;

    itinerary.forEach((item) => {
        const { day, date, theme, timeline = [] } = item;
        const dayLabel = date ? `Day ${day} · ${date}` : `Day ${day}`;

        html += `
        <div class="mb-12">
            <h2 class="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
                <span class="bg-gradient-to-r from-blue-600 to-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg">
                    ${day}
                </span>
                ${dayLabel}
            </h2>
            ${theme ? `<p class="text-gray-500 mb-6 ml-13">${theme}</p>` : ''}

            <div class="relative pl-12">`;

        timeline.forEach((slot) => {
            html += renderTimelineSlot(slot);
        });

        html += `
            </div>
        </div>`;
    });

    html += `</div>`;
    return html;
}

/**
 * 生成美食标签页
 */
function generateRestaurantsTab(data) {
    const restaurants = [];
    (data.itinerary || []).forEach(item => {
        (item.timeline || []).forEach(slot => {
            if (slot.type === 'meal') restaurants.push(slot);
        });
        if (item.restaurant) restaurants.push(item.restaurant);
    });
    if (!restaurants.length) {
        return `<div x-show="activeTab === 'restaurants'" x-cloak class="text-center text-gray-500 py-12">暂无餐饮数据</div>`;
    }

    let html = `
    <!-- 美食标签页 -->
    <div x-show="activeTab === 'restaurants'" x-cloak>
        <h2 class="text-3xl font-bold mb-8 text-gray-800">🍴 精选美食</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;

    restaurants.forEach(r => {
        html += `
        <div class="card rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <h3 class="text-xl font-bold mb-1 text-gray-800">${r.name}</h3>
            ${r.meal ? `<div class="text-sm text-pink-600 mb-2">${r.meal}</div>` : ''}
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-yellow-500">${'⭐'.repeat(Math.floor(r.rating || 0))}</span>
                    <span class="font-bold text-gray-700">${r.rating || '-'}</span>
                    <span class="text-gray-500 text-sm">${r.reviews ? '(' + r.reviews + ')' : ''}</span>
                </div>
                <div class="text-lg font-bold text-orange-600">¥${r.price || 0}</div>
            </div>
            <div class="flex gap-2 flex-wrap">
                ${r.cuisine || r.search_cuisine ? `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">${r.cuisine || r.search_cuisine}</span>` : ''}
                ${r.district ? `<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">${r.district}</span>` : ''}
                ${r.source === 'dianping' ? '<span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">大众点评</span>' : ''}
                ${r.xiaohongshu ? '<span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">小红书</span>' : ''}
            </div>
            ${mealDishes(r).length ? `<div class="mt-3 flex flex-wrap gap-2">${mealDishes(r).slice(0, 5).map(d => `<span class="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs">${escapeHtml(d)}</span>`).join('')}</div>` : ''}
        </div>`;
    });

    html += `
        </div>
    </div>`;
    return html;
}

/**
 * 收集行程点位（WGS-84）。坐标来自 JSON 的 lat/lng。
 */
function collectMapPoints(data) {
    const points = [];
    (data.itinerary || []).forEach((item) => {
        (item.timeline || []).forEach((slot) => {
            const lat = Number(slot.lat);
            const lng = Number(slot.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            points.push({
                lat,
                lng,
                name: slot.name || '',
                time: [item.date || `Day ${item.day}`, slot.time, slot.meal].filter(Boolean).join(' · '),
                type: slot.type || 'poi',
                metro: slot.metro || '',
            });
        });
    });
    return points;
}

function generateMapTab(data) {
    const points = collectMapPoints(data);
    const note = points.length
        ? '标记按行程顺序编号，虚线为示意连线（非实时公交路径）。点击标记可打开高德导航。坐标为 WGS-84，适配 OpenStreetMap 底图。'
        : '当前行程没有坐标，无法绘制地图。请在 JSON 各站点补充 lat / lng。';

    return `
    <div x-show="activeTab === 'map'" x-cloak>
        <h2 class="text-3xl font-bold mb-3 text-gray-800">🗺️ 行程地图</h2>
        <p class="text-gray-500 mb-4 text-sm">${escapeHtml(note)}</p>
        <div class="card rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div id="travel-map"></div>
        </div>
        ${points.length ? `
        <ol class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            ${points.map((p, i) => `<li class="flex gap-2"><span class="font-bold text-blue-600">${i + 1}.</span><span>${escapeHtml(p.time)} ${escapeHtml(p.name)}</span></li>`).join('')}
        </ol>` : ''}
    </div>`;
}

/**
 * 生成预算标签页
 */
function generateBudgetTab(data) {
    const { budget, costs } = data;

    return `
    <!-- 预算标签页 -->
    <div x-show="activeTab === 'budget'" x-cloak>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
                <div class="text-gray-600 mb-2">总预算</div>
                <div class="text-4xl font-bold text-gray-800">¥${budget}</div>
            </div>
            <div class="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg p-8 text-center text-white">
                <div class="opacity-90 mb-2">实际消费</div>
                <div class="text-4xl font-bold">¥${costs.total}</div>
                <div class="text-sm mt-2">${((costs.total / budget) * 100).toFixed(1)}%</div>
            </div>
            <div class="bg-white rounded-2xl shadow-lg p-8 text-center border-2 ${costs.within_budget ? 'border-green-500' : 'border-red-500'}">
                <div class="text-gray-600 mb-2">剩余</div>
                <div class="text-4xl font-bold ${costs.within_budget ? 'text-green-600' : 'text-red-600'}">¥${costs.surplus}</div>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
            <h3 class="text-2xl font-bold mb-6 text-gray-800">成本分布</h3>
            <div id="costChart" style="width:100%;height:400px;"></div>
        </div>

        <div class="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <table class="w-full">
                <thead class="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <tr>
                        <th class="px-6 py-4 text-left">类别</th>
                        <th class="px-6 py-4 text-right">金额</th>
                        <th class="px-6 py-4 text-right">占比</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-6 py-4">🍴 餐饮</td>
                        <td class="px-6 py-4 text-right font-bold">¥${costs.dining}</td>
                        <td class="px-6 py-4 text-right">${((costs.dining / costs.total) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-6 py-4">🎫 门票</td>
                        <td class="px-6 py-4 text-right font-bold">¥${costs.tickets}</td>
                        <td class="px-6 py-4 text-right">${((costs.tickets / costs.total) * 100).toFixed(1)}%</td>
                    </tr>
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-6 py-4">🚇 交通</td>
                        <td class="px-6 py-4 text-right font-bold">¥${costs.transport}</td>
                        <td class="px-6 py-4 text-right">${((costs.transport / costs.total) * 100).toFixed(1)}%</td>
                    </tr>
                    ${costs.lodging ? `<tr class="border-b hover:bg-gray-50">
                        <td class="px-6 py-4">🏨 住宿</td>
                        <td class="px-6 py-4 text-right font-bold">¥${costs.lodging}</td>
                        <td class="px-6 py-4 text-right">${((costs.lodging / costs.total) * 100).toFixed(1)}%</td>
                    </tr>` : ''}
                    <tr class="bg-gray-50 font-bold">
                        <td class="px-6 py-4">总计</td>
                        <td class="px-6 py-4 text-right text-lg">¥${costs.total}</td>
                        <td class="px-6 py-4 text-right">100%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>`;
}

/**
 * 生成天气标签页
 */
function generateWeatherTab(data) {
    if (!data.weather || !data.weather.forecast || !data.weather.forecast.length) {
        const note = (data.weather && data.weather.note) ? data.weather.note : '天气数据暂不可用';
        return `<div x-show="activeTab === 'weather'" x-cloak class="max-w-2xl mx-auto py-12">
            <h2 class="text-3xl font-bold mb-4 text-gray-800">🌤️ 天气</h2>
            <div class="card rounded-2xl p-6 text-gray-600">${note}</div>
        </div>`;
    }

    const weatherIcons = {
        '晴': '☀️',
        '多云': '⛅',
        '阴': '☁️',
        '小雨': '🌦️',
        '中雨': '🌧️',
        '大雨': '🌧️',
        '暴雨': '⛈️',
        '雷阵雨': '⛈️',
        '雷雨': '⛈️',
        '阵雨': '🌦️',
        '毛毛雨': '🌦️',
        '小雪': '🌨️',
        '中雪': '❄️',
        '大雪': '❄️',
        '暴雪': '❄️',
        '雨夹雪': '🌨️',
        '雾': '🌫️',
        '霾': '😷',
        '沙尘': '💨',
        '浮尘': '💨',
        '扬沙': '💨',
        '强沙尘': '💨',
        '冰雹': '🧊',
        '台风': '🌀',
        '飓风': '🌀'
    };

    let html = `
    <!-- 天气标签页 -->
    <div x-show="activeTab === 'weather'" x-cloak>
        <h2 class="text-3xl font-bold mb-8 text-gray-800">🌤️ 天气预报</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;

    data.weather.forecast.slice(0, data.days).forEach((day, idx) => {
        const icon = weatherIcons[day.weather.split('转')[0]] || '🌤️';

        html += `
        <div class="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow border border-gray-100">
            <div class="font-bold text-blue-600 mb-4">Day ${idx + 1}<br/>${day.date}</div>
            <div class="text-6xl mb-4">${icon}</div>
            <div class="text-xl mb-2 text-gray-800">${day.weather}</div>
            <div class="text-3xl font-bold text-gray-700 mb-4">${day.temp_low} ~ ${day.temp_high}</div>
        </div>`;
    });

    html += `
        </div>
    </div>`;
    return html;
}

/**
 * 生成主题切换按钮
 */
function generateThemeToggle() {
    return `
    <!-- 主题切换按钮 -->
    <button class="theme-toggle" @click="toggleTheme" :title="theme === 'light' ? '切换到深色模式' : '切换到浅色模式'">
        <span x-show="theme === 'light'">🌙</span>
        <span x-show="theme === 'dark'">☀️</span>
    </button>`;
}

/**
 * 生成 JavaScript
 */
function generateScript(data) {
    const { costs } = data;
    const mapPoints = collectMapPoints(data);

    return `
    <script>
    function travelApp() {
        return {
            activeTab: 'itinerary',
            theme: localStorage.getItem('theme') || 'light',
            map: null,
            mapPoints: ${JSON.stringify(mapPoints)},

            init() {
                this.$watch('activeTab', value => {
                    if (value === 'budget') {
                        this.$nextTick(() => this.initCharts());
                    }
                    if (value === 'map') {
                        this.$nextTick(() => this.initMap());
                    }
                });

                document.documentElement.setAttribute('data-theme', this.theme);
            },

            toggleTheme() {
                this.theme = this.theme === 'light' ? 'dark' : 'light';
                localStorage.setItem('theme', this.theme);
                document.documentElement.setAttribute('data-theme', this.theme);

                if (this.activeTab === 'budget') {
                    this.$nextTick(() => this.initCharts());
                }
            },

            initMap() {
                const el = document.getElementById('travel-map');
                if (!el || typeof L === 'undefined' || !this.mapPoints.length) return;
                if (this.map) {
                    this.map.invalidateSize();
                    return;
                }
                const map = L.map(el);
                this.map = map;
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(map);

                const coords = [];
                this.mapPoints.forEach((p, i) => {
                    coords.push([p.lat, p.lng]);
                    const cls = p.type === 'meal' ? 'route-pin route-pin--meal'
                        : p.type === 'hotel' ? 'route-pin route-pin--hotel'
                        : p.type === 'transit' ? 'route-pin route-pin--transit'
                        : 'route-pin';
                    const icon = L.divIcon({
                        className: cls,
                        html: '<span class="route-pin__num">' + (i + 1) + '</span>',
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    });
                    const amapUrl = 'https://uri.amap.com/marker?position=' + p.lng + ',' + p.lat
                        + '&name=' + encodeURIComponent(p.name)
                        + '&coordinate=wgs84&callnative=1&src=travel-planner';
                    L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(
                        '<b>' + (i + 1) + '. ' + p.name.replace(/[<>&]/g, '') + '</b><br>'
                        + (p.time ? p.time + '<br>' : '')
                        + (p.metro ? p.metro + '<br>' : '')
                        + '<a href="' + amapUrl + '" target="_blank" rel="noopener">高德地图导航</a>'
                    );
                });
                if (coords.length > 1) {
                    L.polyline(coords, { dashArray: '6 8', weight: 2, color: '#2563eb' }).addTo(map);
                }
                map.fitBounds(coords, { padding: [36, 36] });
                setTimeout(() => map.invalidateSize(), 200);
            },

            initCharts() {
                const chart = echarts.init(document.getElementById('costChart'));
                chart.setOption({
                    backgroundColor: 'transparent',
                    tooltip: {
                        trigger: 'item',
                        formatter: '{b}: ¥{c} ({d}%)'
                    },
                    legend: {
                        bottom: '5%',
                        left: 'center',
                        textStyle: {
                            color: this.theme === 'dark' ? '#f1f5f9' : '#1f2937'
                        }
                    },
                    series: [{
                        type: 'pie',
                        radius: ['40%', '70%'],
                        avoidLabelOverlap: false,
                        itemStyle: {
                            borderRadius: 10,
                            borderColor: this.theme === 'dark' ? '#1e293b' : '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: true,
                            formatter: '{b}: ¥{c}',
                            color: this.theme === 'dark' ? '#f1f5f9' : '#1f2937'
                        },
                        data: [
                            { value: ${costs.dining}, name: '餐饮', itemStyle: { color: '#3b82f6' } },
                            { value: ${costs.tickets}, name: '门票', itemStyle: { color: '#8b5cf6' } },
                            { value: ${costs.transport}, name: '交通', itemStyle: { color: '#ec4899' } }${costs.lodging ? `,
                            { value: ${costs.lodging}, name: '住宿', itemStyle: { color: '#f59e0b' } }` : ''}
                        ]
                    }]
                });
            }
        };
    }
    </script>`;
}

module.exports = { generateHTML };
