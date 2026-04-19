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

// --- Public Routes ---
// GET /api/v1/bookings/dentist/:id/availability
router.get("/dentist/:id/availability", checkAvailability);

// --- Private Routes (User & Admin) ---
// POST /api/v1/bookings
router.post("/", protect, createBooking);

// GET /api/v1/bookings/me
router.get("/me", protect, getMyBooking);

// GET /api/v1/bookings/:id
// PUT /api/v1/bookings/:id
// DELETE /api/v1/bookings/:id
router
  .route("/:id")
  .get(protect, authorize("admin", "dentist"), getBooking)
  .put(protect, updateBooking)
  .delete(protect, deleteBooking);

// --- Admin Only Routes ---
// GET /api/v1/bookings
router.get("/", protect, authorize("admin"), getBookings);

module.exports = router;
