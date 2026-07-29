const express = require('express');
const router = express.Router();
const familyController = require('../controllers/familyController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.get('/', authenticate, familyController.listFamilyMembers);
router.post('/', authenticate, familyController.createFamilyMember);
router.patch('/:member_id', authenticate, familyController.updateFamilyMember);
router.delete('/:member_id', authenticate, familyController.deleteFamilyMember);

module.exports = router;
