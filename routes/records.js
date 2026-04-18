const express = require("express");
const { getRecords, getRecord } = require("../controllers/records"); // เพิ่ม getRecord ตรงนี้
const { protect } = require("../middleware/auth");

const router = express.Router();

router.route("/")
  .get(protect, getRecords);

router.route("/:id")
  .get(protect, getRecord);

module.exports = router;