const mongoose = require('mongoose');

const dentistSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Dentist name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    yearsOfExperience: {
      type: Number,
      required: [true, 'Years of experience is required'],
      min: [0, 'Years of experience cannot be negative'],
      max: [100, 'Years of experience seems invalid']
    },
    areaOfExpertise: {
      type: String,
      required: [true, 'Area of expertise is required'],
      enum: [
        'General Dentistry',
        'Orthodontics',
        'Periodontology',
        'Endodontics',
        'Prosthodontics',
        'Oral Surgery',
        'Pediatric Dentistry',
        'Cosmetic Dentistry'
      ]
    },
    email: {
      type: String, 
      required: [true, 'Dentist email is required'],
      unique: true,
      lowercase: true,
      match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please provide a valid email'] 
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
    },
    availableSlots: {
      type: [
        {
          date: {
            type: Date,
            required: true,
          },
          startTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
          },
          endTime: {
            type: String,
            required: true,
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
          },
          isBooked: {
            type: Boolean,
            default: false
          }
        }
      ],
      default: []
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
    toObject: { virtuals: true }j
  }
);

// Indexes for performance
dentistSchema.index({ areaOfExpertise: 1 });
dentistSchema.index({ email: 1 });

// Virtual for available
dentistSchema.virtual('availableSlotCount').get(funciton() {
return this.availableSlots.filter(slot => !slot.isBooked).length;
});

module.exports = mongoose.model('Dentist', dentistSchema);