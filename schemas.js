const Joi = require('joi')

// Must stay in sync with the enums on CampgroundSchema in models/campground.js
const AMENITIES = [
    'Firepit', 'Toilets', 'Running Water', 'Electricity', 'Wi-Fi',
    'Pet Friendly', 'Wheelchair Accessible', 'Parking', 'Showers'
];

const TAGS = [
    'Remote', 'Family Friendly', 'Dog Friendly', 'Near Trail', 'Lakeside',
    'Forest', 'Desert', 'Mountain', 'Beach'
];

module.exports.AMENITIES = AMENITIES;
module.exports.TAGS = TAGS;

module.exports.campgroundSchema = Joi.object({
    campground: Joi.object({
        title: Joi.string().required(),
        location: Joi.string().required(),
        // image: Joi.string().uri().required(),
        price: Joi.number().required().min(0),
        description: Joi.string().required(),
        // .single() because a checkbox grid posts a bare string when exactly one
        // box is ticked, and an array when several are.
        amenities: Joi.array().items(Joi.string().valid(...AMENITIES)).single().default([]),
        tags: Joi.array().items(Joi.string().valid(...TAGS)).single().default([])
    }).required()
});

module.exports.ReviewSchema= Joi.object({
    review:Joi.object({
        rating:Joi.number().required().min(1).max(5),
        body:Joi.string().required()
    }).required()
}) 