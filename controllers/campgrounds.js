const Campground = require('../models/campground.js')

module.exports.index =  async (req , res)=> {
    const campgrounds = await Campground.find({})
    res.render('campgrounds/index',{campgrounds} )
}

module.exports.renderNewForm = (req, res)=> {
    res.render('campgrounds/new')
}

module.exports.createCampground = async (req, res, next) => {
    const campground = new Campground (req.body.campground)
    campground.author=req.user._id
    await campground.save()
    req.flash('success','successfuly created a campground !!')
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.showCampground = async (req, res)=>{ 
    const campground = await Campground.findById(req.params.id).populate({
        path:'reviews',populate:{
            path:'author'
        }}).populate('author')
    console.log(campground)
       if(!campground){
        req.flash('error','cannot find that campground')
        return res.redirect('/campgrounds')
    }
    res.render('campgrounds/show' , {campground})
}

module.exports.renderEditForm =  async (req, res)=>{
    const {id} = req.params
    const campground = await Campground.findById(req.params.id)
    res.render('campgrounds/edit',{campground})
}

module.exports.updateCampground =async(req , res)=>{
    const {id}= req.params
    const campground = await Campground.findById(id)
    if(!campground.author.equals(req.user._id)){
        req.flash('error','You dont have the permission to edit since youre not the author ')
        return res.redirect(`/campgrounds/${id}`)
    }
    const camp = await Campground.findByIdAndUpdate(id,{...req.body.campground})
    // campground.save()
    req.flash('success','campground edited')
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteCamground=async (req,res )=> {
    const {id} = req.params
    const campground = await Campground.findByIdAndDelete(id)
    res.redirect('/campgrounds')
}