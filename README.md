# Musafir 

A campground review platform for discovering, sharing, and reviewing campgrounds. Built with Node.js, Express, MongoDB, and MapTiler for Interactive maps with realitime and historic weather data.

![Node.js](https://img.shields.io/badge/Node.js-%23000000.svg?style=for-the-badge&logo=node.js&logoColor=a985ff)
![Express](https://img.shields.io/badge/Express-%23000000.svg?style=for-the-badge&logo=express&logoColor=a985ff)
![MongoDB](https://img.shields.io/badge/MongoDB-%23000000.svg?style=for-the-badge&logo=mongodb&logoColor=a985ff)
![Mongoose](https://img.shields.io/badge/Mongoose-%23000000.svg?style=for-the-badge&logo=mongoose&logoColor=a985ff)
![Passport](https://img.shields.io/badge/Passport-%23000000.svg?style=for-the-badge&logo=passport&logoColor=a985ff)
![EJS](https://img.shields.io/badge/EJS-%23000000.svg?style=for-the-badge&logo=ejs&logoColor=a985ff)
![Cloudinary](https://img.shields.io/badge/Cloudinary-%23000000.svg?style=for-the-badge&logo=cloudinary&logoColor=a985ff)
![Bootstrap](https://img.shields.io/badge/Bootstrap-%23000000.svg?style=for-the-badge&logo=bootstrap&logoColor=a985ff)
![Joi](https://img.shields.io/badge/Joi-%23000000.svg?style=for-the-badge&logo=npm&logoColor=a985ff)
![Helmet](https://img.shields.io/badge/Helmet-%23000000.svg?style=for-the-badge&logo=letsencrypt&logoColor=a985ff)
![MapTiler](https://img.shields.io/badge/MapTiler-%23000000.svg?style=for-the-badge&logo=googlemaps&logoColor=a985ff)
![Render](https://img.shields.io/badge/Render-%23000000.svg?style=for-the-badge&logo=Render&logoColor=a985ff)

<div align="center">
  <a href="https://musafir.ishpeeedy.dev">
    <img src="https://res.cloudinary.com/dzwjyg2ai/image/upload/v1773207657/IMP_Resources/github_assets/Musafir_loader_m3iizy.svg" width="400" />
  </a>
</div>

## Features

- **User Authentication**: Secure signup/login using Passport.js with local strategy
- **Campground Management**: Create, read, update, and delete campgrounds (CRUD operations)
- **Image Uploads**: Multi-image support with Cloudinary integration and thumbnail generation
- **Interactive Maps**:
  - Cluster map view showing all campgrounds (MapTiler SDK)
  - Individual campground location display with markers
  - Geocoding integration for automatic location coordinates
- **Review System**: Authenticated users can leave star ratings and reviews
  - **Weather Data** for the past 7 days and the next 3 days:
  - Temperature (Celsius)
  - "Feels like" temperature
  - Weather condition with icon
  - Humidity
  - Wind speed
  - Precipitation

- **Responsive Design**: Mobile-friendly interface using Bootstrap 5

## Setup & Installation

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas cluster)
- Cloudinary API
- MapTiler API
- Weather API

### Configure environment variables

Create a `.env` file in the root directory:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

# MapTiler API Key
MAPTILER_API_KEY=your_maptiler_key

# WEATHER API Key
WEATHER_API=your_weather_key

# Database URL (local or MongoDB Atlas)
DB_URL=mongodb://localhost:27017/musafir
# OR for production:
# DB_URL=mongodb+srv://username:password@cluster.mongodb.net/musafir

# Session Secret (change in production)
SECRET=your_secret_key
```
