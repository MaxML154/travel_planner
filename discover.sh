#!/bin/bash
# 智能旅行规划系统 - 发现版
# 自动发现城市热门美食和景点，生成完整旅行规划

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 参数
CITY="${1:-深圳}"
BUDGET="${2:-500}"

echo -e "${BLUE}=========================================="
echo -e "  ${CITY}一日游智能规划"
echo -e "  预算: ¥${BUDGET}"
echo -e "==========================================${NC}"
echo ""

# ========================================
# 1. 发现城市热门美食类型
# ========================================
echo -e "${GREEN}【1/6】发现${CITY}热门美食${NC}"

# 搜索多种热门菜系
cuisines=("火锅" "粤菜" "海鲜" "烧烤" "日料" "川菜")
echo "  正在搜索热门菜系..."

all_restaurants="[]"
for cuisine in "${cuisines[@]}"; do
  echo "    - 搜索${cuisine}..."

  results=$(opencli dianping search "$cuisine" --city "$CITY" --limit 5 -f json 2>/dev/null | \
    jq --arg c "$cuisine" 'map(. + {search_cuisine: $c})' 2>/dev/null || echo "[]")

  all_restaurants=$(echo "$all_restaurants" "$results" | jq -s 'add | unique_by(.shop_id)')

  sleep 1  # 避免请求过快
done

# 按评分排序，筛选4.0分以上
top_restaurants=$(echo "$all_restaurants" | jq '[.[] | select(.rating >= 4.0)] | sort_by(.rating) | reverse | .[0:10]')

restaurant_count=$(echo "$top_restaurants" | jq 'length')
echo -e "  ✓ 发现 ${restaurant_count} 家优质餐厅"
echo ""

# 分类统计
echo "  美食分布:"
echo "$top_restaurants" | jq -r 'group_by(.search_cuisine) | .[] | "    \(.[0].search_cuisine): \(length)家"'
echo ""

# 显示TOP 5推荐
echo "  TOP 5 推荐餐厅:"
echo "$top_restaurants" | jq -r '.[0:5] | .[] |
  "    \(.rank). \(.name)\n       评分:\(.rating) | 人均:¥\(.price) | 类型:\(.search_cuisine) | 位置:\(.district)"'
echo ""

# ========================================
# 2. 智能选择午餐餐厅
# ========================================
echo -e "${GREEN}【2/6】智能匹配午餐餐厅${NC}"

lunch_budget=$((BUDGET * 40 / 100))
echo "  午餐预算: ¥${lunch_budget}"

# 从TOP10中选择符合预算的最高评分餐厅
selected_restaurant=$(echo "$top_restaurants" | jq --arg budget "$lunch_budget" \
  '[.[] | select(.price <= ($budget | tonumber))] | sort_by(.rating) | reverse | .[0]')

if [ "$selected_restaurant" == "null" ] || [ -z "$selected_restaurant" ]; then
  echo -e "  ${YELLOW}预算较低，推荐性价比餐厅${NC}"
  selected_restaurant=$(echo "$top_restaurants" | jq 'sort_by(.price / .rating) | .[0]')
fi

restaurant_name=$(echo "$selected_restaurant" | jq -r '.name')
restaurant_id=$(echo "$selected_restaurant" | jq -r '.shop_id')
restaurant_price=$(echo "$selected_restaurant" | jq -r '.price')
restaurant_rating=$(echo "$selected_restaurant" | jq -r '.rating')
restaurant_cuisine=$(echo "$selected_restaurant" | jq -r '.search_cuisine')
restaurant_district=$(echo "$selected_restaurant" | jq -r '.district')

echo "  ✓ 已选择: ${restaurant_name}"
echo "    类型: ${restaurant_cuisine} | 评分: ${restaurant_rating} | 人均: ¥${restaurant_price}"
echo "    位置: ${restaurant_district}"
echo ""

# 获取详细信息
echo "  获取详细信息..."
restaurant_detail=$(opencli dianping shop "$restaurant_id" -f json 2>/dev/null)

restaurant_address=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="address") | .value')
restaurant_subway=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="subway") | .value')
restaurant_hours=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="hours") | .value')

echo "    地址: ${restaurant_address}"
echo "    交通: ${restaurant_subway}"
[ -n "$restaurant_hours" ] && echo "    营业时间: ${restaurant_hours}"

echo ""

# ========================================
# 3. 备选餐厅推荐
# ========================================
echo -e "${GREEN}【3/6】提供备选方案${NC}"

# 推荐同区域的其他餐厅
alternative_restaurants=$(echo "$top_restaurants" | jq --arg district "$restaurant_district" --arg selected_id "$restaurant_id" \
  '[.[] | select(.district == $district and .shop_id != $selected_id)] | .[0:2]')

alt_count=$(echo "$alternative_restaurants" | jq 'length')

if [ "$alt_count" -gt 0 ]; then
  echo "  同区域备选（如需排队）:"
  echo "$alternative_restaurants" | jq -r '.[] | "    • \(.name) - 评分\(.rating) 人均¥\(.price)"'
else
  echo "  暂无同区域备选，可考虑其他区域餐厅"
fi

echo ""

# ========================================
# 4. 发现周边景点
# ========================================
echo -e "${GREEN}【4/6】发现周边景点${NC}"

