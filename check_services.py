#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
服务检查与启动脚本
确保小红书桥接服务和 opencli 等依赖正常运行
"""

import subprocess
import sys
import time
import os
import socket
import io
import requests

from skill_paths import find_xiaohongshu_bridge

# 修复 Windows 控制台编码
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def check_python():
    """检查 Python 版本"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("❌ Python 版本需要 3.7+")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_node():
    """检查 Node.js"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ Node.js {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print("❌ Node.js 未安装")
    return False

def check_opencli():
    """检查 opencli"""
    try:
        result = subprocess.run(['opencli', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ opencli {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print("❌ opencli 未安装，运行: npx skills add jackwener/opencli")
    return False

def check_flyai():
    """检查 FlyAI CLI"""
    try:
        result = subprocess.run(['flyai', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✓ flyai-cli {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print("⚠️  flyai-cli 未安装（可选），运行: npm i -g @fly-ai/flyai-cli")
    return False

def check_xiaohongshu_bridge():
    """检查小红书桥接（WebSocket :9333，不是 HTTP /health）"""
    try:
        sock = socket.create_connection(('127.0.0.1', 9333), timeout=2)
        sock.close()
        print("✓ 小红书桥接服务运行中 (ws://localhost:9333)")
        return True
    except OSError:
        pass

    print("⚠️  小红书桥接服务未运行（端口 9333）")
    return False

def start_xiaohongshu_bridge():
    """启动小红书桥接服务"""
    found = find_xiaohongshu_bridge()
    if not found:
        print("❌ 找不到桥接服务。请安装 xiaohongshu-skills，或设置 XHS_BRIDGE / XIAOHONGSHU_SKILLS_DIR")
        return False
    bridge_path = str(found)

    print("正在启动小红书桥接服务...")

    try:
        # Windows 后台启动
        if sys.platform == 'win32':
            subprocess.Popen(
                [sys.executable, bridge_path],
                creationflags=subprocess.CREATE_NO_WINDOW,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            subprocess.Popen(
                [sys.executable, bridge_path],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )

        # 等待服务启动
        for i in range(10):
            time.sleep(1)
            if check_xiaohongshu_bridge():
                return True

        print("❌ 桥接服务启动超时")
        return False

    except Exception as e:
        print(f"❌ 启动失败: {e}")
        return False

def check_xhs_extension():
    """检查小红书浏览器扩展"""
    print("\n⚠️  小红书：扩展装在实际打开 xiaohongshu.com 的那只浏览器")
    print("   （原 skill 默认 Chrome；用户指定则用 Edge）")
    print("   1. 先 python <xiaohongshu-skills>/scripts/bridge_server.py")
    print("      等到日志：Bridge server 已启动 / Extension 已连接")
    print("   2. 再 python <xiaohongshu-skills>/scripts/cli.py check-login")
    print("   3. 只带子命令调用 cli.py；search-feeds 不要传 --limit")
    return True

def main():
    """主检查流程"""
    print("=" * 60)
    print("  旅行规划 Skill - 服务检查")
    print("=" * 60)
    print()

    checks = {
        "Python": check_python(),
        "Node.js": check_node(),
        "opencli": check_opencli(),
        "FlyAI CLI": check_flyai(),
    }

    print()
    print("-" * 60)
    print("  小红书服务检查")
    print("-" * 60)
    print()

    # 检查小红书桥接
    if not check_xiaohongshu_bridge():
        print("\n正在自动启动小红书桥接服务...")
        if start_xiaohongshu_bridge():
            checks["小红书桥接"] = True
        else:
            checks["小红书桥接"] = False
            print("\n💡 手动启动：")
            print("   python <xiaohongshu-skills>/scripts/bridge_server.py")
            print("   （或设置环境变量 XHS_BRIDGE / XIAOHONGSHU_SKILLS_DIR）")
    else:
        checks["小红书桥接"] = True

    check_xhs_extension()

    print()
    print("=" * 60)
    print("  检查结果")
    print("=" * 60)
    print()

    for name, status in checks.items():
        symbol = "✓" if status else "✗"
        print(f"  {symbol} {name}")

    print()

    # 必需依赖检查
    required = ["Python", "Node.js", "opencli"]
    missing_required = [name for name in required if not checks.get(name, False)]

    if missing_required:
        print("❌ 缺少必需依赖:")
        for name in missing_required:
            print(f"   - {name}")
        print()
        return False

    print("✓ 所有必需服务已就绪！")
    print()

    # 可选依赖提示
    if not checks.get("FlyAI CLI", False):
        print("💡 安装 FlyAI 获取景点图片: npm i -g @fly-ai/flyai-cli")

    if not checks.get("小红书桥接", False):
        print("💡 启动小红书桥接服务以获取用户评价")

    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
