const { Router } = require('express');
const joinBlocktimerController = require('../controllers/joinBlocktimerController');
const { checkUser } = require('../middleware/authMiddleware');

const router = Router();

router.post('/JoinBlocktimer-Step1', checkUser, joinBlocktimerController.joinBlocktimer1_post);
//router.get('/JoinBlocktimer-Step2', checkUser, joinBlocktimerController.joinBlocktimer2_get);
router.post('/JoinBlocktimer-Step2', checkUser, joinBlocktimerController.joinBlocktimer2_post);

module.exports = router;