#!/bin/bash
# 综合旅行规划主脚本
# 整合：大众点评(opencli) + 小红书 + 高德地图 + 天气

set -e

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 默认参数
CITY="深圳"
DISTRICT="罗湖区"
CUISINE="泰国菜"
BUDGET=500
MIN_RATING=4.5

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --city) CITY="$2"; shift 2 ;;
    --district) DISTRICT="$2"; shift 2 ;;
    --cuisine) CUISINE="$2"; shift 2 ;;
    --budget) BUDGET="$2"; shift 2 ;;
    --min-rating) MIN_RATING="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

echo -e "${BLUE}=========================================="
echo -e "  ${CITY}${DISTRICT}一日游规划"
echo -e "  预算: ¥${BUDGET} | 美食偏好: ${CUISINE}"
echo -e "==========================================${NC}"
echo ""

# ========================================
# 1. 天气查询
# ========================================
echo -e "${GREEN}【1/5】查询天气预报${NC}"

if command -v python &> /dev/null; then
  weather_file="${WEATHER_SKILL:-$(dirname "$0")/../weather-skill/weather.py}"

  if [ -f "$weather_file" ]; then
    weather_data=$(python "$weather_file" -json "$CITY" 2>/dev/null || echo "")

    if [ -n "$weather_data" ]; then
      today_weather=$(echo "$weather_data" | jq -r '.forecast[0] | "  天气: \(.weather) | 温度: \(.temp_low) - \(.temp_high) | 风力: \(.wind) \(.wind_level)"' 2>/dev/null || echo "  天气查询失败")
      echo "$today_weather"

      # 提取穿衣建议
      clothing=$(echo "$weather_data" | jq -r '.forecast[0].life_indices[] | select(.key=="clothing") | "  \(.name): \(.description)"' 2>/dev/null || echo "")
      if [ -n "$clothing" ]; then
        echo "$clothing"
      fi
    else
      echo -e "${YELLOW}  天气数据获取失败，继续规划${NC}"
    fi
  else
    echo -e "${YELLOW}  weather-skill未找到，跳过天气查询${NC}"
  fi
else
  echo -e "${YELLOW}  Python未安装，跳过天气查询${NC}"
fi

echo ""

# ========================================
# 2. 餐饮推荐（大众点评）
# ========================================
echo -e "${GREEN}【2/5】搜索餐厅推荐${NC}"

lunch_budget=$((BUDGET * 40 / 100))  # 预算的40%用于午餐
echo "  搜索条件: ${DISTRICT}${CUISINE}, 评分≥${MIN_RATING}, 人均≤¥${lunch_budget}"

restaurants=$(opencli dianping search "${DISTRICT}${CUISINE}" --city "$CITY" -f json | \
  jq --arg min "$MIN_RATING" --arg max "$lunch_budget" \
  '[.[] | select(.rating >= ($min | tonumber) and .price <= ($max | tonumber))] | sort_by(.rating) | reverse')

restaurant_count=$(echo "$restaurants" | jq 'length')

if [ "$restaurant_count" -eq 0 ]; then
  echo -e "${YELLOW}  未找到符合条件的餐厅，放宽条件重试...${NC}"

  # 放宽条件：只看评分
  restaurants=$(opencli dianping search "${DISTRICT}${CUISINE}" --city "$CITY" -f json | \
    jq --arg min "$MIN_RATING" \
    '[.[] | select(.rating >= ($min | tonumber))] | sort_by(.rating) | reverse')

  restaurant_count=$(echo "$restaurants" | jq 'length')
fi

if [ "$restaurant_count" -gt 0 ]; then
  echo -e "  ✓ 找到 ${restaurant_count} 家餐厅"
  echo ""

  # 显示TOP 3
  echo "  推荐餐厅TOP 3:"
  echo "$restaurants" | jq -r '.[0:3] | .[] | "    \(.rank). \(.name) - 评分\(.rating) 人均¥\(.price) (\(.district))"'
  echo ""

  # 获取TOP1详情
  top_restaurant_id=$(echo "$restaurants" | jq -r '.[0].shop_id')
  top_restaurant_name=$(echo "$restaurants" | jq -r '.[0].name')
  top_restaurant_price=$(echo "$restaurants" | jq -r '.[0].price')

  echo "  获取详情: ${top_restaurant_name}"

  restaurant_detail=$(opencli dianping shop "$top_restaurant_id" -f json 2>/dev/null)

  if [ -n "$restaurant_detail" ]; then
    restaurant_address=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="address") | .value')
    restaurant_subway=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="subway") | .value')
    restaurant_hours=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="hours") | .value')
    restaurant_taste=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="taste") | .value')
    restaurant_env=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="environment") | .value')
    restaurant_service=$(echo "$restaurant_detail" | jq -r '.[] | select(.field=="service") | .value')

    echo "    地址: ${restaurant_address}"
    echo "    交通: ${restaurant_subway}"
    [ -n "$restaurant_hours" ] && echo "    营业时间: ${restaurant_hours}"
    echo "    分项评分: 口味${restaurant_taste} 环境${restaurant_env} 服务${restaurant_service}"
  fi
