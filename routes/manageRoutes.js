const { Router } = require("express");
const manageController = require("../controllers/manageController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

router.get("/manage-account", requireAuth, manageController.userData_get);
router.post("/manage-account", requireAuth, manageController.userData_post);
router.post("/change-password", requireAuth, manageController.change_password);

module.exports = router;
