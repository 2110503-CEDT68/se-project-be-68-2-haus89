const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getMyBooking,
  checkAvailability,
} = require("../controllers/bookings");

const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Booking operations
 */

// --- Public Routes ---
/**
 * @swagger
 * /bookings/dentist/{id}/availability:
 *   get:
 *     summary: Get dentist availability
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Dentist ID
 *     responses:
 *       200:
 *         description: Availability retrieved successfully
 */
// GET /api/v1/bookings/dentist/:id/availability
router.get("/dentist/:id/availability", checkAvailability);

// --- Private Routes (User & Admin) ---
/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Create a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - dentist
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               dentist:
 *                 type: string
 *                 description: Dentist ID
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "10:00"
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authorized
 */
// POST /api/v1/bookings
router.post("/", protect, createBooking);

/**
 * @swagger
 * /bookings/me:
 *   get:
 *     summary: Get your bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Your bookings
 *       401:
 *         description: Not authorized
 */
// GET /api/v1/bookings/me
router.get("/me", protect, getMyBooking);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get single booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 *   put:
 *     summary: Update a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "10:00"
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking updated successfully
 *   delete:
 *     summary: Delete a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking deleted successfully
 */
// GET /api/v1/bookings/:id
// PUT /api/v1/bookings/:id
// DELETE /api/v1/bookings/:id
router
  .route("/:id")
  .get(protect, authorize("admin", "dentist"), getBooking)
  .put(protect, updateBooking)
  .delete(protect, deleteBooking);

// --- Admin Only Routes ---
/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: Get all bookings (Admin/Dentist)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings
 */
// GET /api/v1/bookings
router.get("/", protect, authorize("admin"), getBookings);

module.exports = router;
