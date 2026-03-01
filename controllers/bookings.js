const Booking = require('../models/Booking');
const User = require('../models/User');
const Dentist = require('../models/Dentist');

// @desc    Create new booking
// @route   POST /api/v1/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
    try {
        // Check if user already has a booking
        const existingBooking = await Booking.findOne({ user: req.user.id });

        if (existingBooking) {
            return res.status(400).json({
                success: false,
                message: 'You already have a booking. Please delete or update your existing booking first.'
            });
        }

        // Add user to req.body
        req.body.user = req.user.id;

        // Verify dentist exists
        const dentist = await Dentist.findById(req.body.dentist);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: 'Dentist not found'
            });
        }

        // Create booking
        const booking = await Booking.create(req.body);

        // Update user's booking reference
        await User.findByIdAndUpdate(req.user.id, { booking: booking._id });

        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
