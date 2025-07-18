// routes/organiserRoutes.js

const express = require("express");
const router = express.Router();
const moment = require("moment");

// Middleware to get site settings and pass to all organiser routes
// This is now handled globally in index.js via res.locals.siteSettings,
// but leaving this comment here for context.

/**
 * @route GET /organiser
 * @description Renders the Organiser Home Page, displaying site settings and lists of draft and published events.
 * @inputs None (uses site_settings from res.locals, and fetches events from DB)
 * @outputs Renders 'organiser/home.ejs'
 */
router.get("/", async (req, res, next) => {
  const db = req.app.locals.db; // Access the database connection
  try {
    const events = await new Promise((resolve, reject) => {
      // Order by creation date descending
      db.all("SELECT * FROM events ORDER BY created_at DESC", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Separate events into draft and published lists
    const draftEvents = events.filter(event => event.status === 'draft');
    const publishedEvents = events.filter(event => event.status === 'published');

    // Render the organiser home page
    res.render("organiser/home", {
      pageTitle: "Organiser Home Page",
      draftEvents: draftEvents,
      publishedEvents: publishedEvents,
      moment: moment // Pass moment for date formatting in EJS
    });

  } catch (err) {
    console.error("Error fetching events for organiser home:", err);
    next(err); // Pass error to Express error handler
  }
});


/**
 * @route POST /organiser/events/new
 * @description Creates a new draft event and redirects to its edit page.
 * @inputs None
 * @outputs Redirects to /organiser/events/:id/edit
 */
router.post("/events/new", async (req, res, next) => {
  const db = req.app.locals.db;
  const now = moment().toISOString(); // Current timestamp for creation and modification

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO events (
            title, description, event_date,
            full_price_tickets_available, full_price_amount,
            concession_tickets_available, concession_amount,
            location, category, tags,  -- NEW COLUMNS INCLUDED
            created_at, last_modified_at, status
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'New Draft Event', // Default title
          'Description for new draft event.', // Default description
          moment().add(7, 'days').toISOString(), // Default event date (1 week from now)
          100, 10.00, 50, 5.00, // Default ticket values
          'Online Event', // Default Location
          'Workshop',     // Default Category
          'general',      // Default Tags
          now,
          now,
          'draft'
        ],
        function (err) { // Use function() to access this.lastID
          if (err) reject(err);
          else resolve(this.lastID); // Get the ID of the newly inserted row
        }
      );
    });
    res.redirect(`/organiser/events/${result}/edit`); // Redirect to the new event's edit page
  } catch (err) {
    console.error("Error creating new draft event:", err);
    next(err);
  }
});


/**
 * @route POST /organiser/events/:id/delete
 * @description Deletes an event from the database.
 * @inputs req.params.id (Event ID)
 * @outputs Redirects to /organiser
 */
router.post("/events/:id/delete", async (req, res, next) => {
  const db = req.app.locals.db;
  const eventId = req.params.id;

  try {
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM events WHERE id = ?", [eventId], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });
    res.redirect("/organiser"); // Reload the organiser home page
  } catch (err) {
    console.error(`Error deleting event ${eventId}:`, err);
    next(err);
  }
});


/**
 * @route POST /organiser/events/:id/publish
 * @description Publishes a draft event (sets status to 'published' and updates published_at).
 * @inputs req.params.id (Event ID)
 * @outputs Redirects to /organiser
 */
