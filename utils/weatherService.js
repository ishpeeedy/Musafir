const axios = require("axios");

/**
 * Weather Service for WeatherAPI.com integration
 * Fetches weather forecast and historical data for campground locations
 */

const WEATHER_API_KEY = process.env.WEATHER_API;
const BASE_URL = "https://api.weatherapi.com/v1";

/**
 * In-process cache for the explore page only.
 *
 * The show page fetches 8 calls and never caches, because it is one campground
 * and the reader is looking at it now. The explore page renders ten cards, so
 * an uncached current-conditions call per card would make the list page cost
 * more than a detail page.
 *
 * This does not break "weather is never stored". Nothing goes near the
 * database, the process forgets it on restart, and the window is short enough
 * that nothing stale is ever shown as current. The intended end state is a
 * periodic background fetch written to the campground document; see md/PLAN.md.
 */
const CURRENT_TTL_MS = 30 * 60 * 1000;
const currentCache = new Map();

/**
 * Current conditions only, one API call.
 *
 * Coordinates are rounded to 2dp (~1km) for the cache key so that repeat views
 * of the same list share entries. WeatherAPI resolves to the nearest station
 * well beyond that distance, so the rounding costs no accuracy.
 *
 * @returns {Promise<{temp_c: number, condition: string, icon: string}|null>}
 *   null on any failure. Weather is enhancement; a card renders without it.
 */
async function getCurrentWeather(lat, lon) {
  if (!WEATHER_API_KEY) return null;

  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = currentCache.get(key);
  if (hit && Date.now() - hit.at < CURRENT_TTL_MS) return hit.value;

  try {
    const { data } = await axios.get(`${BASE_URL}/current.json`, {
      params: { key: WEATHER_API_KEY, q: key, aqi: "no" },
    });
    const value = {
      temp_c: Math.round(data.current.temp_c),
      condition: data.current.condition.text,
      isDay: data.current.is_day === 1,
    };
    currentCache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error("Current weather fetch failed:", e.message);
    return null;
  }
}

/**
 * Current conditions for many campgrounds at once, in parallel, each cached.
 * Never rejects: a campground whose fetch failed simply has no weather.
 */
async function getCurrentWeatherFor(campgrounds) {
  const out = new Map();
  await Promise.all(
    campgrounds.map(async (c) => {
      const [lon, lat] = c.geometry.coordinates;
      const wx = await getCurrentWeather(lat, lon);
      if (wx) out.set(String(c._id), wx);
    }),
  );
  return out;
}

/**
 * Get weather data for a location (3-day forecast + 7-day history)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Weather data object with forecast and history
 */
