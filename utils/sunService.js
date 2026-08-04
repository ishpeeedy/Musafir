/**
 * Sun Service
 *
 * Builds the daylight readout from astro data that WeatherAPI already returns
 * alongside the forecast. No extra network call, and the times arrive in the
 * campground's local timezone rather than UTC.
 *
 * Never persisted: it changes daily, so it is derived per request and is null
 * whenever the weather fetch failed.
 */

/**
 * Parse WeatherAPI's 12-hour clock strings ("05:24 AM") into minutes past
 * midnight. Returns null for the sentinel values it emits inside polar circles
 * ("No sunrise", "Down all day"), where the sun may not rise or set at all.
 */
const parseClock = (value) => {
  const match =
    typeof value === "string" && value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;

  return hours * 60 + parseInt(match[2], 10);
};

/**
 * @param {object|null} weather Result of getWeatherData()
 * @returns {{sunrise: string, sunset: string, daylight: string}|null}
 */
const buildSunData = (weather) => {
  const astro = weather?.forecast?.[0]?.astro;
  if (!astro) return null;

  const rise = parseClock(astro.sunrise);
  const set = parseClock(astro.sunset);
  if (rise === null || set === null || set <= rise) return null;

  const minutes = set - rise;

  return {
    sunrise: astro.sunrise,
    sunset: astro.sunset,
    daylight: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
  };
};

module.exports = { buildSunData, parseClock };
