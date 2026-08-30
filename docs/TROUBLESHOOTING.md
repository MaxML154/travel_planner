# 问题排查

主路径以 `README.md` / `SKILL.md` 为准。本页只记易踩坑。

## 小红书

扩展装在**实际打开小红书的那只浏览器**（默认 Chrome；用户指定则用 Edge）。

已验证顺序：先 `bridge_server.py`，等到 `Extension 已连接`，再 `cli.py check-login`。无子命令的 `cli.py` 只会 usage / exit 2。端口 **9333**。`search-feeds` 没有 `--limit`。

## 携程问道

环境变量名是 **`TRIPAI_API_KEY`**（不是 `TRIPAISK_TOKEN`），或文件 `~/.config/tripai-skill/api_key`。不要写进 `.claude/settings.local.json` 或本仓库。

Windows：请求体写成 UTF-8 文件后 `curl --data-binary @file`。

## 高德

餐饮 / 坐标 / 路线必须用 **Web 服务** key：`AMAP_WEBSERVICE_KEY`。JS API key 会 `USERKEY_PLAT_NOMATCH`（10009）。

## FlyAI

`npm i -g @fly-ai/flyai-cli`，`flyai config set FLYAI_API_KEY "…"`。Windows 从混合 stdout 取第一个 `{` 到最后一个 `}`。

## 大众点评

只用 `opencli dianping …`。Chrome（或已装 OpenCLI 扩展的浏览器）登录 dianping.com。
