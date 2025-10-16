if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const cities = require("./cities");
const { places, descriptors, campgroundData } = require("./seedHelpers");
const Campground = require("../models/campground");

const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/musafir";

mongoose.connect(dbUrl);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const sample = (array) => array[Math.floor(Math.random() * array.length)];

// Your Cloudinary images
const images = [
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994094/musafir/pexels-tobiasbjorkli-2340161_ev4l70.jpg",
    filename: "musafir/pexels-tobiasbjorkli-2340161_ev4l70",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994094/musafir/pexels-baptiste-valthier-193914-803226_cajvof.jpg",
    filename: "musafir/pexels-baptiste-valthier-193914-803226_cajvof",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994094/musafir/pexels-manuela-adler-344311-949194_h95iem.jpg",
    filename: "musafir/pexels-manuela-adler-344311-949194_h95iem",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994093/musafir/pexels-samson-1881420_vpzj1k.jpg",
    filename: "musafir/pexels-samson-1881420_vpzj1k",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-xue-guangjian-815005-1687845_p6gtvz.jpg",
    filename: "musafir/pexels-xue-guangjian-815005-1687845_p6gtvz",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994093/musafir/pexels-anastasia-shuraeva-4994136_xoxw3f.jpg",
    filename: "musafir/pexels-anastasia-shuraeva-4994136_xoxw3f",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-vijay-richhiya-2155208704-34111386_wc6lwi.jpg",
    filename: "musafir/pexels-vijay-richhiya-2155208704-34111386_wc6lwi",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-thegr8ossab-12685145_mowkva.jpg",
    filename: "musafir/pexels-thegr8ossab-12685145_mowkva",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-vladbagacian-1061640_lrbj3e.jpg",
    filename: "musafir/pexels-vladbagacian-1061640_lrbj3e",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994092/musafir/pexels-prapaiz-2690242_qjaw1d.jpg",
    filename: "musafir/pexels-prapaiz-2690242_qjaw1d",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-roman-odintsov-4555613_wm2xt8.jpg",
    filename: "musafir/pexels-roman-odintsov-4555613_wm2xt8",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-teemu-r-555088-1840421_afzwz0.jpg",
    filename: "musafir/pexels-teemu-r-555088-1840421_afzwz0",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-mikhail-nilov-9267416_nffoqq.jpg",
    filename: "musafir/pexels-mikhail-nilov-9267416_nffoqq",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-nathan-moore-1300563-2603681_rsuxxq.jpg",
    filename: "musafir/pexels-nathan-moore-1300563-2603681_rsuxxq",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994091/musafir/pexels-spencergurley-1448055_rmlqu6.jpg",
    filename: "musafir/pexels-spencergurley-1448055_rmlqu6",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-cliford-mervil-988071-2398220_zluwua.jpg",
    filename: "musafir/pexels-cliford-mervil-988071-2398220_zluwua",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-cottonbro-5994751_js1afc.jpg",
    filename: "musafir/pexels-cottonbro-5994751_js1afc",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-kadaaran-9697709_tfdwqw.jpg",
    filename: "musafir/pexels-kadaaran-9697709_tfdwqw",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-michel-paz-1256954-2473845_eoy13o.jpg",
    filename: "musafir/pexels-michel-paz-1256954-2473845_eoy13o",
  },
  {
    url: "https://res.cloudinary.com/dzwjyg2ai/image/upload/v1761994090/musafir/pexels-olly-3776838_zjqie0.jpg",
    filename: "musafir/pexels-olly-3776838_zjqie0",
  },
];

// Get random 1-3 images for each campground
const getRandomImages = () => {
  const numImages = Math.floor(Math.random() * 3) + 1; // 1 to 3 images
  const shuffled = [...images].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numImages);
};

const seedDB = async () => {
  await Campground.deleteMany({});
  console.log("🗑️  Cleared existing campgrounds\n");

  console.log("🌱 Seeding specific campgrounds with detailed data...");

  // Seed specific campgrounds with varied prices and descriptions for testing filters
  for (let campData of campgroundData) {
    const camp = new Campground({
      author: "6904c4bf7ba614408b65bf16", // ishpeeedy user ID
      ...campData,
      images: getRandomImages(),
    });
    await camp.save();
  }

  console.log(`✅ Seeded ${campgroundData.length} specific campgrounds\n`);

  console.log("🌱 Seeding random campgrounds...");

  // Seed additional random campgrounds
  for (let i = 0; i < 30; i++) {
    const random1000 = Math.floor(Math.random() * 1000);
    const price = Math.floor(Math.random() * 3000) + 300; // ₹300-₹3300

    const camp = new Campground({
      author: "6904c4bf7ba614408b65bf16", // ishpeeedy user ID
      location: `${cities[random1000].city}, ${cities[random1000].state}`,
      title: `${sample(descriptors)} ${sample(places)}`,
      description: `Experience the beauty of nature at this ${sample(
        descriptors
      ).toLowerCase()} ${sample(
        places
      ).toLowerCase()}. Perfect for families, couples, and solo adventurers. Enjoy hiking, camping, and breathtaking views of the surrounding landscape.`,
      price,
      geometry: {
        type: "Point",
        coordinates: [
          cities[random1000].longitude,
          cities[random1000].latitude,
        ],
      },
      images: getRandomImages(),
    });
    await camp.save();

    if ((i + 1) % 10 === 0) {
      console.log(`  Seeded ${i + 1} random campgrounds...`);
    }
  }

  console.log(`✅ Seeded 30 random campgrounds\n`);
  console.log(
    `🎉 Total: ${campgroundData.length + 30} campgrounds seeded successfully!`
  );
};

seedDB().then(() => {
  mongoose.connection.close();
  console.log("\n✨ Database connection closed");
});
