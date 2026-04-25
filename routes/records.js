const express = require("express");
const {
  createRecords,
  getRecords,
  getRecord,
  updateRecord,
  deleteRecord,
} = require("../controllers/records");
const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Medical records operations
 */

const router = express.Router();

/**
 * @swagger
 * /records:
 *   get:
 *     summary: Get all records
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of records
 *   post:
 *     summary: Create a new record
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient
 *               - dentist
 *               - diagnosis
 *             properties:
 *               patient:
 *                 type: string
 *               dentist:
 *                 type: string
 *               booking:
 *                 type: string
 *               recordDate:
 *                 type: string
 *                 format: date-time
 *               diagnosis:
 *                 type: string
 *               treatments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     procedureName:
 *                       type: string
 *                     toothNumber:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     cost:
 *                       type: number
 *               prescriptions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     medicationName:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     instructions:
 *                       type: string
 *               followUpDate:
 *                 type: string
 *                 format: date
 *               dentistNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Record successfully created
 */
router
  .route("/")
  .post(protect, authorize("admin", "dentist"), createRecords)
  .get(protect, getRecords);

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     summary: Get record by ID
 *     tags: [Records]
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
 *         description: Record retrieved
 *   put:
 *     summary: Update record
 *     tags: [Records]
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
 *               diagnosis:
 *                 type: string
 *               treatments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     procedureName:
 *                       type: string
 *                     toothNumber:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     cost:
 *                       type: number
 *               prescriptions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     medicationName:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     duration:
 *                       type: string
 *                     instructions:
 *                       type: string
 *               followUpDate:
 *                 type: string
 *                 format: date
 *               dentistNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Record updated
 *   delete:
 *     summary: Delete a record
 *     tags: [Records]
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
 *         description: Record deleted
 */
router
  .route("/:id")
  .get(protect, getRecord)
  .put(protect, authorize("admin", "dentist"), updateRecord)
  .delete(protect, authorize("admin", "dentist"), deleteRecord);

module.exports = router;
