module.exports.descriptors = [
  "Forest",
  "Ancient",
  "Petrified",
  "Roaring",
  "Cascade",
  "Tumbling",
  "Silent",
  "Redwood",
  "Bullfrog",
  "Maple",
  "Misty",
  "Elk",
  "Grizzly",
  "Ocean",
  "Sea",
  "Sky",
  "Dusty",
  "Diamond",
  "Sunset",
  "Sunrise",
  "Mountain",
  "Valley",
  "River",
  "Lake",
  "Whispering",
  "Thunder",
  "Lightning",
  "Moonlit",
  "Starry",
  "Golden",
  "Silver",
  "Crystal",
  "Hidden",
  "Wild",
  "Peaceful",
  "Serene",
  "Majestic",
  "Royal",
  "Sacred",
  "Mystic",
  "Enchanted",
  "Emerald",
  "Sapphire",
  "Tranquil",
  "Pristine",
  "Alpine",
  "Highland",
  "Coastal",
  "Tropical",
];

module.exports.places = [
  "Flats",
  "Village",
  "Canyon",
  "Pond",
  "Group Camp",
  "Horse Camp",
  "Ghost Town",
  "Camp",
  "Dispersed Camp",
  "Backcountry",
  "River",
  "Creek",
  "Creekside",
  "Bay",
  "Spring",
  "Bayshore",
  "Sands",
  "Mule Camp",
  "Hunting Camp",
  "Cliffs",
  "Hollow",
  "Retreat",
  "Paradise",
  "Haven",
  "Meadow",
  "Grove",
  "Ridge",
  "Peak",
  "Summit",
  "Prairie",
  "Oasis",
  "Sanctuary",
  "Wilderness",
  "Lakeside",
  "Riverside",
  "Hillside",
  "Plateau",
  "Waterfall",
  "Rapids",
  "Woods",
  "Trail",
  "Bluff",
  "Dell",
  "Glade",
  "Knoll",
];