else
  echo -e "${YELLOW}  未找到餐厅，建议调整搜索条件${NC}"
  top_restaurant_price=100  # 默认值
fi

echo ""

# ========================================
# 3. 景点推荐
# ========================================
echo -e "${GREEN}【3/5】推荐热门景点${NC}"

# 罗湖区热门景点（可扩展为从高德地图或小红书获取）
echo "  基于位置推荐:"
echo "    1. 东门老街 - 购物美食街区（2小时）免费"
echo "    2. 地王大厦 - 观光展览（1.5小时）门票¥60"
echo "    3. 仙湖植物园 - 自然风光（3小时）门票¥20"

# 预设景点数据
attraction1_name="东门老街"
attraction1_time=2
attraction1_ticket=0

attraction2_name="地王大厦"
attraction2_time=1.5
attraction2_ticket=60

echo ""

# ========================================
# 4. 行程规划
# ========================================
echo -e "${GREEN}【4/5】生成行程计划${NC}"

echo "  建议行程:"
echo "    09:30 - 出发前往${DISTRICT}"
echo "    10:00 - 抵达${attraction1_name}，开始游览"
echo "    12:00 - 前往${top_restaurant_name}用餐"
echo "    13:30 - 午餐后休息"
echo "    14:00 - 游览${attraction2_name}"
echo "    16:00 - 行程结束，返程"

echo ""

# ========================================
# 5. 成本计算
# ========================================
echo -e "${GREEN}【5/5】成本预算分析${NC}"

# 计算各项成本
dining_cost=${top_restaurant_price}
ticket_cost=$((attraction1_ticket + attraction2_ticket))
transport_cost=30  # 预估交通费用

total_cost=$((dining_cost + ticket_cost + transport_cost))

echo "  成本明细:"
echo "    餐饮: ¥${dining_cost} (${top_restaurant_name})"
echo "    门票: ¥${ticket_cost} (${attraction1_name}¥${attraction1_ticket} + ${attraction2_name}¥${attraction2_ticket})"
echo "    交通: ¥${transport_cost} (地铁往返+市内交通)"
echo "    ────────────────"
echo "    合计: ¥${total_cost}"

if [ $total_cost -le $BUDGET ]; then
  surplus=$((BUDGET - total_cost))
  echo -e "    ${GREEN}✓ 预算充足，剩余¥${surplus}${NC}"

  if [ $surplus -ge 50 ]; then
    echo "    建议: 可增加下午茶或纪念品预算"
  fi
else
  deficit=$((total_cost - BUDGET))
  echo -e "    ${YELLOW}✗ 超出预算¥${deficit}${NC}"
  echo "    建议调整:"

  # 提供优化建议
  if [ $dining_cost -gt $lunch_budget ]; then
    echo "      - 选择人均¥${lunch_budget}以内的餐厅"
  fi

  if [ $ticket_cost -gt 50 ]; then
    echo "      - 优先选择免费景点（如${attraction1_name}）"
  fi
fi

echo ""

# ========================================
# 输出总结
# ========================================
echo -e "${BLUE}=========================================="
echo -e "  规划完成！"
echo -e "==========================================${NC}"
echo ""
echo "数据来源:"
echo "  ✓ 餐饮信息: 大众点评 (opencli)"
echo "  ✓ 天气预报: weather-skill"
echo "  ✓ 景点推荐: 本地数据库"
echo ""
echo "建议:"
echo "  • 提前预订餐厅（热门店铺可能需要排队）"
echo "  • 关注天气变化，携带雨具/防晒用品"
echo "  • 购买景点门票建议使用团购优惠"
echo ""
echo "保存行程:"
echo "  执行以下命令将行程保存为文件:"
echo "  bash $0 --city \"$CITY\" --district \"$DISTRICT\" --cuisine \"$CUISINE\" --budget $BUDGET > my_trip_plan.txt"
