// routes/authRoutes.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // Import bcryptjs

// Configuration for bcrypt salt rounds
const SALT_ROUNDS = 10; // Standard practice is 10-12

// This variable will hold the hashed password. In a real application,
// this would be fetched from a database for a user, not an env variable.
// But for this project's requirement, we hash the plaintext env var.
let HASHED_ORGANISER_PASSWORD = null;

/**
 * @function hashOrganiserPassword
 * @description Hashes the plaintext ORGANISER_PASSWORD from environment variables using bcrypt.
 *              This runs once when the server starts.
 * @inputs None (reads from process.env)
 * @outputs Sets HASHED_ORGANISER_PASSWORD global variable.
 */
async function hashOrganiserPassword() {
  const plainTextPassword = process.env.ORGANISER_PASSWORD;
  if (!plainTextPassword) {
    console.error("CRITICAL: ORGANISER_PASSWORD environment variable is not set! Organiser login will fail.");
    return;
  }
  try {
    HASHED_ORGANISER_PASSWORD = await bcrypt.hash(plainTextPassword, SALT_ROUNDS);
    console.log("Organiser password hashed successfully (in-memory for comparison).");
  } catch (err) {
    console.error("Error hashing organiser password at startup:", err);
  }
}

// Hash the password when this module is loaded (i.e., when server starts)
hashOrganiserPassword();

/**
 * @route GET /login
 * @description Renders the login page for the organiser.
 * @inputs None
 * @outputs Renders 'auth/login.ejs'
 */
router.get("/login", (req, res) => {

  res.render("auth/login", { pageTitle: "Organiser Login", errorMessage: null });
});

/**
 * @route POST /login
 * @description Handles organiser login attempt, authenticates against password.
 * @inputs req.body.password (Password entered by user)
 * @outputs Redirects to /organiser on success, re-renders login with error on failure.
 */
router.post("/login", async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res.render("auth/login", { pageTitle: "Organiser Login", errorMessage: "Password is required." });
  }

  // Ensure password is hashed before comparison (in case startup hashing failed)
  if (!HASHED_ORGANISER_PASSWORD) {
      console.warn("Attempting to re-hash organiser password during login attempt.");
      await hashOrganiserPassword(); // Try hashing again
      if (!HASHED_ORGANISER_PASSWORD) {
          return res.render("auth/login", { pageTitle: "Organiser Login", errorMessage: "Server password not configured. Please contact administrator." });
      }
  }

  try {
    const isMatch = await bcrypt.compare(password, HASHED_ORGANISER_PASSWORD);

    if (isMatch) {
      req.session.isAuthenticated = true; // Set session flag
      const redirectTo = req.session.redirectUrl || "/organiser"; // Redirect to original destination
      delete req.session.redirectUrl; // Clean up
      res.redirect(redirectTo);
    } else {
      res.render("auth/login", { pageTitle: "Organiser Login", errorMessage: "Invalid password." });
    }
  } catch (err) {
    console.error("Error during password comparison:", err);
    next(err); // Pass error to Express error handler
  }
});

/**
 * @route GET /logout
 * @description Logs out the organiser by destroying the session.
 * @inputs None
 * @outputs Redirects to /
 */
router.get("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return next(err); // Pass error to Express error handler
    }
    // Clear the cookie client-side
    res.clearCookie('connect.sid'); // Default name for express-session cookie
    res.redirect("/"); // Redirect to main home page
  });
});

module.exports = router;