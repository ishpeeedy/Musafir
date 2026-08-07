const Campground = require("../models/campground");

const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
const { cloudinary } = require("../cloudinary");
const { getWeatherData } = require("../utils/weatherService");
const { buildSunData } = require("../utils/sunService");
const getElevationGrid = require("../utils/elevationService");
const analyseTerrain = require("../utils/terrainAnalysis");
// Single source of truth for the checkbox grids, shared with Joi validation
const { AMENITIES, TAGS } = require("../schemas");

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

module.exports.index = async (req, res) => {
  // Get query parameters
  const { search, minPrice, maxPrice, sort } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;

  // Build query object
  let query = {};

  // Text search with partial matching using regex
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim();
    if (escaped.length > 0 && escaped.length <= 60) {
      const searchRegex = new RegExp(escaped, "i"); // Case-insensitive regex
      query.$or = [
        { title: searchRegex },
        { location: searchRegex },
        { description: searchRegex },
      ];
    }
  }

  // Price filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Build sort object
  let sortOption = {};
  switch (sort) {
    case "price-asc":
      sortOption = { price: 1 };
      break;
    case "price-desc":
      sortOption = { price: -1 };
      break;
    case "newest":
      sortOption = { _id: -1 };
      break;
    case "oldest":
      sortOption = { _id: 1 };
      break;
    default:
      sortOption = { _id: -1 }; // Default: newest first
  }

  // Paginate campgrounds
  const options = {
    page,
    limit,
    sort: sortOption,
    lean: false, // Need virtuals for popUpMarkup
  };

  const result = await Campground.paginate(query, options);

  // Get all campgrounds for the cluster map (not paginated)
  const allCampgrounds = await Campground.find({});

  res.render("campgrounds/index", {
    campgrounds: result.docs,
    pagination: {
      page: result.page,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage,
      nextPage: result.nextPage,
      prevPage: result.prevPage,
      totalDocs: result.totalDocs,
    },
    filters: { search, minPrice, maxPrice, sort },
    clusterMapData: {
      type: "FeatureCollection",
      features: allCampgrounds.map((campground) => ({
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

  res.render("campgrounds/show", {
    campground,
    weather: weatherData,
    sunData,
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

  // The cached grid describes the old spot, so it is now wrong. Clearing it makes
  // the next show-page view refetch and re-derive for the new coordinates.
  if (coordsChanged) {
    campground.elevationGrid = undefined;
    campground.elevation = undefined;
    campground.terrain = undefined;
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
