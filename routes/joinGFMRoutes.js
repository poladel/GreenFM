const { Router } = require('express');
const joinGFMController = require('../controllers/joinGFMController');
const { checkUser } = require('../middleware/authMiddleware');

const router = Router();

router.post('/JoinGFM-Step1', checkUser, joinGFMController.joinGFM1_post);
router.post('/JoinGFM-Step2', checkUser, joinGFMController.joinGFM2_post);

module.exports = router;