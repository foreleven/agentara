---
name: daily-pollen
description: >
  花粉过敏指数权威发布与实时监控。当用户询问花粉浓度、过敏风险、花粉预警，
  或设置每日定时推送花粉播报时使用。数据来源：花粉通（中国天气网 × 北京同仁医院）+ wttr.in 天气。
  支持自定义城市，支持设置 cron 定时每日推送。
  触发关键词：花粉、过敏、花粉指数、花粉预警、花粉浓度、今天花粉、每日花粉、
  pollen、allergy、pollen alert、花粉播报、花粉监控、每天推送花粉。
---

# 花粉过敏指数 🌿

每日花粉浓度查询与推送，数据权威来源：中国天气网 × 首都医科大学附属北京同仁医院。

## 城市配置

默认城市可通过环境变量设置：

```bash
export POLLEN_CITY="北京"   # 支持中文或拼音
```

**支持花粉监测的城市：**
北京、淄博、昆明、天津、烟台、广州、西宁、沧州、杭州、鄂尔多斯、包头、聊城、兰州、
长春、西安、郑州、太原、银川、哈尔滨、乌鲁木齐、海口、重庆、武汉、石家庄、泊头、
大连、济南、南充、扬州、乌海、保定等。

## 工作流

### Step 1: 确认城市与日期

1. 读取 `$POLLEN_CITY`，若未设置则默认使用「北京」。
2. 记录当前日期（格式：M月D日）和时间。

### Step 2 & 3: 并发获取天气与花粉数据

运行以下 Python 脚本，**同时**抓取天气和花粉数据，将结果输出为 JSON：

```bash
python3 - << 'PYEOF'
import asyncio, json, os, re, sys
from datetime import datetime

try:
    import aiohttp
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing dependencies...", file=sys.stderr)
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "aiohttp", "beautifulsoup4"], check=True)
    import aiohttp
    from bs4 import BeautifulSoup

CITY_MAP = {
    "北京": "Beijing", "上海": "Shanghai", "广州": "Guangzhou",
    "天津": "Tianjin", "杭州": "Hangzhou", "西安": "Xian",
    "郑州": "Zhengzhou", "成都": "Chengdu", "武汉": "Wuhan",
    "重庆": "Chongqing", "大连": "Dalian", "济南": "Jinan",
    "长春": "Changchun", "哈尔滨": "Harbin", "昆明": "Kunming",
    "兰州": "Lanzhou", "银川": "Yinchuan", "太原": "Taiyuan",
    "石家庄": "Shijiazhuang", "南充": "Nanchong", "扬州": "Yangzhou",
    "海口": "Haikou", "乌鲁木齐": "Urumqi", "西宁": "Xining",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

async def fetch_weather(session: aiohttp.ClientSession, city_en: str) -> dict:
    url = f"https://wttr.in/{city_en}?format=j1"
    async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
        data = await resp.json(content_type=None)
    cur = data["current_condition"][0]
    today = data["weather"][0]
    tomorrow = data["weather"][1] if len(data["weather"]) > 1 else {}
    # Check for rain in today's / tomorrow's hourly forecast
    def has_rain(day):
        if not day:
            return False
        for h in day.get("hourly", []):
            code = int(h.get("weatherCode", 0))
            if code in range(263, 400):   # drizzle / rain codes
                return True
            if h.get("chanceofrain", "0") and int(h.get("chanceofrain", 0)) >= 40:
                return True
        return False
    return {
        "desc": cur["weatherDesc"][0]["value"],
        "temp_c": cur["temp_C"],
        "feels_like_c": cur["FeelsLikeC"],
        "humidity": cur["humidity"],
        "wind_kmph": cur["windspeedKmph"],
        "today_rain": has_rain(today),
        "tomorrow_rain": has_rain(tomorrow),
        "today_max_c": today.get("maxtempC", ""),
        "today_min_c": today.get("mintempC", ""),
    }

async def fetch_pollen(session: aiohttp.ClientSession, city: str) -> dict:
    url = "https://richerculture.cn/hf/"
    async with session.get(url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=20)) as resp:
        html = await resp.text(errors="replace")
    soup = BeautifulSoup(html, "html.parser")

    result: dict = {"city": city, "raw_text": ""}

    # ── 浓度 & 等级 ──────────────────────────────────────────────
    # 尝试多种选择器，适应页面结构变化
    for sel in ["#pollen-value", ".pollen-num", ".num", "[class*='value']", "[class*='num']"]:
        el = soup.select_one(sel)
        if el and re.search(r"\d+", el.get_text()):
            result["concentration"] = int(re.search(r"\d+", el.get_text()).group())
            break

    for sel in ["#pollen-level", ".pollen-level", ".level", "[class*='level']"]:
        el = soup.select_one(sel)
        if el and re.search(r"[1-5级]", el.get_text()):
            m = re.search(r"([1-5])\s*级", el.get_text())
            if m:
                result["level"] = int(m.group(1))
            break

    # ── 致敏植物 ─────────────────────────────────────────────────
    for sel in [".pollen-plant", ".plant", "[class*='plant']", "[class*='source']"]:
        el = soup.select_one(sel)
        if el:
            result["plants"] = el.get_text(strip=True)
            break

    # ── 7日趋势数字（寻找连续数字序列） ──────────────────────────
    numbers = re.findall(r"\b(\d{1,4})\b", html)
    candidate_seq = [int(n) for n in numbers if 0 < int(n) < 5000]
    # 找7个连续的合理浓度值（启发式：差值不超过2000）
    for i in range(len(candidate_seq) - 6):
        seq = candidate_seq[i:i+7]
        if max(seq) - min(seq) < 2000 and max(seq) > 0:
            result["weekly"] = seq
            break

    # ── 保留纯文本供 LLM 兜底解析 ────────────────────────────────
    result["raw_text"] = soup.get_text(separator="\n", strip=True)[:3000]
    return result

async def main():
    city = os.environ.get("POLLEN_CITY", "北京")
    city_en = CITY_MAP.get(city, city)

    async with aiohttp.ClientSession(headers=HEADERS) as session:
        weather, pollen = await asyncio.gather(
            fetch_weather(session, city_en),
            fetch_pollen(session, city),
        )

    print(json.dumps({"weather": weather, "pollen": pollen}, ensure_ascii=False, indent=2))

asyncio.run(main())
PYEOF
```

