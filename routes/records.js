const express = require("express");
const {
  createRecords,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
} = require("../controllers/records");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router
  .route("/")
  .post(protect, authorize("admin"), createRecords)
  .get(protect, getRecords);

router
  .route("/:id")
  .get(protect, getRecord)
  .put(protect, authorize("admin", "dentist"), updateRecord)
  .delete(protect, authorize("admin", "dentist"), deleteRecord);

module.exports = router;
