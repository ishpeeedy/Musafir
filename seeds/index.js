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
        const random1000 = Math.floor(Math.random()*1000)
        const random100 = Math.floor(Math.random()*100)
        const price = Math.floor(Math.random()*20)+10
        const camp = new Campground({
            location: `${cities[random1000].city},${cities[random1000].state}`,
            title:`${sample(descriptors)} ${sample(places)}`,
            image: `https://picsum.photos/400?random=${Math.random()}`,
            description:"Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.",
            price
        })
        await camp.save()
    }
}

seedDB().then (()=>{
    mongoose.connection.close()
})