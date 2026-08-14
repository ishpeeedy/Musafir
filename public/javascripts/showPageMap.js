maptilersdk.config.apiKey = maptilerApiKey;

const map = new maptilersdk.Map({
  container: "map",
  style: maptilersdk.MapStyle.OUTDOOR,
  center: campground.geometry.coordinates, // starting position [lng, lat]
  zoom: 10, // starting zoom
});

// Shared with the listing map so the two match. See mapTheme.js.
themeMap(map);

// A trig point rather than a balloon pin: the survey mark for a station whose
// position is known. No popup, because the only thing it could say is the title
// of the page it is on.
const mark = document.createElement("div");
mark.innerHTML =
  '<svg class="trig-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
  'stroke-width="1.6" stroke-linejoin="round">' +
  '<path d="M12 4 20 19H4Z"/>' +
  '<circle cx="12" cy="14.6" r="1.6" fill="currentColor" stroke="none"/></svg>';

new maptilersdk.Marker({ element: mark })
  .setLngLat(campground.geometry.coordinates)
  .addTo(map);
