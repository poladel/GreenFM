const express = require('express');
const router = express.Router();
const assessmentSlotController = require('../controllers/assessmentSlotController'); // Adjust path
const { requireAuth, checkRoles } = require('../middleware/authMiddleware');

// Admin route to mark a slot available
router.post('/admin/assessment-slots', requireAuth, checkRoles(['Admin']), assessmentSlotController.saveAssessmentSlot);
router.get('/admin/assessment-slots/for-week', assessmentSlotController.getAssessmentSlotsForWeek);
router.get('/assessment-slots', assessmentSlotController.getAvailableAssessmentSlots);
router.delete('/admin/assessment-slots/:id', requireAuth, checkRoles(['Admin']), assessmentSlotController.deleteAssessmentSlot);
router.get('/booked-slots', assessmentSlotController.getBookedAssessmentSlots);

module.exports = router;