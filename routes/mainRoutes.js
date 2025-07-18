// routes/mainRoutes.js - Defines routes for the main home page

const express = require("express");
const router = express.Router();

/**
 * @route GET /
 * @description Renders the default home page of the application, providing links to the
 *              Organiser and Attendee sections.
 * @inputs None
 * @outputs Renders the 'main.ejs' template with page title and navigation links.
 */
router.get("/", (req, res) => {
  res.render("main", {
    pageTitle: "Welcome to the Event Manager",
    organizerLink: "/organiser", // URL for the Organiser Home Page (to be implemented)
    attendeeLink: "/attendee", // URL for the Attendee Home Page (to be implemented)
  });
});

module.exports = router;