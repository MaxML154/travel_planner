---
name: travel-planner
description: >
  This skill should be used when the user asks to plan a trip, itinerary, 旅行计划,
  旅游攻略, or generate a travel HTML report. It collects weather, hotels, attractions,
  and nearby restaurants from FlyAI, TripAI, Amap, Dianping (opencli), and Xiaohongshu,
  then writes plan.json and a dark-card HTML with weather, costs, numbered map
  pins, Amap navigation, and a geographically logical route.
---

# Travel planner

Produce **one offline HTML file**: weather, expected spend, numbered map nodes (intro + 高德 jump), and a route that does not teleport.

Visual/data shape: dark-card HTML from `scripts/generate_html.js` (weather, costs, numbered map, 高德 jump). Not a city lock.

Do **not** hardcode API keys. Read `references/sources.md` for how users obtain tokens. Store keys in env vars or the companion skill’s own local config (`~/.config/tripai-skill/api_key`, amap skill `config.json` on disk). **Never** put tokens in `.claude/settings.local.json`, this repo, `plan.json`, HTML, or chat.

**Required companion skills** (must be installed before this skill can run; tell open-source users the same): weather-skill, FlyAI (`flyai` CLI), TripAI (携程问道), Amap LBS. FlyAI / TripAI / Amap also need the user to obtain API keys (env only). Xiaohongshu is required for dish cross-check: follow **xiaohongshu-skills** — install XHS Bridge on the browser that opens xiaohongshu.com (Chrome default; Edge if the user says so), log in, grant site access, start `bridge_server.py` (`ws://localhost:9333`) and wait for `Extension 已连接`, then only `cli.py` with a subcommand.

## Output

1. `plan.json` matching `references/schema.md`
2. `python scripts/validate_plan.py plan.json` must have **no FAIL**
3. `node scripts/generate_html.js plan.json plan.html`

Never hand-author a one-off HTML. Never fill XHS dishes or weather days that were not fetched.

## Mandatory pipeline

```
天气
  → 住宿 + 景区（飞猪图/价，携程交叉验证，高德坐标与路线）
  → 按地理分簇排日程（同半日可走完）
  → 每餐：高德周边筛店 → 只留 1 主 + 1 备
  → 用店名做点评 + 小红书交叉验证
  → 写 JSON → validate → HTML
```

Load `references/geo-rules.md` before placing any meal. Load `references/sources.md` before calling a tool.

## Token funnel (food)

Do **not** dump “全市美食” into Dianping/XHS.

1. After a POI has `lng,lat`, run:

```bash
node scripts/nearby_dining.js --location=<lng>,<lat> --radius=1000 --min-rating=4.3 --limit=2
```

   (threshold 4.3 unless the user sets another). Radius **1000 m**; never widen past 1 km. Attraction and restaurant must be walkable.

2. Cross-check **only those 1–2 shop names**:
   - Dianping: `opencli dianping search` with the **shop name** (Chrome logged in on dianping.com). Discover the exact subcommand with `opencli dianping --help`.
   - Xiaohongshu: `python …/cli.py search-feeds --keyword "<店名>"` then at most **2** `get-feed-detail`. No `--limit` on search-feeds.

3. If Amap returns nothing ≥4.3 inside 1 km, change keyword (`粤菜`/`早餐`/local cuisine). Do **not** widen past 1000 m. Do not fall back to a city-wide ranking list.

Why this order: Amap is cheap geo+rating filter; Dianping/XHS are expensive (login, anti-bot, tokens). Shortlist first.

## Geographic logic

- Consecutive attraction/dining hops must be **≤1.0 km** (warn >0.8 km). Both primary and `dining-alt` shops must sit in that walking cluster.
- Any hop **>12 km** needs an explicit `transit` (or `parking`) slot with duration **before** the jump.
- `validate_plan.py` fails the HTML step if this is violated.
- `dining-alt` is the backup shop; it is **not** on the main dashed route.

## Tool rules

| Source | How | Auth |
|--------|-----|------|
| Weather | **required skill** weather-skill; then opencli wttr; then Open-Meteo | none |
| FlyAI | **required skill** + `flyai search-poi` / `search-hotel` | **required** FLYAI_API_KEY (user applies at flyai.open.fliggy.com) |
| TripAI | **required skill**; POST wendao-skill-prod; Windows: body file + curl `--data-binary` | **required** `TRIPAI_API_KEY` or `~/.config/tripai-skill/api_key` |
| Amap | **required skill**; `nearby_dining.js`, poi-search, route-planning | **required** `AMAP_WEBSERVICE_KEY` |
| Dianping | **opencli only** | dianping.com login |
| Xiaohongshu | **only** `xiaohongshu-skills/scripts/cli.py` + `bridge_server.py` `ws://localhost:9333` | XHS Bridge on the browser that opens xiaohongshu.com (Chrome default; Edge if the user says so) |

XHS activation (verified): start `bridge_server.py` first and wait for `Extension 已连接`; bare `cli.py` (no subcommand) only prints usage. Then `cli.py check-login`. On empty feeds / 429 / host-permission errors, stop and set `notes_count=0`. Do not invent notes. Optional user proxy is allowed; do not ship proxies in this skill.

Images: FlyAI `mainPic` → TripAI → Amap. `onerror` hide.

## HTML must contain

- Leaflet map `#travel-map`, numbered pins in visit order, dashed schematic line
- Popup: name, time, type; mainland 高德 `uri.amap.com/marker` (`coordinate=gaode`); overseas Google. Tiles always OSM. GCJ-02 in JSON → WGS-84 for OSM.
- Weather block (honest empty forecast + note if dates out of range)
- Cost breakdown (dining + tickets + transport + lodging)
- Day timeline with intros, prices, dishes when verified
- Pre-trip checklist if `reminders` present

Renderer: `scripts/generate_html.js` + `assets/style.css` + `assets/map-engine.js`. Light/dark of the old Tailwind report is **not** required; match the dark-card template.

## Agent checklist

```
[ ] Dates, origin/end, budget, transport mode recorded
[ ] Weather attempted; out-of-range stated, not fabricated
[ ] Hotel coords from FlyAI/Amap; hotel is a real stop
[ ] Attractions cross-checked FlyAI ↔ TripAI; tickets from source
[ ] Days clustered; validate_plan.py exit 0
[ ] Each meal: Amap ≥4.3 nearby → Dianping name → XHS name
[ ] No API keys in json/html/git
[ ] HTML from generate_html.js only
```

## Maintainers

MaxML154 · Claude Code · lxd28116@outlook.com
