const {campgroundSchema} = require ('./schemas.js')
const ExpressError = require('./utils/ExpressError.js')
const Review= require('./models/review.js')
const {ReviewSchema} = require ('./schemas.js') //joi schema
const Campground = require('./models/campground.js')

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        // If the request is a plain GET, store originalUrl. For non-GET (form method-override like DELETE),
        // store the referer (the page the user came from) so we don't redirect back to a DELETE endpoint.
        if (req.method === 'GET') {
            req.session.returnTo = req.originalUrl
        } else {
            req.session.returnTo = req.get('Referer') || '/'
        }
        req.flash('error', 'you must be signed in')
        return res.redirect('/login')
    }
    next()
}

module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo
    }
    next()
}

module.exports.validateCampground= (req , res , next ) => {
    const {error} = campgroundSchema.validate(req.body)
    if(error){
        const msg = error.details.map(el=>el.message).join(',')
        throw new ExpressError(msg,400)
    }
    else {
        next()
    }
}

module.exports.validateReview = (req, res, next)=>{
    const {error} = ReviewSchema.validate(req.body)
    if(error){
        const msg = error.details.map(el=>el.message).join(',')
        throw new ExpressError(msg,400)
    }else{
        next()
    }
}

module.exports.isReviewAuthor=async(req,res,next)=>{
    const {id,reviewId}= req.params
    const review = await Review.findById(reviewId)
    if (!review) {
        req.flash('error', 'Review not found')
        return res.redirect(`/campgrounds/${id}`)
    }
    if (!review.author || !review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do this')
        return res.redirect(`/campgrounds/${id}`)
    }
    next()
}

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params
    const campground = await Campground.findById(id)
    if (!campground) {
        req.flash('error', 'Campground not found')
        return res.redirect('/campgrounds')
    }
    if (!campground.author || !campground.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that')
        return res.redirect(`/campgrounds/${id}`)
    }
    next()
}