# 根据餐厅所在区域推荐景点
case "$restaurant_district" in
  *"福田"*|*"中心区"*)
    attractions=(
      "莲花山公园|2|免费|登高观景，俯瞰深圳"
      "中心书城|1.5|免费|文化地标，购书休闲"
      "市民中心|1|免费|现代建筑，拍照打卡"
    )
    ;;
  *"南山"*)
    attractions=(
      "世界之窗|3|200|世界各国建筑微缩景观"
      "欢乐谷|4|230|大型主题游乐园"
      "海上世界|2|免费|海滨商业区，夜景优美"
    )
    ;;
  *"罗湖"*)
    attractions=(
      "东门老街|2|免费|历史商业街区，购物美食"
      "地王大厦|1.5|60|观光层，城市全景"
      "仙湖植物园|3|20|植物园林，弘法寺"
    )
    ;;
  *)
    attractions=(
      "深圳湾公园|2|免费|海滨长廊，骑行漫步"
      "大梅沙海滨公园|3|免费|海滨浴场，戏水玩沙"
      "深圳博物馆|2|免费|了解深圳历史文化"
    )
    ;;
esac

echo "  基于位置(${restaurant_district})推荐景点:"
for attraction in "${attractions[@]}"; do
  IFS='|' read -r name time ticket desc <<< "$attraction"
  if [ "$ticket" == "免费" ]; then
    echo "    • ${name} - ${time}小时 | ${ticket} | ${desc}"
  else
    echo "    • ${name} - ${time}小时 | 门票¥${ticket} | ${desc}"
  fi
done

echo ""

# 让用户选择景点（这里默认选前两个）
selected_attraction1=$(echo "${attractions[0]}" | cut -d'|' -f1)
selected_attraction1_time=$(echo "${attractions[0]}" | cut -d'|' -f2)
selected_attraction1_ticket=$(echo "${attractions[0]}" | cut -d'|' -f3)
selected_attraction1_ticket_num=$(echo "$selected_attraction1_ticket" | grep -o '[0-9]\+' || echo "0")

selected_attraction2=$(echo "${attractions[1]}" | cut -d'|' -f1)
selected_attraction2_time=$(echo "${attractions[1]}" | cut -d'|' -f2)
selected_attraction2_ticket=$(echo "${attractions[1]}" | cut -d'|' -f3)
selected_attraction2_ticket_num=$(echo "$selected_attraction2_ticket" | grep -o '[0-9]\+' || echo "0")

# ========================================
# 5. 天气查询
# ========================================
echo -e "${GREEN}【5/6】查询天气状况${NC}"

if command -v python &> /dev/null; then
  weather_file="${WEATHER_SKILL:-$(dirname "$0")/../weather-skill/weather.py}"

  if [ -f "$weather_file" ]; then
    weather_data=$(python "$weather_file" -json "$CITY" 2>/dev/null || echo "")

    if [ -n "$weather_data" ]; then
      echo "$weather_data" | jq -r '.forecast[0] | "  今日: \(.weather) | 温度: \(.temp_low) - \(.temp_high)"'
      echo "$weather_data" | jq -r '.forecast[0].life_indices[] | select(.key=="clothing") | "  \(.description)"'
    else
      echo "  天气查询失败"
    fi
  fi
fi

echo ""

# ========================================
# 6. 生成完整行程
# ========================================
echo -e "${GREEN}【6/6】生成旅行计划${NC}"

# 计算成本
dining_cost=$restaurant_price
ticket_cost=$((selected_attraction1_ticket_num + selected_attraction2_ticket_num))
transport_cost=30
total_cost=$((dining_cost + ticket_cost + transport_cost))

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗"
echo -e "║        ${CITY}一日游完整行程            ║"
echo -e "╚════════════════════════════════════════╝${NC}"
echo ""
echo "📅 行程安排:"
echo ""
echo "  09:30  出发"
echo "         → 目的地: ${restaurant_district}"
echo ""
echo "  10:00  上午活动: ${selected_attraction1}"
echo "         游览时长: ${selected_attraction1_time}小时"
echo "         门票: ${selected_attraction1_ticket}"
echo ""
echo "  12:00  午餐: ${restaurant_name}"
echo "         地址: ${restaurant_address}"
echo "         人均: ¥${restaurant_price} | 评分: ${restaurant_rating}"
echo "         推荐: ${restaurant_cuisine}"
echo ""
echo "  13:30  下午活动: ${selected_attraction2}"
echo "         游览时长: ${selected_attraction2_time}小时"
echo "         门票: ${selected_attraction2_ticket}"
echo ""
echo "  16:00  行程结束，返程"
echo ""
echo "💰 成本预算:"
echo "  ├─ 餐饮: ¥${dining_cost}"
echo "  ├─ 门票: ¥${ticket_cost}"
echo "  ├─ 交通: ¥${transport_cost}"
echo "  └─ 合计: ¥${total_cost}"
echo ""

if [ $total_cost -le $BUDGET ]; then
  surplus=$((BUDGET - total_cost))
  echo -e "  ${GREEN}✓ 预算充足，剩余¥${surplus}${NC}"

  if [ $surplus -ge 100 ]; then
    echo "  💡 建议: 可增加下午茶或购物预算"
  fi
else
  deficit=$((total_cost - BUDGET))
  echo -e "  ${YELLOW}✗ 超出预算¥${deficit}${NC}"
  echo "  💡 建议: 选择免费景点或降低餐饮预算"
fi

echo ""
echo "📝 温馨提示:"
echo "  • 热门餐厅建议提前预订或错峰就餐"
echo "  • 携带身份证件（部分景点需要）"
echo "  • 关注天气变化，做好防护准备"
echo "  • ${restaurant_subway}"
echo ""
echo -e "${GREEN}数据来源:${NC}"
echo "  • 餐饮推荐: 大众点评 (opencli)"
echo "  • 天气预报: weather-skill  "
echo "  • 景点推荐: 本地知识库"
echo ""
echo -e "${BLUE}=========================================="
echo -e "  规划完成！祝旅途愉快！"
echo -e "==========================================${NC}"
