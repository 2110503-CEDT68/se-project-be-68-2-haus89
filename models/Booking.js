const mongoose = require('mongoose');

const bookingSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    dentist: {
      type: mongoose.Schema.ObjectId,
      ref: 'Dentist',
      required: [true, 'Dentist is required']
    },
    data: {
      type: Date,
      reuired: [true, 'Appointment date is required'],
      validate: {
        validator: function(value) {
          return value > new Date();
        },
        message: 'Appointment date must be in the future'
      }
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
    },
    status: {
      type: String,
      enum: ['confirmed', 'completed', 'cancelled'],
      default: 'confirmed'
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

bookingSchema.index({ user: 1 }, { unique: true });

bookingSchema.index({ dentist: 1, date: 1});

bookingSchema.index({ dentist: 1, date: 1, startTime: 1, endTime: 1}, { unique: true });

bookingSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

bookingSchema.virtual('appointmentDuration').get(function() {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  const startTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;
  return endTotalMin - startTotalMin;
});

module.exports = mongoose.model('Booking', bookingSchema);
