#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTML报告生成器
将旅行计划数据转换为交互式HTML页面
"""

import json
import sys
import io
from typing import Dict, List

# 修复Windows控制台编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


class HTMLReportGenerator:
    """生成交互式HTML旅行规划报告"""

    def __init__(self, plan_data: Dict):
        self.data = plan_data

    def generate(self, output_path: str):
        """生成完整HTML文件"""
        html = self._build_html()

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)

        print(f"✓ HTML报告已生成: {output_path}")
        print(f"  在浏览器中打开: file:///{output_path}")

    def _build_html(self) -> str:
        """构建完整HTML"""
        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.data['city']}{self.data['days']}日游 - 智能旅行规划</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
    {self._get_css()}
</head>
<body>
    {self._build_header()}
    {self._build_tabs()}
    {self._build_itinerary_content()}
    {self._build_restaurants_content()}
    {self._build_budget_content()}
    {self._build_weather_content()}
    {self._get_js()}
</body>
</html>"""

    def _get_css(self) -> str:
        """获取CSS样式"""
        return """<style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f7fa;
            color: #333;
        }

        .container { max-width: 1400px; margin: 0 auto; }

        /* 顶部概览 */
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 20px;
            text-align: center;
        }

        .summary {
            display: flex;
            justify-content: center;
            gap: 40px;
            flex-wrap: wrap;
        }

        .stat {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 20px 30px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }

        .stat .label {
            display: block;
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
        }

        .stat .value {
            display: block;
            font-size: 28px;
            font-weight: bold;
        }

        .stat .value.highlight { color: #ffd93d; }
        .stat .value.success { color: #6bcf7f; }

        /* 标签页导航 */
        .tabs {
            display: flex;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .tab {
            flex: 1;
            padding: 18px;
            text-align: center;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            font-size: 16px;
        }

        .tab:hover {
            background: #f8f9fa;
        }

        .tab.active {
            border-bottom-color: #667eea;
            color: #667eea;
            font-weight: bold;
        }

        /* 内容区 */
        .tab-content {
            display: none;
            padding: 30px 20px;
        }

        .tab-content.active {
            display: block;
        }

        /* 时间轴 */
        .timeline {
            max-width: 900px;
            margin: 0 auto;
        }

        .day-section {
            margin-bottom: 50px;
        }

        .day-section h2 {
            font-size: 28px;
            margin-bottom: 20px;
            color: #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .day-section .date {
            font-size: 16px;
            color: #999;
            font-weight: normal;
        }

        .timeline-item {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            position: relative;
            padding-left: 90px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .timeline-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(102,126,234,0.2);
        }

        .timeline-item.highlight {
            border-left: 4px solid #667eea;
        }

        .time-badge {
            position: absolute;
            left: 25px;
            top: 25px;
            background: #667eea;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
        }

        .timeline-item h3 {
            font-size: 20px;
            margin-bottom: 10px;
            color: #333;
        }

        .timeline-item .desc {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.6;
        }

        .details {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }

        .tag {
            display: inline-block;
            padding: 6px 12px;
            background: #f0f0f0;
            border-radius: 6px;
            font-size: 13px;
            color: #666;
        }

        .tag.success { background: #e7f5ec; color: #27ae60; }
        .tag.warning { background: #fff4e5; color: #e67e22; }

        /* 餐厅卡片 */
        .restaurant-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 15px 0;
        }

        .rating {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .stars {
            color: #ffd93d;
            font-size: 18px;
        }

        .score {
            font-weight: bold;
            font-size: 18px;
            color: #667eea;
        }

        .price {
            font-size: 18px;
            color: #e67e22;
            font-weight: bold;
        }

        .recommended-dishes {
            margin: 15px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .dish {
            display: inline-block;
            background: white;
            padding: 6px 12px;
            margin: 4px;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
        }

        .user-reviews {
            margin: 15px 0;
        }

        .review {
            padding: 10px 0;
            color: #666;
            font-style: italic;
            border-left: 3px solid #667eea;
            padding-left: 12px;
            margin: 8px 0;
        }

        .transportation {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }

        .transportation span {
            display: inline-block;
            margin-right: 20px;
        }

        /* 按钮 */
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        }

        .btn-primary {
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-1px);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
            margin-left: 10px;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        /* 图表容器 */
        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            margin-bottom: 30px;
        }

        .chart-container h3 {
            margin-bottom: 20px;
            color: #333;
            font-size: 20px;
        }

        /* 预算卡片 */
        .budget-overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .budget-card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            text-align: center;
        }

        .budget-card h3 {
            color: #666;
            font-size: 16px;
            margin-bottom: 15px;
        }

        .budget-card .amount {
            font-size: 36px;
            font-weight: bold;
            color: #333;
        }

        .budget-card.success .amount {
            color: #27ae60;
        }

        .budget-card.highlight .amount {
            color: #667eea;
        }

        .percentage {
            margin-top: 10px;
            color: #999;
            font-size: 14px;
        }

        .suggestion {
            margin-top: 10px;
            color: #667eea;
            font-size: 14px;
        }

        /* 成本表格 */
        .cost-table {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }

        .cost-table table {
            width: 100%;
            border-collapse: collapse;
        }

        .cost-table th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }

        .cost-table td {
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }

        .cost-table tr:hover {
            background: #f8f9fa;
        }

        .cost-table .subtotal {
            background: #f8f9fa;
            font-weight: bold;
        }

        .cost-table .total {
            background: #667eea;
            color: white;
            font-weight: bold;
            font-size: 18px;
        }

        /* 天气卡片 */
        .weather-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .weather-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            text-align: center;
        }

        .weather-card .date {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
            font-size: 16px;
        }

        .weather-icon {
            font-size: 48px;
            margin: 15px 0;
        }

        .weather-desc {
            font-size: 18px;
            color: #333;
            margin-bottom: 10px;
        }

        .temperature {
            font-size: 24px;
            font-weight: bold;
            color: #666;
            margin-bottom: 15px;
        }

        .suggestions {
            text-align: left;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            font-size: 14px;
        }

        .suggestions p {
            margin: 8px 0;
            color: #666;
        }

        /* 响应式 */
        @media (max-width: 768px) {
            .header h1 { font-size: 24px; }
            .summary { gap: 15px; }
            .stat { padding: 15px 20px; }
            .tab { padding: 12px; font-size: 14px; }
            .timeline-item { padding-left: 80px; }
        }
    </style>"""

    def _build_header(self) -> str:
        """构建顶部概览"""
        costs = self.data['costs']
        return f"""
    <div class="header">
        <div class="container">
            <h1>🎉 {self.data['city']}{self.data['days']}日游智能规划</h1>
            <div class="summary">
                <div class="stat">
                    <span class="label">预算</span>
                    <span class="value">¥{self.data['budget']:.0f}</span>
                </div>
                <div class="stat">
                    <span class="label">实际消费</span>
                    <span class="value highlight">¥{costs['total']}</span>
                </div>
                <div class="stat">
                    <span class="label">剩余</span>
                    <span class="value success">¥{costs['surplus']:.0f}</span>
                </div>
                <div class="stat">
                    <span class="label">天数</span>
                    <span class="value">{self.data['days']}天</span>
                </div>
            </div>
        </div>
    </div>"""

    def _build_tabs(self) -> str:
        """构建标签页导航"""
        return """
    <div class="tabs">
        <div class="tab active" onclick="showTab('itinerary')">📅 详细行程</div>
        <div class="tab" onclick="showTab('restaurants')">🍴 美食推荐</div>
        <div class="tab" onclick="showTab('budget')">💰 成本分析</div>
        <div class="tab" onclick="showTab('weather')">🌤️ 天气预报</div>
    </div>"""

    def _build_itinerary_content(self) -> str:
        """构建行程内容"""
        html = '<div id="tab-itinerary" class="tab-content active"><div class="container"><div class="timeline">'

        for item in self.data['itinerary']:
            day = item['day']
            district = item['district']
            restaurant = item['restaurant']
            restaurant_detail = item.get('restaurant_detail', {})
            attractions = item['attractions']

            html += f'''
        <div class="day-section">
            <h2>📅 Day {day} - {district} <span class="date">第{day}天</span></h2>'''

            # 上午景点
            if attractions:
                attr1 = attractions[0]
                html += f'''
            <div class="timeline-item">
                <div class="time-badge">10:00</div>
                <div class="content">
                    <h3>📍 {attr1['name']}</h3>
                    <p class="desc">{attr1['desc']}</p>
                    <div class="details">
                        <span class="tag">{'免费' if attr1['ticket'] == 0 else f"门票¥{attr1['ticket']}"}</span>
                        <span class="tag">{attr1['hours']}小时</span>
                    </div>
                </div>
            </div>'''

            # 午餐
            if restaurant:
                # 提取字典格式的详情
                address = restaurant_detail.get('address', '暂无地址信息')
                subway = restaurant_detail.get('subway', '')
                taste = restaurant_detail.get('taste', 'N/A')
                env = restaurant_detail.get('environment', 'N/A')
                service = restaurant_detail.get('service', 'N/A')

                html += f'''
            <div class="timeline-item highlight">
                <div class="time-badge">12:00</div>
                <div class="content">
                    <h3>🍴 {restaurant['name']}（午餐）</h3>
                    <div class="restaurant-info">
                        <div class="rating">
                            <span class="stars">{'⭐' * int(restaurant['rating'])}</span>
                            <span class="score">{restaurant['rating']}分</span>
                        </div>
                        <div class="price">人均 ¥{restaurant['price']}</div>
                    </div>
                    <div class="details">
                        <span class="tag">口味 {taste}</span>
                        <span class="tag">环境 {env}</span>
                        <span class="tag">服务 {service}</span>
                    </div>'''

                if 'xiaohongshu' in restaurant:
                    xhs = restaurant['xiaohongshu']
                    if xhs.get('recommended_dishes'):
                        html += f'''
                    <div class="recommended-dishes">
                        <strong>📝 小红书推荐菜品：</strong>
                        {' '.join(f'<span class="dish">{dish}</span>' for dish in xhs['recommended_dishes'][:5])}
                    </div>'''

                html += f'''
                    <div class="transportation">
                        <span>📍 {address}</span>
                        {f'<span>🚇 {subway}</span>' if subway else ''}
                    </div>
                </div>
            </div>'''

            # 下午景点
            if len(attractions) > 1:
                attr2 = attractions[1]
                html += f'''
            <div class="timeline-item">
                <div class="time-badge">14:00</div>
                <div class="content">
                    <h3>📍 {attr2['name']}</h3>
                    <p class="desc">{attr2['desc']}</p>
                    <div class="details">
                        <span class="tag">{'免费' if attr2['ticket'] == 0 else f"门票¥{attr2['ticket']}"}</span>
                        <span class="tag">{attr2['hours']}小时</span>
                    </div>
                </div>
            </div>'''

            html += '</div>'  # day-section

        html += '</div></div></div>'  # timeline, container, tab-content
        return html

    def _build_restaurants_content(self) -> str:
        """构建美食推荐内容"""
        html = '<div id="tab-restaurants" class="tab-content"><div class="container">'
        html += '<h2 style="margin-bottom: 30px; font-size: 28px;">🍴 精选美食推荐</h2>'

        for item in self.data['itinerary']:
            if item['restaurant']:
                r = item['restaurant']
                html += f'''
        <div class="timeline-item">
            <h3>{r['name']}</h3>
            <div class="restaurant-info">
                <div class="rating">
                    <span class="stars">{'⭐' * int(r['rating'])}</span>
                    <span class="score">{r['rating']}分</span>
                    <span style="color: #999; margin-left: 10px;">({r['reviews']}条评价)</span>
                </div>
                <div class="price">人均 ¥{r['price']}</div>
            </div>
            <div class="details">
                <span class="tag">{r['cuisine']}</span>
                <span class="tag">{r['district']}</span>
                <span class="tag success">大众点评推荐</span>
            </div>
        </div>'''

        html += '</div></div>'
        return html

    def _build_budget_content(self) -> str:
        """构建成本分析内容"""
        costs = self.data['costs']
        percentage = (costs['total'] / self.data['budget']) * 100

        html = f'''
    <div id="tab-budget" class="tab-content"><div class="container">
        <div class="budget-overview">
            <div class="budget-card">
                <h3>总预算</h3>
                <div class="amount">¥{self.data['budget']:.0f}</div>
            </div>
            <div class="budget-card success">
                <h3>实际消费</h3>
                <div class="amount">¥{costs['total']}</div>
                <div class="percentage">{percentage:.1f}%</div>
            </div>
            <div class="budget-card highlight">
                <h3>剩余</h3>
                <div class="amount">¥{costs['surplus']:.0f}</div>
                {'<div class="suggestion">💡 可增加购物或高端餐饮</div>' if costs['within_budget'] else ''}
            </div>
        </div>

        <div class="chart-container">
            <h3>💰 成本分布</h3>
            <div id="cost-pie-chart" style="width:100%;height:400px;"></div>
        </div>

        <div class="cost-table">
            <table>
                <thead>
                    <tr>
                        <th>类别</th>
                        <th>金额</th>
                        <th>占比</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>🍴 餐饮</td>
                        <td>¥{costs['dining']}</td>
                        <td>{(costs['dining']/costs['total']*100):.1f}%</td>
                    </tr>
                    <tr>
                        <td>🎫 门票</td>
                        <td>¥{costs['tickets']}</td>
                        <td>{(costs['tickets']/costs['total']*100):.1f}%</td>
                    </tr>
                    <tr>
                        <td>🚇 交通</td>
                        <td>¥{costs['transport']}</td>
                        <td>{(costs['transport']/costs['total']*100):.1f}%</td>
                    </tr>
                    <tr class="total">
                        <td>总计</td>
                        <td>¥{costs['total']}</td>
                        <td>100%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div></div>'''

        return html

    def _build_weather_content(self) -> str:
        """构建天气预报内容"""
        if not self.data.get('weather'):
            return '<div id="tab-weather" class="tab-content"><div class="container"><p>天气数据暂不可用</p></div></div>'

        weather_icons = {
            '晴': '☀️',
            '多云': '⛅',
            '阴': '☁️',
            '雨': '🌧️',
            '中雨': '🌧️',
            '大雨': '⛈️',
            '雷阵雨': '⛈️',
            '雪': '❄️'
        }

        html = '<div id="tab-weather" class="tab-content"><div class="container">'
        html += '<h2 style="margin-bottom: 30px; font-size: 28px;">🌤️ 天气预报</h2>'
        html += '<div class="weather-cards">'

        for i, day_weather in enumerate(self.data['weather']['forecast'][:self.data['days']]):
            weather_desc = day_weather['weather']
            icon = weather_icons.get(weather_desc.split('转')[0], '🌤️')

            html += f'''
        <div class="weather-card">
            <div class="date">Day {i+1}<br>{day_weather['date']}</div>
            <div class="weather-icon">{icon}</div>
            <div class="weather-desc">{weather_desc}</div>
            <div class="temperature">{day_weather['temp_low']} - {day_weather['temp_high']}</div>
            <div class="suggestions">'''

            # 提取生活指数
            if 'life_indices' in day_weather:
                for index in day_weather['life_indices'][:3]:
                    html += f'<p>{index.get("description", "")}</p>'

            html += '</div></div>'

        html += '</div></div></div>'
        return html

    def _get_js(self) -> str:
        """获取JavaScript代码"""
        costs = self.data['costs']

        return f"""
    <script>
    // 标签页切换
    function showTab(tabName) {{
        // 隐藏所有内容
        document.querySelectorAll('.tab-content').forEach(function(content) {{
            content.classList.remove('active');
        }});
        document.querySelectorAll('.tab').forEach(function(tab) {{
            tab.classList.remove('active');
        }});

        // 显示选中的内容
        document.getElementById('tab-' + tabName).classList.add('active');
        event.target.classList.add('active');

        // 如果切换到预算页，初始化图表
        if (tabName === 'budget') {{
            setTimeout(initCharts, 100);
        }}
    }}

    // 初始化图表
    function initCharts() {{
        var pieChart = echarts.init(document.getElementById('cost-pie-chart'));

        pieChart.setOption({{
            tooltip: {{
                trigger: 'item',
                formatter: '{{b}}: ¥{{c}} ({{d}}%)'
            }},
            legend: {{
                bottom: '5%',
                left: 'center'
            }},
            series: [{{
                name: '成本分布',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {{
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                }},
                label: {{
                    show: true,
                    formatter: '{{b}}: ¥{{c}}'
                }},
                emphasis: {{
                    label: {{
                        show: true,
                        fontSize: 18,
                        fontWeight: 'bold'
                    }}
                }},
                data: [
                    {{ value: {costs['dining']}, name: '餐饮', itemStyle: {{ color: '#667eea' }} }},
                    {{ value: {costs['tickets']}, name: '门票', itemStyle: {{ color: '#764ba2' }} }},
                    {{ value: {costs['transport']}, name: '交通', itemStyle: {{ color: '#f093fb' }} }}
                ]
            }}]
        }});
    }}
    </script>"""


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='生成交互式HTML旅行规划报告')
    parser.add_argument('--input', required=True, help='输入JSON文件路径')
    parser.add_argument('--output', required=True, help='输出HTML文件路径')

    args = parser.parse_args()

    # 读取JSON数据
    with open(args.input, 'r', encoding='utf-8') as f:
        plan_data = json.load(f)

    # 生成HTML
    generator = HTMLReportGenerator(plan_data)
    generator.generate(args.output)


if __name__ == '__main__':
    main()
