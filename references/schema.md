# Canonical trip JSON (`plan.json`)

Single source of truth. HTML is rendered from this file. Do not invent fields in HTML that are missing here.

Do **not** copy a previous city's itinerary into a new plan. Fill every field from live sources for the current trip.

```json
{
  "title": "",
  "city": "",
  "dayCount": 0,
  "startDate": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD"],
  "transport_mode": "",
  "origin": "",
  "destination": "",
  "budget": 0,
  "disclaimer": "基于查询当日数据；价格/天气/营业时间会变。",
  "preTrip": {
    "budget": "",
    "weather": "",
    "parking": "",
    "vehicle": "",
    "notes": ""
  },
  "weather": {
    "city": "",
    "source": "weather-skill | opencli wttr | open-meteo",
    "note": "若行程日超出预报窗，必须写明，禁止编造逐日预报",
    "forecast": [
      {"date": "YYYY-MM-DD", "weather": "", "temp_low": "", "temp_high": ""}
    ]
  },
  "reminders": [
    {"item": "", "leadDays": 1}
  ],
  "hotelAreas": [
    {
      "name": "",
      "reason": "",
      "options": [
        {
          "name": "",
          "price": "",
          "tier": "",
          "note": "",
          "lat": 0,
          "lng": 0,
          "image_url": "",
          "booking_url": "",
          "source": "fliggy"
        }
      ]
    }
  ],
  "costs": {
    "dining": 0,
    "tickets": 0,
    "transport": 0,
    "lodging": 0,
    "total": 0,
    "budget": 0,
    "surplus": 0,
    "within_budget": true,
    "notes": {"dining": "", "tickets": "", "transport": "", "lodging": ""}
  },
  "tips": [],
  "days": [
    {
      "date": "YYYY-MM-DD",
      "theme": "",
      "summary": "",
      "slots": [
        {
          "time": "HH:MM-HH:MM",
          "type": "attraction | dining | hotel | transit | parking | dining-alt",
          "name": "",
          "lat": 0,
          "lng": 0,
          "address": "",
          "metro": "",
          "duration": "",
          "price": "",
          "rating": 0,
          "review": "",
          "image": "",
          "source": "fliggy|ctrip|amap|dianping|xhs",
          "recommended_dishes": [],
          "xiaohongshu": {
            "notes_count": 0,
            "recommended_dishes": [],
            "tips": "",
            "source": "xiaohongshu|none"
          }
        }
      ]
    }
  ]
}
```

## Fields

| Field | Meaning |
|-------|---------|
| `dayCount` | Number of days (integer). Optional; renderer can use `days.length`. |
| `days` | **Always an array of day objects.** Never an integer. |
| `lat` / `lng` | GCJ-02 from Amap / domestic apps. Never store WGS-84 here. |
| `duration` | Required on long `transit` hops (e.g. `约40分钟`). |
| `dining-alt` | Backup restaurant; not on the main dashed route. |

## Slot types

| type | 地图 | 计入主路线折线 |
|------|------|----------------|
| attraction / poi | 绿 | 是 |
| dining / meal | 金 | 是 |
| hotel | 青 | 是 |
| transit | 灰 | 是（跨区必须有） |
| parking | 青 | 可选 |
| dining-alt | 金、虚 | **否** |

## Coordinates

JSON is **GCJ-02**.

- OSM tiles / Leaflet markers / `geo:` / Apple Maps: convert with `gcj02ToWgs84` in `assets/map-engine.js`. Tiles are always OSM (never Google tiles).
- 中国大陆：高德 `uri.amap.com/marker`，original GCJ pair + `coordinate=gaode`。不挂 Google。
- 境外（用户行程不在中国大陆）：弹窗给 Google Maps（WGS-84）。
- Do **not** store WGS-84 in `plan.json`.

## Hard rules

- Every visitable slot needs `lat` + `lng`. No map pin without coords.
- Meals sit in the **same walking cluster** as the surrounding attractions (**≤1.0 km**).
- Cross-district hops need an explicit `transit` slot (metro/drive + duration).
- Do not fill `xiaohongshu.notes_count > 0` unless `get-feed-detail` succeeded.
- Do not write API keys into this file.
- `costs.dining + tickets + transport + lodging` must equal `total`; `budget - total` must equal `surplus`.
