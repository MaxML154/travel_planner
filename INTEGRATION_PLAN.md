# 旅行规划Skill - 完整版集成方案

## 一、整体架构升级

### 1.1 数据流程图

```
用户输入
  ├─ 城市
  ├─ 天数
  ├─ 预算
  └─ 偏好（可选）
     │
     ▼
┌────────────────────────────────────────┐
│      数据收集与整合层                    │
│                                        │
│  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │大众点评  │  │ 小红书  │  │高德地图│ │
│  │(opencli)│  │(skills) │  │(amap)  │ │
│  └────┬────┘  └────┬────┘  └───┬────┘ │
│       │            │            │      │
│       ▼            ▼            ▼      │
│   餐厅评分      用户评价      POI位置   │
│   价格地址      推荐菜品      路线规划   │
│   营业时间      避坑建议      距离时间   │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│      智能分析与优化层                    │
│                                        │
│  • 数据交叉验证（大众点评+小红书）        │
│  • 地理位置聚类（高德地图距离计算）        │
│  • 路线优化算法（最短路径+顺路原则）       │
│  • 预算智能分配（动态调整餐饮/景点比例）   │
│  • 时间冲突检测（营业时间+交通时间）       │
└────────────────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────┐
│      行程生成与输出层                    │
│                                        │
│  • 多日行程规划                         │
│  • 可视化路线图                         │
│  • 成本明细表                           │
│  • 备选方案推荐                         │
└────────────────────────────────────────┘
     │
     ▼
  用户获得完整行程计划
```

## 二、详细模块设计

### 2.1 小红书集成模块

#### 功能定位
- **主要用途**：获取真实用户评价、探店笔记、推荐菜品
- **补充角色**：验证大众点评数据真实性，提供更丰富的体验描述

#### 调用方式
```python
class XiaohongshuIntegration:
    """小红书数据集成"""

    def __init__(self):
        # Resolve via env XHS_CLI / XIAOHONGSHU_SKILLS_DIR, or sibling skill dir
        self.cli_path = os.environ.get("XHS_CLI") or "<xiaohongshu-skills>/scripts/cli.py"

    def search_restaurant_notes(self, restaurant_name: str, city: str) -> List[Dict]:
        """
        搜索餐厅相关笔记
        
        Args:
            restaurant_name: 餐厅名称
            city: 城市
            
        Returns:
            笔记列表，包含标题、内容、图片、点赞数
        """
        keyword = f"{city} {restaurant_name}"
        cmd = f'python "{self.cli_path}" search-feeds --keyword "{keyword}" --sort-by "最新" --note-type "图文"'
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8')
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            # 提取笔记信息
            notes = []
            for feed in data.get('feeds', []):
                notes.append({
                    'title': feed.get('title'),
                    'content': feed.get('desc'),
                    'likes': feed.get('liked_count'),
                    'images': feed.get('images'),
                    'author': feed.get('user', {}).get('nickname')
                })
            return notes
        return []

    def extract_recommended_dishes(self, notes: List[Dict]) -> List[str]:
        """
        从笔记中提取推荐菜品
        
        使用关键词匹配法：
        - "推荐"、"必点"、"好吃"、"招牌"
        - 提取这些词后面的菜品名
        """
        dishes = []
        keywords = ['推荐', '必点', '好吃', '招牌', '必吃']
        
        for note in notes:
            content = note.get('content', '') + ' ' + note.get('title', '')
            for keyword in keywords:
                if keyword in content:
                    # 简单的关键词提取（实际可用NLP改进）
                    # 这里提取关键词后的几个字作为菜品名
                    start = content.find(keyword)
                    dish_candidate = content[start+len(keyword):start+len(keyword)+10].strip()
                    if dish_candidate and len(dish_candidate) > 2:
                        dishes.append(dish_candidate.split()[0])  # 取第一个词
        
        # 统计频率，返回TOP 5
        from collections import Counter
        dish_counter = Counter(dishes)
        return [dish for dish, count in dish_counter.most_common(5)]

    def get_user_sentiment(self, notes: List[Dict]) -> Dict:
        """
        分析用户情感倾向
        
        Returns:
            {
                'positive_keywords': ['环境好', '服务棒'],
                'negative_keywords': ['等位久', '价格贵'],
                'overall_sentiment': 'positive'  # positive/neutral/negative
            }
        """
        positive_words = ['好吃', '推荐', '棒', '赞', '喜欢', '满意', '值得']
        negative_words = ['不好', '难吃', '贵', '等', '久', '差', '失望']
        
        positive_count = 0
        negative_count = 0
        
        positive_keywords = []
        negative_keywords = []
        
        for note in notes:
            content = note.get('content', '') + ' ' + note.get('title', '')
            for word in positive_words:
                if word in content:
                    positive_count += 1
                    # 提取上下文
                    idx = content.find(word)
                    context = content[max(0, idx-5):min(len(content), idx+10)]
                    positive_keywords.append(context)
            
            for word in negative_words:
                if word in content:
                    negative_count += 1
                    idx = content.find(word)
                    context = content[max(0, idx-5):min(len(content), idx+10)]
                    negative_keywords.append(context)
        
        # 判断整体倾向
        if positive_count > negative_count * 2:
            sentiment = 'positive'
        elif negative_count > positive_count * 2:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        return {
            'positive_keywords': positive_keywords[:5],
            'negative_keywords': negative_keywords[:5],
            'overall_sentiment': sentiment,
            'positive_count': positive_count,
            'negative_count': negative_count
        }
```

