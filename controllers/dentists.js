const User = require('../models/User');
const Booking = require('../models/Booking');
const Record = require('../models/Record');

// @desc    Get all dentists
// @route   GET /api/v1/dentists
// @access  Public
exports.getDentists = async (req, res, next) => {
    let query;

    const reqQuery = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete reqQuery[param]);

    let queryStr = JSON.stringify(reqQuery);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    query = User.find({ ...JSON.parse(queryStr), role: 'dentist' });

    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await User.countDocuments({ role: 'dentist' });
        query = query.skip(startIndex).limit(limit);

        const dentists = await query;

        const pagination = {};
        if (endIndex < total) pagination.next = { page: page + 1, limit };
        if (startIndex > 0) pagination.prev = { page: page - 1, limit };

        res.status(200).json({
            success: true,
            count: dentists.length,
            pagination,
            data: dentists
        });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Get single dentist
// @route   GET /api/v1/dentists/:id
// @access  Public
exports.getDentist = async (req, res, next) => {
    try {
        const dentist = await User.findOne({ _id: req.params.id, role: 'dentist' });

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        res.status(200).json({ success: true, data: dentist });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Create new dentist (admin provides initial password)
// @route   POST /api/v1/dentists
// @access  Private/Admin
exports.createDentist = async (req, res, next) => {
    try {
        const dentist = await User.create({ ...req.body, role: 'dentist' });

        res.status(201).json({ success: true, data: dentist });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Update dentist
// @route   PUT /api/v1/dentists/:id
// @access  Private/Admin or own Dentist
exports.updateDentist = async (req, res, next) => {
    try {
        if (req.user.role === 'dentist' && req.params.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
        }

        const dentist = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'dentist' },
            req.body,
            { new: true, runValidators: true }
        );

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        res.status(200).json({ success: true, data: dentist });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Delete dentist
// @route   DELETE /api/v1/dentists/:id
// @access  Private/Admin
exports.deleteDentist = async (req, res, next) => {
    try {
        const dentist = await User.findOne({ _id: req.params.id, role: 'dentist' });

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        await Booking.deleteMany({ dentist: req.params.id });
        await Record.deleteMany({ dentist: req.params.id });
        await User.deleteOne({ _id: req.params.id });

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Add available slots to dentist
// @route   POST /api/v1/dentists/:id/slots
// @access  Private/Admin or own Dentist
exports.addSlots = async (req, res, next) => {
    try {
        if (req.user.role === 'dentist' && req.params.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this dentist\'s slots' });
        }

        const dentist = await User.findOne({ _id: req.params.id, role: 'dentist' });

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        const newSlots = req.body.slots || [req.body];
        dentist.availableSlots.push(...newSlots);
        await dentist.save();

        res.status(200).json({ success: true, data: dentist });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

// @desc    Delete available slot from dentist
// @route   DELETE /api/v1/dentists/:id/slots/:slotId
// @access  Private/Admin or own Dentist
exports.deleteSlot = async (req, res, next) => {
    try {
        if (req.user.role === 'dentist' && req.params.id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Not authorized to manage this dentist\'s slots' });
        }

        const dentist = await User.findOne({ _id: req.params.id, role: 'dentist' });

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        const slotIndex = dentist.availableSlots.findIndex(
            slot => slot._id.toString() === req.params.slotId
        );

        if (slotIndex === -1) {
            return res.status(404).json({
                success: false,
                message: `Slot not found with id of ${req.params.slotId}`
            });
        }

        const slotToDelete = dentist.availableSlots[slotIndex];

        if (slotToDelete.isBooked) {
            const slotDate = new Date(slotToDelete.date);
            slotDate.setHours(0, 0, 0, 0);

            await Booking.deleteOne({
                dentist: req.params.id,
                date: { $gte: slotDate, $lt: new Date(slotDate.getTime() + 24 * 60 * 60 * 1000) },
                startTime: slotToDelete.startTime,
                endTime: slotToDelete.endTime
            });
        }

        dentist.availableSlots.splice(slotIndex, 1);
        await dentist.save();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
