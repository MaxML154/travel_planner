# Data sources and credentials

Never paste tokens into SKILL.md, plan.json, HTML, git, or chat logs.

## Required companion skills (open-source install list)

These must be installed before travel-planner can run. Document them as **required**, not optional.

| Skill | Why | Extra |
|-------|-----|-------|
| **weather-skill** | 行程日天气 | 无 key |
| **FlyAI** (`@fly-ai/flyai-cli`) | 景点 / 酒店 / 图 | 用户去 https://flyai.open.fliggy.com 申请并配置 `FLYAI_API_KEY` |
| **TripAI**（携程问道） | 门票 / 交叉验证 | 用户去 https://www.ctrip.com/wendao/openclaw 申请；`TRIPAI_API_KEY` 或 `~/.config/tripai-skill/api_key`。**不要**写入 `.claude/settings.local.json` 或本仓库 |
| **Amap LBS** | 坐标、周边餐厅、路线 | 用户去高德开放平台申请 **Web 服务** key：`AMAP_WEBSERVICE_KEY`。JS API key 会 `USERKEY_PLAT_NOMATCH`。amap skill 本地 `config.json` 仅本机使用，勿提交、勿拷进本仓库 |
| **xiaohongshu-skills** | 店名笔记 / 推荐菜 | 按该 skill 原文：Chrome 登录 xiaohongshu.com、安装桥接扩展并授权站点、运行 `bridge_server.py`（`ws://localhost:9333`），只走 `cli.py` |
| **opencli** | 大众点评店名搜索 | Chrome 登录 dianping.com |

## Order of work

1. 天气  
2. 住宿 + 景区（飞猪 + 携程交叉验证 + 高德坐标/路线）  
3. **高德周边搜餐饮（漏斗第一层，省 token）**  
   以当前景点/酒店坐标做周边搜索（半径 **1000 m**，禁止再扩）。  
   硬过滤：有坐标、高德评分 **≥4.3**（用户另指定则从其值）、距上一节点 **≤1.0 km**。  
   **每餐只留 1 家主推 + 1 家备选**，不要把周边 20 家都送去点评/小红书。  
4. **只对短名单交叉验证（漏斗第二层）**  
   - 大众点评：`opencli dianping search` **直接搜店名**（须 dianping.com 登录）→ 评分/人均/地址  
   - 小红书：`search-feeds --keyword "{店名}"`；命中后再 `get-feed-detail`（每店最多 2 篇）  
   不要先搜「{景点}附近美食」再扫几十条笔记——高德已经给了候选，XHS 只验证店名。  
5. 高德 <4.3、无坐标、或交叉验证地址对不上簇的店丢弃。禁止全市热门榜硬塞。

## Weather

1. `python <weather-skill>/weather.py -json <城市>`（同级 skills 目录，或环境变量 `WEATHER_SKILL`）
2. Fallback: `opencli wttr …` if available
3. Fallback: Open-Meteo `https://api.open-meteo.com/v1/forecast?...&start_date=&end_date=`
4. If the trip dates are outside every window, set `weather.forecast=[]` and write an honest `weather.note`. Do not invent 9/11 weather in August.

## FlyAI (Fliggy) — POI / hotel / images

- Required skill + CLI: `npm i -g @fly-ai/flyai-cli`
- Required key: `flyai config set FLYAI_API_KEY "<key>"` after https://flyai.open.fliggy.com
- Commands: `flyai search-poi --city-name "深圳"`, `flyai search-hotel …`
- Image priority: FlyAI `mainPic`/`picUrl` → TripAI image → Amap photo
- Windows: stdout may mix logs + JSON; parse first `{`… last `}`. Console GBK: `PYTHONIOENCODING=utf-8`

## TripAI (Ctrip 问道)

- Apply: https://www.ctrip.com/wendao/openclaw (or t.ctrip.cn short link)
- Store **one of**: env `TRIPAI_API_KEY` **or** `~/.config/tripai-skill/api_key`
- POST `https://wendao-skill-prod.ctrip.com/skill/query`
- Windows: write JSON body to a UTF-8 file, `curl --data-binary @file`. Do not inline Chinese in cmd.exe.

## Amap LBS

- Key: https://lbs.amap.com/api/webservice/create-project-and-key (Web服务)
- Env: `AMAP_WEBSERVICE_KEY` (legacy `AMAP_KEY` accepted by skill)
- Use: `node <amap-skill>/scripts/poi-search.js --keywords=… --city=…`
- Route: `node …/route-planning.js --type=walking|driving|transfer --origin=lng,lat --destination=lng,lat`
- Deep link: `https://uri.amap.com/marker?position=lng,lat&name=…&coordinate=gaode&callnative=1`
- Coords from Amap are GCJ-02.

## Dianping — **opencli only**

- User must be logged in on **dianping.com** in Chrome (OpenCLI extension).
- `opencli dianping search … -f json` (discover exact command via `opencli list` / `opencli dianping --help`)
- Do not use browser-SOP Dianping skills, App 操作, or invent ratings.
- Anti-bot: if a keyword fails, change cluster+cuisine; do not hammer.

## Xiaohongshu — follow xiaohongshu-skills, do not invent a second path

Verified activation (do this every time; do not swap the order):

1. Install **xiaohongshu-skills**. Put **XHS Bridge** on the browser that actually opens xiaohongshu.com (Chrome by default; Edge if the user says so). Log in; grant site access; reopen the XHS tab.
2. Start the bridge **first**: `python <xiaohongshu-skills>/scripts/bridge_server.py` → `ws://localhost:9333`. Wait for `Extension 已连接`. If 9333 is already listening, do not start a second process.
3. Bare `cli.py` with no subcommand only prints usage (exit 2). After the extension is connected: `python <xiaohongshu-skills>/scripts/cli.py check-login`.
4. **Only** `cli.py` (`check-login`, `search-feeds`, `get-feed-detail`). No MCP / other XHS tools.
5. `search-feeds` has **no** `--limit`. At most 2 `get-feed-detail` per shortlisted shop.
6. On 429 / empty `__INITIAL_STATE__` / host-permission errors: stop; `notes_count=0`. Do not invent dishes.
7. Optional user proxy; do not bake proxies into this skill.

## opencli

- `opencli doctor` if browser adapters fail.
- Mass-dianping and weather fallbacks go through opencli, not ad-hoc scraping.
