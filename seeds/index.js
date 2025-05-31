const mongoose = require ('mongoose')
const cities =require ('./cities')
const {descriptors , places} = require('./seedHelpers')
const Campground=require('../models/campground')

mongoose.connect('mongodb://localhost:27017/musafir')

const db = mongoose.connection
db.on('error', console.error.bind(console,"connection error:"))
db.once("open" , ()=> {
    console.log('db connected')
})

const sample =(array)=>array[Math.floor(Math.random() *array.length)]

const seedDB = async () =>{
    await Campground.deleteMany({});
    // const c = new Campground({title :'purple field'})
    for (let i=0 ; i<100 ; i++){
        const random100 = Math.floor(Math.random()*1000)
        const camp = new Campground({
            location: `${cities[random100].city},${cities[random100].state}`,
            title:`${sample(descriptors)} ${sample(places)}`

        })
        await camp.save()
    }
}

seedDB().then (()=>{
    mongoose.connection.close()
})