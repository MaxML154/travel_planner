# 旅行规划Skill - 完整架构文档

## 一、整体架构

```
┌─────────────────────────────────────────────────────┐
│            旅行规划Skill (travel-planner)             │
│                                                       │
│  输入：城市、天数、预算、偏好                          │
│  输出：完整行程、路线图、成本分析                      │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼───────┐ ┌────▼────┐ ┌───────▼────────┐
│ 数据收集层     │ │智能分析层│ │  行程生成层     │
└───────────────┘ └─────────┘ └────────────────┘
```

### 二、数据收集层

#### 2.1 餐饮数据（Dining）
**数据源**：
- **主要**：大众点评 (opencli)
- **辅助**：小红书 (xiaohongshu-skills)

**工作流程**：
1. 搜索多种菜系（火锅、粤菜、海鲜、日料、川菜等）
2. 按评分排序，筛选4.0分以上
3. 获取详细信息（地址、交通、营业时间、分项评分）
4. 从小红书获取用户真实评价（可选）

**为什么用opencli而非直接爬虫**：
- opencli已经处理了反爬机制
- 返回结构化JSON数据，直接可用
- 稳定性高，不需要维护爬虫代码

#### 2.2 景点数据（Attractions）
**数据源**：
- **主要**：本地知识库（预设热门景点）
- **辅助**：高德地图POI (amap-lbs-skill)
- **辅助**：小红书攻略 (xiaohongshu-skills)

**工作流程**：
1. 根据城市和区域匹配景点库
2. 从高德地图获取POI详情（位置、营业时间）
3. 从小红书获取游玩攻略和用户评价
4. 计算景点间的距离和交通时间

#### 2.3 交通数据（Transportation）
**数据源**：
- **主要**：高德地图 (amap-lbs-skill)

**工作流程**：
1. 计算景点间的路线（地铁、公交、打车）
2. 估算时间和费用
3. 生成可视化路线图

#### 2.4 天气数据（Weather）
**数据源**：
- **主要**：weather-skill

**工作流程**：
1. 查询未来7天天气预报
2. 提供穿衣和出行建议
3. 根据天气调整行程（如雨天避开户外景点）

### 三、智能分析层

#### 3.1 偏好分析
- 根据用户预算分配餐饮/景点/交通比例
- 根据天数合理安排景点密度
- 考虑年龄/体力因素（如老人避免高强度行程）

#### 3.2 路线优化
- **地理聚类**：将同区域景点安排在同一天
- **时间优化**：避免过多交通时间
- **顺路原则**：餐厅安排在景点附近

#### 3.3 成本优化
- 在预算内选择最优方案
- 提供"降低成本"建议（如选免费景点）
- 提供"升级体验"建议（如预算充足时）

### 四、行程生成层

#### 4.1 多日行程规划
**原则**：
- 第一天：轻松，适应节奏（市区景点 + 特色美食）
- 中间天：深度游玩（主要景点 + 文化体验）
- 最后天：灵活，预留购物/备用时间

**示例（深圳3日游）**：

**Day 1: 福田中心区 - 城市体验**
- 上午：莲花山公园（2h）- 登高观景
- 午餐：福田区粤菜（人均¥150）
- 下午：深圳博物馆（2h）- 了解城市历史
- 晚餐：中心区火锅（人均¥120）
- 交通：地铁为主，¥20

**Day 2: 南山区 - 主题游乐**
- 上午：世界之窗（3h）- 微缩景观
- 午餐：南山区海鲜（人均¥180）
- 下午：海上世界（2h）- 海滨休闲
- 晚餐：海上世界日料（人均¥200）
- 交通：地铁+打车，¥40

**Day 3: 盐田区 - 海滨放松**
- 上午：大梅沙海滨公园（3h）- 海滩戏水
- 午餐：盐田海鲜（人均¥160）
- 下午：购物或备用时间
- 交通：地铁+公交，¥30

**总预算估算**：
- 餐饮：(150+120)+(180+200)+(160) = ¥810/天 × 3天 = ¥2430
- 门票：世界之窗¥200
- 交通：¥90
- **总计**：¥2720

#### 4.2 路线图生成

