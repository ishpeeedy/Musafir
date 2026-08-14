/**
 * Parchment treatment for a MapTiler map.
 *
 * Both maps on the site load OUTDOOR, which is a fixed remote style, so the
 * recolour happens layer by layer once it is available. Shared because the
 * listing map and the show map have to match; it used to live inside
 * showPageMap.js, which is why the listing map was full colour with only a
 * sepia filter smeared over it.
 *
 * A custom style built in MapTiler Cloud would replace this. This version
 * needs no account work and survives whatever MapTiler changes upstream.
 */
window.themeMap = function themeMap(map) {
  const PAPER = "#d2bea5";
  const PAPER_HI = "#dccbb5";
  const WATER = "#c2ad92";
  const INK_SOFT = "#5a4032";
  const INK = "#3f2a1e";
  const INK_DEEP = "#291a12";

  // Per property, not per layer: a layer that rejects one value should still
  // get the rest. The treatment is enhancement, so a failure anywhere in here
  // must never take the map down.
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
          // Labels stay, in MapTiler's own glyph set: IM Fell is not in it and
          // uploading a face depends on the plan. A different type for map
          // lettering is honest anyway, since the engraver and the foundry
          // were never the same shop. The pictograms go, being unambiguously
          // modern.
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
};
