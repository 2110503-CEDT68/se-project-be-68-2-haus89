const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");

const buildPagination = (page, limit, total) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };
  return pagination;
};

// @desc    Get all reviews of the logged-in patient
// @route   GET /api/v1/reviews
// @access  Private (patient)
exports.getReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    const filter = { user: req.user.id };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate({ path: "dentist", select: "name" })
        .sort("-createdAt")
        .skip(startIndex)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination: buildPagination(page, limit, total),
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all reviews for a dentist with averageRating + distribution
// @route   GET /api/v1/reviews/dentist/:dentistId
// @access  Private (patient)
exports.getDentistReviews = async (req, res, next) => {
  try {
    const { dentistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dentistId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid dentist id: ${dentistId}`,
      });
    }

    const dentistExists = await User.exists({
      _id: dentistId,
      role: "dentist",
    });
    if (!dentistExists) {
      return res.status(404).json({
        success: false,
        message: `Dentist not found with id of ${dentistId}`,
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    const dentistObjectId = new mongoose.Types.ObjectId(dentistId);
    const filter = { dentist: dentistObjectId };

    const [reviews, total, statsAgg] = await Promise.all([
      Review.find(filter)
        .populate({ path: "user", select: "name" })
        .sort("-createdAt")
        .skip(startIndex)
        .limit(limit),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: filter },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  averageRating: { $avg: "$rating" },
                  totalReviews: { $sum: 1 },
                },
              },
            ],
            distribution: [{ $group: { _id: "$rating", count: { $sum: 1 } } }],
          },
        },
      ]),
    ]);

    const summary = statsAgg[0]?.summary[0] || {
      averageRating: 0,
      totalReviews: 0,
    };
    const averageRating = summary.totalReviews
      ? Math.round(summary.averageRating * 10) / 10
      : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (statsAgg[0]?.distribution || []).forEach((d) => {
      ratingDistribution[d._id] = d.count;
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pagination: buildPagination(page, limit, total),
      averageRating,
      totalReviews: summary.totalReviews,
      ratingDistribution,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single review (owner only — used to preload edit/delete modal)
// @route   GET /api/v1/reviews/:id
// @access  Private (patient, owner only)
exports.getReview = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review id: ${req.params.id}`,
      });
    }

    const review = await Review.findById(req.params.id)
      .populate({ path: "user", select: "name" })
      .populate({ path: "dentist", select: "name" });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `No review found with the id of ${req.params.id}`,
      });
    }

    if (review.user._id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this review",
      });
    }

    res.status(200).json({ success: true, data: review });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/v1/reviews/:id
// @access  Private (patient, owner only)
exports.deleteReview = async (req, res, next) => {
  try {
    // 1. ตรวจสอบว่า ID ที่ส่งมาเป็น ObjectId ที่ถูกต้องหรือไม่
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review id: ${req.params.id}`,
      });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `No review found with the id of ${req.params.id}`,
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// @desc    Update reviews
// @route   PUT /api/v1/reviews/:id
// @access  Private (patient, owner only)
exports.updateReview = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review id: ${req.params.id}`,
      });
    }

    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: `No review found with the id of ${req.params.id}`,
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        rating: req.body.rating ?? review.rating,
        review: req.body.review ?? review.review,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: review,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
