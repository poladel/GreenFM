const express = require("express");
const router = express.Router();
const schoolYearController = require("../controllers/schoolYearController");

router.get("/schoolYear", schoolYearController.getSchoolYear);
router.post("/schoolYear/config", schoolYearController.updateSchoolYearConfig);
router.get('/schoolYear/all', schoolYearController.getAllSchoolYears);

module.exports = router;