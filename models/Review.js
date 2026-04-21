const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    rating: {
        type: Number,
        required: [true, 'Please add a rating between 1 and 5'],
        min: 1,
        max: 5
    },
    review: {
        type: String,
        required: [true, 'Please add a comment for your review'],
        trim: true,
        maxlength: [500, 'Review cannot be more than 500 characters']
    },
    dentist: {
        type: mongoose.Schema.ObjectId,
        ref: 'Dentist',
        required: true
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ReviewSchema.index({ dentist: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', ReviewSchema);