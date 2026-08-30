# 🎒 智能旅行规划器

> 整合飞猪、携程、小红书、高德、大众点评、天气等多数据源，生成深色卡片风格的离线 HTML 旅行计划：天气、预计开销、序号地图节点（介绍 + 跳转高德）、路线详情。

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/MaxML154/travel-planner)
[![Python](https://img.shields.io/badge/python-3.7+-green.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/node.js-16+-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

## ✨ 特性

### 🌐 多数据源

| 数据源 | 用途 | 说明 |
|--------|------|------|
| **飞猪（FlyAI）** | 景点 / 酒店 / 图片 | 首选图与报价 |
| **携程问道（TripAI）** | 景点交叉验证 | 门票、地铁口 |
| **高德（Amap）** | 坐标、周边餐厅、路线 | 餐饮漏斗第一层 |
| **大众点评（Dianping）** | 店名评分 / 人均 | **仅 opencli** |
| **小红书（XHS）** | 店名笔记 / 推荐菜 | 短名单交叉验证 |
| **天气** | 行程日天气 | 超出窗口如实写明 |

### 🎨 HTML 必须包含

- 天气与行前须知
- 预计开销（餐饮 + 门票 + 交通 + 住宿）
- Leaflet 序号针、虚线示意、弹窗介绍、高德导航
- 按日时间轴（介绍、价格、已验证推荐菜）
- 路线逻辑：同簇可走完；跨区必须有 `transit`

禁止：上一站还在景区，下一站午餐不在步行 1 km 内。跨区必须先写 `transit`。

### 🍽️ 餐饮漏斗（省 token）

不要「全市热门餐厅」再丢给点评 / 小红书。

1. 景点已有坐标后：

```bash
node scripts/nearby_dining.js --location=<lng>,<lat> --radius=1000 --min-rating=4.3 --limit=2
```

高德评分默认 **≥4.3**，半径 **1000 m（禁止再扩）**，景点与餐厅必须步行可达。**每餐 1 主推 + 1 备选**。

2. 只拿这两个**店名**：
   - 大众点评：`opencli dianping search`（须在 dianping.com 登录）
   - 小红书：`cli.py search-feeds --keyword "<店名>"`，每店最多 2 篇 `get-feed-detail`

高德负责发现；XHS / 点评只做交叉验证。

## 📦 安装

开源使用者必须先装下列 **配套 skill**，再装本仓库。缺任一则无法按主路径出计划。

| 配套 | 作用 | 额外要求 |
|------|------|----------|
| weather-skill | 天气 | 无 key |
| FlyAI | 景点 / 酒店 / 图 | 申请 API：https://flyai.open.fliggy.com |
| TripAI（携程问道） | 门票交叉验证 | 申请 API：https://www.ctrip.com/wendao/openclaw |
| Amap LBS | 坐标、周边餐厅、路线 | 高德开放平台：https://lbs.amap.com/ Web 服务 key |
| xiaohongshu-skills | 店名笔记 / 推荐菜 | 见下方「小红书」；按该 skill 原文操作 |
| opencli | 大众点评店名 | Chrome 登录 https://dianping.com |

### 1. 前置要求

```bash
python --version   # 3.7+
node --version     # 16+
```

### 2. 安装依赖

```bash
pip install requests

# 大众点评等适配器
npm install -g @jackwener/opencli
# 或
npx skills add jackwener/opencli

# 飞猪 CLI（必装）
npm install -g @fly-ai/flyai-cli
```

把 weather-skill、amap-lbs-skill、tripai-skill、xiaohongshu-skills 装到 Claude Code 的 skills 目录（与本 skill 同级即可）。

### 3. 小红书配置（按 xiaohongshu-skills 原文，不要另开路径）

扩展装在**实际打开小红书的那只浏览器**里。原 skill 默认 Chrome / Chromium；若用户指定 Edge，则在 Edge 安装 **XHS Bridge**、登录 [xiaohongshu.com](https://www.xiaohongshu.com)，并给扩展 `xiaohongshu.com` 站点权限。

**已验证的激活顺序**（后续都按这个来；不要对调）：

```bash
# 1. 先起桥接（不要只跑无子命令的 cli.py——那只会打印 usage 并 exit 2）
python <xiaohongshu-skills>/scripts/bridge_server.py
# 日志应出现：
#   Bridge server 已启动: ws://localhost:9333
#   Extension 已连接
# 若 9333 已在 LISTENING，说明桥已在跑，不要再起一个。

# 2. 扩展连上后再查登录（必须带子命令）
python <xiaohongshu-skills>/scripts/cli.py check-login
# 期望：{"logged_in": true}

# 3. 只对餐饮短名单店名搜笔记
python <xiaohongshu-skills>/scripts/cli.py search-feeds --keyword "店名"
# 每店最多 2 次 get-feed-detail；search-feeds 没有 --limit
```

只使用该 skill 的 `cli.py`。频率过高会触发反爬：本 skill 用短名单限制调用；需要时由用户自备代理，**不要把代理写进仓库**。

### 4. API Token 配置

**不要把 token 写进 SKILL.md / JSON / HTML / git / 对话日志。**

#### 密钥放哪里（推荐顺序）

| 优先级 | 位置 | 适用 | 不要 |
|--------|------|------|------|
| 1 | 环境变量 | `TRIPAI_API_KEY`、`AMAP_WEBSERVICE_KEY`；飞猪用 `flyai config set` | 写进本仓库任何文件 |
| 2 | 该配套 skill **官方约定的本机配置** | 携程：`~/.config/tripai-skill/api_key`；高德 LBS skill 自己的本地 `config.json`（只留在 **amap-lbs-skill 目录**，且勿提交） | 把高德/携程 key 拷进 travel-planner |
| 禁止 | `.claude/settings.local.json` | 这是 Claude Code **权限白名单**，不是密钥库。允许命令字符串里一旦带上 key，会进 git / 备份 / 对话 | 用它存携程 token |
| 禁止 | 本 skill 目录下的 `config.json` / `_tripai_body.json` / `.env` 若会随仓库上传 | — | 本仓库已 `.gitignore` 这类文件，但仍不要创建后提交 |

开源克隆者各自申请 key，按上表放在**自己机器**上。仓库永远不带真实密钥。

#### 携程问道 API Key

1. 访问：https://www.ctrip.com/wendao/openclaw （或 http://t.ctrip.cn/28J6RhL ）
2. 扫码登录获取 API Key
3. 二选一：

```bash
# Windows
setx TRIPAI_API_KEY "your_api_key_here"
# Linux/Mac
export TRIPAI_API_KEY="your_api_key_here"

# 或配置文件
mkdir -p ~/.config/tripai-skill
echo "your_api_key_here" > ~/.config/tripai-skill/api_key
```

未配置会被限流或失败，开源安装视为必配。

#### 飞猪（FlyAI）

1. 访问：https://flyai.open.fliggy.com
2. 按页面完成 CLI / 鉴权
3. `flyai config set FLYAI_API_KEY "your-key"`
4. 验证：`flyai search-poi --city-name "深圳"`

#### 高德地图 Web 服务 Key

餐饮漏斗、坐标、路线走的是 **Web 服务** key（REST `restapi.amap.com`），**不是** JS API key。用 JS key 会返回 `USERKEY_PLAT_NOMATCH`（infocode 10009）。

1. 访问：https://lbs.amap.com/api/webservice/create-project-and-key （选「Web服务」）
2. 教程：https://lbs.amap.com/api/skill/ready-to-use/summary
3. 环境变量（推荐，travel-planner 只读这个）：

```bash
# Windows
setx AMAP_WEBSERVICE_KEY "your_key_here"
# Linux/Mac
export AMAP_WEBSERVICE_KEY="your_key_here"
```

兼容旧名 `AMAP_KEY`。也可写在 **amap-lbs-skill** 本地 `config.json` 的 `webServiceKey`（该 skill 自己用，**不要**把这份 config 上传到 GitHub，也**不要**复制进 travel-planner）。

#### 大众点评（opencli）

Chrome 安装 OpenCLI 扩展，在 **dianping.com** 登录。`opencli doctor` 可检查桥接。只使用 `opencli dianping …`，不要用其它点评爬虫 skill。

### 5. 链接 Skill

```bash
# Claude Code
ln -sfn "$(pwd)/travel-planner" ~/.claude/skills/travel-planner

# Windows 也可复制
cp -r travel-planner ~/.claude/skills/
```

## 🚀 快速开始

### 方式 1：Claude Code 对话

```
你：帮我规划深圳3天2晚，预算2000，公共交通，起止深圳站

Claude：
✓ 天气
✓ 住宿 + 景区（飞猪 / 携程 / 高德）
✓ 按地理分簇
✓ 高德周边餐厅短名单 → 点评 + 小红书店名验证
✓ validate_plan.py
✓ generate_html.js → plan.html
```

### 方式 2：命令行

```bash
# 校验路线跳跃与成本加总
python scripts/validate_plan.py plan.json

# 生成深色卡片 HTML（主路径）
node scripts/generate_html.js plan.json plan.html
```

旧脚本 `generate_report.js` / `travel_planner.py` 仍可参考，**不要当主路径**。不要手写一次性 HTML。

## 📖 工作流程

```
1. 环境
   Python / Node / weather-skill / FlyAI / TripAI / Amap / opencli / XHS 桥接
   飞猪、携程、高德须已配置 API key

2. 天气
   weather-skill → opencli wttr → Open-Meteo
   日期超出窗口：forecast=[] + 诚实 note

3. 住宿 + 景区
   飞猪图/价 → 携程交叉验证 → 高德坐标与路线
   按簇排半日动线

4. 餐饮（每餐）
   nearby_dining.js（半径 1000m、≥4.3，1 主 + 1 备）
   → opencli 搜店名
   → XHS 搜店名（每店 ≤2 篇详情）

5. 写出 plan.json（见 references/schema.md）
   python scripts/validate_plan.py plan.json   # 无 FAIL
   node scripts/generate_html.js plan.json plan.html
```


## 📂 仓库结构

```
.gitignore
SKILL.md                 # Agent 强制流程
README.md
HTML_VISUALIZATION.md
INTEGRATION_PLAN.md
TROUBLESHOOTING.md
discover.sh
check_services.py
skill_paths.py
travel_planner.py
references/schema.md     # plan.json 字段
references/geo-rules.md  # 距离阈值
references/sources.md    # 各 API 怎么拿、怎么调
scripts/nearby_dining.js
scripts/validate_plan.py
scripts/generate_html.js
assets/style.css         # 深色卡片模板
assets/map-engine.js
```

## ⚙️ 默认参数

| 项 | 默认 | 说明 |
|----|------|------|
| 高德餐饮评分 | ≥ 4.3 | `--min-rating` |
| 周边半径 | **1000 m** | 脚本会把更大半径截到 1000 |
| 每餐短名单 | 1 主 + 1 备 | `--limit=2` |
| 景点↔餐厅 | 警告 >0.8 km，**失败 >1.0 km** | `validate_plan.py` |
| 跨区 | >12 km 必须先有 `transit` | |
| XHS 详情 | 每店最多 2 篇 | 反爬 |

配套 skill 装在 Claude Code 的 skills 目录；小红书 CLI / 桥接脚本以 **xiaohongshu-skills** 仓库为准，不要写死本机路径。

## 🐛 常见问题

### Q1：飞猪查询失败

**解决**：`npm install -g @fly-ai/flyai-cli`，检查网络。Windows 从混合 stdout 里取第一个 `{` 到最后一个 `}`。  
**影响**：回退携程，可能缺图。

### Q2：小红书桥接 / 无笔记

**解决**：先 `python …/bridge_server.py`，等到日志 `Extension 已连接`；再 `python …/cli.py check-login`（无子命令只会 usage / exit 2）。端口 **9333**（不是 8765）；9333 已在 LISTENING 就不要再起一个。`search-feeds` **没有** `--limit`。浏览器以实际登录小红书的那只为准（默认 Chrome；用户指定则用 Edge）。  
**影响**：`notes_count=0`，不编造菜品。

### Q3：opencli / 大众点评失败

**解决**：`npx skills add jackwener/opencli`；Chrome 登录 dianping.com；`opencli doctor`。换店名重试，不要对同一关键词连打。

### Q4：天气没有行程日

**原因**：weather-skill 约 7 天；wttr 更短；Open-Meteo 也有窗口。  
**解决**：写明「超出预报窗，出发前再查」，禁止编造逐日天气。

### Q5：Windows 乱码 / TripAI Invalid JSON

控制台 GBK：`PYTHONIOENCODING=utf-8`。TripAI body 写成 UTF-8 文件后 `curl --data-binary @file`。

### Q6：validate_plan.py FAIL

午餐/景点跳 **>1.0 km**：换 1 km 内的高德周边店，或加 `transit`。成本四项加总必须等于 `total`。

### Q7：密钥能不能写进 settings.local.json？

**不要。** `.claude/settings.local.json` 是 Claude Code 的工具权限名单，不是密钥库。把 `TRIPAI_API_KEY` 写进允许执行的命令后，key 会进仓库或备份。携程 token 用环境变量或 `~/.config/tripai-skill/api_key`；高德 Web 服务 key 用 `AMAP_WEBSERVICE_KEY` 或 **amap-lbs-skill 自己的、且不提交的** `config.json`。

### Q8：高德报 USERKEY_PLAT_NOMATCH

用了 JS API key。换成控制台里 **Web服务** 那一类 key，赋给 `AMAP_WEBSERVICE_KEY`。

## 🚧 路线图

### 已完成

- [x] 深色卡片 HTML（天气 / 开销 / 序号地图 / 高德跳转）
- [x] 地理校验
- [x] 高德周边餐饮短名单

### 计划中

- [ ] 数据缓存（减少 API 的使用）
- [ ] Agent token 开销问题（目前请使用较为轻便的模型完成任务）
- [ ] PDF 导出
- [ ] 多城市联程

## 🤝 贡献

欢迎 Issue 和 Pull Request。


## 📄 许可证

MIT License

Copyright (c) 2026 Travel Planner Contributors

## 🙏 致谢

开源：

- [Leaflet](https://leafletjs.com/) — 地图
- [OpenStreetMap](https://www.openstreetmap.org/) — 底图
- [OpenCLI](https://github.com/jackwener/OpenCLI) — 点评等适配器
- [autoclaw-cc/xiaohongshu-skills](https://github.com/autoclaw-cc/xiaohongshu-skills) — 小红书skill
- [trips-ai/tripai-skill](https://github.com/trips-ai/tripai-skill) — 携程问道旅行skill
- [alibaba-flyai/flyai-skill](https://github.com/alibaba-flyai/flyai-skill) — 飞猪旅行搜索skill
- [AMap-Web/amap-lbs-skill](https://github.com/AMap-Web/amap-lbs-skill) — 高德地图综合服务skill

数据源：

- 飞猪（FlyAI）
- 携程问道（TripAI）
- 小红书（XHS）
- 高德地图（Amap）
- 大众点评（Dianping）

## 📞 联系方式

- Issues: [GitHub Issues](https://github.com/MaxML154/travel-planner/issues)
- Email: lxd28116@outlook.com

## 🧑‍💻贡献者

[MaxML154](https://github.com/MaxML154)
Claude Code Skill Creater


---

**Happy Traveling! 🎒✈️🗺️**