#### 数据使用策略
```python
def enhance_restaurant_with_xiaohongshu(restaurant: Dict, city: str) -> Dict:
    """
    用小红书数据增强餐厅信息
    """
    xhs = XiaohongshuIntegration()
    
    # 搜索笔记
    notes = xhs.search_restaurant_notes(restaurant['name'], city)
    
    if notes:
        # 提取推荐菜品
        recommended_dishes = xhs.extract_recommended_dishes(notes)
        
        # 分析用户情感
        sentiment = xhs.get_user_sentiment(notes)
        
        # 增强餐厅信息
        restaurant['xiaohongshu'] = {
            'notes_count': len(notes),
            'recommended_dishes': recommended_dishes,
            'user_sentiment': sentiment,
            'top_notes': notes[:3]  # 保留前3条笔记
        }
        
        # 可信度评分（大众点评+小红书交叉验证）
        if sentiment['overall_sentiment'] == 'positive' and restaurant['rating'] >= 4.5:
            restaurant['credibility_score'] = 'high'
        elif sentiment['overall_sentiment'] == 'negative' and restaurant['rating'] >= 4.5:
            restaurant['credibility_score'] = 'medium'  # 评分高但口碑一般
        else:
            restaurant['credibility_score'] = 'low'
    
    return restaurant
```

### 2.2 高德地图集成模块

#### 功能定位
- **主要用途**：POI搜索、路线规划、距离计算、时间估算
- **核心价值**：优化行程路线，减少交通时间

