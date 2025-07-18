# Event Manager Web Application

This project implements a deployable event manager web application for organizing and booking events.

The application is designed for a single individual or organization to manage their events. It features distinct interfaces for event organizers and attendees, and includes robust data persistence, user authentication, and a clean, responsive design using Tailwind CSS.

## Table of Contents

1.  [Features](#features)
2.  [Technical Specifications](#technical-specifications)
3.  [Extensions Implemented](#extensions-implemented)
4.  [Prerequisites](#prerequisites)
5.  [Installation & Setup](#installation--setup)
6.  [Running the Application](#running-the-application)
7.  [Database Management](#database-management)
8.  [Application Structure](#application-structure)
9.  [Code Style & Comments](#code-style--comments)
10. [Known Issues / Limitations](#known-issues--limitations)
11. [Contact](#contact)

## 1. Features

The Event Manager application provides the following functionalities:

### 1.1 Main Home Page (`/`)
*   A default landing page with links to the Organiser Login and Attendee Home Page.

### 1.2 Organiser Portal (Requires Login)

#### Organiser Home Page (`/organiser`)
*   **Secure Access:** Protected by password authentication.
*   Displays event manager name and description (configurable via Site Settings).
*   Links to Site Settings and View All Bookings.
*   "Create New Event" button to quickly draft an event.
*   Dynamically populated lists of:
    *   **Draft Events:** Events not yet published. Each has "Edit", "Publish", and "Delete" actions.
    *   **Published Events:** Events live for attendees. Each has a "Share Link" (to Attendee Event Page) and "Delete" action.
*   Events display: Title, Date, Location, Category, Tags, Creation/Modification/Publication dates, and ticket availability/price.

#### Site Settings Page (`/organiser/settings`)
*   Allows the organiser to update the site name and description.
*   Form validation for required fields.
*   Back button to Organiser Home.

#### Organiser Edit Event Page (`/organiser/events/:id/edit`)
*   Used for creating new events or amending existing ones.
*   Displays event creation and last modified dates.
*   Form fields for: Title, Description, Event Date & Time, Location, Category (dropdown list), Tags (comma-separated).
*   **Extension: Multiple Ticket Types:** Allows setting `Full Price` and `Concession` tickets, each with its own quantity and amount.
*   Form validation to ensure all required fields are completed.
*   "Save Changes" button.
*   Back button to Organiser Home.

#### Organiser Bookings Page (`/organiser/bookings`)
*   **Extension: View All Bookings:** Displays a comprehensive list of all bookings made for all events.
*   Shows: Booking ID, Event Title, Event Date, Booked By Name, Quantity of Full/Concession Tickets, and Booking Timestamp.

### 1.3 Attendee Portal (Public Access)

#### Attendee Home Page (`/attendee`)
*   Displays the site name and description.
*   Lists all **published** events, ordered by event date (next event appearing at the top).
*   Events display: Title, Date, Time, Location, Category, Tags, and remaining ticket quantities.
*   **Extension: Fully Booked Status:** Events with 0 remaining tickets (both types) are visually marked as "Fully Booked".
*   Each event item links to its dedicated Attendee Event Page.

#### Attendee Event Page (`/attendee/events/:id`)
*   Displays detailed information for a single published event.
*   Shows: Title, Description, Date, Time, Location, Category, Tags, Full Price Ticket details (price, remaining), Concession Ticket details (price, remaining).
*   **Extension: Fully Booked Alert:** Displays a clear "TICKETS SOLD OUT!" alert if the event has no remaining tickets.
*   Booking form:
    *   User can enter their name.
    *   User can select number of Full and Concession tickets.
    *   **Validates** against available ticket quantities.
    *   "Book Tickets" button, which is disabled if the event is fully booked or if no tickets are requested.
    *   Displays success/error messages after booking attempts.
*   Back button to Attendee Home.

## 2. Technical Specifications

*   **Server-Side:** Node.js, Express.js
*   **Database:** SQLite3 (accessed via `sqlite3` npm package)
*   **Templating:** Embedded JavaScript (EJS) for server-side rendering.
*   **Styling:** Tailwind CSS.
*   **Date Handling:** Moment.js for robust date formatting and parsing.
*   **Authentication:**
    *   `express-session` for managing secure user sessions.
    *   `bcryptjs` for secure password hashing and comparison with adjustable salt rounds (cost factor).
    *   `dotenv` for managing environment variables (e.g., session secret, organiser password).
  
## 3. Extensions Implemented

As per the coursework instructions, the following extensions have been implemented:

1.  **Password Access for Organiser Pages and Routes:**
    *   Secure authentication for organiser pages (`/organiser/*`) using `express-session` for session management and `bcryptjs` for password hashing (with configurable salt rounds of 10).
    *   An organiser login page (`/login`) is implemented, authenticating against a password stored in a `.env` environment variable.
    *   All organiser routes are protected by an `isAuthenticated` middleware.
    *   Logout functionality is available from the Organiser Home Page.

2.  **Add Extra Functionality:**
    *   **Different Ticket Types:** Events can be configured with separate `Full Price` and `Concession` ticket quantities and amounts, both in the Organiser Edit Event Page and displayed on attendee pages.
    *   **Show Number of Remaining Tickets:** The count of `Full Price` and `Concession` tickets remaining is displayed on both the Attendee Home Page (event list) and the Attendee Event Page (details and booking form).
    *   **Page for Organiser to See All Bookings:** A dedicated page (`/organiser/bookings`) lists all bookings made across all events, showing relevant booking details.
    *   **"Fully Booked" Status:** The Attendee Home Page visually indicates fully booked events, and the Attendee Event Page displays a clear "TICKETS SOLD OUT!" message and disables the booking form when an event has no remaining tickets.
    *   **Enhanced Event Details:** Added `Location`, `Category`, and `Tags` fields to events, reflected across organiser and attendee views for richer event information.

## 4. Prerequisites

Before running the application, ensure you have the following installed:

*   **Node.js:** Version 16.x or higher (recommended 20.x+ LTS).
*   **npm:** Version 8.x or higher (comes with Node.js).

## 5. Installation & Setup

1.  **Clone the repository / Extract the project zip:**
    ```bash
    # If using git
    git clone <your-repo-url> event-manager
    cd event-manager
    ```
    (Or just navigate to the extracted `event-manager` folder.)

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This will install all required Node.js packages (Express, EJS, SQLite3, bcryptjs, express-session, dotenv, moment).

3.  **Configure Environment Variables:**
    *   Create a file named `.env` in the root of your project (same directory as `package.json`).
    *   Add the following content, replacing the placeholder values:
        ```dotenv
        SESSION_SECRET="your_strong_random_secret_key_here"
        ORGANISER_PASSWORD="your_desired_organiser_password"
        ```
    *   **Generate `SESSION_SECRET`:** It's highly recommended to use a strong, random string. You can generate one using Node.js: open a terminal, type `node`, then `require('crypto').randomBytes(64).toString('hex')` and copy the output.
    *   **Remember to add `.env` to your `.gitignore`** if you are using version control to prevent accidentally committing sensitive data.

4.  **Build the Database Schema:**
    ```bash
    npm run build-db
    ```
    This command will create the `database.db` file in your project root and initialize it with the necessary tables (`site_settings`, `events`, `bookings`) and default site settings. **Run this command whenever you change `db/schema.sql`.** It will delete existing `database.db` file.

## 6. Running the Application

To start the web server:

```bash
npm start
```
You should see output indicating that the server is running on `http://localhost:3000` and connected to the SQLite database.

**Accessing the Application:**

*   **Main Home Page:** `http://localhost:3000/`
*   **Organiser Login:** `http://localhost:3000/login`
*   **Attendee Home Page:** `http://localhost:3000/attendee`

**Login Credentials (for Organiser):**
*   **Password:** The value you set for `ORGANISER_PASSWORD` in your `.env` file.

## 7. Database Management

*   The database file is `database.db` in the project root.
*   To reset the database (delete all data and re-create tables):
    ```bash
    npm run build-db
    ```
    **Warning:** This will erase all existing event and booking data.

## 8. Application Structure

The project follows a modular structure:

*   `index.js`: The main Express.js application entry point, setting up middleware, static file serving, and routing.
*   `routes/`: Contains separate router modules for different sections of the application (`mainRoutes.js`, `authRoutes.js`, `organiserRoutes.js`, `attendeeRoutes.js`).
*   `views/`: Contains EJS template files, organized into subdirectories (`auth/`, `organiser/`, `attendee/`) for different parts of the application.
*   `middlewares/`: Contains custom Express middleware (e.g., `authMiddleware.js` for authentication).
*   `db/`: Contains `schema.sql` (database schema definition) and `build.js` (script to build the database).
*   `public/`: Contains static assets like CSS (though for Tailwind, CSS is loaded via CDN now), images, client-side JS (if any).
*   `.env`: Environment variable configuration file (excluded from Git).
*   `package.json`: Project metadata and dependency management.

## 9. Code Style & Comments

*   All routes are preceded by comments describing their purpose, inputs, and outputs.
*   Database interactions are commented.
*   Code is laid out with consistent indenting and meaningful names for functions and variables.
*   Variables are declared with attention to scoping (`const`, `let`).

## 10. Known Issues / Limitations

*   **Font Awesome CDN Blocking:** Some network environments (e.g., school/corporate) might block `kit.fontawesome.com`. The project uses `cdnjs.cloudflare.com` as an alternative. If icons still don't load, local Font Awesome files might be needed (requires manual download/setup, going against the spirit of "no bundlers").
*   **Basic Validation:** Form validation is server-side and relatively basic. For a production-grade app, more comprehensive client-side and server-side validation (e.g., using libraries like Joi or Express-Validator as mentioned in the project instructions) would be beneficial.
*   **Single Organiser:** The authentication is designed for a single, pre-defined organiser password as per the requirement "naively stored server-side password". There is no multi-user registration system for organisers.
*   **No User Accounts for Attendees:** Attendees do not have accounts; bookings are made with just a name.
*   **Limited Error Pages:** Basic 500 error handling and a simple 404 page.
*   **No API Endpoints:** All data transfer is via server-side rendered EJS.
