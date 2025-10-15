# Musafir - Campground Review Platform

A full-stack web application for discovering, sharing, and reviewing campgrounds. Built with Node.js, Express, MongoDB, and MapTiler for interactive maps.

## 🌟 Features

- **User Authentication**: Secure signup/login using Passport.js with local strategy
- **Campground Management**: Create, read, update, and delete campgrounds (CRUD operations)
- **Image Uploads**: Multi-image support with Cloudinary integration and thumbnail generation
- **Interactive Maps**:
  - Cluster map view showing all campgrounds (MapTiler SDK)
  - Individual campground location display with markers
  - Geocoding integration for automatic location coordinates
- **Review System**: Authenticated users can leave star ratings and reviews
- **Authorization**: Users can only edit/delete their own campgrounds and reviews
- **Input Validation**: Server-side validation with Joi schemas
- **Security Features**:
  - Helmet.js for HTTP header security
  - express-mongo-sanitize to prevent NoSQL injection
  - Content Security Policy (CSP) configuration
  - Session management with MongoDB session store
- **Responsive Design**: Mobile-friendly interface using Bootstrap 5
- **Flash Messages**: User feedback for successful/error operations
- **Error Handling**: Custom error pages and async error wrapper

## 📁 Project Structure

```
musafir/
├── api/                          # Serverless function wrapper for deployment
│   └── index.js                  # Vercel serverless handler
│
├── cloudinary/                   # Cloudinary configuration
│   └── index.js                  # Cloudinary setup and Multer storage config
│
├── controllers/                  # Route controllers (MVC pattern)
│   ├── campgrounds.js            # Campground CRUD logic
│   ├── reviews.js                # Review operations
│   └── users.js                  # User authentication logic
│
├── models/                       # Mongoose schemas and models
│   ├── campground.js             # Campground schema with geometry, images, reviews
│   ├── review.js                 # Review schema with rating and author
│   └── user.js                   # User schema with passport-local-mongoose
│
├── public/                       # Static assets
│   ├── javascripts/
│   │   ├── clusterMap.js         # MapTiler cluster map for campground index
│   │   ├── showPageMap.js        # MapTiler map for individual campground
│   │   └── validateForms.js      # Client-side Bootstrap validation
│   └── stylesheets/
│       └── stars.css             # Star rating styles
│
├── routes/                       # Express route definitions
│   ├── campgrounds.js            # Campground routes with middleware
│   ├── reviews.js                # Review routes (nested under campgrounds)
│   └── users.js                  # User registration/login/logout routes
│
├── seeds/                        # Database seeding
│   ├── index.js                  # Seed script to populate database
│   ├── cities.js                 # US cities data with coordinates
│   └── seedHelpers.js            # Random name generators for campgrounds
│
├── utils/                        # Utility modules
│   ├── catchAsync.js             # Async error wrapper for route handlers
│   └── ExpressError.js           # Custom error class with status codes
│
├── views/                        # EJS templates
│   ├── campgrounds/
│   │   ├── index.ejs             # All campgrounds with cluster map
│   │   ├── new.ejs               # Create new campground form
│   │   ├── show.ejs              # Single campground detail with map and reviews
│   │   └── edit.ejs              # Edit campground form with image management
│   ├── layouts/
│   │   └── boilerplate.ejs       # Main layout template
│   ├── partials/
│   │   ├── navbar.ejs            # Navigation bar
│   │   ├── footer.ejs            # Footer
│   │   └── flash.ejs             # Flash message display
│   ├── users/
│   │   ├── register.ejs          # User registration form
│   │   └── login.ejs             # User login form
│   ├── home.ejs                  # Landing page
│   └── error.ejs                 # Error page template
│
├── .env                          # Environment variables (not in git)
├── .gitignore                    # Git ignore file
├── app.js                        # Main application entry point
├── middleware.js                 # Custom middleware (auth, validation, authorization)
├── package.json                  # Dependencies and scripts
├── schemas.js                    # Joi validation schemas
└── vercel.json                   # Vercel deployment configuration
```

## 🏗️ Architecture & How It Works

### Application Flow

#### 1. **Application Entry Point (`app.js`)**

