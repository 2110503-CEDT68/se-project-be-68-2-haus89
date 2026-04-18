const mongoose = require("mongoose");

const treatmentItemSchema = new mongoose.Schema(
  {
    procedureName: {
      type: String,
      required: [true, "Procedure name is required"],
      trim: true,
      maxlength: [100, "Procedure name cannot exceed 100 characters"],
    },
    toothNumber: {
      type: String,
      trim: true,
      maxlength: [10, "Tooth number cannot exceed 10 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Treatment note cannot exceed 500 characters"],
    },
    cost: {
      type: Number,
      min: [0, "Cost cannot be negative"],
      default: 0,
    },
  },
  { _id: false },
);

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicationName: {
      type: String,
      required: [true, "Medication name is required"],
      trim: true,
      maxlength: [100, "Medication name cannot exceed 100 characters"],
    },
    dosage: {
      type: String,
      trim: true,
      maxlength: [100, "Dosage cannot exceed 100 characters"],
    },
    frequency: {
      type: String,
      trim: true,
      maxlength: [100, "Frequency cannot exceed 100 characters"],
    },
    duration: {
      type: String,
      trim: true,
      maxlength: [100, "Duration cannot exceed 100 characters"],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, "Instruction cannot exceed 500 characters"],
    },
  },
  { _id: false },
);

const recordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Patient is required"],
    },
    dentist: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Dentist is required"],
    },
    booking: {
      type: mongoose.Schema.ObjectId,
      ref: "Booking",
    },
    recordDate: {
      type: Date,
      required: [true, "Record date is required"],
      default: Date.now,
    },
    diagnosis: {
      type: String,
      required: [true, "Diagnosis is required"],
      trim: true,
      maxlength: [1000, "Diagnosis cannot exceed 1000 characters"],
    },
    treatments: {
      type: [treatmentItemSchema],
      default: [],
    },
    prescriptions: {
      type: [prescriptionItemSchema],
      default: [],
    },
    followUpDate: {
      type: Date,
    },
    dentistNote: {
      type: String,
      trim: true,
      maxlength: [2000, "Dentist note cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

recordSchema.index({ patient: 1, recordDate: -1 });
recordSchema.index({ dentist: 1, recordDate: -1 });
recordSchema.index({ booking: 1 }, { sparse: true });

recordSchema.virtual("totalTreatmentCost").get(function () {
  if (!this.treatments || this.treatments.length === 0) {
    return 0;
  }

  return this.treatments.reduce((total, item) => total + (item.cost || 0), 0);
});

module.exports = mongoose.model("Record", recordSchema);
