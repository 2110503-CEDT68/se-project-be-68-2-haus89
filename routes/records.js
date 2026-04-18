const express = require("express");
const { getRecords, getRecord, updateRecord } = require("../controllers/records");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.route("/")
  .get(protect, getRecords);

router.route("/:id")
  .get(protect, getRecord)
  .put(protect, authorize("admin", "dentist"), updateRecord);

module.exports = router;