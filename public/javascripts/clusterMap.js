maptilersdk.config.apiKey = maptilerApiKey;

// Mirrors of the :root tokens in app.css. MapLibre paint properties are style
// JSON rather than CSS, so var() cannot be used and these have to be literals.
// The map shows where places are, which is the land, so it is inked in brown:
// purple is the sky plate and carries weather, light and season only.
const INK_SOFT = "#5a4032";
const INK = "#3f2a1e";
const INK_DEEP = "#291a12";
const PAPER_HI = "#dccbb5";
const KNOCKOUT = "#e2d2ba";

const map = new maptilersdk.Map({
  container: "map",
  style: maptilersdk.MapStyle.OUTDOOR,
  // Every seeded campground is in India, so opening over Kansas meant the first
  // thing anyone saw was an empty map they had to drag halfway round the world.
  center: [79.5, 22.5],
  zoom: 3.7,
});

// Same parchment treatment as the show page. Without this the listing map is
// full-colour OUTDOOR with only the sepia canvas filter over the top.
themeMap(map);

map.on("load", function () {
  map.addSource("campgrounds", {
    type: "geojson",
    data: campgrounds,
    cluster: true,
    clusterMaxZoom: 14, // Max zoom to cluster points on
    clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "campgrounds",
    filter: ["has", "point_count"],
    paint: {
      // Density of ink, not a change of hue. The Material cyan/blue/indigo that
      // used to be here came from the tutorial and survived the palette
      // migration because it lives in JavaScript, where no CSS token sweep
      // reaches it. Same blind spot as trap 1 in CLAUDE.md.
      //
      // Literal hex because MapLibre paint properties are style JSON, not CSS,
      // so var() does not resolve. These are --ink-soft, --ink, --ink-deep and
      // must be updated by hand if those tokens move.
      "circle-color": [
        "step",
        ["get", "point_count"],
        INK_SOFT,
        10,
        INK,
        30,
        INK_DEEP,
      ],
      "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25],
      "circle-stroke-width": 1,
      "circle-stroke-color": PAPER_HI,
    },
  });

  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "campgrounds",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    // Knockout on the solid ink, the same accent-object treatment the price
    // panel and the CTA use.
    paint: {
      "text-color": KNOCKOUT,
    },
  });

  map.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: "campgrounds",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": INK_DEEP,
      "circle-radius": 4,
      "circle-stroke-width": 1,
      "circle-stroke-color": PAPER_HI,
    },
  });

  // inspect a cluster on click
  map.on("click", "clusters", async (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"],
    });
    const clusterId = features[0].properties.cluster_id;
    const zoom = await map
      .getSource("campgrounds")
      .getClusterExpansionZoom(clusterId);
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom,
    });
  });

  // When a click event occurs on a feature in
  // the unclustered-point layer, open a popup at
  // the location of the feature, with
  // description HTML from its properties.
  map.on("click", "unclustered-point", function (e) {
    const { popUpMarkup } = e.features[0].properties;
    const coordinates = e.features[0].geometry.coordinates.slice();

    // Ensure that if the map is zoomed out such that
    // multiple copies of the feature are visible, the
    // popup appears over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    new maptilersdk.Popup()
      .setLngLat(coordinates)
      .setHTML(popUpMarkup)
      .addTo(map);
  });

  map.on("mouseenter", "clusters", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "clusters", () => {
    map.getCanvas().style.cursor = "";
  });
});
