#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
旅行规划器 - 完整版
整合飞猪、携程、小红书、高德地图、大众点评、天气等多个数据源
"""

import subprocess
import json
import sys
import io
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from collections import Counter

# 修复 Windows 控制台编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


def _extract_json_payload(text: str) -> Optional[Dict]:
    """从混合输出中提取首个完整 JSON 对象"""
    if not text:
        return None
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return None


class FlyAIIntegration:
    """飞猪数据集成"""

    def search_poi(self, city: str, keyword: str = "", limit: int = 5) -> List[Dict]:
        """搜索景点"""
        try:
            cmd = f'flyai search-poi --city-name "{city}"'
            if keyword:
                cmd += f' --keyword "{keyword}"'

            # Windows 下 flyai 可能 exit code != 0，但 stdout 仍有有效 JSON
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=30)
            data = _extract_json_payload(result.stdout or '')
            if not data:
                return []

            items = data.get('data', {}).get('itemList', [])[:limit]
            attractions = []
            for item in items:
                ticket_info = item.get('ticketInfo') or {}
                attractions.append({
                    'name': item.get('name', ''),
                    'desc': (item.get('description') or '')[:200],
                    'rating': 4.5,
                    'ticket': self._parse_price(ticket_info.get('price', '0')),
                    'hours': 2,
                    'image_url': item.get('mainPic', '') or '',
                    'booking_url': item.get('jumpUrl', ''),
                    'address': item.get('address', ''),
                    'latitude': item.get('latitude', ''),
                    'longitude': item.get('longitude', ''),
                    'source': 'fliggy'
                })
            return attractions
        except Exception as e:
            print(f"  ⚠️  飞猪查询失败: {e}", file=sys.stderr)
        return []

    def _parse_price(self, price_str: str) -> int:
        """解析价格字符串"""
        try:
            return int(float(str(price_str).replace('¥', '').replace('元', '').strip() or '0'))
        except Exception:
            return 0


class TripAIIntegration:
    """携程问道数据集成"""

    def __init__(self):
        # 官方环境变量为 TRIPAI_API_KEY；兼容旧名 TRIPAISK_TOKEN
        self.api_token = (
            os.getenv('TRIPAI_API_KEY', '')
            or os.getenv('TRIPAISK_TOKEN', '')
        )
        # 也支持配置文件 ~/.config/tripai-skill/api_key
        if not self.api_token:
            cfg = os.path.expanduser('~/.config/tripai-skill/api_key')
            if os.path.exists(cfg):
                try:
                    with open(cfg, 'r', encoding='utf-8') as f:
                        self.api_token = f.read().strip()
                except Exception:
                    pass
        if not self.api_token:
            print("  ⚠️  未配置携程问道 API Key（可选），环境变量: TRIPAI_API_KEY", file=sys.stderr)

    def search_attractions(self, city: str, query: str = None) -> List[Dict]:
        """搜索景点（token 可选，无 token 也可能可用但易限流）"""
        try:
            search_query = query or f"{city}有什么好玩的景点推荐"
            payload = {
                "query": search_query,
                "source": "clawhub"
            }
            if self.api_token:
                payload["token"] = self.api_token

            # 用临时文件传 body，避免 Windows 引号问题
            import tempfile
            with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as tf:
                json.dump(payload, tf, ensure_ascii=False)
                body_path = tf.name

            cmd = (
                f'curl -s -X POST https://wendao-skill-prod.ctrip.com/skill/query '
                f'-H "Content-Type: application/json" -d "@{body_path}"'
            )
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=45)
            try:
                os.unlink(body_path)
            except Exception:
                pass

            raw = (result.stdout or '').strip()
            data = _extract_json_payload(raw)
            if data:
                return self._parse_ctrip_response(data, city)
            # 携程问道常直接返回 Markdown 文本
            if raw and not raw.startswith('{'):
                return self._parse_ctrip_markdown(raw)
            print(f"  ⚠️  携程返回无法解析: {raw[:120]}", file=sys.stderr)
            return []
        except Exception as e:
            print(f"  ⚠️  携程查询失败: {e}", file=sys.stderr)
        return []

    def _parse_ctrip_markdown(self, text: str) -> List[Dict]:
        """从携程 Markdown 回答中提取景点名与描述"""
        import re
        attractions = []
        # 匹配 ### 景点名 后跟一段描述
        pattern = re.compile(r'^#{2,3}\s+(.+?)\s*$', re.M)
        parts = pattern.split(text)
        # parts: [preamble, name1, body1, name2, body2, ...]
        for i in range(1, len(parts) - 1, 2):
            name = parts[i].strip()
            body = parts[i + 1].strip()
            # 过滤分类标题（过短或含“推荐/休闲”等类别词且无实质描述）
            if not name or len(name) > 40:
                continue
            if name in ('滨海休闲', '主题乐园', '城市地标', '自然风光', '文化历史'):
                continue
            # 取描述首句
            desc = body.split('\n')[0].strip() if body else ''
            desc = re.sub(r'^[-*]\s*', '', desc)[:200]
            # 粗略识别免费
            ticket = 0 if '免费' in body[:80] else 0
            attractions.append({
                'name': name,
                'desc': desc,
                'rating': 4.5,
                'ticket': ticket,
                'hours': 2,
                'image_url': '',
                'booking_url': '',
                'source': 'ctrip'
            })
        return attractions[:10]

    def _parse_ctrip_response(self, data: Dict, city: str) -> List[Dict]:
        """解析携程返回 JSON（结构可能随版本变化）"""
        attractions = []

        candidates = []
        if isinstance(data.get('data'), list):
            candidates = data['data']
        elif isinstance(data.get('data'), dict):
            for key in ('list', 'items', 'pois', 'products', 'attractions'):
                if isinstance(data['data'].get(key), list):
                    candidates = data['data'][key]
                    break
        # 有时正文在 answer/content/message
        for key in ('answer', 'content', 'message', 'response'):
            val = data.get(key)
            if isinstance(val, str) and val.strip() and not val.strip().startswith('{'):
                return self._parse_ctrip_markdown(val)

        for item in candidates:
            if not isinstance(item, dict):
                continue
            name = item.get('name') or item.get('title') or item.get('poiName') or ''
            if not name:
                continue
            attractions.append({
                'name': name,
                'desc': item.get('description') or item.get('desc') or item.get('intro') or '',
                'rating': item.get('score') or item.get('rating') or 0,
                'ticket': 0,
                'hours': 2,
                'image_url': item.get('image') or item.get('imageUrl') or item.get('coverImage') or '',
                'booking_url': item.get('url') or item.get('jumpUrl') or '',
                'source': 'ctrip'
            })

        return attractions


class XiaohongshuIntegration:
    """小红书数据集成"""

    def __init__(self):
        from skill_paths import find_xiaohongshu_cli
        found = find_xiaohongshu_cli()
        self.cli_path = str(found) if found else ""

    def search_restaurant_notes(self, restaurant_name: str, city: str, limit: int = 3) -> List[Dict]:
        """搜索餐厅笔记"""
        if not self.cli_path:
            print("  ⚠️  未找到 xiaohongshu-skills/scripts/cli.py", file=sys.stderr)
            return []
        try:
            keyword = f"{city} {restaurant_name}"
            cmd = f'python "{self.cli_path}" search-feeds --keyword "{keyword}" --sort-by "最新" --note-type "图文"'

            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=30)

            if result.returncode == 0 and result.stdout:
                data = json.loads(result.stdout)
                notes = []
                for feed in data.get('feeds', [])[:limit]:
                    notes.append({
                        'title': feed.get('title', ''),
                        'content': feed.get('desc', ''),
                        'likes': feed.get('liked_count', 0),
                        'images': feed.get('images', []),
                        'author': feed.get('user', {}).get('nickname', '')
                    })
                return notes
        except Exception as e:
            print(f"  ⚠️  小红书查询失败: {e}", file=sys.stderr)
        return []

    def extract_recommended_dishes(self, notes: List[Dict]) -> List[str]:
        """从笔记中提取推荐菜品"""
        dishes = []
        keywords = ['推荐', '必点', '好吃', '招牌', '必吃', '强烈推荐', '墙裂推荐']

        for note in notes:
            content = note.get('content', '') + ' ' + note.get('title', '')
            for keyword in keywords:
                if keyword in content:
                    start = content.find(keyword)
                    if start != -1:
                        extract = content[start:start+50].strip()
                        words = extract.replace('！', ' ').replace('，', ' ').replace('。', ' ').split()
                        for word in words[1:4]:
                            if 2 <= len(word) <= 8:
                                dishes.append(word)

        if dishes:
            dish_counter = Counter(dishes)
            return [dish for dish, count in dish_counter.most_common(5)]
        return []

    def get_user_sentiment(self, notes: List[Dict]) -> Dict:
        """分析用户情感"""
        positive_words = ['好吃', '推荐', '棒', '赞', '喜欢', '满意', '值得', '不错', '惊艳']
        negative_words = ['不好', '难吃', '贵', '等', '久', '差', '失望', '一般', '坑']

        positive_count = 0
        negative_count = 0

        for note in notes:
            content = note.get('content', '') + ' ' + note.get('title', '')
            for word in positive_words:
                if word in content:
                    positive_count += 1
            for word in negative_words:
                if word in content:
                    negative_count += 1

        if positive_count > negative_count * 2:
            sentiment = 'positive'
        elif negative_count > positive_count * 2:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'

        return {
            'overall_sentiment': sentiment,
            'positive_count': positive_count,
            'negative_count': negative_count
        }


class AmapIntegration:
    """高德地图数据集成"""

    def get_poi_url(self, keyword: str, city: str = "") -> str:
        """生成高德地图搜索 URL"""
        query = f"{city} {keyword}" if city else keyword
        return f"https://www.amap.com/search?query={query}"

    def search_poi_with_image(self, keyword: str, city: str = "") -> Optional[str]:
        """尝试从高德获取POI图片（通过amap-lbs-skill）"""
        try:
            # 如果有amap-lbs-skill，可以调用获取更多信息
            # 这里简化处理，返回搜索URL
            query = f"{city} {keyword}" if city else keyword
            cmd = f'amap search "{query}" --limit 1 -f json'

            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=15)

            if result.returncode == 0 and result.stdout:
                data = json.loads(result.stdout)
                if data and len(data) > 0:
                    poi = data[0]
                    # 高德API通常不直接返回图片，返回空
                    return poi.get('photos', [''])[0] if 'photos' in poi else ''
        except Exception as e:
            print(f"  ⚠️  高德POI查询失败: {e}", file=sys.stderr)

        return ''


class DianpingIntegration:
    """大众点评数据集成"""

    def search_restaurants(self, city: str, cuisine_types: List[str], limit_per_type: int = 3) -> List[Dict]:
        """搜索餐厅"""
        all_restaurants = []

        for cuisine in cuisine_types:
            try:
                cmd = f'opencli dianping search "{cuisine}" --city "{city}" --limit {limit_per_type} -f json'
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=30)

                if result.returncode == 0 and result.stdout:
                    restaurants = json.loads(result.stdout)
                    for r in restaurants:
                        r['search_cuisine'] = cuisine
                        r['source'] = 'dianping'
                    all_restaurants.extend(restaurants)

            except Exception as e:
                print(f"  ⚠️  {cuisine}查询失败: {e}", file=sys.stderr)
                continue

        # 去重
        seen_ids = set()
        unique = []
        for r in all_restaurants:
            if r['shop_id'] not in seen_ids:
                seen_ids.add(r['shop_id'])
                unique.append(r)

        # 按评分排序
        unique.sort(key=lambda x: x.get('rating', 0), reverse=True)
        return unique

    def get_restaurant_detail(self, shop_id: str) -> Optional[Dict]:
        """获取餐厅详情"""
        try:
            cmd = f'opencli dianping shop {shop_id} -f json'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=30)

            if result.returncode == 0 and result.stdout:
                detail_list = json.loads(result.stdout)
                detail = {}
                for item in detail_list:
                    detail[item['field']] = item['value']
                return detail

        except Exception as e:
            print(f"  ⚠️  餐厅详情查询失败: {e}", file=sys.stderr)

        return None


class WeatherIntegration:
    """天气数据集成"""

    def __init__(self):
        from skill_paths import find_weather_py
        found = find_weather_py()
        self.weather_script = str(found) if found else ""

    def get_weather(self, city: str) -> Optional[Dict]:
        """获取天气预报"""
        if not self.weather_script:
            print("  ⚠️  未找到 weather-skill/weather.py", file=sys.stderr)
            return None
        try:
            cmd = f'python "{self.weather_script}" -json "{city}"'
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, encoding='utf-8', timeout=30)

            if result.returncode == 0 and result.stdout:
                return json.loads(result.stdout)

        except Exception as e:
            print(f"  ⚠️  天气查询失败: {e}", file=sys.stderr)

        return None


class TravelPlanner:
    """旅行规划主类"""

    def __init__(self, city: str, days: int, budget: float):
        self.city = city
        self.days = days
        self.budget = budget
        self.daily_budget = budget / days

        # 初始化所有数据源
        self.flyai = FlyAIIntegration()
        self.tripai = TripAIIntegration()
        self.xiaohongshu = XiaohongshuIntegration()
        self.amap = AmapIntegration()
        self.dianping = DianpingIntegration()
        self.weather = WeatherIntegration()

    def collect_attractions(self) -> List[Dict]:
        """收集景点数据（飞猪优先，携程备用，高德兜底）"""
        print("  正在查询景点...")

        # 飞猪查询（优先，有图片）
        attractions = self.flyai.search_poi(self.city, limit=10)

        if not attractions:
            # 携程备用（可能有图片）
            print("  飞猪无结果，尝试携程...")
            attractions = self.tripai.search_attractions(self.city)

        # 为没有图片的景点补充高德兜底
        for attr in attractions:
            if not attr.get('image_url'):
                print(f"  为 {attr['name']} 尝试高德图片...")
                amap_image = self.amap.search_poi_with_image(attr['name'], self.city)
                if amap_image:
                    attr['image_url'] = amap_image

        print(f"  找到 {len(attractions)} 个景点")
        return attractions

    def collect_restaurants(self, cuisine_types: List[str] = None) -> List[Dict]:
        """收集餐厅数据（大众点评 + 小红书验证）"""
        print("  正在查询餐厅...")

        if cuisine_types is None:
            # 默认偏本地 + 国际化菜系；具体城市可由调用方覆盖
            cuisine_types = ["粤菜", "海鲜", "茶餐厅", "泰国菜", "日料"]

        # 大众点评查询（控制类型数量，避免超时）
        restaurants = self.dianping.search_restaurants(self.city, cuisine_types[:4], limit_per_type=2)

        print(f"  找到 {len(restaurants)} 家餐厅")
        return restaurants

    def enhance_restaurant_with_xhs(self, restaurant: Dict) -> Dict:
        """用小红书数据增强餐厅信息"""
        notes = self.xiaohongshu.search_restaurant_notes(restaurant['name'], self.city)

        if notes:
            dishes = self.xiaohongshu.extract_recommended_dishes(notes)
            sentiment = self.xiaohongshu.get_user_sentiment(notes)

            restaurant['xiaohongshu'] = {
                'notes_count': len(notes),
                'recommended_dishes': dishes,
                'user_sentiment': sentiment
            }

        return restaurant

    def generate_itinerary(self, attractions: List[Dict], restaurants: List[Dict]) -> List[Dict]:
        """生成多日行程"""
        print("  正在规划行程...")

        itinerary = []

        # 按天分配景点和餐厅
        attractions_per_day = max(2, len(attractions) // self.days)
        restaurants_per_day = 1

        for day in range(self.days):
            day_attractions = attractions[day*attractions_per_day:(day+1)*attractions_per_day]
            day_restaurant = restaurants[day] if day < len(restaurants) else None

            # 获取餐厅详情
            restaurant_detail = None
            if day_restaurant:
                restaurant_detail = self.dianping.get_restaurant_detail(day_restaurant['shop_id'])
                # 小红书增强
                day_restaurant = self.enhance_restaurant_with_xhs(day_restaurant)

            itinerary.append({
                'day': day + 1,
                'attractions': day_attractions[:2],  # 每天最多2个景点
                'restaurant': day_restaurant,
                'restaurant_detail': restaurant_detail
            })

        return itinerary

    def calculate_costs(self, itinerary: List[Dict]) -> Dict:
        """计算成本"""
        dining_cost = 0
        ticket_cost = 0

        for item in itinerary:
            # 餐饮
            if item['restaurant']:
                dining_cost += item['restaurant'].get('price', 0)

            # 门票
            for attr in item['attractions']:
                ticket_cost += attr.get('ticket', 0)

        transport_cost = self.days * 30  # 预估交通
        total = dining_cost + ticket_cost + transport_cost

        return {
            'dining': dining_cost,
            'tickets': ticket_cost,
            'transport': transport_cost,
            'total': total,
            'within_budget': total <= self.budget,
            'surplus': self.budget - total if total <= self.budget else 0,
            'deficit': total - self.budget if total > self.budget else 0
        }

    def plan(self) -> Dict:
        """生成完整旅行计划"""
        print(f"\n正在规划 {self.city} {self.days}日游（预算¥{self.budget}）...\n")

        # 1. 天气
        print("【1/5】查询天气...")
        weather = self.weather.get_weather(self.city)
        print()

        # 2. 景点
        print("【2/5】搜索景点...")
        attractions = self.collect_attractions()
        print()

        # 3. 餐厅
        print("【3/5】搜索餐厅...")
        restaurants = self.collect_restaurants()
        print()

        # 4. 生成行程
        print("【4/5】规划行程...")
        itinerary = self.generate_itinerary(attractions, restaurants)
        print()

        # 5. 计算成本
        print("【5/5】计算成本...")
        costs = self.calculate_costs(itinerary)
        print()

        return {
            'city': self.city,
            'days': self.days,
            'budget': self.budget,
            'weather': weather,
            'itinerary': itinerary,
            'costs': costs,
            'generated_at': datetime.now().isoformat()
        }

    def print_summary(self, plan: Dict):
        """打印摘要"""
        print("=" * 60)
        print(f"  {plan['city']} {plan['days']}日游规划完成")
        print("=" * 60)
        print()

        costs = plan['costs']
        print(f"💰 成本: ¥{costs['total']} / 预算: ¥{plan['budget']}")
        print(f"   餐饮 ¥{costs['dining']} + 门票 ¥{costs['tickets']} + 交通 ¥{costs['transport']}")
        print()

        if costs['within_budget']:
            print(f"✓ 预算充足，剩余 ¥{costs['surplus']}")
        else:
            print(f"⚠️  超出预算 ¥{costs['deficit']}")
        print()


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='智能旅行规划器')
    parser.add_argument('--city', default='深圳', help='目标城市')
    parser.add_argument('--days', type=int, default=3, help='旅行天数')
    parser.add_argument('--budget', type=float, default=2000, help='总预算（元）')
    parser.add_argument('--output', default='plan.json', help='输出JSON文件')

    args = parser.parse_args()

    # 创建规划器
    planner = TravelPlanner(args.city, args.days, args.budget)

    # 生成计划
    plan = planner.plan()

    # 打印摘要
    planner.print_summary(plan)

    # 保存JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
    print(f"✓ 数据已保存: {args.output}")


if __name__ == '__main__':
    main()
