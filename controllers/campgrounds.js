const Campground = require("../models/campground");

const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
const { cloudinary } = require("../cloudinary");
const { getWeatherData } = require("../utils/weatherService");
// Safe diagnostic: log whether an API key is present (length only) so we don't print secrets
if (!process.env.MAPTILER_API_KEY) {
  console.warn("MAPTILER_API_KEY is not set in process.env");
} else {
  try {
    console.log(
      "MAPTILER_API_KEY length:",
      process.env.MAPTILER_API_KEY.length
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
    const searchRegex = new RegExp(search, "i"); // Case-insensitive regex
    query.$or = [
      { title: searchRegex },
      { location: searchRegex },
      { description: searchRegex },
    ];
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
  res.render("campgrounds/new");
};

module.exports.createCampground = async (req, res, next) => {
  let geoData;
  try {
    geoData = await maptilerClient.geocoding.forward(
      req.body.campground.location,
      { limit: 1 }
    );
  } catch (err) {
    console.error(
      "MapTiler geocoding error (create):",
      err && err.message ? err.message : err
    );
    req.flash(
      "error",
      "Location lookup failed (MapTiler). Try again or check your API key/network."
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
      "Could not find that location. Please try a different location name."
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

  // Fetch weather data using campground coordinates
  let weatherData = null;
  if (campground.geometry && campground.geometry.coordinates) {
    const [lon, lat] = campground.geometry.coordinates;
    try {
      weatherData = await getWeatherData(lat, lon);
    } catch (error) {
      console.error("Failed to fetch weather data:", error.message);
      // Continue without weather data - page will still render
    }
  }

  res.render("campgrounds/show", { campground, weather: weatherData });
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/edit", { campground });
};

module.exports.updateCampground = async (req, res) => {
  const { id } = req.params;
  console.log(req.body);
  const campground = await Campground.findByIdAndUpdate(id, {
    ...req.body.campground,
  });

  // Try to geocode the location
  try {
    const geoData = await maptilerClient.geocoding.forward(
      req.body.campground.location,
      { limit: 1 }
    );

    // Validate that we got valid geocoding results
    if (
      !geoData ||
      !geoData.features ||
      !geoData.features.length ||
      !geoData.features[0].geometry
    ) {
      req.flash(
        "error",
        "Could not find that location. Please try a different location name."
      );
      return res.redirect("back");
    }

    campground.geometry = geoData.features[0].geometry;
  } catch (err) {
    console.error(
      "MapTiler geocoding error (update):",
      err && err.message ? err.message : err
    );
    req.flash(
      "error",
      "Location lookup failed while updating (MapTiler). Try again or check your API key/network."
    );
    return res.redirect("back");
  }

  const imgs = req.files.map((f) => ({ url: f.path, filename: f.filename }));
  campground.images.push(...imgs);
  await campground.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await campground.updateOne({
      $pull: { images: { filename: { $in: req.body.deleteImages } } },
    });
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
