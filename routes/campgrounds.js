const express = require('express')
const router = express.Router()
const campgrounds = require('../controllers/campgrounds')
const catchAsync = require('../utils/catchAsync.js')
const Campground = require('../models/campground.js')
const {isLoggedIn,isAuthor,validateCampground} = require('../middleware')

router.route('/')
    .get(catchAsync(campgrounds.index))
    .post(isLoggedIn,validateCampground , catchAsync (campgrounds.createCampground))

router.route('/new')
    .get(isLoggedIn, campgrounds.renderNewForm)

router.route('/:id')
    .get(catchAsync( campgrounds.showCampground))
    .put(isLoggedIn,validateCampground, catchAsync(campgrounds.updateCampground))
    .delete(isLoggedIn, catchAsync(campgrounds.deleteCampground))

router.route('/:id/edit')
    .get( isLoggedIn ,isAuthor, catchAsync(campgrounds.renderEditForm))

module.exports = router