#### 调用方式
```python
class AmapIntegration:
    """高德地图数据集成"""

    def __init__(self):
        # 检查amap-lbs-skill是否存在
        self.skill_available = self._check_skill()

    def _check_skill(self) -> bool:
        """检查amap-lbs-skill是否可用"""
        # 这里需要根据实际skill的安装情况判断
        # 暂时返回False，使用备用方案
        return False

    def get_poi_info(self, name: str, city: str) -> Optional[Dict]:
        """
        获取POI信息
        
        Returns:
            {
                'name': '莲花山公园',
                'address': '深圳市福田区红荔路6030号',
                'location': '114.055291,22.548065',  # 经纬度
                'type': '公园广场',
                'tel': '0755-83244804'
            }
        """
        if not self.skill_available:
            # 使用本地POI数据库备用方案
            return self._get_poi_from_local_db(name, city)
        
        # TODO: 调用amap-lbs-skill
        pass

    def calculate_route(self, origin: str, destination: str, mode: str = 'transit') -> Dict:
        """
        计算两点间路线
        
        Args:
            origin: 起点坐标 "lng,lat"
            destination: 终点坐标 "lng,lat"
            mode: 出行方式 transit(公交)/driving(驾车)/walking(步行)
            
        Returns:
            {
                'distance': 5200,  # 米
                'duration': 1800,  # 秒
                'cost': 6,  # 元（公交/地铁费用）
                'route_desc': '地铁3号线 -> 地铁1号线',
                'steps': [...]
            }
        """
        if not self.skill_available:
            # 备用方案：基于距离估算
            return self._estimate_route(origin, destination, mode)
        
        # TODO: 调用amap-lbs-skill路线规划API
        pass

    def _estimate_route(self, origin: str, destination: str, mode: str) -> Dict:
        """
        备用方案：基于直线距离估算路线
        """
        # 简单的距离估算（实际应使用高德API）
        # 这里先返回估算值
        return {
            'distance': 5000,
            'duration': 1800,
            'cost': 6,
            'route_desc': '地铁（预估）',
            'estimated': True
        }

    def _get_poi_from_local_db(self, name: str, city: str) -> Optional[Dict]:
        """本地POI数据库（备用）"""
        # 这里可以维护一个常用景点的本地数据库
        local_pois = {
            '莲花山公园': {
                'address': '深圳市福田区红荔路6030号',
                'location': '114.055291,22.548065',
                'type': '公园'
            },
            '世界之窗': {
                'address': '深圳市南山区深南大道9037号',
                'location': '113.975843,22.534886',
                'type': '主题乐园'
            },
            # ... 更多POI
        }
        return local_pois.get(name)

    def optimize_daily_route(self, poi_list: List[Dict]) -> List[Dict]:
        """
        优化一天内的景点访问顺序
        
        使用贪心算法：每次选择距离当前位置最近的未访问景点
        
        Args:
            poi_list: 景点列表，每个包含location字段
            
        Returns:
            优化后的景点顺序
        """
        if len(poi_list) <= 1:
            return poi_list
        
        # 简化版：按地理位置聚类
        # 实际可以用最短路径算法（TSP问题）
        optimized = [poi_list[0]]  # 从第一个开始
        remaining = poi_list[1:]
        
        while remaining:
            current_location = optimized[-1].get('location')
            
            # 找到距离当前位置最近的景点
            nearest = min(remaining, key=lambda p: self._distance(
                current_location, 
                p.get('location', '')
            ))
            
            optimized.append(nearest)
            remaining.remove(nearest)
        
        return optimized

    def _distance(self, loc1: str, loc2: str) -> float:
        """计算两点间距离（简化版）"""
        if not loc1 or not loc2:
            return 9999
        
        try:
            lng1, lat1 = map(float, loc1.split(','))
            lng2, lat2 = map(float, loc2.split(','))
            
            # 简单的欧式距离（实际应使用Haversine公式）
            return ((lng1 - lng2) ** 2 + (lat1 - lat2) ** 2) ** 0.5
        except:
            return 9999
```

## 三、增强版规划流程

### 3.1 完整工作流

