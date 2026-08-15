const Campground = require("../models/campground");

const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
const { cloudinary } = require("../cloudinary");
const { getWeatherData, getCurrentWeatherFor } = require("../utils/weatherService");
const { buildSunData } = require("../utils/sunService");
const getElevationGrid = require("../utils/elevationService");
const analyseTerrain = require("../utils/terrainAnalysis");
const getClimateNormals = require("../utils/climateService");
const analyseSeasonality = require("../utils/seasonality");
// Single source of truth for the checkbox grids, shared with Joi validation
const { AMENITIES, TAGS } = require("../schemas");
const {
  parseConstraints,
  filterCampgrounds,
  suggestRelaxations,
  describeConstraints,
  ASPECT_GROUPS,
  RUGGEDNESS,
  SLOPE,
  POSITIONS,
  MONTHS,
} = require("../utils/discovery");

const ELEVATION_RADIUS_KM = 5;
const ELEVATION_GRID_SIZE = 10;
// Safe diagnostic: log whether an API key is present (length only) so we don't print secrets
if (!process.env.MAPTILER_API_KEY) {
  console.warn("MAPTILER_API_KEY is not set in process.env");
} else {
  try {
    console.log(
      "MAPTILER_API_KEY length:",
      process.env.MAPTILER_API_KEY.length,
    );
  } catch (e) {
    /* ignore */
  }
}

const PAGE_SIZE = 10;

const SORTERS = {
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  // ObjectId hex sorts in creation order, since the timestamp leads the bytes.
  newest: (a, b) => String(b._id).localeCompare(String(a._id)),
  oldest: (a, b) => String(a._id).localeCompare(String(b._id)),
};

/**
 * Condition text to weather art. Same mapping and same GIFs the show page uses,
 * matted into the paper by --gif-mat. Duplicated from the inline helper at the
 * top of show.ejs; worth extracting to a shared util if a third caller appears.
 */
const wxIcon = (condition) => {
  const c = (condition || "").toLowerCase();
  if (c.includes("sun") || c.includes("clear")) return "/images/weather/sunny.gif";
  if (c.includes("partly cloudy") || c.includes("partial")) return "/images/weather/partly-cloudy.gif";
  if (c.includes("cloudy") || c.includes("overcast")) return "/images/weather/cloudy.gif";
  if (c.includes("thunder") || c.includes("storm")) return "/images/weather/thunderstorm.gif";
  if (c.includes("heavy rain") || c.includes("torrential")) return "/images/weather/heavy-rain.gif";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return "/images/weather/rain.gif";
  if (c.includes("snow") || c.includes("blizzard")) return "/images/weather/snow.gif";
  if (c.includes("sleet") || c.includes("ice")) return "/images/weather/sleet.gif";
  if (c.includes("fog") || c.includes("mist") || c.includes("haze")) return "/images/weather/foggy.gif";
  if (c.includes("wind")) return "/images/weather/windy.gif";
  return "/images/weather/cloudy.gif";
};

/**
 * Fall-line elevations for the card sparkline, or null where no grid is cached.
 * Reads only what is already on the document; it must never trigger a fetch.
 */
const profileRow = (campground) => {
  const grid = campground.elevationGrid?.data;
  if (!grid || !grid.length) return null;
  return analyseTerrain.sampleFallLine(
    grid,
    campground.terrain?.aspectBearing ?? null,
    { gridSize: campground.elevationGrid.gridSize || 10 },
  );
};

const matchesText = (campground, search) => {
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
  if (!escaped.length || escaped.length > 60) return true;
  const re = new RegExp(escaped, "i");
  return (
    re.test(campground.title) ||
    re.test(campground.location) ||
    re.test(campground.description)
  );
};

