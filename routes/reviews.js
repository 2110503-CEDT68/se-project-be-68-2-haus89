const express = require("express");
const {
  getReviews,
  getDentistReviews,
  getReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviews");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

// All review endpoints are patient-only (role: user)
router.use(protect, authorize("user"));

router.get("/", getReviews);
router.get("/dentist/:dentistId", getDentistReviews);
router.get("/:id", getReview);

router.put("/:id", updateReview);

router.delete("/:id", deleteReview);

module.exports = router;
