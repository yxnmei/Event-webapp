// index.js - Main Server File

require('dotenv').config(); // Load environment variables from .env file
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const session = require("express-session"); // For session management

const app = express();
const PORT = process.env.PORT || 3000;

// --- Configure View Engine (EJS) ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, "public")));

// --- Middleware for Parsing Request Bodies ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Also parse JSON request bodies (useful for APIs, if you add them later)

// --- Session Middleware ---
app.use(session({
  secret: process.env.SESSION_SECRET, // Secret for signing the session ID cookie
  resave: false, // Don't save session if unmodified
  saveUninitialized: false, // Don't create session until something is stored
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // Session duration: 1 day
    httpOnly: true, // Prevent client-side JS from accessing the cookie
    // secure: true, // Uncomment in production if using HTTPS (requires HTTPS server)
    sameSite: 'Lax' // Protection against CSRF attacks
  }
}));

// --- Database Connection ---
const DB_PATH = path.join(__dirname, "database.db");
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
    process.exit(1); // Exit if unable to connect to DB
  } else {
    console.log("Connected to the SQLite database.");
  }
});
app.locals.db = db; // Make DB object available globally to routes

// --- Global Middleware for EJS Locals ---
// This makes session data and site settings available to all EJS templates
app.use(async (req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated; // For conditional rendering (login/logout buttons)

  // Fetch site settings for all pages (e.g., in header/footer)
  try {
    const siteSettings = await new Promise((resolve, reject) => {
      db.get("SELECT name, description FROM site_settings WHERE id = 1", (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    res.locals.siteSettings = siteSettings;
    next();
  } catch (err) {
    console.error("Error fetching site settings for global locals:", err);
    // Even if settings fail, allow processing to continue, but handle gracefully in templates
    res.locals.siteSettings = { name: "Event Manager", description: "Loading failed" };
    next();
  }
});

// --- Route Handling ---
const mainRoutes = require("./routes/mainRoutes");
app.use("/", mainRoutes);

const authRoutes = require("./routes/authRoutes");
app.use("/", authRoutes); // Login/logout routes

const organiserRoutes = require("./routes/organiserRoutes");
const isAuthenticated = require("./middlewares/authMiddleware"); // Import auth middleware
// Protect all organiser-related routes with authentication
app.use("/organiser", isAuthenticated, organiserRoutes);

const attendeeRoutes = require("./routes/attendeeRoutes"); // Will create this next
app.use("/attendee", attendeeRoutes); // Attendee routes don't require authentication

// --- Basic Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  res.status(500).send("Oops! Something went wrong on the server.");
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop the server.");
});