// Diverse campgrounds with varied prices for testing filters
module.exports.campgroundData = [
  // Budget-friendly options (₹300-₹800)
  {
    title: "Riverside Budget Camp",
    location: "Rishikesh, Uttarakhand",
    description:
      "Affordable riverside camping perfect for budget travelers. Enjoy the sounds of flowing water and peaceful mountain views. Basic amenities provided.",
    price: 350,
    geometry: {
      type: "Point",
      coordinates: [78.2676, 30.0869],
    },
  },
  {
    title: "Backpacker Paradise",
    location: "Manali, Himachal Pradesh",
    description:
      "Budget backpacker camp in the heart of Manali. Meet fellow travelers, share stories around the campfire. Clean and safe.",
    price: 450,
    geometry: {
      type: "Point",
      coordinates: [77.1734, 32.2396],
    },
  },
  {
    title: "Simple Desert Camp",
    location: "Jaisalmer, Rajasthan",
    description:
      "Experience authentic desert camping without breaking the bank. Star-gazing, camel rides, and traditional Rajasthani hospitality.",
    price: 600,
    geometry: {
      type: "Point",
      coordinates: [70.9083, 26.9157],
    },
  },
  {
    title: "Forest Trail Camp",
    location: "Coorg, Karnataka",
    description:
      "Nestled in coffee plantations, this budget camp offers nature walks, bird watching, and fresh mountain air. Family-friendly.",
    price: 700,
    geometry: {
      type: "Point",
      coordinates: [75.7382, 12.3375],
    },
  },

  // Mid-range options (₹900-₹1500)
  {
    title: "Mountain View Retreat",
    location: "Nainital, Uttarakhand",
    description:
      "Beautiful mountain campsite with lake views. Includes bonfire, music, and delicious meals. Perfect for weekend getaways with friends.",
    price: 950,
    geometry: {
      type: "Point",
      coordinates: [79.4633, 29.3804],
    },
  },
  {
    title: "Lakeside Adventure Camp",
    location: "Bhimtal, Uttarakhand",
    description:
      "Peaceful lakeside camping with kayaking, fishing, and nature trails. Comfortable tents with attached washrooms. Great for families.",
    price: 1100,
    geometry: {
      type: "Point",
      coordinates: [79.5589, 29.3475],
    },
  },
  {
    title: "Himalayan Eco Camp",
    location: "Dharamshala, Himachal Pradesh",
    description:
      "Eco-friendly camping in the lap of Himalayas. Yoga sessions, meditation, organic meals. Disconnect to reconnect with nature.",
    price: 1250,
    geometry: {
      type: "Point",
      coordinates: [76.3234, 32.219],
    },
  },
  {
    title: "Beach Bonfire Camp",
    location: "Gokarna, Karnataka",
    description:
      "Camp by the beach with bonfire nights, live music, and stunning sunsets. Water sports and beach volleyball available.",
    price: 1350,
    geometry: {
      type: "Point",
      coordinates: [74.3193, 14.5488],
    },
  },
  {
    title: "Waterfall Wilderness Camp",
    location: "Chikmagalur, Karnataka",
    description:
      "Hidden gem near waterfalls. Trek to nearby peaks, explore coffee estates, and enjoy fresh mountain streams. Guided tours available.",
    price: 1400,
    geometry: {
      type: "Point",
      coordinates: [75.772, 13.3161],
    },
  },
  {
    title: "Valley of Flowers Camp",
    location: "Spiti Valley, Himachal Pradesh",
    description:
      "High-altitude camping in the breathtaking Spiti Valley. Experience Tibetan culture, visit monasteries, and witness stunning landscapes.",
    price: 1500,
    geometry: {
      type: "Point",
      coordinates: [78.0, 32.25],
    },
  },

  // Premium options (₹1600-₹2500)
  {
    title: "Luxury Safari Camp",
    location: "Ranthambore, Rajasthan",
    description:
      "Premium camping near Ranthambore National Park. Tiger safari, luxury tents with AC, gourmet meals, and expert wildlife guides.",
    price: 1800,
    geometry: {
      type: "Point",
      coordinates: [76.5026, 26.0173],
    },
  },
  {
    title: "Royal Desert Resort",
    location: "Pushkar, Rajasthan",
    description:
      "Luxury desert camping with Swiss tents, cultural performances, camel safari, and royal Rajasthani cuisine. Wedding and events venue.",
    price: 2000,
    geometry: {
      type: "Point",
      coordinates: [74.555, 26.4899],
    },
  },
  {
    title: "Alpine Luxury Retreat",
    location: "Gulmarg, Jammu & Kashmir",
    description:
      "Premium alpine camping with heated tents, gourmet dining, skiing in winter, gondola rides, and breathtaking mountain views.",
    price: 2200,
    geometry: {
      type: "Point",
      coordinates: [74.3809, 34.0484],
    },
  },
  {
    title: "Jungle Lodge & Camp",
    location: "Jim Corbett, Uttarakhand",
    description:
      "Exclusive jungle camp with elephant safari, luxury cottages, swimming pool, spa, and fine dining. Perfect for nature lovers and families.",
    price: 2300,
    geometry: {
      type: "Point",
      coordinates: [78.8936, 29.5314],
    },
  },
  {
    title: "Coastal Paradise Glamping",
    location: "Andaman Islands",
    description:
      "Beachfront glamping with sea-view tents, scuba diving, snorkeling, island hopping, and fresh seafood. A tropical paradise experience.",
    price: 2500,
    geometry: {
      type: "Point",
      coordinates: [92.6586, 11.7401],
    },
  },

  // Ultra-premium options (₹2600-₹4000)
  {
    title: "Himalayan Summit Camp",
    location: "Leh-Ladakh",
    description:
      "Ultra-premium high-altitude camping with oxygen tents, personal guides, gourmet meals, monastery visits, and stunning Himalayan panoramas.",
    price: 2800,
    geometry: {
      type: "Point",
      coordinates: [77.5771, 34.1526],
    },
  },
  {
    title: "Heritage Palace Camp",
    location: "Udaipur, Rajasthan",
    description:
      "Royal camping experience near palace lakes. Butler service, private bonfire, cultural shows, luxury amenities, and royal dining.",
    price: 3000,
    geometry: {
      type: "Point",
      coordinates: [73.7125, 24.5854],
    },
  },
  {
    title: "Exclusive Wildlife Sanctuary",
    location: "Bandhavgarh, Madhya Pradesh",
    description:
      "VIP wildlife camp with private safari vehicles, expert naturalists, luxury tents, spa, and gourmet cuisine. High tiger sighting probability.",
    price: 3200,
    geometry: {
      type: "Point",
      coordinates: [81.0311, 23.6934],
    },
  },
  {
    title: "Pristine Valley Luxury Camp",
    location: "Tirthan Valley, Himachal Pradesh",
    description:
      "Secluded luxury camp in pristine valley. Trout fishing, riverside picnics, spa treatments, yoga, and organic farm-to-table dining.",
    price: 3500,
    geometry: {
      type: "Point",
      coordinates: [77.44, 31.58],
    },
  },
  {
    title: "Royal Houseboat & Camp",
    location: "Dal Lake, Srinagar",
    description:
      "Luxury houseboat with lakeside camping option. Shikara rides, Kashmiri cuisine, personal chef, spa, and unparalleled hospitality.",
    price: 4000,
    geometry: {
      type: "Point",
      coordinates: [74.8723, 34.1089],
    },
  },

  // Special themed camps
  {
    title: "Adventure Sports Camp",
    location: "Bir Billing, Himachal Pradesh",
    description:
      "Paragliding capital camp with adventure activities. Includes tandem paragliding, trekking, mountain biking, and camping under stars.",
    price: 1600,
    geometry: {
      type: "Point",
      coordinates: [76.7276, 32.055],
    },
  },
  {
    title: "Spiritual Retreat Camp",
    location: "Rishikesh, Uttarakhand",
    description:
      "Yoga and meditation camp on Ganges riverbank. Daily yoga classes, Ayurvedic meals, spiritual talks, and peaceful environment.",
    price: 1300,
    geometry: {
      type: "Point",
      coordinates: [78.3004, 30.0869],
    },
  },
  {
    title: "Photography Expedition Camp",
    location: "Zanskar Valley, Ladakh",
    description:
      "Perfect for photographers. Frozen river trek, Buddhist monasteries, snow leopard tracking, and stunning landscape photography opportunities.",
    price: 2700,
    geometry: {
      type: "Point",
      coordinates: [76.88, 33.6],
    },
  },
  {
    title: "Family Fun Camp",
    location: "Lonavala, Maharashtra",
    description:
      "Family-oriented camp with kids activities, outdoor games, rain dance, waterfall trekking, and bonfire. Safe and secure environment.",
    price: 900,
    geometry: {
      type: "Point",
      coordinates: [73.4096, 18.7541],
    },
  },
  {
    title: "Romantic Couples Getaway",
    location: "Munnar, Kerala",
    description:
      "Exclusive couples-only camp in tea plantations. Private tents, candlelight dinner, couple spa, and scenic sunrise views.",
    price: 1900,
    geometry: {
      type: "Point",
      coordinates: [77.059, 10.0889],
    },
  },

  // INDORE & MADHYA PRADESH SPECIFIC CAMPGROUNDS
  {
    title: "Ralamandal Wildlife Sanctuary Eco-Camp",
    location: "Ralamandal, Indore, Madhya Pradesh",
    description:
      "Immerse yourself in nature at Indore's oldest wildlife sanctuary. Wake up to bird songs, explore dense forests, and spot deer on morning trails. Perfect for nature enthusiasts and photographers seeking tranquility just 15km from the city.",
    price: 850,
    geometry: {
      type: "Point",
      coordinates: [75.7873, 22.6708],
    },
  },
  {
    title: "Patalpani Monsoon Magic Camp",
    location: "Patalpani Waterfall, Mhow, Indore",
    description:
      "Experience the thundering beauty of Patalpani waterfall during monsoons. Camp amidst misty hills, enjoy waterfall rappelling, and witness spectacular sunsets. Adventure activities include valley crossing and rock climbing. Best visited June-September.",
    price: 1200,
    geometry: {
      type: "Point",
      coordinates: [75.5937, 22.5645],
    },
  },
  {
    title: "Tincha Falls Triple Cascade Retreat",
    location: "Tincha Falls, Indore, Madhya Pradesh",
    description:
      "Hidden gem featuring three-tiered waterfall cascading through virgin forests. Ideal for weekend escapes with trekking, swimming in natural pools, and jungle camping. Monsoon season transforms this into a magical paradise.",
    price: 950,
    geometry: {
      type: "Point",
      coordinates: [75.6402, 22.5826],
    },
  },
  {
    title: "Choral Dam Lakeside Luxury Camp",
    location: "Choral Dam, Indore, Madhya Pradesh",
    description:
      "Premium camping by the serene Choral Dam reservoir. Enjoy kayaking, paddling boats, fishing, and stunning sunset photography. Swiss tents with modern amenities. Perfect for romantic getaways and family picnics.",
    price: 1400,
    geometry: {
      type: "Point",
      coordinates: [75.6447, 22.8139],
    },
  },
  {
    title: "Janapav Kund Sacred Hills Camp",
    location: "Janapav, Indore, Madhya Pradesh",
    description:
      "Spiritual camping at the legendary birthplace of Lord Parshuram. Trek to ancient Shiva temple, witness panoramic Malwa plateau views, and experience divine sunrises. Combine spirituality with adventure in the Vindhya ranges.",
    price: 800,
    geometry: {
      type: "Point",
      coordinates: [75.3167, 22.7167],
    },
  },
  {
    title: "Sailani Island Adventure Paradise",
    location: "Sailani Island, Indore, Madhya Pradesh",
    description:
      "Unique island camping accessible only by boat! Located in Yashwant Sagar reservoir, this secluded paradise offers water sports, island trekking, bird watching, and complete digital detox. Bonfire nights under starlit skies.",
    price: 1350,
    geometry: {
      type: "Point",
      coordinates: [75.5847, 22.7958],
    },
  },
  {
    title: "Mandu Fort Heritage Camping",
    location: "Mandu, Dhar (Near Indore), Madhya Pradesh",
    description:
      "Camp amidst 15th-century Afghan architecture! Explore Jahaz Mahal, Rani Roopmati Pavilion, and ancient monuments. Experience royal history with modern glamping comfort. Cultural performances and traditional Malwa cuisine included.",
    price: 1600,
    geometry: {
      type: "Point",
      coordinates: [75.3953, 22.3583],
    },
  },
  {
    title: "Bamniya Kund Waterfall Camp",
    location: "Bamniya Kund, Indore, Madhya Pradesh",
    description:
      "Off-the-beaten-path waterfall camping for true adventurers. Trek through dense forests, swim in crystal-clear pools, and enjoy authentic village hospitality. Minimal commercialization ensures pristine natural beauty.",
    price: 700,
    geometry: {
      type: "Point",
      coordinates: [75.7156, 22.6523],
    },
  },
  {
    title: "Gidiyakhoh Waterfall Wilderness Camp",
    location: "Gidiyakhoh, Indore, Madhya Pradesh",
    description:
      "Remote waterfall camping offering ultimate solitude. Perfect for meditation retreats and nature lovers. Includes guided forest walks, bird identification sessions, and organic farm-fresh meals. Limited slots ensure exclusivity.",
    price: 900,
    geometry: {
      type: "Point",
      coordinates: [75.6789, 22.7234],
    },
  },
  {
    title: "Naulakha Mahal Moonlight Camp",
    location: "Mandu, Madhya Pradesh",
    description:
      "Romantic camping near the magnificent Naulakha Palace. Moonlit monument tours, traditional folk music performances, and Malwa cuisine under stars. Couples special with private bonfire and candlelight dinner.",
    price: 1750,
    geometry: {
      type: "Point",
      coordinates: [75.3889, 22.3621],
    },
  },
  {
    title: "Indore City Outskirts Eco Village Camp",
    location: "Simrol, Indore, Madhya Pradesh",
    description:
      "Rural experience just 20km from Indore city. Stay in traditional mud houses, learn organic farming, milk cows, cook village-style food, and experience authentic Malwa culture. Perfect for families and school groups.",
    price: 650,
    geometry: {
      type: "Point",
      coordinates: [75.8523, 22.7896],
    },
  },
  {
    title: "Omkareshwar Riverside Spiritual Camp",
    location: "Omkareshwar, Madhya Pradesh (Near Indore)",
    description:
      "Sacred camping on Narmada river banks near Jyotirlinga temple. Morning aarti participation, river rafting, and spiritual discourses. Vegetarian sattvic meals prepared by temple priests. Soul-cleansing experience.",
    price: 1100,
    geometry: {
      type: "Point",
      coordinates: [76.1406, 22.2407],
    },
  },
  {
    title: "Maheshwar Fort View Luxury Camp",
    location: "Maheshwar, Madhya Pradesh (Near Indore)",
    description:
      "Glamping with stunning views of Ahilya Fort and Narmada ghats. Handloom weaving workshops, boat rides, temple visits, and traditional Maheshwari saree shopping. Experience royal Holkar dynasty heritage.",
    price: 1550,
    geometry: {
      type: "Point",
      coordinates: [75.5883, 22.1757],
    },
  },
  {
    title: "Hanumantiya Backwater Island Camp",
    location: "Hanumantiya, Khandwa (Accessible from Indore)",
    description:
      "MP Tourism's water sports paradise! Jet skiing, parasailing, banana boat rides, and island camping. Annual Jal Mahotsav venue with adventure activities. Perfect for thrill-seekers and water sport enthusiasts.",
    price: 1450,
    geometry: {
      type: "Point",
      coordinates: [76.3489, 21.8307],
    },
  },
  {
    title: "Kalakund Ancient Caves Trek Camp",
    location: "Kalakund, Indore, Madhya Pradesh",
    description:
      "Archaeological camping near prehistoric cave paintings. Guided heritage walks, fossil hunting, and night safari. Learn about ancient civilizations while enjoying modern camping comforts. Educational and adventurous.",
    price: 1000,
    geometry: {
      type: "Point",
      coordinates: [75.7234, 22.6891],
    },
  },
];
