# Route logic (non-negotiable)

Cluster first, then meals. A walking old-town loop needs no transit; a second district or city needs an explicit drive/metro slot. Plans fail when lunch jumps 15–30 km from the last POI.

## Cluster first

1. Geocode every candidate (Amap POI).
2. Group by district / **≤1 km walking radius** (attraction ↔ dining must be walkable).
3. Assign **one cluster per half-day**.
4. Hotel belongs to the overnight cluster (or next morning start). Cross-cluster hotel needs `transit`.
5. Meals — **funnel, not flood** (token budget):
   - Amap around-search at the current POI (**radius 1000 m**, do not widen past 1 km). Keep rating **≥ 4.3** (or user threshold).
   - Shortlist **1 primary + 1 alt per meal**. Both shops must be ≤1 km from the POI. Stop. Do not enrich 20 shops.
   - Cross-check **shop names only**: Dianping `opencli` + Xiaohongshu `search-feeds` / `get-feed-detail` (≤2 notes/shop).
   - Skip city-wide “附近美食” XHS dumps; Amap already did discovery.

## Jump thresholds (`scripts/validate_plan.py`)

Haversine on consecutive **main** slots (`dining-alt` is checked against the cluster, not the dashed line):

| Mode | Warn | Fail |
|------|------|------|
| walking cluster: attraction/poi ↔ dining/meal | > 0.8 km | **> 1.0 km** |
| walking cluster: attraction ↔ attraction (no transit) | > 0.8 km | **> 1.0 km** |
| `dining-alt` vs nearest attraction/dining in the same day | — | **> 1.0 km** |
| any hop > 12 km | — | fail unless **previous** slot is `transit`/`parking` with duration |

Do **not** place a restaurant 1 km+ from the last sight and call it lunch. If Amap has no ≥4.3 shop inside 1 km, change cuisine keyword — never expand radius past 1000 m.

Self-drive / metro between clusters: only as `type=transit` with `duration` (e.g. "A区→B区 约40分钟").

## Time vs space

- Do not schedule 10 minutes to move 8 km.
- Walking 1 km ≈ 12–15 min; metro 1 stop ≈ 8–12 min including access.
- Meal duration ≥ 45 min; attraction duration from source or conservative default.

## Map

- Number pins in **visit order** (1…n), not by rating.
- Dashed polyline is schematic, not a real bus path.
- Tiles always OSM. JSON coords are GCJ-02; convert to WGS-84 before drawing.
- Mainland popup: 高德 only (`uri.amap.com/marker` + `coordinate=gaode`). Never Google tiles or Google links on a mainland trip.
- Overseas (or HK/MO/TW): popup Google Maps (WGS-84). OSM still the basemap.
- `dining-alt` may appear as unnumbered notes in the day card, not on the main line.
