const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [1, "Name must be at least 1 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please provide a valid email",
      ], // From Class
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      match: [
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
        "Please provide a valid phone number",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // No return
    },
    role: {
      type: String,
      enum: ["user", "admin","dentist"],
      default: "user",
    },
    yearsOfExperience: {
      type: Number,
      min: [0, "Years of experience cannot be negative"],
      max: [100, "Years of experience seems invalid"],
    },
    areaOfExpertise: {
      type: String,
      enum: [
        "General Dentistry",
        "Orthodontics",
        "Periodontology",
        "Endodontics",
        "Prosthodontics",
        "Oral Surgery",
        "Pediatric Dentistry",
        "Cosmetic Dentistry",
      ],
    },
    availableSlots: {
      type: [
        {
          date: { type: Date, required: true },
          startTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"],
          },
          endTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"],
          },
          isBooked: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updateAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes for performance
UserSchema.index({ phone: 1 });

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.virtual("availableSlotCount").get(function () {
  return this.availableSlots ? this.availableSlots.filter((s) => !s.isBooked).length : 0;
});

// Virtual populate for booking
UserSchema.virtual("booking", {
  ref: "Booking",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

module.exports = mongoose.model("User", UserSchema);
