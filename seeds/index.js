/**
 * Seeds the database from seeds/campsites.json.
 *
 * Every campground here is a real site tagged tourism=camp_site in
 * OpenStreetMap, with coordinates from the map, elevation from SRTM 30m, and
 * terrain derived from that elevation. Descriptions are assembled from those
 * measurements. Amenities appear only where a mapper actually recorded them.
 *
 * Price is the sole invented field. See seeds/buildCampsites.js, which builds
 * the JSON and documents where each field comes from.
 *
 * The grids are baked into the JSON, so seeding makes no API calls and every
 * campground page renders its topo card immediately instead of paying a cold
 * OpenTopoData fetch on first view.
 */

if (process.env.NODE_ENV !== "production") require("dotenv").config();

const mongoose = require("mongoose");
const campsites = require("./campsites.json");
const Campground = require("../models/campground");
const Review = require("../models/review");
const User = require("../models/user");

const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/musafir";
const SEED_AUTHOR = "ishpeeedy";

// Already uploaded to Cloudinary
const images = [
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994094/musafir/pexels-tobiasbjorkli-2340161_ev4l70.jpg", filename: "musafir/pexels-tobiasbjorkli-2340161_ev4l70" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994094/musafir/pexels-baptiste-valthier-193914-803226_cajvof.jpg", filename: "musafir/pexels-baptiste-valthier-193914-803226_cajvof" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994094/musafir/pexels-manuela-adler-344311-949194_h95iem.jpg", filename: "musafir/pexels-manuela-adler-344311-949194_h95iem" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994093/musafir/pexels-samson-1881420_vpzj1k.jpg", filename: "musafir/pexels-samson-1881420_vpzj1k" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-xue-guangjian-815005-1687845_p6gtvz.jpg", filename: "musafir/pexels-xue-guangjian-815005-1687845_p6gtvz" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994093/musafir/pexels-anastasia-shuraeva-4994136_xoxw3f.jpg", filename: "musafir/pexels-anastasia-shuraeva-4994136_xoxw3f" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-vijay-richhiya-2155208704-34111386_wc6lwi.jpg", filename: "musafir/pexels-vijay-richhiya-2155208704-34111386_wc6lwi" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-thegr8ossab-12685145_mowkva.jpg", filename: "musafir/pexels-thegr8ossab-12685145_mowkva" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-vladbagacian-1061640_lrbj3e.jpg", filename: "musafir/pexels-vladbagacian-1061640_lrbj3e" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-prapaiz-2690242_qjaw1d.jpg", filename: "musafir/pexels-prapaiz-2690242_qjaw1d" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-roman-odintsov-4555613_wm2xt8.jpg", filename: "musafir/pexels-roman-odintsov-4555613_wm2xt8" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-teemu-r-555088-1840421_afzwz0.jpg", filename: "musafir/pexels-teemu-r-555088-1840421_afzwz0" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-mikhail-nilov-9267416_nffoqq.jpg", filename: "musafir/pexels-mikhail-nilov-9267416_nffoqq" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-nathan-moore-1300563-2603681_rsuxxq.jpg", filename: "musafir/pexels-nathan-moore-1300563-2603681_rsuxxq" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-spencergurley-1448055_rmlqu6.jpg", filename: "musafir/pexels-spencergurley-1448055_rmlqu6" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-cliford-mervil-988071-2398220_zluwua.jpg", filename: "musafir/pexels-cliford-mervil-988071-2398220_zluwua" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-cottonbro-5994751_js1afc.jpg", filename: "musafir/pexels-cottonbro-5994751_js1afc" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-kadaaran-9697709_tfdwqw.jpg", filename: "musafir/pexels-kadaaran-9697709_tfdwqw" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-michel-paz-1256954-2473845_eoy13o.jpg", filename: "musafir/pexels-michel-paz-1256954-2473845_eoy13o" },
  { url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-olly-3776838_zjqie0.jpg", filename: "musafir/pexels-olly-3776838_zjqie0" },
];

/** Deterministic per campground, so reseeding does not reshuffle the gallery. */
const imagesFor = (index) => {
  const count = (index % 3) + 1;
  return Array.from({ length: count }, (_, k) => images[(index * 3 + k) % images.length]);
};

const seedDB = async () => {
  const author = await User.findOne({ username: SEED_AUTHOR });
  if (!author) {
    throw new Error(
      `No user "${SEED_AUTHOR}" in the database. Register that account first, ` +
        `or change SEED_AUTHOR. Seeding with a dangling author id makes every ` +
        `show page throw on campground.author.username.`,
    );
  }

  // deleteMany does not fire the findOneAndDelete hook that cascades reviews,
  // so clearing campgrounds alone used to orphan the entire reviews collection.
  const { deletedCount } = await Campground.deleteMany({});
  const reviews = await Review.deleteMany({});
  console.log(`Cleared ${deletedCount} campgrounds and ${reviews.deletedCount} reviews`);

  const docs = campsites.map((site, i) => ({
    ...site,
    author: author._id,
    images: imagesFor(i),
  }));

  await Campground.insertMany(docs);

  const withTerrain = docs.filter((d) => d.terrain).length;
  const withAmenities = docs.filter((d) => d.amenities.length).length;
  const relief = docs.filter((d) => d.terrain).map((d) => d.terrain.relief);

  console.log(`Seeded ${docs.length} real campgrounds, authored by ${author.username}`);
  console.log(`  ${withTerrain} with terrain already derived, no cold fetch on first view`);
  console.log(`  ${withAmenities} with amenities recorded in OpenStreetMap`);
  console.log(`  relief spans ${Math.min(...relief)}m to ${Math.max(...relief)}m`);
};

mongoose
  .connect(dbUrl)
  .then(() => seedDB())
  .then(() => mongoose.connection.close())
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