```
用户输入: 深圳3日游，预算2000

Step 1: 数据收集
├─ 大众点评: 搜索火锅、粤菜、海鲜等（30家餐厅）
├─ 小红书: 搜索"深圳美食推荐"（获取热门餐厅）
├─ 天气: 查询未来3天天气
└─ 高德地图: 获取景点POI信息

Step 2: 数据整合
├─ 餐厅筛选: 评分≥4.0 且 价格≤预算*40%
├─ 小红书验证: 交叉验证餐厅口碑
│   ├─ 大众点评4.8分 + 小红书好评 = 高可信度 ✓
│   └─ 大众点评4.8分 + 小红书差评 = 需警惕 ⚠️
└─ 提取推荐菜品: 从小红书笔记中挖掘

Step 3: 路线优化
├─ Day 1: 福田区
│   ├─ 景点1: 莲花山公园 (114.055,22.548)
│   ├─ 餐厅: 巴奴火锅 (114.062,22.541) [距离700m]
│   └─ 景点2: 深圳博物馆 (114.058,22.545) [距离500m]
│   └─ 路线优化: 景点1 → 餐厅(步行10min) → 景点2(步行7min)
│
├─ Day 2: 南山区
│   └─ 同样流程...
│
└─ Day 3: 罗湖区
    └─ 同样流程...

Step 4: 成本计算
├─ 餐饮: ¥368
├─ 门票: ¥490
├─ 交通: 
│   ├─ Day1: 地铁¥6 + 步行
│   ├─ Day2: 地铁¥8 + 出租¥15
│   └─ Day3: 地铁¥6
└─ 合计: ¥893

Step 5: 生成报告
├─ 多日行程表
├─ 可视化路线图
├─ 餐厅推荐理由（大众点评评分 + 小红书推荐菜品）
└─ 备选方案
```

### 3.2 数据增强示例

**原始数据（仅大众点评）**：
```json
{
  "name": "巴奴毛肚火锅",
  "rating": 5.0,
  "price": 150,
  "address": "福华路卓悦中心"
}
```

**增强后（大众点评+小红书+高德）**：
```json
{
  "name": "巴奴毛肚火锅",
  "rating": 5.0,
  "price": 150,
  "address": "福华路与岗厦一路交叉口西北角卓悦中心东区二楼",
  "location": "114.062,22.541",
  "subway": "距地铁1号线岗厦站190m",
  
  "xiaohongshu": {
    "notes_count": 28,
    "recommended_dishes": ["毛肚", "鸭血", "虾滑", "手工面"],
    "user_sentiment": {
      "overall": "positive",
      "positive_keywords": ["毛肚新鲜", "汤底好喝", "服务周到"],
      "negative_keywords": ["需要等位", "价格偏贵"]
    },
    "credibility_score": "high"
  },
  
  "route_info": {
    "from_previous": {
      "distance": 700,
      "duration": 600,
      "mode": "walking",
      "description": "从莲花山公园步行10分钟"
    }
  }
}
```

## 四、实现优先级

### Phase 1: 基础集成（本次实现）
- [x] 大众点评数据获取
- [x] 天气预报集成
- [x] 基础行程生成
- [ ] 小红书笔记搜索
- [ ] 高德地图POI查询

### Phase 2: 数据增强（下一步）
- [ ] 小红书推荐菜品提取
- [ ] 用户情感分析
- [ ] 可信度交叉验证

### Phase 3: 路线优化（进阶）
- [ ] 高德地图路线规划
- [ ] 景点顺序优化
- [ ] 交通时间精确计算

### Phase 4: 可视化（锦上添花）
- [ ] 生成地图路线图
- [ ] 成本可视化图表
- [ ] 导出为PDF/图片

## 五、依赖检查清单

```bash
# 必需
✅ opencli (大众点评)
✅ Python 3.7+
✅ jq (JSON处理)
✅ weather-skill

# 本次需要
⚠️ xiaohongshu-skills (需要配置)
⚠️ amap-lbs-skill (需要确认可用性)

# 可选
❓ 可视化库 (matplotlib/plotly)
❓ PDF生成库 (reportlab)
```

## 六、测试计划

### 6.1 单元测试
- [ ] 小红书数据获取
- [ ] 推荐菜品提取
- [ ] 情感分析准确性
- [ ] 高德地图路线计算

### 6.2 集成测试
- [ ] 完整流程：深圳3日游
- [ ] 边界情况：预算不足
- [ ] 异常处理：API失败降级

### 6.3 用户验收
- [ ] 行程是否合理
- [ ] 推荐是否准确
- [ ] 成本是否可控

接下来我将实现这个完整版本，需要我现在开始编码吗？
