const { Router } = require("express");
const playlistController = require("../controllers/playlistController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

// Route to handle song recommendations
router.post("/recommend", requireAuth, playlistController.recommendSong);
router.delete("/delete/:id", requireAuth, playlistController.deleteSong);
router.post("/like/:id", requireAuth, playlistController.toggleLike);
router.get("/top-songs", playlistController.getTopSongs);

module.exports = router;