module.exports.index = async (req, res) => {
  const { search, minPrice, maxPrice, sort } = req.query;

  // Rebuild the query string minus some keys, so pagination carries every
  // active constraint and a relaxation link drops exactly one. Repeated fields
  // (the amenity and tag checkboxes) survive as repeats.
  const queryWithout = (...drop) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (drop.includes(key)) continue;
      for (const one of [].concat(value)) params.append(key, one);
    }
    return params.toString();
  };

  // One fetch, then everything in memory. Terrain constraints could be Mongo
  // queries but season constraints cannot, because seasonality is derived per
  // request rather than stored. Filtering in two places would make the result
  // count disagree with itself. This route already loaded the whole collection
  // for the cluster map, so it is one query fewer than before. See
  // utils/discovery.js for where the seam goes when the collection grows.
  const all = await Campground.find({});

  const constraints = parseConstraints(req.query);
  const { matched, skipped } = filterCampgrounds(all, constraints);

  let results = matched;
  if (search) results = results.filter((c) => matchesText(c, search));
  if (minPrice) results = results.filter((c) => c.price >= parseFloat(minPrice));
  if (maxPrice) results = results.filter((c) => c.price <= parseFloat(maxPrice));

  results = results.slice().sort(SORTERS[sort] || SORTERS.newest);

  const totalDocs = results.length;
  const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));
  // Clamped, because tightening a filter while on page 4 would otherwise land
  // on an empty page that reads as "no results".
  const page = Math.min(Math.max(1, parseInt(req.query.page) || 1), totalPages);
  const docs = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Ratings for the visible page only: one extra query pulling nothing but the
  // rating field. The review array of ids is already on the document, so the
  // count costs nothing and only the mean needs this.
  await Campground.populate(docs, { path: "reviews", select: "rating" });

  // Per-card extras, for the visible page only. Seasonality is arithmetic over
  // data already on the document, so it is free. Weather is one API call per
  // card, which is why it is scoped to the ten being rendered rather than to
  // every match.
  const thisMonth = new Date().getMonth();
  const cards = new Map(
    docs.map((c) => {
      const season = c.climate
        ? analyseSeasonality(c.climate, { elevation: c.elevation })
        : null;
      const ratings = (c.reviews || []).map((r) => r.rating).filter((n) => typeof n === "number");
      return [
        String(c._id),
        {
          season,
          // The headline finding: is it good now, and if not, when.
          verdict: analyseSeasonality.verdictFor(season, thisMonth),
          // One row of the cached grid, for the profile sparkline. Never
          // fetches: a campground with no cached grid simply has no line. See
          // the lazy fetch rule in CLAUDE.md.
          profile: profileRow(c),
          reviews: ratings.length
            ? {
                count: ratings.length,
                mean: Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10,
              }
            : null,
        },
      ];
    }),
  );

  const fetched = await getCurrentWeatherFor(docs);
  const weather = new Map(
    [...fetched].map(([id, wx]) => [id, { ...wx, icon: wxIcon(wx.condition) }]),
  );

  res.render("campgrounds/index", {
    campgrounds: docs,
    // Keyed by id rather than merged onto the documents, because these are
    // Mongoose documents and attaching fields to them is asking for the
    // subdocument trap in CLAUDE.md.
    cards,
    weather,
    pagination: {
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      totalDocs,
      base: queryWithout("page"),
    },
    filters: { search, minPrice, maxPrice, sort },
    discovery: {
      constraints,
      summary: describeConstraints(constraints),
      // Campgrounds with no cached survey data cannot be judged, which is not
      // the same as failing. Reported rather than silently dropped.
      skipped,
      surveyed: all.length - skipped,
      total: all.length,
      relaxations:
        totalDocs === 0
          ? suggestRelaxations(all, constraints).map((r) => ({
              ...r,
              href: `/campgrounds?${queryWithout("page", r.key)}`,
            }))
          : [],
      // Option lists for the sidebar, from the same tables discovery matches
      // against, so a control can never offer a value that cannot match.
      options: {
        aspects: Object.keys(ASPECT_GROUPS),
        ruggedness: RUGGEDNESS,
        slope: SLOPE,
        positions: POSITIONS,
        months: MONTHS,
        amenities: AMENITIES,
        tags: TAGS,
      },
    },
    // The map shows what matched. With constraints active a map of all 45 would
    // contradict the list beside it.
    clusterMapData: {
      type: "FeatureCollection",
      features: results.map((campground) => ({
        type: "Feature",
        geometry: campground.geometry,
        properties: {
          id: campground._id,
          title: campground.title,
          description: campground.description,
          location: campground.location,
          popUpMarkup: `<strong><a href="/campgrounds/${campground._id}">${
            campground.title
          }</a></strong><p>${campground.description.substring(0, 20)}...</p>`,
        },
      })),
    },
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render("campgrounds/new", { AMENITIES, TAGS });
};

module.exports.createCampground = async (req, res, next) => {
  let geoData;
  try {
    geoData = await maptilerClient.geocoding.forward(
      req.body.campground.location,
      { limit: 1 },
    );
  } catch (err) {
    console.error(
      "MapTiler geocoding error (create):",
      err && err.message ? err.message : err,
    );
    req.flash(
      "error",
      "Location lookup failed (MapTiler). Try again or check your API key/network.",
    );
    return res.redirect("back");
  }

  // Validate that we got valid geocoding results
  if (
    !geoData ||
    !geoData.features ||
    !geoData.features.length ||
    !geoData.features[0].geometry
  ) {
    req.flash(
      "error",
      "Could not find that location. Please try a different location name.",
    );
    return res.redirect("back");
  }

  const campground = new Campground(req.body.campground);
  campground.geometry = geoData.features[0].geometry;
  campground.images = req.files.map((f) => ({
    url: f.path,
    filename: f.filename,
  }));
  campground.author = req.user._id;
  await campground.save();
  console.log(campground);
  req.flash("success", "Successfully made a new campground!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.showCampground = async (req, res) => {
  const campground = await Campground.findById(req.params.id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("author");
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }

  const hasCoords =
    campground.geometry &&
    Array.isArray(campground.geometry.coordinates) &&
    campground.geometry.coordinates.length === 2;

  // Fetch weather data using campground coordinates
  let weatherData = null;
  if (hasCoords) {
    const [lon, lat] = campground.geometry.coordinates;
    try {
      weatherData = await getWeatherData(lat, lon);
    } catch (error) {
      console.error("Failed to fetch weather data:", error.message);
      // Continue without weather data - page will still render
    }
  }

  // Daylight is derived from the weather response, so it costs no extra request.
  // Never stored: it changes every day.
  const sunData = buildSunData(weatherData);

  // Elevation grid: fetched lazily on first view of this page, then cached on the
  // document forever. OpenTopoData allows 1000 calls/day, so this must never move
  // to campground creation or to any list view. See PLAN.md.
  if (hasCoords && !campground.elevationGrid?.data?.length) {
    const [lon, lat] = campground.geometry.coordinates;
    try {
      const grid = await getElevationGrid(
        lat,
        lon,
        ELEVATION_RADIUS_KM,
        ELEVATION_GRID_SIZE,
      );

      campground.elevationGrid = {
        data: grid,
        gridSize: ELEVATION_GRID_SIZE,
        radiusKm: ELEVATION_RADIUS_KM,
        cachedAt: new Date(),
      };

      const terrain = analyseTerrain(grid, {
        gridSize: ELEVATION_GRID_SIZE,
        radiusKm: ELEVATION_RADIUS_KM,
      });
      if (terrain) {
        campground.terrain = terrain;
        campground.elevation = terrain.elevation;
      }

      await campground.save();
    } catch (error) {
      console.error("Elevation fetch failed:", error.message);
      // Fail silently. The topo card is enhancement, not the critical path.
    }
  } else if (
    campground.elevationGrid?.data?.length &&
    !campground.terrain?.summary
  ) {
    // Grid cached before terrain analysis existed. Derive it now, no new API call.
    const terrain = analyseTerrain(campground.elevationGrid.data, {
      gridSize: campground.elevationGrid.gridSize || ELEVATION_GRID_SIZE,
      radiusKm: campground.elevationGrid.radiusKm || ELEVATION_RADIUS_KM,
    });
    if (terrain) {
      campground.terrain = terrain;
      campground.elevation = terrain.elevation;
      await campground.save();
    }
  }

  // Climate normals: same contract as the elevation grid. One fetch, cached on
  // the document forever, because ten-year normals do not move. Seeded
  // campgrounds already carry theirs, so this only runs for ones users add.
  if (hasCoords && !campground.climate?.monthly?.length) {
    const [lon, lat] = campground.geometry.coordinates;
    try {
      const climate = await getClimateNormals(lat, lon);
      campground.climate = { ...climate, cachedAt: new Date() };
      await campground.save();
    } catch (error) {
      console.error("Climate fetch failed:", error.message);
      // Fail silently, like terrain. The page renders without a season strip.
    }
  }

  // Derived per request rather than stored: it is arithmetic over 48 numbers,
  // and keeping it out of the database means the thresholds stay changeable.
  const seasonality = campground.climate?.monthly?.length
    ? analyseSeasonality(campground.climate, { elevation: campground.elevation })
    : null;

  res.render("campgrounds/show", {
    campground,
    weather: weatherData,
    sunData,
    seasonality,
  });
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/edit", { campground, AMENITIES, TAGS });
};

module.exports.updateCampground = async (req, res) => {
  const { id } = req.params;

  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }

  const newLocation = req.body.campground.location;
  const locationTextChanged = newLocation !== campground.location;
  const needsGeocode = locationTextChanged || !campground.geometry?.coordinates?.length;

  // Geocode BEFORE writing anything. The previous version wrote the update first
  // and bailed out afterwards on a geocode failure, which left the record with a
  // new location string still pointing at the old coordinates.
  let newGeometry = null;
  if (needsGeocode) {
    let geoData;
    try {
      geoData = await maptilerClient.geocoding.forward(newLocation, { limit: 1 });
    } catch (err) {
      console.error(
        "MapTiler geocoding error (update):",
        err && err.message ? err.message : err,
      );
      req.flash(
        "error",
        "Location lookup failed while updating (MapTiler). Try again or check your API key/network.",
      );
      return res.redirect("back");
    }

    if (!geoData?.features?.length || !geoData.features[0].geometry) {
      req.flash(
        "error",
        "Could not find that location. Please try a different location name.",
      );
      return res.redirect("back");
    }

    newGeometry = geoData.features[0].geometry;
  }

  const oldCoords = campground.geometry?.coordinates || [];
  const coordsChanged =
    newGeometry &&
    (newGeometry.coordinates[0] !== oldCoords[0] ||
      newGeometry.coordinates[1] !== oldCoords[1]);

  Object.assign(campground, req.body.campground);
  if (newGeometry) campground.geometry = newGeometry;

  // Everything cached describes the old spot, so it is all wrong now. Clearing
  // it makes the next show-page view refetch and re-derive for the new
  // coordinates. Climate included: it is tied to the location just as tightly
  // as the elevation grid, and a campground moved from Ladakh to the coast
  // would otherwise keep reporting a Himalayan winter forever.
  if (coordsChanged) {
    campground.elevationGrid = undefined;
    campground.elevation = undefined;
    campground.terrain = undefined;
    campground.climate = undefined;
    campground.region = undefined;
  }

  const imgs = req.files.map((f) => ({ url: f.path, filename: f.filename }));
  campground.images.push(...imgs);

  if (req.body.deleteImages?.length) {
    campground.images = campground.images.filter(
      (img) => !req.body.deleteImages.includes(img.filename),
    );
  }

  await campground.save();

  // Cloudinary cleanup runs only once the database is consistent. Doing it the
  // other way round means a mid-loop failure leaves the record pointing at assets
  // that no longer exist, which shows up as broken images. An orphaned asset is
  // the cheaper failure.
  if (req.body.deleteImages?.length) {
    for (let filename of req.body.deleteImages) {
      try {
        await cloudinary.uploader.destroy(filename);
      } catch (err) {
        console.error("Cloudinary delete failed for", filename, err.message);
      }
    }
  }

  req.flash("success", "Successfully updated campground!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  await Campground.findByIdAndDelete(id);
  req.flash("success", "Successfully deleted campground");
  res.redirect("/campgrounds");
};
