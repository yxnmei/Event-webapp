// middlewares/authMiddleware.js

/**
 * @function isAuthenticated
 * @description Middleware to check if the user is authenticated (logged in).
 *              If not, redirects them to the login page.
 * @inputs req, res, next
 * @outputs Calls next() if authenticated, or redirects to /login.
 */
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    next(); // User is authenticated, proceed to the next middleware/route handler
  } else {
    // Store original URL to redirect after successful login
    req.session.redirectUrl = req.originalUrl;
    res.redirect("/login"); // User is not authenticated, redirect to login page
  }
};

module.exports = isAuthenticated;