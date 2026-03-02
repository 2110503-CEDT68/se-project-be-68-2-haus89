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

        // Check if the requested slot exists and is available
        const bookingDate = new Date(req.body.date);
        bookingDate.setHours(0, 0, 0, 0);
        
        const availableSlot = dentist.availableSlots.find(slot => {
            const slotDate = new Date(slot.date);
            slotDate.setHours(0, 0, 0, 0);
            return slotDate.getTime() === bookingDate.getTime() &&
                   slot.startTime === req.body.startTime &&
                   slot.endTime === req.body.endTime &&
                   !slot.isBooked;
        });

        if (!availableSlot) {
            return res.status(400).json({
                success: false,
                message: 'The requested time slot is not available'
            });
        }

        // Create booking
        const booking = await Booking.create(req.body);

        // Update user's booking reference
        await User.findByIdAndUpdate(req.user.id, { booking: booking._id });

        // Update dentist's availableSlots to mark the slot as booked
        await Dentist.findOneAndUpdate(
            {
                _id: req.body.dentist,
                'availableSlots._id': availableSlot._id
            },
            {
                $set: { 'availableSlots.$.isBooked': true }
            }
        );

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

// @desc    Get own booking
// @route   GET /api/v1/bookings/me
// @access  Private
exports.getMyBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findOne({ user: req.user.id }).populate({
            path: 'dentist',
            select: 'name yearsOfExperience areaOfExpertise'
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'No booking found'
            });
        }

        res.status(200).json({
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

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private/Admin
exports.getBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find().populate({
            path: 'dentist',
            select: 'name yearsOfExperience areaOfExpertise'
        }).populate({
            path: 'user',
            select: 'name email phone'
        });

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get single booking
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id).populate({
            path: 'dentist',
            select: 'name yearsOfExperience areaOfExpertise'
        }).populate({
            path: 'user',
            select: 'name email phone'
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `Booking not found with id of ${req.params.id}`
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this booking'
            });
        }

        res.status(200).json({
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

// @desc    Update booking
// @route   PUT /api/v1/bookings/:id
// @access  Private
exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `Booking not found with id of ${req.params.id}`
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this booking'
            });
        }

        // Update booking
        booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
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

// @desc    Delete booking
// @route   DELETE /api/v1/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `Booking not found with id of ${req.params.id}`
            });
        }

        // Check if user owns this booking or is admin
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this booking'
            });
        }

        // Remove booking reference from user
        await User.findByIdAndUpdate(booking.user, { booking: null });

        // Update dentist's availableSlots to mark the slot as available again
        const bookingDate = new Date(booking.date);
        bookingDate.setHours(0, 0, 0, 0);
        
        await Dentist.findOneAndUpdate(
            {
                _id: booking.dentist,
                'availableSlots.date': {
                    $gte: bookingDate,
                    $lt: new Date(bookingDate.getTime() + 24 * 60 * 60 * 1000)
                },
                'availableSlots.startTime': booking.startTime,
                'availableSlots.endTime': booking.endTime
            },
            {
                $set: { 'availableSlots.$.isBooked': false }
            }
        );

        // Delete booking
        await Booking.deleteOne({ _id: req.params.id });

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Check dentist availability
// @route   GET /api/v1/bookings/dentist/:id/availability
// @access  Public
exports.checkAvailability = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        // Get available slots (not booked)
        const availableSlots = dentist.availableSlots.filter(slot => !slot.isBooked);

        res.status(200).json({
            success: true,
            count: availableSlots.length,
            data: availableSlots
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
