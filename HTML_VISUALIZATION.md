# 旅行规划Skill - 交互式HTML可视化方案

## 一、HTML可视化设计

### 1.1 整体布局

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>深圳3日游 - 智能旅行规划</title>
    <!-- 引入高德地图API -->
    <script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_KEY"></script>
    <!-- 引入ECharts图表库 -->
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    <style>
        /* 响应式布局 */
        body { margin: 0; font-family: 'Microsoft YaHei', sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; }
        
        /* 顶部信息栏 */
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 30px; }
        
        /* 标签页导航 */
        .tabs { display: flex; background: #f5f5f5; }
        .tab { padding: 15px 30px; cursor: pointer; }
        .tab.active { background: white; border-bottom: 3px solid #667eea; }
        
        /* 主要内容区 */
        .content { padding: 20px; }
        
        /* 地图容器 */
        #map { width: 100%; height: 500px; }
        
        /* 时间轴 */
        .timeline { position: relative; padding: 20px 0; }
        .timeline-item { padding: 20px; margin-bottom: 20px; 
                        background: white; border-radius: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <!-- 页面结构 -->
</body>
</html>
```

### 1.2 功能模块设计

#### 模块1: 顶部概览面板
```html
<div class="header">
    <h1>🎉 深圳3日游智能规划</h1>
    <div class="summary">
        <div class="stat">
            <span class="label">预算</span>
            <span class="value">¥2000</span>
        </div>
        <div class="stat">
            <span class="label">实际消费</span>
            <span class="value highlight">¥948</span>
        </div>
        <div class="stat">
            <span class="label">剩余</span>
            <span class="value success">¥1052</span>
        </div>
        <div class="stat">
            <span class="label">天数</span>
            <span class="value">3天</span>
        </div>
    </div>
</div>
```

#### 模块2: 多标签页导航
```html
<div class="tabs">
    <div class="tab active" onclick="showTab('route')">📍 路线地图</div>
    <div class="tab" onclick="showTab('itinerary')">📅 详细行程</div>
    <div class="tab" onclick="showTab('restaurants')">🍴 美食推荐</div>
    <div class="tab" onclick="showTab('budget')">💰 成本分析</div>
    <div class="tab" onclick="showTab('weather')">🌤️ 天气预报</div>
</div>
```

#### 模块3: 交互式地图（核心）
```html
<div id="tab-route" class="tab-content">
    <div class="map-controls">
        <select id="day-selector" onchange="updateMapRoute()">
            <option value="all">查看全部3天</option>
            <option value="1">Day 1 - 福田区</option>
            <option value="2">Day 2 - 南山区</option>
            <option value="3">Day 3 - 罗湖区</option>
        </select>
        
        <label>
            <input type="checkbox" id="show-subway" checked onchange="toggleSubway()">
            显示地铁站
        </label>
        
        <label>
            <input type="checkbox" id="show-route" checked onchange="toggleRoute()">
            显示路线
        </label>
    </div>
    
    <!-- 高德地图容器 -->
    <div id="map"></div>
    
    <!-- 地图说明 -->
    <div class="map-legend">
        <div class="legend-item">
            <span class="marker restaurant"></span> 餐厅
        </div>
        <div class="legend-item">
            <span class="marker attraction"></span> 景点
        </div>
        <div class="legend-item">
            <span class="marker subway"></span> 地铁站
        </div>
    </div>
</div>

<script>
// 初始化地图
var map = new AMap.Map('map', {
    zoom: 12,
    center: [114.0579, 22.5431], // 深圳中心
    mapStyle: 'amap://styles/light'
});

// 添加标记点
var markers = {
    day1: [
        {
            type: 'attraction',
            name: '莲花山公园',
            position: [114.055291, 22.548065],
            time: '10:00-12:00',
            info: '登高观景，俯瞰深圳'
        },
        {
            type: 'restaurant',
            name: '巴奴毛肚火锅',
            position: [114.062, 22.541],
            time: '12:00-13:30',
            rating: 5.0,
            price: 150,
            dishes: ['毛肚', '鸭血', '虾滑']
        },
        {
            type: 'attraction',
            name: '深圳博物馆',
            position: [114.058, 22.545],
            time: '14:00-16:00',
            info: '了解深圳历史文化'
        }
    ],
    // day2, day3...
};

// 创建标记
function createMarkers(day) {
    markers[day].forEach(function(item, index) {
        var icon = new AMap.Icon({
            image: item.type === 'restaurant' ? '🍴' : '📍',
            size: new AMap.Size(32, 32)
        });
        
        var marker = new AMap.Marker({
            position: item.position,
            icon: icon,
            title: item.name,
            label: {
                content: `${index + 1}. ${item.name}`,
                offset: new AMap.Pixel(0, 30)
            }
        });
        
        // 点击标记显示详情
        marker.on('click', function() {
            showInfoWindow(item);
        });
        
        map.add(marker);
    });
}

// 绘制路线
function drawRoute(day) {
    var points = markers[day].map(m => m.position);
    
    var polyline = new AMap.Polyline({
        path: points,
        strokeColor: '#667eea',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        showDir: true  // 显示方向箭头
    });
    
    map.add(polyline);
}

// 信息窗口
function showInfoWindow(item) {
    var content = `
        <div class="info-window">
            <h3>${item.name}</h3>
            <p><strong>时间：</strong>${item.time}</p>
            ${item.rating ? `<p><strong>评分：</strong>${item.rating}⭐</p>` : ''}
            ${item.price ? `<p><strong>人均：</strong>¥${item.price}</p>` : ''}
            ${item.dishes ? `<p><strong>推荐：</strong>${item.dishes.join('、')}</p>` : ''}
            ${item.info ? `<p>${item.info}</p>` : ''}
        </div>
    `;
    
    var infoWindow = new AMap.InfoWindow({
        content: content,
        offset: new AMap.Pixel(0, -30)
    });
    
    infoWindow.open(map, item.position);
}

// 切换天数
function updateMapRoute() {
    var day = document.getElementById('day-selector').value;
    map.clearMap();
    
    if (day === 'all') {
        createMarkers('day1');
        createMarkers('day2');
        createMarkers('day3');
    } else {
        createMarkers('day' + day);
        drawRoute('day' + day);
    }
}

// 初始化
updateMapRoute();
</script>
```

#### 模块4: 时间轴行程展示
```html
<div id="tab-itinerary" class="tab-content" style="display:none;">
    <div class="timeline">
        <!-- Day 1 -->
        <div class="day-section">
            <h2>📅 Day 1 - 福田区 <span class="date">2026-08-26</span></h2>
            
            <div class="timeline-item" data-time="09:30">
                <div class="time-badge">09:30</div>
                <div class="content">
                    <h3>🚇 出发</h3>
                    <p>从酒店出发，前往福田区</p>
                    <p class="route">建议路线：地铁3号线 → 莲花村站</p>
                </div>
            </div>
            
            <div class="timeline-item" data-time="10:00" onclick="highlightOnMap('莲花山公园')">
                <div class="time-badge">10:00</div>
                <div class="content">
                    <h3>📍 莲花山公园</h3>
                    <p class="desc">登高观景，俯瞰深圳城市天际线</p>
                    <div class="details">
                        <span class="tag">免费</span>
                        <span class="tag">2小时</span>
                        <span class="tag">户外</span>
                    </div>
                    <button class="btn-view-map">在地图上查看</button>
                </div>
            </div>
            
            <div class="timeline-item highlight" data-time="12:00" onclick="highlightOnMap('巴奴火锅')">
                <div class="time-badge">12:00</div>
                <div class="content">
                    <h3>🍴 巴奴毛肚火锅（午餐）</h3>
                    <div class="restaurant-info">
                        <div class="rating">
                            <span class="stars">⭐⭐⭐⭐⭐</span>
                            <span class="score">5.0分</span>
                        </div>
                        <div class="price">人均 ¥150</div>
                    </div>
                    
                    <div class="recommended-dishes">
                        <strong>推荐菜品：</strong>
                        <span class="dish">毛肚</span>
                        <span class="dish">鸭血</span>
                        <span class="dish">虾滑</span>
                    </div>
                    
                    <div class="user-reviews">
                        <p class="review">💬 小红书用户："毛肚超级新鲜，汤底好喝！"</p>
                        <p class="review">💬 大众点评："服务周到，环境干净"</p>
                    </div>
                    
                    <div class="transportation">
                        <span>📍 距莲花山公园步行10分钟</span>
                        <span>🚇 距地铁岗厦站190m</span>
                    </div>
                    
                    <button class="btn-primary">查看完整评价</button>
                    <button class="btn-secondary">导航前往</button>
                </div>
            </div>
            
            <!-- 更多时间点... -->
        </div>
        
        <!-- Day 2, Day 3... -->
    </div>
</div>

<script>
function highlightOnMap(name) {
    // 切换到地图标签页
    showTab('route');
    
    // 在地图上高亮显示该位置
    // ... 实现代码
}
</script>
```

#### 模块5: 美食推荐详情页
```html
<div id="tab-restaurants" class="tab-content" style="display:none;">
    <div class="restaurant-grid">
        <!-- 餐厅卡片 -->
        <div class="restaurant-card" onclick="showRestaurantDetail('巴奴火锅')">
            <div class="card-image">
                <img src="restaurant1.jpg" alt="巴奴火锅">
                <div class="rating-badge">5.0⭐</div>
            </div>
            
            <div class="card-content">
                <h3>巴奴毛肚火锅</h3>
                <p class="cuisine-type">🔥 火锅 | 福田区</p>
                <p class="price">人均 ¥150</p>
                
                <div class="tags">
                    <span class="tag">大众点评5.0分</span>
                    <span class="tag success">小红书高口碑</span>
                </div>
                
                <div class="highlights">
                    <p>✨ 推荐菜品：毛肚、鸭血、虾滑</p>
                    <p>💬 28条小红书笔记推荐</p>
                </div>
                
                <button class="btn-detail">查看详情</button>
            </div>
        </div>
        
        <!-- 更多餐厅卡片... -->
    </div>
    
    <!-- 筛选器 -->
    <div class="filter-bar">
        <select id="filter-cuisine">
            <option value="all">所有菜系</option>
            <option value="火锅">火锅</option>
            <option value="粤菜">粤菜</option>
            <option value="海鲜">海鲜</option>
        </select>
        
        <select id="filter-price">
            <option value="all">所有价格</option>
            <option value="0-100">¥0-100</option>
            <option value="100-200">¥100-200</option>
            <option value="200+">¥200+</option>
        </select>
        
        <select id="filter-rating">
            <option value="all">所有评分</option>
            <option value="5.0">5.0分</option>
            <option value="4.5">4.5分以上</option>
            <option value="4.0">4.0分以上</option>
        </select>
    </div>
</div>

<!-- 餐厅详情弹窗 -->
<div id="restaurant-modal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        
        <div class="restaurant-detail">
            <div class="detail-header">
                <h2>巴奴毛肚火锅（卓悦中心店）</h2>
                <div class="rating-large">
                    <span class="score">5.0</span>
                    <span class="stars">⭐⭐⭐⭐⭐</span>
                    <span class="review-count">(4435条评价)</span>
                </div>
            </div>
            
            <div class="detail-tabs">
                <div class="tab active">基本信息</div>
                <div class="tab">推荐菜品</div>
                <div class="tab">用户评价</div>
                <div class="tab">小红书笔记</div>
            </div>
            
            <div class="detail-content">
                <!-- 基本信息 -->
                <div class="info-section">
                    <p><strong>地址：</strong>福华路与岗厦一路交叉口西北角卓悦中心东区二楼</p>
                    <p><strong>交通：</strong>距地铁1号线岗厦站出入口步行190m</p>
                    <p><strong>营业时间：</strong>11:00-23:00</p>
                    <p><strong>人均消费：</strong>¥150</p>
                    <p><strong>特色：</strong>有包厢、有大桌、付费停车</p>
                </div>
                
                <!-- 推荐菜品（来自小红书） -->
                <div class="dishes-section">
                    <div class="dish-item">
                        <img src="dish1.jpg">
                        <div class="dish-info">
                            <h4>毛肚</h4>
                            <p>1826人推荐</p>
                            <p class="dish-review">"超级新鲜，七上八下最好吃"</p>
                        </div>
                    </div>
                    <!-- 更多菜品... -->
                </div>
                
                <!-- 用户评价分析 -->
                <div class="reviews-analysis">
                    <h3>评价分析</h3>
                    
                    <div class="sentiment-chart">
                        <!-- 用ECharts绘制情感分析图 -->
                        <div id="sentiment-chart" style="width:100%;height:300px;"></div>
                    </div>
                    
                    <div class="keyword-cloud">
                        <h4>高频关键词</h4>
                        <span class="keyword">毛肚新鲜</span>
                        <span class="keyword">汤底好喝</span>
                        <span class="keyword">服务周到</span>
                        <span class="keyword">环境不错</span>
                    </div>
                    
                    <div class="review-samples">
                        <h4>精选评价</h4>
                        <div class="review-item">
                            <div class="reviewer">
                                <img src="avatar1.jpg" class="avatar">
                                <span class="name">美食探索家</span>
                                <span class="platform">小红书</span>
                            </div>
                            <p class="review-text">
                                巴奴的毛肚真的是一绝！七上八下的口感超级棒...
                            </p>
                            <div class="review-images">
                                <img src="review1.jpg">
                                <img src="review2.jpg">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### 模块6: 成本分析图表
```html
<div id="tab-budget" class="tab-content" style="display:none;">
    <div class="budget-overview">
        <div class="budget-card">
            <h3>总预算</h3>
            <div class="amount large">¥2000</div>
        </div>
        
        <div class="budget-card success">
            <h3>实际消费</h3>
            <div class="amount large">¥948</div>
            <div class="percentage">47.4%</div>
        </div>
        
        <div class="budget-card highlight">
            <h3>剩余</h3>
            <div class="amount large">¥1052</div>
            <div class="suggestion">可增加购物或高端餐饮</div>
        </div>
    </div>
    
    <!-- 饼图：成本分布 -->
    <div class="chart-section">
        <h3>成本分布</h3>
        <div id="cost-pie-chart" style="width:100%;height:400px;"></div>
    </div>
    
    <!-- 柱状图：每日成本 -->
    <div class="chart-section">
        <h3>每日成本对比</h3>
        <div id="daily-cost-chart" style="width:100%;height:400px;"></div>
    </div>
    
    <!-- 详细清单 -->
    <div class="cost-detail-table">
        <h3>详细清单</h3>
        <table>
            <thead>
                <tr>
                    <th>日期</th>
                    <th>项目</th>
                    <th>明细</th>
                    <th>金额</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td rowspan="4">Day 1</td>
                    <td>午餐</td>
                    <td>巴奴毛肚火锅</td>
                    <td>¥150</td>
                </tr>
                <tr>
                    <td>门票</td>
                    <td>莲花山公园（免费）</td>
                    <td>¥0</td>
                </tr>
                <tr>
                    <td>交通</td>
                    <td>地铁往返</td>
                    <td>¥6</td>
                </tr>
                <tr class="subtotal">
                    <td colspan="2">小计</td>
                    <td>¥156</td>
                </tr>
                <!-- Day 2, Day 3... -->
            </tbody>
            <tfoot>
                <tr class="total">
                    <td colspan="3">总计</td>
                    <td>¥948</td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>

<script>
// 初始化饼图
var piChart = echarts.init(document.getElementById('cost-pie-chart'));
piChart.setOption({
    title: { text: '成本分布', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
        type: 'pie',
        radius: '60%',
        data: [
            {value: 368, name: '餐饮'},
            {value: 490, name: '门票'},
            {value: 90, name: '交通'}
        ],
        itemStyle: {
            normal: {
                color: function(params) {
                    var colors = ['#667eea', '#764ba2', '#f093fb'];
                    return colors[params.dataIndex];
                }
            }
        }
    }]
});

// 初始化柱状图
var barChart = echarts.init(document.getElementById('daily-cost-chart'));
barChart.setOption({
    title: { text: '每日成本', left: 'center' },
    xAxis: { type: 'category', data: ['Day 1', 'Day 2', 'Day 3'] },
    yAxis: { type: 'value', name: '金额（元）' },
    series: [
        {
            name: '餐饮',
            type: 'bar',
            stack: 'total',
            data: [150, 108, 110],
            itemStyle: { color: '#667eea' }
        },
        {
            name: '门票',
            type: 'bar',
            stack: 'total',
            data: [0, 430, 60],
            itemStyle: { color: '#764ba2' }
        },
        {
            name: '交通',
            type: 'bar',
            stack: 'total',
            data: [6, 23, 6],
            itemStyle: { color: '#f093fb' }
        }
    ],
    tooltip: { trigger: 'axis' }
});
</script>
```

#### 模块7: 天气预报可视化
```html
<div id="tab-weather" class="tab-content" style="display:none;">
    <div class="weather-cards">
        <div class="weather-card">
            <div class="date">Day 1 <br> 8月26日</div>
            <div class="weather-icon">🌧️</div>
            <div class="weather-desc">中雨</div>
            <div class="temperature">26°C - 30°C</div>
            <div class="suggestions">
                <p>☂️ 建议携带雨具</p>
                <p>👕 穿着：薄长袖或短袖</p>
                <p>⚠️ 注意：户外活动可能受影响</p>
            </div>
        </div>
        
        <!-- Day 2, Day 3... -->
    </div>
    
    <!-- 温度趋势图 -->
    <div class="chart-section">
        <h3>温度趋势</h3>
        <div id="temperature-chart" style="width:100%;height:300px;"></div>
    </div>
</div>
```

## 二、Python生成HTML

```python
class HTMLReportGenerator:
    """生成交互式HTML报告"""
    
    def __init__(self, plan_data: Dict):
        self.data = plan_data
        
    def generate(self, output_path: str):
        """生成完整HTML文件"""
        html = self._build_html()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"HTML报告已生成: {output_path}")
    
    def _build_html(self) -> str:
        """构建完整HTML"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.data['city']}{self.data['days']}日游</title>
    {self._get_css()}
</head>
<body>
    {self._build_header()}
    {self._build_tabs()}
    {self._build_content()}
    {self._get_js()}
</body>
</html>
        """
    
    def _get_css(self) -> str:
        """获取CSS样式"""
        # ... CSS代码
        
    def _build_header(self) -> str:
        """构建顶部"""
        costs = self.data['costs']
        return f"""
        <div class="header">
            <h1>🎉 {self.data['city']}{self.data['days']}日游智能规划</h1>
            <div class="summary">
                <div class="stat">
                    <span class="label">预算</span>
                    <span class="value">¥{self.data['budget']}</span>
                </div>
                <div class="stat">
                    <span class="label">实际消费</span>
                    <span class="value highlight">¥{costs['total']}</span>
                </div>
                <div class="stat">
                    <span class="label">剩余</span>
                    <span class="value success">¥{costs['surplus']}</span>
                </div>
            </div>
        </div>
        """
    
    def _get_js(self) -> str:
        """获取JavaScript代码"""
        # 将Python数据转为JS变量
        itinerary_json = json.dumps(self.data['itinerary'], ensure_ascii=False)
        
        return f"""
        <script>
        var itineraryData = {itinerary_json};
        
        // 标签页切换
        function showTab(tabName) {{
            // ... 实现代码
        }}
        
        // 地图初始化
        function initMap() {{
            // ... 实现代码
        }}
        
        // 图表初始化
        function initCharts() {{
            // ... 实现代码
        }}
        
        window.onload = function() {{
            initMap();
            initCharts();
        }};
        </script>
        """
```

## 三、完整使用流程

```bash
# 1. 生成旅行计划
python travel_planner.py --city "深圳" --days 3 --budget 2000 --output plan.json

# 2. 生成HTML报告
python generate_html.py --input plan.json --output shenzhen_trip.html

# 3. 在浏览器中打开
# 双击 shenzhen_trip.html 或
# python -m http.server 8000
# 访问 http://localhost:8000/shenzhen_trip.html
```

## 四、交互功能清单

- [x] 交互式地图（高德地图API）
- [x] 可切换天数查看不同路线
- [x] 点击标记显示详情
- [x] 标签页切换（路线/行程/美食/预算/天气）
- [x] 餐厅详情弹窗
- [x] 成本分析图表（饼图+柱状图）
- [x] 温度趋势图
- [x] 筛选器（菜系/价格/评分）
- [x] 时间轴展示
- [ ] 导出PDF（可选）
- [ ] 分享链接（可选）

这个HTML方案是否符合你的期望？我现在实现完整的代码吗？
