const mongoose = require("mongoose");
const Review = require("./review");
const mongoosePaginate = require("mongoose-paginate-v2");
const Schema = mongoose.Schema;

const ImageSchema = new Schema({
  url: String,
  filename: String,
});

ImageSchema.virtual("thumbnail").get(function () {
  return this.url.replace("/upload", "/upload/w_200");
});

const opts = { toJSON: { virtuals: true } };

const CampgroundSchema = new Schema(
  {
    title: String,
    images: [ImageSchema],
    geometry: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    price: Number,
    description: String,
    location: String,

    // Elevation at the campground itself, in metres. Derived from the centre of
    // elevationGrid at no extra API cost.
    elevation: Number,

    // 10x10 grid of elevation samples covering a square box around the campground.
    // Fetched lazily on first show-page view and cached permanently. See PLAN.md.
    elevationGrid: {
      data: [Number], // flat, row-major, 100 floats. row 0 = south, col 0 = west
      gridSize: { type: Number, default: 10 },
      radiusKm: { type: Number, default: 5 },
      cachedAt: Date,
    },

    // Twelve monthly climate normals from ERA5, fetched once and cached like the
    // elevation grid. Seasonality is derived from these on render rather than
    // stored, so the thresholds in utils/seasonality.js can be argued with and
    // changed without a refetch or a migration.
    climate: {
      monthly: [
        {
          _id: false,
          tMax: Number, // mean daily maximum, C, at the model cell's elevation
          tMin: Number,
          precip: Number, // total mm in an average month
          snow: Number, // total cm in an average month
        },
      ],
      modelElevation: Number, // ERA5 cell elevation, for the lapse-rate correction
      years: Number,
      from: String,
      to: String,
      cachedAt: Date,
    },

    // Terrain character derived from elevationGrid. Stored so we compute it once.
    terrain: {
      relief: Number, // max - min across the grid, metres
      minElevation: Number,
      maxElevation: Number,
      percentile: Number, // where the campground sits in the local distribution, 0-100
      positionLabel: String, // "Valley floor", "Mid slope", "Ridge", ...
      aspectBearing: Number, // compass degrees the land falls away toward, 0-360
      aspectCompass: String, // "N", "NE", "E", ...
      aspectName: String, // "North", "Northeast", ...
      slopeDegrees: Number,
      slopeLabel: String,
      ruggedness: Number, // terrain ruggedness index, metres
      ruggednessLabel: String,
      summary: String, // one-line prose readout
    },

    amenities: {
      type: [String],
      enum: [
        "Firepit",
        "Toilets",
        "Running Water",
        "Electricity",
        "Wi-Fi",
        "Pet Friendly",
        "Wheelchair Accessible",
        "Parking",
        "Showers",
      ],
      default: [],
    },

    tags: {
      type: [String],
      enum: [
        "Remote",
        "Family Friendly",
        "Dog Friendly",
        "Near Trail",
        "Lakeside",
        "Forest",
        "Desert",
        "Mountain",
        "Beach",
      ],
      default: [],
    },

    region: String,

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
  },
  opts
);

CampgroundSchema.virtual("properties.popUpMarkup").get(function () {
  return `
    <strong><a href="/campgrounds/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`;
});

// Add text index for search functionality
CampgroundSchema.index({
  title: "text",
  location: "text",
  description: "text",
});

// Add pagination plugin
CampgroundSchema.plugin(mongoosePaginate);

CampgroundSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await Review.deleteMany({
      _id: {
        $in: doc.reviews,
      },
    });
  }
});

module.exports = mongoose.model("Campground", CampgroundSchema);
