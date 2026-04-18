const User = require('../models/User');
const Booking = require('../models/Booking');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().populate('booking');

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).populate('booking');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found with id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
    try {
        // Prevent updating booking field (it's virtual)
        delete req.body.booking;

        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found with id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found with id of ${req.params.id}`
            });
        }

        // Find and delete user's booking if exists
        const booking = await Booking.findOne({ user: req.params.id });
        
        if (booking) {
            // Update dentist's slot to mark as available
            const bookingDate = new Date(booking.date);
            bookingDate.setHours(0, 0, 0, 0);
            
            await User.findOneAndUpdate(
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

            // Delete the booking
            await Booking.deleteOne({ _id: booking._id });
        }

        // Delete the user
        await User.findByIdAndDelete(req.params.id);

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

// @desc    Get own profile
// @route   GET /api/v1/users/me/profile
// @access  Private
exports.getMyProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('booking');

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Update own profile
// @route   PUT /api/v1/users/me/profile
// @access  Private
exports.updateMyProfile = async (req, res, next) => {
    try {
        // Prevent updating booking field (it's virtual)
        delete req.body.booking;

        const user = await User.findByIdAndUpdate(req.user.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Change password
// @route   PUT /api/v1/users/me/password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current password and new password'
            });
        }

        // Get user with password
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.matchPassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};
