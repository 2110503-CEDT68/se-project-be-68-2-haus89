const Dentist = require('../models/Dentist');

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
