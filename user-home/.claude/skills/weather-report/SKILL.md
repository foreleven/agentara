---
name: weather-report
description: >
  Provide real-time weather forecasts for any city worldwide. Use this skill whenever the user asks about weather,
  temperature, or climate conditions — including phrases like "weather in [city]", "what's the weather like",
  "weather forecast", "is it going to rain", "how hot is it", or any mention of checking current or upcoming
  weather conditions for a location. Also trigger when users ask about what to wear today, whether to bring
  an umbrella, or any question where weather data would help.
---

# Weather Report

Get current weather and short-term forecasts for any city worldwide. Supports city names in various languages. Always respond in user's language.

## Workflow

### 1. Determine the city

- If the user specifies a city (e.g., "weather in Tokyo", "Shanghai weather"), extract it directly.
- If no city is mentioned, ask the user which city they want to check.
- If the user previously mentioned a city in the conversation, use that as context.

### 2. Search for weather data

Use `WebSearch` with query: `"weather forecast {city} today {date}"`

For China cities, use `weather.com.cn` as the source. For the rest of the world, use `weather.com` as the source.

Include today's date in the query for freshness.

### 3. Present the report

Use this structure:

```
## {Emoji} {City} Weather — {date}

- **Condition**: {condition}
- **Temperature**: {current}°C (High {high}°C / Low {low}°C)
- **Feels Like**: {feels_like}°C
- **Humidity**: {humidity}%
- **Wind**: {wind_direction} {wind_speed}

### 📅 3-Day Forecast

| Date | Condition | High | Low |
|------|-----------|------|-----|
| {d1} | {w1}     | {h1} | {l1}|
| {d2} | {w2}     | {h2} | {l2}|
| {d3} | {w3}     | {h3} | {l3}|

{brief_tip}
```

Use emoji in the weather column.

### 4. Tips

Add a short practical tip with emoji at the end based on conditions:

- Rain → 🌧️ "Bring an umbrella"
- Cold → 🧥 "Bundle up"
- Hot → ☀️ "Stay hydrated"
- Pleasant → 🌤️ "Great day to be outdoors"

### 5. Sources

Always include 1-2 source links at the end so the user can check details.

## Notes

- If search results lack some fields (feels-like, humidity, etc.), omit those rows rather than guessing.
- Prefer authoritative sources: weather.com.cn, AccuWeather, Weather.com, NWS.
- Use °C by default. If the user is clearly US-based or requests it, use °F.