**文本版路线图**：
```
Day 1 路线图：
  起点 → [地铁3号线] → 莲花山公园 (2h)
    ↓ [步行5分钟]
  粤菜餐厅午餐
    ↓ [地铁4号线]
  深圳博物馆 (2h)
    ↓ [地铁1号线]
  火锅晚餐
    ↓
  返回酒店
```

**未来可视化**：
- 生成地图标记点
- 使用高德地图API生成实际路线
- 导出为图片或可分享链接

### 五、技术选型说明

#### 为什么使用Shell脚本而非Python？

**当前方案（Shell + CLI工具）**：
```bash
# 优点：
✅ 直接调用opencli、weather-skill等CLI工具
✅ 无需处理Python环境依赖
✅ 轻量快速，适合自动化流程
✅ 易于调试和修改

# 缺点：
❌ 复杂数据处理不如Python方便
❌ 跨平台兼容性问题（Windows需Git Bash）
❌ 字符串处理较繁琐
```

**Python方案**：
```python
# 优点：
✅ 强大的数据处理能力（pandas、numpy）
✅ 丰富的第三方库（requests、beautifulsoup）
✅ 更好的跨平台支持
✅ 易于实现复杂算法（路线优化、推荐算法）

# 缺点：
❌ 需要安装依赖（opencli的Python绑定可能不存在）
❌ 调用外部CLI工具需要subprocess
❌ 环境配置复杂（虚拟环境、依赖管理）
```

#### **推荐方案：混合架构**

```
┌─────────────────────────────────────┐
│   Python主控脚本 (travel_planner.py) │
│   - 行程规划逻辑                     │
│   - 数据整合分析                     │
│   - 路线优化算法                     │
└─────────────────────────────────────┘
              │
      ┌───────┼───────┬────────┐
      │       │       │        │
  ┌───▼──┐ ┌──▼──┐ ┌──▼───┐ ┌─▼────┐
  │opencli│ │小红书│ │高德  │ │天气  │
  │(CLI) │ │(Py) │ │(API) │ │(Py)  │
  └──────┘ └─────┘ └──────┘ └──────┘
```

**实现示例**：
```python
import subprocess
import json

# 调用opencli获取餐厅数据
def get_restaurants(city, cuisine):
    cmd = f'opencli dianping search "{cuisine}" --city "{city}" -f json'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return json.loads(result.stdout)

# 调用weather-skill获取天气
def get_weather(city):
    cmd = f'python weather.py -json "{city}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return json.loads(result.stdout)

# 主规划函数
def plan_trip(city, days, budget):
    # 1. 收集数据
    restaurants = get_restaurants(city, "美食")
    weather = get_weather(city)

    # 2. 智能分析
    daily_budget = budget / days
    selected_restaurants = select_by_budget(restaurants, daily_budget * 0.4)

    # 3. 生成行程
    itinerary = generate_itinerary(days, selected_restaurants, weather)

    return itinerary
```

### 六、依赖管理方案

#### 6.1 Skills依赖清单

| Skill | 状态 | 用途 | 调用方式 |
|-------|------|------|---------|
| opencli (dianping) | ✅ 已验证 | 餐饮数据 | CLI命令 |
| weather-skill | ✅ 已验证 | 天气预报 | Python脚本 |
| xiaohongshu-skills | ⚠️ 需配置 | 用户评价 | Python CLI |
| amap-lbs-skill | ❓ 未测试 | 地图路线 | 待确认 |

#### 6.2 安装与配置

**创建统一安装脚本**：
```bash
#!/bin/bash
# setup.sh - 安装所有依赖

echo "检查并安装依赖..."

# 1. 检查opencli
if ! command -v opencli &> /dev/null; then
    echo "❌ opencli未安装"
    exit 1
fi
echo "✓ opencli已安装"

# 2. 检查Python
if ! command -v python &> /dev/null; then
    echo "❌ Python未安装"
    exit 1
fi
echo "✓ Python已安装"

# 3. 检查jq
if ! command -v jq &> /dev/null; then
    echo "❌ jq未安装，正在安装..."
    # Windows: choco install jq
    # Linux: apt-get install jq
    # Mac: brew install jq
fi

# 4. 安装Python依赖
pip install -r requirements.txt

echo "✓ 所有依赖已就绪"
```

**requirements.txt**：
```
requests>=2.28.0
jq>=1.2.0
beautifulsoup4>=4.11.0
```

### 七、完整Python实现方案
