const Record = require("../models/Record");
const User = require("../models/User");
const Dentist = require("../models/Dentist");
const Booking = require("../models/Booking");

// @desc    Create record
// @route   POST /api/v1/records
// @access  Private (Admin only)
exports.createRecords = async (req, res, next) => {
  try {
    const {
      patient,
      dentist,
      booking,
      recordDate,
      diagnosis,
      treatments,
      prescriptions,
      followUpDate,
      dentistNote,
    } = req.body;

    const recordData = {
      patient,
      dentist,
      booking,
      recordDate,
      diagnosis,
      treatments,
      prescriptions,
      followUpDate,
      dentistNote,
    };

    const [patientUser, dentistDoc] = await Promise.all([
      User.findOne({ _id: patient, role: "user" }),
      Dentist.findById(dentist),
    ]);

    if (!patientUser) {
      return res.status(404).json({
        success: false,
        message: "Patient not found or is not a user",
      });
    }

    if (!dentistDoc) {
      return res.status(404).json({
        success: false,
        message: "Dentist not found",
      });
    }

    if (booking) {
      const bookingDoc = await Booking.findById(booking);

      if (!bookingDoc) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (
        bookingDoc.user.toString() !== patient.toString() ||
        bookingDoc.dentist.toString() !== dentist.toString()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Booking does not belong to the provided patient and dentist",
        });
      }
    }

    const record = await Record.create(recordData);

    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Get all records
// @route   GET /api/v1/records
// @access  Private

exports.getRecords = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === "admin") {
      query = Record.find();
    } else if (req.user.role === "user") {
      query = Record.find({ patient: req.user.id });
    } else if (req.user.role === "dentist") {
      query = Record.find({ dentist: req.user.id });
    }

    const records = await query
      .populate({
        path: "patient",
        select: "name email",
      })
      .populate({
        path: "dentist",
        select: "name",
      });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single record
// @route   GET /api/v1/records/:id
// @access  Private
exports.getRecord = async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id)
      .populate({
        path: "patient",
        select: "name email",
      })
      .populate({
        path: "dentist",
        select: "name",
      });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `No record found with the id of ${req.params.id}`,
      });
    }

    // authorize roles
    if (
      req.user.role !== "admin" &&
      record.patient._id.toString() !== req.user.id &&
      record.dentist._id.toString() !== req.user.id
    ) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this record",
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Update record
// @route   PUT /api/v1/records/:id
// @access  Private (Admin/Dentist)
exports.updateRecord = async (req, res, next) => {
  try {
    let record = await Record.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `No record found with the id of ${req.params.id}`,
      });
    }

    // authorize roles (only admin and dentist)
    if (req.user.role !== "admin" && req.user.role !== "dentist") {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this record",
      });
    }

    record = await Record.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
