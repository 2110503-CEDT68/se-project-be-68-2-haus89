const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
} = require("../controllers/users");

const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and management
 */

// --- Own Profile Routes (User & Admin) ---
/**
 * @swagger
 * /users/me/profile:
 *   get:
 *     summary: Get my profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *   put:
 *     summary: Update my profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
// @route   GET /api/v1/users/me/profile
// @route   PUT /api/v1/users/me/profile
router
  .route("/me/profile")
  .get(protect, getMyProfile)
  .put(protect, updateMyProfile);

/**
 * @swagger
 * /users/me/password:
 *   put:
 *     summary: Change my password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password successfully changed
 */
// @route   PUT /api/v1/users/me/password
router.put("/me/password", protect, changePassword);

// --- Admin Only Routes ---
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin/Dentist)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 */
// @route   GET /api/v1/users
router.get("/", protect, authorize("admin", "dentist"), getUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User data
 *   put:
 *     summary: Update user (Admin/Dentist)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     summary: Delete user (Admin/Dentist)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
// @route   GET /api/v1/users/:id
// @route   PUT /api/v1/users/:id
// @route   DELETE /api/v1/users/:id
router
  .route("/:id")
  .get(protect, authorize("admin", "dentist"), getUser)
  .put(protect, authorize("admin", "dentist"), updateUser)
  .delete(protect, authorize("admin", "dentist"), deleteUser);

module.exports = router;
