const { Router } = require('express');
const authController = require('../controllers/authController');

const router = Router();

// Define login and registration routes
router.get('/LogIn', authController.login_get);
router.post('/LogIn', authController.login_post);
router.get('/Register', authController.register_get);
router.post('/Register', authController.register_post);
router.post('/refresh-token', authController.refreshToken);
router.get('/LogOut', authController.logout_get);

module.exports = router;