- Loads environment variables via `dotenv`
- Connects to MongoDB (local or Atlas via `DB_URL`)
- Configures Express middleware:
  - `ejs-mate` for template layouts
  - `express-session` with MongoDB store for persistent sessions
  - `passport` for authentication with local strategy
  - `helmet` for security headers with custom CSP rules
  - `express-mongo-sanitize` to prevent NoSQL injection
  - `connect-flash` for temporary messages
  - `method-override` for HTTP verb support (PUT/DELETE)
  - `multer` for file uploads (configured in routes)
- Sets up routes: `/` (users), `/campgrounds`, `/campgrounds/:id/reviews`
- Error handling middleware catches and renders errors
- Exports app for serverless deployment (Vercel)

#### 2. **Routing System**

**Campground Routes (`routes/campgrounds.js`)**

```
GET    /campgrounds              → index (list all)
POST   /campgrounds              → create (with image upload)
GET    /campgrounds/new          → renderNewForm
GET    /campgrounds/:id          → show (single campground)
PUT    /campgrounds/:id          → update (with image upload)
DELETE /campgrounds/:id          → delete
GET    /campgrounds/:id/edit     → renderEditForm
```

**Review Routes (`routes/reviews.js`)** - nested under campgrounds

```
POST   /campgrounds/:id/reviews           → create review
DELETE /campgrounds/:id/reviews/:reviewId → delete review
```

**User Routes (`routes/users.js`)**

```
GET    /register    → renderRegister
POST   /register    → register
GET    /login       → renderLogin
POST   /login       → authenticate and login
GET    /logout      → logout
```

#### 3. **Middleware Chain (`middleware.js`)**

**Authentication Middleware:**

- `isLoggedIn`: Checks if user is authenticated; redirects to login if not
- `storeReturnTo`: Stores the return URL for post-login redirect

**Validation Middleware:**

- `validateCampground`: Joi schema validation for campground data
- `validateReview`: Joi schema validation for review data

**Authorization Middleware:**

- `isAuthor`: Ensures user owns the campground before allowing edit/delete
- `isReviewAuthor`: Ensures user owns the review before allowing delete

#### 4. **Data Models**

**Campground Model (`models/campground.js`)**

```javascript
{
  title: String,
  images: [{ url: String, filename: String }],  // Cloudinary URLs
  geometry: {
    type: "Point",                              // GeoJSON format
    coordinates: [longitude, latitude]
  },
  price: Number,
  description: String,
  location: String,
  author: ObjectId → User,
  reviews: [ObjectId → Review]
}
```

- Virtual property `thumbnail`: Generates 200px wide thumbnails from Cloudinary URLs
- Virtual property `properties.popUpMarkup`: HTML for map popup
- Post-delete hook: Removes associated reviews when campground is deleted

**User Model (`models/user.js`)**

```javascript
{
  email: String (unique),
  // username and password handled by passport-local-mongoose plugin
}
```

**Review Model (`models/review.js`)**

```javascript
{
  body: String,
  rating: Number (1-5),
  author: ObjectId → User
}
```

#### 5. **Controller Logic Flow**

**Creating a Campground (`controllers/campgrounds.js`)**

1. Receives form data with location and uploaded images
2. Geocodes location using MapTiler API → gets coordinates
3. Creates new Campground document with:
   - Form data
   - GeoJSON geometry from geocoding
   - Image URLs from Cloudinary upload (via Multer)
   - Current user as author
4. Saves to database
5. Redirects to show page with success flash

**Updating a Campground**

1. Finds existing campground by ID
2. Updates fields from form data
3. Re-geocodes location if changed
4. Appends new uploaded images to existing array
5. Removes images if marked for deletion (from Cloudinary + DB)
6. Saves and redirects

**Image Upload Flow**

1. User selects files in form (multipart/form-data)
2. Multer middleware intercepts `req.files`
3. Cloudinary storage plugin uploads to cloud
4. Returns URL and filename for each image
5. Controller maps files to `{ url, filename }` objects
6. Stores in campground.images array

#### 6. **Map Integration**

**Cluster Map (`public/javascripts/clusterMap.js`)**

