# Weather Data Reference

When `weather` is available in your view, here's what you can access:

## Current Weather (`weather.current`)

```javascript
weather.current.temp_c; // Current temperature in Celsius (e.g., 11)
weather.current.temp_f; // Current temperature in Fahrenheit
weather.current.feelslike_c; // Feels like temperature in Celsius (e.g., 9)
weather.current.feelslike_f; // Feels like temperature in Fahrenheit
weather.current.condition; // Condition text (e.g., "Clear", "Sunny", "Mist")
weather.current.icon; // Icon URL (e.g., "https://cdn.weatherapi.com/weather/64x64/day/113.png")
weather.current.humidity; // Humidity percentage (e.g., 76)
weather.current.wind_kph; // Wind speed in km/h (e.g., 17.3)
weather.current.wind_mph; // Wind speed in mph
weather.current.precip_mm; // Precipitation in mm (e.g., 0)
weather.current.precip_in; // Precipitation in inches
weather.current.uv; // UV index
weather.current.last_updated; // Last update timestamp
```

## 3-Day Forecast (`weather.forecast`)

This is an **array** of 3 days. Loop through it:

```ejs
<% weather.forecast.forEach((day, index) => { %>
  <%= day.date %>                    // Date (e.g., "2025-11-13")
  <%= day.maxtemp_c %>               // Max temp in Celsius (e.g., 28)
  <%= day.maxtemp_f %>               // Max temp in Fahrenheit
  <%= day.mintemp_c %>               // Min temp in Celsius (e.g., 9)
  <%= day.mintemp_f %>               // Min temp in Fahrenheit
  <%= day.avgtemp_c %>               // Average temp in Celsius
  <%= day.avgtemp_f %>               // Average temp in Fahrenheit
  <%= day.condition %>               // Condition text (e.g., "Sunny", "Mist")
  <%= day.icon %>                    // Icon URL
  <%= day.daily_chance_of_rain %>    // Chance of rain % (e.g., 0)
  <%= day.daily_chance_of_snow %>    // Chance of snow %
  <%= day.maxwind_kph %>             // Max wind speed
  <%= day.totalprecip_mm %>          // Total precipitation
  <%= day.avghumidity %>             // Average humidity
  <%= day.uv %>                      // UV index
<% }); %>
```

## 7-Day History (`weather.history`)

This is an **array** of 7 past days. Loop through it:

```ejs
<% weather.history.forEach(day => { %>
  <%= day.date %>                    // Date (e.g., "2025-11-06")
  <%= day.maxtemp_c %>               // Max temp in Celsius
  <%= day.mintemp_c %>               // Min temp in Celsius
  <%= day.avgtemp_c %>               // Average temp in Celsius
  <%= day.condition %>               // Condition text
  <%= day.icon %>                    // Icon URL
  <%= day.totalprecip_mm %>          // Total precipitation
  <%= day.avghumidity %>             // Average humidity
<% }); %>
```

## Historical Averages (`weather.historicalAverage`)

```javascript
weather.historicalAverage.avgtemp_c; // Average temp over 7 days (e.g., "12.5")
weather.historicalAverage.avgtemp_f; // Average temp in Fahrenheit
weather.historicalAverage.total_precip_mm; // Total precipitation over 7 days (e.g., "5.2")
weather.historicalAverage.total_precip_in; // Total precipitation in inches
weather.historicalAverage.avg_humidity; // Average humidity (e.g., "65")
```

## Location Info (`weather.location`)

```javascript
weather.location.name; // Location name (e.g., "Grand Prairie")
weather.location.region; // Region/State (e.g., "Texas")
weather.location.country; // Country
weather.location.lat; // Latitude
weather.location.lon; // Longitude
weather.location.tz_id; // Timezone ID
weather.location.localtime; // Local time at location
```

## Weather Alerts (`weather.alerts`)

This is an **array** that might be empty:

```ejs
<% if (weather.alerts && weather.alerts.length > 0) { %>
  <% weather.alerts.forEach(alert => { %>
    <%= alert.headline %>          // Alert headline
    <%= alert.event %>             // Event type
    <%= alert.desc %>              // Description
  <% }); %>
<% } %>
```

## Useful JavaScript Helpers

### Format dates:

```ejs
<!-- Get day of week -->
<%= new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) %>
<!-- Output: "Wed" -->

<!-- Get month and day -->
<%= new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) %>
<!-- Output: "Nov 13" -->

<!-- Check if today -->
<%= index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) %>
```

### Round numbers:

```ejs
<%= Math.round(day.maxtemp_c) %>°  <!-- Rounds 28.5 to 29 -->
```

### Show rain/snow chance:

```ejs
<% if (day.daily_chance_of_rain > 0) { %>
  Rain: <%= day.daily_chance_of_rain %>%
<% } else if (day.daily_chance_of_snow > 0) { %>
  Snow: <%= day.daily_chance_of_snow %>%
<% } %>
```

## Example: Simple Current Weather

```ejs
<% if (weather) { %>
  <div class="weather-card">
    <h3>Weather at <%= campground.location %></h3>
    <img src="<%= weather.current.icon %>" alt="<%= weather.current.condition %>">
    <p><%= Math.round(weather.current.temp_c) %>°C</p>
    <p><%= weather.current.condition %></p>
  </div>
<% } %>
```

## Example: Simple 3-Day Forecast

```ejs
<% if (weather) { %>
  <h4>3-Day Forecast</h4>
  <% weather.forecast.forEach((day, index) => { %>
    <div class="forecast-day">
      <p><%= index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) %></p>
      <img src="<%= day.icon %>" alt="<%= day.condition %>">
      <p><%= Math.round(day.maxtemp_c) %>° / <%= Math.round(day.mintemp_c) %>°</p>
    </div>
  <% }); %>
<% } %>
```

Now you can build your own weather UI with your own styling! 🎨