async function getWeatherData(lat, lon) {
  try {
    if (!WEATHER_API_KEY) {
      console.error("WEATHER_API key is not set in environment variables");
      return null;
    }

    const location = `${lat},${lon}`;

    // Calculate date for 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const historyStartDate = sevenDaysAgo.toISOString().split("T")[0];

    // Fetch forecast (includes current + 3 days)
    const forecastPromise = axios.get(`${BASE_URL}/forecast.json`, {
      params: {
        key: WEATHER_API_KEY,
        q: location,
        days: 3,
        aqi: "no",
        alerts: "yes",
      },
    });

    // Fetch historical data (7 days)
    const historyPromises = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i + 1));
      const dateStr = date.toISOString().split("T")[0];

      historyPromises.push(
        axios.get(`${BASE_URL}/history.json`, {
          params: {
            key: WEATHER_API_KEY,
            q: location,
            dt: dateStr,
          },
        })
      );
    }

    // Wait for all API calls to complete
    const [forecastResponse, ...historyResponses] = await Promise.all([
      forecastPromise,
      ...historyPromises,
    ]);

    // Process forecast data
    const forecastData = forecastResponse.data;
    const current = {
      temp_c: forecastData.current.temp_c,
      temp_f: forecastData.current.temp_f,
      condition: forecastData.current.condition.text,
      icon: forecastData.current.condition.icon.startsWith("//")
        ? "https:" + forecastData.current.condition.icon
        : forecastData.current.condition.icon,
      feelslike_c: forecastData.current.feelslike_c,
      feelslike_f: forecastData.current.feelslike_f,
      humidity: forecastData.current.humidity,
      wind_kph: forecastData.current.wind_kph,
      wind_mph: forecastData.current.wind_mph,
      precip_mm: forecastData.current.precip_mm,
      precip_in: forecastData.current.precip_in,
      uv: forecastData.current.uv,
      last_updated: forecastData.current.last_updated,
    };

    const forecast = forecastData.forecast.forecastday.map((day) => ({
      date: day.date,
      // Local-time sun and moon data, already included in this response. Saves a
      // separate sunrise/sunset API call and avoids the timezone conversion that
      // an external UTC-based service would need. See utils/sunService.js.
      astro: day.astro
        ? { sunrise: day.astro.sunrise, sunset: day.astro.sunset }
        : null,
      maxtemp_c: day.day.maxtemp_c,
      maxtemp_f: day.day.maxtemp_f,
      mintemp_c: day.day.mintemp_c,
      mintemp_f: day.day.mintemp_f,
      avgtemp_c: day.day.avgtemp_c,
      avgtemp_f: day.day.avgtemp_f,
      condition: day.day.condition.text,
      icon: day.day.condition.icon.startsWith("//")
        ? "https:" + day.day.condition.icon
        : day.day.condition.icon,
      daily_chance_of_rain: day.day.daily_chance_of_rain,
      daily_chance_of_snow: day.day.daily_chance_of_snow,
      maxwind_kph: day.day.maxwind_kph,
      maxwind_mph: day.day.maxwind_mph,
      totalprecip_mm: day.day.totalprecip_mm,
      totalprecip_in: day.day.totalprecip_in,
      avghumidity: day.day.avghumidity,
      uv: day.day.uv,
    }));

    // Process historical data
    const history = historyResponses
      .map((response) => {
        const day = response.data.forecast.forecastday[0];
        return {
          date: day.date,
          maxtemp_c: day.day.maxtemp_c,
          maxtemp_f: day.day.maxtemp_f,
          mintemp_c: day.day.mintemp_c,
          mintemp_f: day.day.mintemp_f,
          avgtemp_c: day.day.avgtemp_c,
          avgtemp_f: day.day.avgtemp_f,
          condition: day.day.condition.text,
          icon: day.day.condition.icon.startsWith("//")
            ? "https:" + day.day.condition.icon
            : day.day.condition.icon,
          totalprecip_mm: day.day.totalprecip_mm,
          totalprecip_in: day.day.totalprecip_in,
          avghumidity: day.day.avghumidity,
        };
      })
      .reverse(); // Reverse to show oldest first

    // Calculate historical averages
    const historicalAverage = {
      avgtemp_c: (
        history.reduce((sum, day) => sum + day.avgtemp_c, 0) / history.length
      ).toFixed(1),
      avgtemp_f: (
        history.reduce((sum, day) => sum + day.avgtemp_f, 0) / history.length
      ).toFixed(1),
      total_precip_mm: history
        .reduce((sum, day) => sum + day.totalprecip_mm, 0)
        .toFixed(1),
      total_precip_in: history
        .reduce((sum, day) => sum + day.totalprecip_in, 0)
        .toFixed(2),
      avg_humidity: (
        history.reduce((sum, day) => sum + day.avghumidity, 0) / history.length
      ).toFixed(0),
    };

    return {
      location: {
        name: forecastData.location.name,
        region: forecastData.location.region,
        country: forecastData.location.country,
        lat: forecastData.location.lat,
        lon: forecastData.location.lon,
        tz_id: forecastData.location.tz_id,
        localtime: forecastData.location.localtime,
      },
      current,
      forecast,
      history,
      historicalAverage,
      alerts: forecastData.alerts?.alert || [],
    };
  } catch (error) {
    console.error("Weather API Error:", error.response?.data || error.message);

    // Return null on error so the page can still render
    return null;
  }
}

/**
 * Format date for display
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { month: "short", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Get day of week from date string
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @returns {string} Day of week
 */
function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

module.exports = {
  getWeatherData,
  getCurrentWeather,
  getCurrentWeatherFor,
  formatDate,
  getDayOfWeek,
};
