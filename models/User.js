const mongoose = require('mongoose');
const bcypt = require('bcrytjs');
const jwt = require('jsonwebtoken');

const userSchema = new Schema(
  {
    name: {
      type: String, 
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'Please provide a valid email'] // From Class
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // No return 
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null
      // enforces ONE booking per user (max 1 booking)
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updateAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true},
    toObject: { virtuals: true}
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

userSchema.pre('save', async function(next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.getSignedJwtToken = function(){
  return jwt.sign({id:this._id}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
}
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteraedPassword, this.password);
}
      
module.exports = mongoose.model('User', userSchema);