- Receives GeoJSON of all campgrounds from server
- Initializes MapTiler SDK with API key
- Adds GeoJSON source with clustering enabled
- Creates three layers:
  - `clusters`: Colored circles scaled by campground count
  - `cluster-count`: Labels showing number in each cluster
  - `unclustered-point`: Individual markers when zoomed in
- Click handlers: Zoom into clusters or show campground popup

**Show Page Map (`public/javascripts/showPageMap.js`)**

- Centers map on campground's geometry coordinates
- Adds single marker with popup showing title and location

**Geocoding Flow**

1. User enters location (e.g., "Yosemite, CA")
2. Controller calls MapTiler geocoding API
3. Returns GeoJSON with coordinates
4. Stores as `geometry: { type: "Point", coordinates: [lng, lat] }`
5. Used for map rendering and clustering

#### 7. **Authentication Flow**

**Registration**

1. User submits username, email, password
2. Controller creates User document
3. `User.register()` hashes password (passport-local-mongoose)
4. Auto-login after registration
5. Redirects to campgrounds

**Login**

1. User submits username/password
2. Passport LocalStrategy authenticates
3. Serializes user to session (stored in MongoDB)
4. Redirects to returnTo URL or campgrounds

**Session Management**

- Sessions stored in MongoDB via `connect-mongo`
- Cookie expires after 7 days
- User ID stored in session and available as `req.user`

#### 8. **Security Implementation**

**Helmet Configuration**

- Sets various HTTP headers for security
- Custom CSP allows:
  - Scripts from Bootstrap, FontAwesome, MapTiler
  - Styles from Google Fonts, Bootstrap
  - Images from Cloudinary, Unsplash, MapTiler
  - API connections to MapTiler

**Input Sanitization**

- `express-mongo-sanitize` strips `$` and `.` from user input
- Prevents NoSQL injection attacks

**Validation**

- Client-side: Bootstrap validation classes
- Server-side: Joi schemas enforce:
  - Required fields
  - Data types (string, number)
  - Ranges (price ≥ 0, rating 1-5)

**Authorization**

- Middleware checks ownership before allowing edits
- Flash messages explain denied actions
- Redirects to safe pages

#### 9. **Error Handling**

**Async Wrapper (`utils/catchAsync.js`)**

```javascript
// Wraps async route handlers to catch errors
catchAsync(async (req, res) => { ... })
// Catches rejections and passes to error middleware
```

**Custom Error Class (`utils/ExpressError.js`)**

- Extends Error with statusCode property
- Allows throwing errors with HTTP status codes

**Error Middleware (`app.js`)**

- Catches all errors
- Extracts status code and message
- Renders `error.ejs` template with error details

#### 10. **View Rendering**

**EJS Template Engine**

- `ejs-mate` provides layout support
- `boilerplate.ejs` wraps all pages with navbar/footer
- Partials for reusable components (navbar, flash messages)

**Data Flow to Views**

```javascript
res.render("campgrounds/show", { campground });
```

- Controller fetches data from database
- Populates references (author, reviews with authors)
- Passes to template
- Template accesses via `<%= campground.title %>`

**Client-Side Scripts Injection**

```javascript
// In show.ejs
const campground = <%- JSON.stringify(campground) %>;
const maptilerApiKey = '<%= process.env.MAPTILER_API_KEY %>';
```

- Server renders JavaScript with campground data
- Map scripts use this data to render markers

#### 11. **Database Seeding**

**Seed Script (`seeds/index.js`)**

1. Connects to local MongoDB
2. Deletes all existing campgrounds
3. Creates 300 random campgrounds:
   - Selects random US city from cities array
   - Generates random title from descriptors + places
   - Assigns fixed author ID (must exist in users collection)
   - Sets random price
   - Uses city coordinates for geometry
   - Assigns 2 sample images from Cloudinary
4. Saves all and closes connection

**Running Seeds**

```bash
node seeds/index.js
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas cluster)
- Cloudinary account
- MapTiler account

### Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/ishpeeedy/musafir.git
cd musafir
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_api_key
CLOUDINARY_SECRET=your_api_secret

# MapTiler API Key
MAPTILER_API_KEY=your_maptiler_key

# Database URL (local or MongoDB Atlas)
DB_URL=mongodb://localhost:27017/musafir
# OR for production:
# DB_URL=mongodb+srv://username:password@cluster.mongodb.net/musafir

# Session Secret (change in production)
SECRET=your_secret_key
```

