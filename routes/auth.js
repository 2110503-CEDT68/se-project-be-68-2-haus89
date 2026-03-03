const express = require("express");
const { register, login, getMe, logout } = require("../controllers/auth");
const router = express.Router();

const { protect } = require("../middleware/auth");

// @route   POST /api/v1/auth/register
router.post("/register", register);

// @route   POST /api/v1/auth/login
router.post("/login", login);

// @route   GET /api/v1/auth/logout
router.get("/logout", protect, logout);

// @route   GET /api/v1/auth/me
router.get("/me", protect, getMe);

module.exports = router;
