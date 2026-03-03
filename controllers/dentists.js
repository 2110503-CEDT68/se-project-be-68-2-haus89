const Dentist = require('../models/Dentist');
const Booking = require('../models/Booking');

// @desc    Get all dentists
// @route   GET /api/v1/dentists
// @access  Public
exports.getDentists = async (req, res, next) => {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit'];

    // Loop over remove fields and delete them from reqQuery
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Dentist.find(JSON.parse(queryStr));

    // Select Fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const total = await Dentist.countDocuments();
        query = query.skip(startIndex).limit(limit);

        // Executing result
        const dentists = await query;

        // Pagination result
        const pagination = {};

        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            };
        }

        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit
            };
        }

        res.status(200).json({
            success: true,
            count: dentists.length,
            pagination,
            data: dentists
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Get single dentist
// @route   GET /api/v1/dentists/:id
// @access  Public
exports.getDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: dentist
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Create new dentist
// @route   POST /api/v1/dentists
// @access  Private/Admin
exports.createDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.create(req.body);

        res.status(201).json({
            success: true,
            data: dentist
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Update dentist
// @route   PUT /api/v1/dentists/:id
// @access  Private/Admin
exports.updateDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: dentist
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Delete dentist
// @route   DELETE /api/v1/dentists/:id
// @access  Private/Admin
exports.deleteDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        // Delete all bookings associated with this dentist
        await Booking.deleteMany({ dentist: req.params.id });

        // Delete the dentist
        await Dentist.deleteOne({ _id: req.params.id });

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

// @desc    Add available slots to dentist
// @route   POST /api/v1/dentists/:id/slots
// @access  Private/Admin
exports.addSlots = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        // Add new slots to existing availableSlots
        const newSlots = req.body.slots || [req.body];
        dentist.availableSlots.push(...newSlots);

        await dentist.save();

        res.status(200).json({
            success: true,
            data: dentist
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// @desc    Delete available slot from dentist
// @route   DELETE /api/v1/dentists/:id/slots/:slotId
// @access  Private/Admin
exports.deleteSlot = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        // Find the slot to be deleted
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

        // If the slot is booked, delete the associated booking
        if (slotToDelete.isBooked) {
            const slotDate = new Date(slotToDelete.date);
            slotDate.setHours(0, 0, 0, 0);
            
            await Booking.deleteOne({
                dentist: req.params.id,
                date: {
                    $gte: slotDate,
                    $lt: new Date(slotDate.getTime() + 24 * 60 * 60 * 1000)
                },
                startTime: slotToDelete.startTime,
                endTime: slotToDelete.endTime
            });
        }

        // Remove the slot
        dentist.availableSlots.splice(slotIndex, 1);
        await dentist.save();

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