从 JSON 输出中提取：
- **天气**：`weather.desc`、`weather.temp_c`、`weather.humidity`、`weather.wind_kmph`、`weather.today_rain` / `tomorrow_rain`
- **花粉浓度**：`pollen.concentration`（粒/千平方毫米）
- **花粉等级**：`pollen.level`（1–5）
- **致敏植物**：`pollen.plants`
- **7日趋势**：`pollen.weekly`（数组，若结构化提取失败则从 `pollen.raw_text` 中人工识别）

### Step 4: 解析等级与趋势

**花粉浓度等级划分：**

| 等级 | 浓度（粒/千平方毫米） | 风险描述 | 行动建议 |
|------|---------------------|---------|---------|
| 1级 | ≤70 | 很低，一般无需防护 | 正常户外活动 |
| 2级 | 71-150 | 低，敏感人群注意 | 敏感人群携带药物 |
| 3级 | 151-290 | 中，敏感人群需防护 | 减少户外活动时间 |
| 4级 | 291-520 | 高，减少户外活动 | 尽量避免户外 |
| 5级 | >520 | 很高，避免户外活动 | 强烈建议待室内 |

**7日趋势判断规则：**

| 趋势描述 | 判断标准 |
|---------|---------|
| 持续很高 | 近7日均>500，连续多日高浓度 |
| 持续高位 | 近7日均>300，整体处于中高浓度 |
| 今日更高 | 今日浓度>昨日，且涨幅>20% |
| 有所降低 | 今日浓度<昨日，且降幅>20% |
| 开始升高 | 连续3天浓度上升，进入高峰期 |
| 逐渐缓解 | 连续3天浓度下降，离开高峰期 |
| 波动较大 | 近7天忽高忽低，不稳定 |

**花粉来源季节参考：**

- 春季（3-5月）：柏树、榆树、杨树、柳树、杏树、桃花、樱花（高峰3月中旬-4月中旬）
- 初夏（5-6月）：槐树、梧桐、桑树
- 夏秋（8-10月）：蒿草、豚草、葎草（秋季过敏主因）

