const Campground = require('../models/campground');

const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
const { cloudinary } = require("../cloudinary");
// Safe diagnostic: log whether an API key is present (length only) so we don't print secrets
if (!process.env.MAPTILER_API_KEY) {
    console.warn('MAPTILER_API_KEY is not set in process.env');
} else {
    try {
        console.log('MAPTILER_API_KEY length:', process.env.MAPTILER_API_KEY.length);
    } catch (e) { /* ignore */ }
}


module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds })
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
}

module.exports.createCampground = async (req, res, next) => {
    let geoData;
    try {
        geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
    } catch (err) {
        console.error('MapTiler geocoding error (create):', err && err.message ? err.message : err);
        req.flash('error', 'Location lookup failed (MapTiler). Try again or check your API key/network.');
        return res.redirect('back');
    }
    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.features && geoData.features[0] && geoData.features[0].geometry;
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.author = req.user._id;
    await campground.save();
    console.log(campground);
    req.flash('success', 'Successfully made a new campground!');
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.showCampground = async (req, res,) => {
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/show', { campground });
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id)
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req, res) => {
    const { id } = req.params;
    console.log(req.body);
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    try {
        const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
        campground.geometry = geoData.features && geoData.features[0] && geoData.features[0].geometry;
    } catch (err) {
        console.error('MapTiler geocoding error (update):', err && err.message ? err.message : err);
        req.flash('error', 'Location lookup failed while updating (MapTiler). Try again or check your API key/network.');
        return res.redirect('back');
    }
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
    await campground.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }
    req.flash('success', 'Successfully updated campground!');
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted campground')
    res.redirect('/campgrounds');
}