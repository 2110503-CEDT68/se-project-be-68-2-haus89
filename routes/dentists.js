const express = require("express");
const router = express.Router();

const {
  getDentists,
  getDentist,
  createDentist,
  updateDentist,
  deleteDentist,
  addSlots,
  deleteSlot,
} = require("../controllers/dentists");

const { protect, authorize } = require("../middleware/auth.js");

/**
 * @swagger
 * tags:
 *   name: Dentists
 *   description: Dentist management operations
 */

// --- Public / Protected ---
/**
 * @swagger
 * /dentists:
 *   get:
 *     summary: List all dentists
 *     tags: [Dentists]
 *     responses:
 *       200:
 *         description: List of dentists
 *   post:
 *     summary: Create a new dentist
 *     tags: [Dentists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               yearsOfExperience:
 *                 type: number
 *               areaOfExpertise:
 *                 type: string
 *                 enum: [General Dentistry, Orthodontics, Periodontology, Endodontics, Prosthodontics, Oral Surgery, Pediatric Dentistry, Cosmetic Dentistry]
 *     responses:
 *       201:
 *         description: Dentist created
 */
// GET /api/v1/dentists (List dentists)
// GET /api/v1/dentists/:id (Get dentist + slots)
router
  .route("/")
  .get(getDentists)
  .post(protect, authorize("admin"), createDentist);

/**
 * @swagger
 * /dentists/{id}:
 *   get:
 *     summary: Get dentist by ID
 *     tags: [Dentists]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dentist details
 *   put:
 *     summary: Update dentist
 *     tags: [Dentists]
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
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               yearsOfExperience:
 *                 type: number
 *               areaOfExpertise:
 *                 type: string
 *                 enum: [General Dentistry, Orthodontics, Periodontology, Endodontics, Prosthodontics, Oral Surgery, Pediatric Dentistry, Cosmetic Dentistry]
 *     responses:
 *       200:
 *         description: Dentist updated
 *   delete:
 *     summary: Delete dentist
 *     tags: [Dentists]
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
 *         description: Dentist removed
 */
router
  .route("/:id")
  .get(getDentist)
  .put(protect, authorize("admin", "dentist"), updateDentist)
  .delete(protect, authorize("admin"), deleteDentist);

/**
 * @swagger
 * /dentists/{id}/slots:
 *   post:
 *     summary: Add slots for a dentist
 *     tags: [Dentists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 example: "10:00"
 *     responses:
 *       201:
 *         description: Slot added
 */
// POST /api/v1/dentists/:id/slots (Add slots)
router.post("/:id/slots", protect, authorize("admin", "dentist"), addSlots);

/**
 * @swagger
 * /dentists/{id}/slots/{slotId}:
 *   delete:
 *     summary: Delete a dentist slot
 *     tags: [Dentists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Slot deleted
 */
// DELETE /api/v1/dentists/:id/slots/:slotId (Delete slot)
router.delete(
  "/:id/slots/:slotId",
  protect,
  authorize("admin", "dentist"),
  deleteSlot,
);

module.exports = router;
