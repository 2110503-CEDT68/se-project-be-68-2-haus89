const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Record = require('../models/Record');
const { buildQueryFilter, buildPagination } = require('../utils/queryUtils');

// Pipeline stages that enrich a dentist document with averageRating,
// totalReviews, and availableSlotCount. Prepend a $match upstream.
const dentistEnrichmentStages = [
    {
        $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'dentist',
            as: '__reviews',
        },
    },
    {
        $addFields: {
            averageRating: {
                $cond: [
                    { $gt: [{ $size: '$__reviews' }, 0] },
                    { $round: [{ $avg: '$__reviews.rating' }, 1] },
                    0,
                ],
            },
            totalReviews: { $size: '$__reviews' },
            availableSlotCount: {
                $size: {
                    $filter: {
                        input: { $ifNull: ['$availableSlots', []] },
                        as: 'slot',
                        cond: { $eq: ['$$slot.isBooked', false] },
                    },
                },
            },
        },
    },
    { $project: { __reviews: 0, password: 0 } },
];

// @desc    Get all dentists
// @route   GET /api/v1/dentists
// @access  Public
exports.getDentists = async (req, res, next) => {
    try {
        const match = buildQueryFilter(req.query, { role: 'dentist' });

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;

        const sortStage = {};
        if (req.query.sort) {
            req.query.sort.split(',').forEach(f => {
                if (f.startsWith('-')) sortStage[f.slice(1)] = -1;
                else sortStage[f] = 1;
            });
        } else {
            sortStage.createdAt = -1;
        }

        const basePipeline = [
            { $match: match },
            ...dentistEnrichmentStages,
        ];

        const dataPipeline = [
            ...basePipeline,
            { $sort: sortStage },
            { $skip: startIndex },
            { $limit: limit },
        ];

        if (req.query.select) {
            const projection = {};
            req.query.select.split(',').forEach(f => { projection[f] = 1; });
            dataPipeline.push({ $project: projection });
        }

        const [dentists, total] = await Promise.all([
            User.aggregate(dataPipeline),
            User.countDocuments(match),
        ]);

        res.status(200).json({
            success: true,
            count: dentists.length,
            pagination: buildPagination(page, limit, total),
            data: dentists,
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
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        const dentistObjectId = new mongoose.Types.ObjectId(req.params.id);

        const [result] = await User.aggregate([
            { $match: { _id: dentistObjectId, role: 'dentist' } },
            ...dentistEnrichmentStages,
        ]);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: `Dentist not found with id of ${req.params.id}`
            });
        }

        const bookings = await Booking.find({ dentist: req.params.id });

        const slotsWithBooking = (result.availableSlots || []).map(slot => {
            const slotObj = { ...slot };
            if (slot.isBooked) {
                const slotDate = new Date(slot.date);
                slotDate.setHours(0, 0, 0, 0);

                const matched = bookings.find(b => {
                    const bDate = new Date(b.date);
                    bDate.setHours(0, 0, 0, 0);
                    return (
                        bDate.getTime() === slotDate.getTime() &&
                        b.startTime === slot.startTime &&
                        b.endTime === slot.endTime
                    );
                });

                if (matched) {
                    slotObj.bookedBy = matched.user.toString();
                    slotObj.bookingId = matched._id.toString();
                }
            }
            return slotObj;
        });

        result.availableSlots = slotsWithBooking;

        res.status(200).json({ success: true, data: result });
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