4. **Seed the database (optional)**

First, create a user account in the app, then update `seeds/index.js` with your user ID:

```javascript
author: "YOUR_USER_ID_HERE"; // Line 23 in seeds/index.js
```

Then run:

```bash
node seeds/index.js
```

5. **Start the application**

Development mode (with nodemon):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The app will run on `http://localhost:3000`

## 🌐 Deployment (Vercel)

The application is configured for serverless deployment on Vercel:

1. **Install Vercel CLI** (optional)

```bash
npm install -g vercel
```

2. **Configure environment variables in Vercel dashboard**

   - Go to Project Settings → Environment Variables
   - Add all variables from `.env`

3. **Deploy**

```bash
vercel --prod
```

**Note:** The `vercel.json` routes all requests to `api/index.js`, which wraps the Express app using `serverless-http`.

## 📦 Dependencies

### Core

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **ejs** & **ejs-mate**: Template engine with layouts

### Authentication

- **passport**: Authentication middleware
- **passport-local**: Local username/password strategy
- **passport-local-mongoose**: User authentication plugin

### File Uploads & Storage

- **multer**: Multipart form data handling
- **cloudinary**: Cloud image storage
- **multer-storage-cloudinary**: Multer storage engine for Cloudinary

### Maps & Geocoding

- **@maptiler/client**: MapTiler SDK for maps and geocoding

### Security

- **helmet**: Security headers
- **express-mongo-sanitize**: NoSQL injection prevention
- **sanitize-html**: HTML sanitization
- **joi**: Schema validation

### Session & Flash

- **express-session**: Session management
- **connect-mongo**: MongoDB session store
- **connect-flash**: Flash messages

### Utilities

- **dotenv**: Environment variable management
- **method-override**: HTTP verb support (PUT/DELETE)
- **bs-custom-file-input**: Bootstrap file input enhancement

## 🔑 Key Technologies

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js (Local Strategy)
- **View Engine**: EJS with layouts (ejs-mate)
- **Image Storage**: Cloudinary
- **Maps**: MapTiler SDK (cluster maps, geocoding)
- **Styling**: Bootstrap 5
- **Validation**: Joi (server-side), Bootstrap (client-side)
- **Security**: Helmet, Mongo Sanitize
- **Deployment**: Vercel (serverless functions)

## 🛡️ Security Features

1. **Authentication**: Secure password hashing with bcrypt (via passport-local-mongoose)
2. **Authorization**: Ownership checks before edit/delete operations
3. **Input Validation**: Joi schemas + client-side validation
4. **NoSQL Injection Prevention**: express-mongo-sanitize
5. **XSS Protection**: Helmet with CSP, HTML sanitization
6. **Session Security**: HTTP-only cookies, secure in production
7. **CSRF Protection**: Not yet implemented (future enhancement)

## 📝 API Endpoints

### Campgrounds

- `GET /campgrounds` - List all campgrounds
- `GET /campgrounds/new` - New campground form (auth required)
- `POST /campgrounds` - Create campground (auth required)
- `GET /campgrounds/:id` - Show campground
- `GET /campgrounds/:id/edit` - Edit form (auth + ownership required)
- `PUT /campgrounds/:id` - Update campground (auth + ownership required)
- `DELETE /campgrounds/:id` - Delete campground (auth + ownership required)

### Reviews

- `POST /campgrounds/:id/reviews` - Create review (auth required)
- `DELETE /campgrounds/:id/reviews/:reviewId` - Delete review (auth + ownership required)

### Users

- `GET /register` - Registration form
- `POST /register` - Create user account
- `GET /login` - Login form
- `POST /login` - Authenticate user
- `GET /logout` - Logout user

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Anuj Sharma** ([@ishpeeedy](https://github.com/ishpeeedy))

## 🙏 Acknowledgments

- MapTiler for maps and geocoding API
- Cloudinary for image hosting and transformation
- Bootstrap for responsive UI components
- The Colt Steele Web Developer Bootcamp for project inspiration

---

**Note**: Remember to never commit your `.env` file or expose API keys publicly. Always use environment variables for sensitive data.