router.post("/events/:id/publish", async (req, res, next) => {
  const db = req.app.locals.db;
  const eventId = req.params.id;
  const now = moment().toISOString();

  try {
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE events SET status = 'published', published_at = ?, last_modified_at = ? WHERE id = ?",
        [now, now, eventId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    res.redirect("/organiser"); // Reload the organiser home page
  } catch (err) {
    console.error(`Error publishing event ${eventId}:`, err);
    next(err);
  }
});


/**
 * @route GET /organiser/settings
 * @description Renders the Site Settings page for the organiser.
 * @inputs None (site_settings fetched globally)
 * @outputs Renders 'organiser/settings.ejs'
 */
router.get("/settings", async (req, res, next) => {
    // siteSettings is available from res.locals.siteSettings (from global middleware in index.js)
    res.render("organiser/settings", {
        pageTitle: "Site Settings",
        errorMessage: null
    });
});

/**
 * @route POST /organiser/settings
 * @description Handles updating site name and description.
 * @inputs req.body.siteName, req.body.siteDescription
 * @outputs Redirects to /organiser on success, re-renders with error on failure.
 */
router.post("/settings", async (req, res, next) => {
    const db = req.app.locals.db;
    const { siteName, siteDescription } = req.body;
    const now = moment().toISOString();

    // Basic validation
    if (!siteName || siteName.trim() === '' || !siteDescription || siteDescription.trim() === '') {
        // Site settings are available via res.locals.siteSettings even on error re-render
        return res.render("organiser/settings", {
            pageTitle: "Site Settings",
            errorMessage: "Site Name and Description cannot be empty."
        });
    }

    try {
        await new Promise((resolve, reject) => {
            db.run(
                "UPDATE site_settings SET name = ?, description = ?, last_modified_at = ? WHERE id = 1",
                [siteName.trim(), siteDescription.trim(), now],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        // Redirect back to Organiser Home Page after successful update
        res.redirect("/organiser");
    } catch (err) {
        console.error("Error updating site settings:", err);
        next(err);
    }
});


/**
 * @route GET /organiser/events/:id/edit
 * @description Renders the Organiser Edit Event Page, either for a new event or an existing one.
 * @inputs req.params.id (Event ID, or 'new')
 * @outputs Renders 'organiser/edit-event.ejs'
 */
router.get("/events/:id/edit", async (req, res, next) => {
    const db = req.app.locals.db;
    const eventId = req.params.id;

    let event = null;
    if (eventId !== 'new') { // 'new' is a special ID for creating a new event
        try {
            event = await new Promise((resolve, reject) => {
                db.get("SELECT * FROM events WHERE id = ?", [eventId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (!event) {
                // If event not found, redirect to organiser home with an error (or 404 page)
                req.session.errorMessage = "Event not found.";
                return res.redirect("/organiser");
            }
        } catch (err) {
            console.error(`Error fetching event ${eventId} for edit:`, err);
            return next(err); // Pass error to Express error handler
        }
    }
    // Define categories for the dropdown (should be consistent across calls)
    const categories = ['Workshop', 'Seminar', 'Concert', 'Webinar', 'Meetup', 'Other'];

    // If event is null, it's a new event being created.
    // If it's an existing event, it will be populated.
    res.render("organiser/edit-event", {
        pageTitle: event ? "Edit Event" : "Create New Event",
        event: event, // Pass the event data (or null for new)
        moment: moment,
        errorMessage: null,
        categories: categories // Pass categories to the template
    });
});

/**
 * @route POST /organiser/events/:id/edit
 * @description Handles saving changes for an event (either new creation or update).
 * @inputs req.params.id (Event ID, or 'new'), req.body (form fields)
 * @outputs Redirects to /organiser on success, re-renders with error on failure.
 */
router.post("/events/:id/edit", async (req, res, next) => {
    const db = req.app.locals.db;
    const eventId = req.params.id;
    const {
        title,
        description,
        eventDate, // This will be the form input date string
        fullPriceTickets,
        fullPriceAmount,
        concessionTickets,
        concessionAmount,
        location,    // NEW
        category,    // NEW
        tags         // NEW
    } = req.body;
    const now = moment().toISOString();

    // --- Validation (as per requirement, extended for new fields) ---
    if (!title || title.trim() === '' ||
        !description || description.trim() === '' ||
        !eventDate || eventDate.trim() === '' ||
        isNaN(fullPriceTickets) || fullPriceTickets < 0 ||
        isNaN(fullPriceAmount) || fullPriceAmount < 0 ||
        isNaN(concessionTickets) || concessionTickets < 0 ||
        isNaN(concessionAmount) || concessionAmount < 0 ||
        !location || location.trim() === '' || // NEW VALIDATION: Location cannot be empty
        !category || category.trim() === ''    // NEW VALIDATION: Category cannot be empty
        // Tags are optional, no validation needed here.
        ) {
        // Reconstruct event data to re-render the form with entered values
        let eventToRender = {
            id: eventId,
            title: title,
            description: description,
            event_date: eventDate, // Use the raw input date for re-populating form
            full_price_tickets_available: fullPriceTickets,
            full_price_amount: fullPriceAmount,
            concession_tickets_available: concessionTickets,
            concession_amount: concessionAmount,
            location: location,
            category: category,
            tags: tags,
            created_at: now, // Placeholder, actual 'created_at' from DB for existing events
            last_modified_at: now,
            published_at: null,
            status: 'draft'
        };

        // If it's an existing event, try to fetch actual created_at/status for display
        if (eventId !== 'new') {
            try {
                const existingEvent = await new Promise((resolve, reject) => {
                    db.get("SELECT created_at, status FROM events WHERE id = ?", [eventId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                if (existingEvent) {
                    eventToRender.created_at = existingEvent.created_at;
                    eventToRender.status = existingEvent.status;
                }
            } catch (err) {
                console.error("Error re-fetching event data for error render:", err);
            }
        }
        const categories = ['Workshop', 'Seminar', 'Concert', 'Webinar', 'Meetup', 'Other']; // Re-define for error render
        return res.render("organiser/edit-event", {
            pageTitle: eventId !== 'new' ? "Edit Event" : "Create New Event",
            event: eventToRender,
            moment: moment,
            errorMessage: "All fields marked as required (Title, Description, Event Date, Location, Category, and all ticket/amount values) must be completed and valid numbers for tickets/amounts.",
            categories: categories
        });
    }

    const formattedEventDate = moment(eventDate).toISOString(); // Ensure correct ISO format for DB

    try {
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE events SET
                    title = ?, description = ?, event_date = ?,
                    full_price_tickets_available = ?, full_price_amount = ?,
                    concession_tickets_available = ?, concession_amount = ?,
                    location = ?, category = ?, tags = ?,  -- NEW COLUMNS IN UPDATE
                    last_modified_at = ?
                 WHERE id = ?`,
                [
                    title.trim(),
                    description.trim(),
                    formattedEventDate,
                    fullPriceTickets,
                    fullPriceAmount,
                    concessionTickets,
                    concessionAmount,
                    location.trim(),
                    category,
                    tags ? tags.trim() : null, // Save trimmed tags, or null if empty
                    now,
                    eventId
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        res.redirect("/organiser"); // Redirect back to Organiser Home after update
    } catch (err) {
        console.error(`Error updating event ${eventId}:`, err);
        next(err);
    }
});


/**
 * @route GET /organiser/bookings
 * @description Renders the Organiser Bookings Page, displaying all bookings made.
 * @inputs None (fetches all bookings and associated event details)
 * @outputs Renders 'organiser/bookings.ejs'
 */
router.get("/bookings", async (req, res, next) => {
    const db = req.app.locals.db;
    try {
        // Fetch all bookings and join with events to get event titles
        const bookings = await new Promise((resolve, reject) => {
            db.all(
                `SELECT
                    b.id AS booking_id,
                    b.event_id,
                    b.user_name,
                    b.full_tickets_booked,
                    b.concession_tickets_booked,
                    b.booked_at,
                    e.title AS event_title,
                    e.event_date
                FROM bookings b
                JOIN events e ON b.event_id = e.id
                ORDER BY b.booked_at DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.render("organiser/bookings", {
            pageTitle: "All Bookings",
            bookings: bookings,
            moment: moment
        });

    } catch (err) {
        console.error("Error fetching bookings for organiser:", err);
        next(err);
    }
});


// Export the router
module.exports = router;