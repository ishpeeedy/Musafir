maptilersdk.config.apiKey = maptilerApiKey;

const map = new maptilersdk.Map({
  container: "map",
  style: maptilersdk.MapStyle.OUTDOOR,
  center: campground.geometry.coordinates, // starting position [lng, lat]
  zoom: 10, // starting zoom
});

// OUTDOOR is a fixed remote style, so the parchment treatment is applied layer
// by layer once it has loaded. See md/UI_REDO.md: a custom style built in
// MapTiler Cloud replaces this, but this version needs no account work, no new
// env vars, and survives whatever MapTiler changes upstream.
const PAPER = "#cdb89d";
const PAPER_HI = "#d8c5ac";
const WATER = "#bda291";
const INK_SOFT = "#5a4032";
const INK = "#3f2a1e";
const INK_DEEP = "#291a12";

// Per property, not per layer: a layer that rejects one value should still get
// the rest. The treatment is enhancement, same as the topo card, so a failure
// anywhere in here must never take the map down.
const set = (id, prop, value) => {
  try {
    map.setPaintProperty(id, prop, value);
  } catch (e) {
    /* layer does not carry this property */
  }
};

map.on("load", () => {
  map.getStyle().layers.forEach((layer) => {
    const id = layer.id;
    const wet = /water|ocean|river|lake|sea|marine/i.test(id);

    switch (layer.type) {
      case "background":
        set(id, "background-color", PAPER);
        break;
      case "fill":
        set(id, "fill-color", wet ? WATER : PAPER_HI);
        set(id, "fill-outline-color", INK_SOFT);
        break;
      case "line":
        set(id, "line-color", INK_SOFT);
        break;
      case "symbol":
        // Labels stay, in MapTiler's own glyph set, because IM Fell is not in
        // it and uploading a face depends on the plan. A different type for the
        // map lettering is honest anyway: on a real sheet the engraver and the
        // foundry were never the same shop. The pictograms do go, because those
        // are unambiguously modern.
        set(id, "text-color", INK_DEEP);
        set(id, "text-halo-color", PAPER);
        set(id, "text-halo-width", 1.8);
        set(id, "text-halo-blur", 0);
        set(id, "icon-opacity", 0);
        break;
      case "hillshade":
        set(id, "hillshade-shadow-color", INK);
        set(id, "hillshade-highlight-color", PAPER_HI);
        set(id, "hillshade-accent-color", INK_SOFT);
        break;
      case "raster":
        set(id, "raster-saturation", -0.8);
        break;
    }
  });
});

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