### Step 5: 格式化输出

使用 Markdown 列表格式输出，确保在各类终端和 IM 应用中正确渲染。

```markdown
# 花粉播报 🌿 — {M月D日}

> {一句话今日总结，说明风险等级和核心建议，例如：北京今日花粉5级爆表，连续5日超安全值10倍，过敏人群务必全天待室内。}

## 🚨 今日过敏风险

- **等级**：{N}级（{很低/低/中/高/很高}）· 浓度 {数值} 粒/千平方毫米
- **超标**：安全值 70，{超标约N倍 / 在安全范围内}
- **主要来源**：{植物1}、{植物2}、{植物3}
- **7日趋势**：{趋势描述}（{近7日数据简述，如：近5日均800，3月13日520}）
- **日内峰值**：午后 14–17 时浓度最高，早晚相对较低

---

## 🛡️ 今日行动指南

### 必须做

1. {强制建议1}
2. {强制建议2}
3. {强制建议3，视等级增减}

### 建议做

- {推荐建议1}
- {推荐建议2}

### 禁止做

- ❌ {禁忌1}
- ❌ {禁忌2}

---

## 📊 天气参考

- **今日**：{天气描述} · {温度} · 湿度{湿度} · 风速{风速}
- **花粉影响**：{晴天无雨说明扩散条件好；有降雨则说明预计浓度下降}

---

## 📌 温馨提示

{2–3句个性化提示，结合当前等级和趋势给出最实用的一条行动建议，以及今明两日花粉走势预判。
例如：今天全天晴朗，是近期花粉最猛的一天，建议上午尽量不出门。如果必须出门，N95 是底线。
明日天气相似，花粉不会缓解，药不要停。}

📱 更精准数据：微信搜索「花粉健康宝」小程序
```

**等级对应的行动建议内容：**

- **1–2级（很低/低）**
  - 必须做：过敏史者随身携带抗过敏药
  - 建议做：可正常户外运动，注意观察症状变化
  - 禁止做：无特别限制

- **3级（中）**
  - 必须做：① 减少户外活动时间 ② 回家后洗手洗脸
  - 建议做：外出佩戴口罩；服用抗过敏药物
  - 禁止做：❌ 花粉峰值期（14–17时）户外剧烈运动

- **4级（高）**
  - 必须做：① 尽量避免户外活动 ② 外出必须佩戴N95口罩 ③ 回家立即洗脸漱口换衣
  - 建议做：提前服用抗过敏药；关闭门窗开启空气净化器
  - 禁止做：❌ 开窗通风  ❌ 晾晒衣物

- **5级（很高）**
  - 必须做：① 强烈建议全天待室内 ② 关闭门窗开启空气净化器 ③ 外出必须佩戴N95口罩 ④ 外出后立即洗脸漱口换衣
  - 建议做：提前服用抗过敏药持续规范用药；关注「花粉健康宝」精确数据
  - 禁止做：❌ 开窗通风  ❌ 晾晒衣物  ❌ 户外运动

## 关键规则

- **必须使用 Python 脚本**：数据获取必须运行 Step 2 & 3 中的 async Python 脚本，严禁使用 `agent-browser` 或 `WebFetch` 工具直接抓页面。
- **依赖自动安装**：脚本首次运行会自动 `pip install aiohttp beautifulsoup4`，无需手动安装。
- **数据兜底**：若结构化字段（concentration、level、plants、weekly）未能提取，从 `pollen.raw_text` 中人工识别关键数值后再生成报告；若脚本报错，提示用户稍后重试。
- **使用列表，不用表格**：推送内容使用 Markdown 列表格式，确保在各类 IM 应用中正确渲染
- **中文全角标点**：推送内容中使用中文全角标点（，、：！）
- **超标计算**：超标倍数 = (浓度 - 70) / 70，保留整数
- **降雨影响**：若今夜或明早有降雨预报，需在天气提示中注明「预计降雨后花粉浓度将明显下降」
- **数据时效**：花粉数据通常每天更新一次，推送时注明数据发布时间
