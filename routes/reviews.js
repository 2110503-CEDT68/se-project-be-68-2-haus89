const express = require("express");
const {
  getReviews,
  getDentistReviews,
  getReview,
} = require("../controllers/reviews");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All review endpoints are patient-only (role: user)
router.use(protect, authorize("user"));

router.get("/", getReviews);
router.get("/dentist/:dentistId", getDentistReviews);
router.get("/:id", getReview);

module.exports = router;
