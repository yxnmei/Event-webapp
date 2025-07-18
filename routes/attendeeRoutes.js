// routes/attendeeRoutes.js

const express = require("express");
const router = express.Router();
const moment = require("moment"); // Will be used for date formatting

/**
 * @route GET /attendee
 * @description Renders the Attendee Home Page, listing all published events.
 * @inputs None
 * @outputs Renders 'attendee/home.ejs'
 */
router.get("/", async (req, res, next) => {
    const db = req.app.locals.db;
    try {
        const publishedEvents = await new Promise((resolve, reject) => {
            // Order by event_date with the next event appearing at the top
            db.all("SELECT * FROM events WHERE status = 'published' ORDER BY event_date ASC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Add a 'isFullyBooked' flag to each event for easier templating
        const eventsWithStatus = publishedEvents.map(event => ({
            ...event,
            isFullyBooked: (event.full_price_tickets_available === 0 && event.concession_tickets_available === 0)
        }));


        res.render("attendee/home", {
            pageTitle: "Attendee Home Page",
            publishedEvents: eventsWithStatus, // Pass the events with the new flag
            moment: moment
        });

    } catch (err) {
        console.error("Error fetching published events for attendee home:", err);
        next(err);
    }
});


/**
 * @route GET /attendee/events/:id
 * @description Renders the Attendee Event Page for a specific event.
 * @inputs req.params.id (Event ID)
 * @outputs Renders 'attendee/event-details.ejs'
 */
router.get("/events/:id", async (req, res, next) => {
    const db = req.app.locals.db;
    const eventId = req.params.id;

    try {
        const event = await new Promise((resolve, reject) => {
            // Fetch only published events for attendee
            db.get("SELECT * FROM events WHERE id = ? AND status = 'published'", [eventId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!event) {
            // Use req.session for messages that survive redirects
            req.session.errorMessage = "The event you are looking for does not exist or is not published.";
            return res.status(404).redirect("/attendee"); // Redirect to attendee home with error
        }

        // Add the 'isFullyBooked' flag
        event.isFullyBooked = (event.full_price_tickets_available === 0 && event.concession_tickets_available === 0);

        // Retrieve messages from session if they exist
        const errorMessage = req.session.errorMessage;
        const successMessage = req.session.successMessage;
        // Clear them after retrieval so they don't persist across multiple page loads
        delete req.session.errorMessage;
        delete req.session.successMessage;

        res.render("attendee/event-details", {
            pageTitle: event.title,
            event: event,
            moment: moment,
            errorMessage: errorMessage, // Pass to template
            successMessage: successMessage // Pass to template
        });

    } catch (err) {
        console.error(`Error fetching event ${eventId} for attendee view:`, err);
        next(err);
    }
});


/**
 * @route POST /attendee/events/:id/book
 * @description Handles booking tickets for a specific event.
 * @inputs req.params.id (Event ID), req.body.userName, req.body.fullTickets, req.body.concessionTickets
 * @outputs Redirects to /attendee/events/:id with success/error message
 */
router.post("/events/:id/book", async (req, res, next) => {
    const db = req.app.locals.db;
    const eventId = req.params.id;
    const { userName, fullTickets, concessionTickets } = req.body;

    // Convert ticket counts to numbers
    const numFullTickets = parseInt(fullTickets || 0);
    const numConcessionTickets = parseInt(concessionTickets || 0);
    const totalTicketsRequested = numFullTickets + numConcessionTickets;

    // --- Validation ---
    if (!userName || userName.trim() === '') {
        req.session.errorMessage = "Your name is required to make a booking.";
        return res.redirect(`/attendee/events/${eventId}`);
    }
    if (totalTicketsRequested <= 0) {
        req.session.errorMessage = "You must request at least one ticket.";
        return res.redirect(`/attendee/events/${eventId}`);
    }
    if (isNaN(numFullTickets) || numFullTickets < 0 || isNaN(numConcessionTickets) || numConcessionTickets < 0) {
        req.session.errorMessage = "Invalid number of tickets requested.";
        return res.redirect(`/attendee/events/${eventId}`);
    }


    try {
        const event = await new Promise((resolve, reject) => {
            db.get("SELECT id, title, full_price_tickets_available, concession_tickets_available FROM events WHERE id = ? AND status = 'published'", [eventId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!event) {
            req.session.errorMessage = "Event not found or not published.";
            return res.redirect(`/attendee`);
        }

        // Check availability
        if (numFullTickets > event.full_price_tickets_available || numConcessionTickets > event.concession_tickets_available) {
            req.session.errorMessage = "Requested tickets exceed available quantity!";
            return res.redirect(`/attendee/events/${eventId}`);
        }

        // --- Perform Booking Transaction ---
        // Using a transaction to ensure atomicity for ticket updates and booking creation
        db.serialize(() => { // Ensures operations run sequentially within this connection
            db.run("BEGIN TRANSACTION;");

            // 1. Update event ticket counts
            db.run(
                `UPDATE events
                 SET full_price_tickets_available = full_price_tickets_available - ?,
                     concession_tickets_available = concession_tickets_available - ?
                 WHERE id = ?`,
                [numFullTickets, numConcessionTickets, eventId],
                function (err) {
                    if (err) {
                        db.run("ROLLBACK;");
                        console.error("Error updating ticket counts:", err);
                        req.session.errorMessage = "Failed to update ticket counts. Please try again.";
                        return res.redirect(`/attendee/events/${eventId}`);
                    }

                    // 2. Insert booking record into the 'bookings' table
                    const bookedAt = moment().toISOString();
                    db.run(
                        `INSERT INTO bookings (event_id, user_name, full_tickets_booked, concession_tickets_booked, booked_at)
                         VALUES (?, ?, ?, ?, ?)`,
                        [eventId, userName, numFullTickets, numConcessionTickets, bookedAt],
                        function (err) {
                            if (err) {
                                db.run("ROLLBACK;"); // Rollback event ticket update if booking insert fails
                                console.error("Error inserting booking:", err);
                                req.session.errorMessage = "Failed to record booking. Please try again.";
                                return res.redirect(`/attendee/events/${eventId}`);
                            }
                            db.run("COMMIT;"); // Commit both operations if successful
                            req.session.successMessage = `Successfully booked ${totalTicketsRequested} ticket(s) for "${event.title}"!`;
                            res.redirect(`/attendee/events/${eventId}`);
                        }
                    );
                }
            );
        });

    } catch (err) {
        console.error("General booking error:", err);
        req.session.errorMessage = "An unexpected error occurred during booking.";
        next(err); // Pass error to Express error handler
    }
});


module.exports = router;