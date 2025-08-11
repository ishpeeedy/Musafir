const express = require('express')
const router = express.Router({mergeParams:true})
const catchAsync = require('../utils/catchAsync.js')
const {validateReview,isLoggedIn,isReviewAuthor}= require('../middleware.js')
const Campground = require('../models/campground.js')
const Review = require('../models/review.js')
const reviews = require('../controllers/reviews.js')

router.route('/')
    .post(isLoggedIn,validateReview, catchAsync(reviews.createReview))

router.route('/:reviewId')
    .delete(isLoggedIn,isReviewAuthor, catchAsync(reviews.deleteReview))
    
module.exports = router