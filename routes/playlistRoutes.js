const { Router } = require("express");
const playlistController = require("../controllers/playlistController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = Router();

// Route to handle song recommendations
router.post("/recommend", requireAuth, playlistController.recommendSong);

// Route to fetch all songs in the playlist (if needed for an API)
router.get("/songs", playlistController.getPlaylist);

module.exports = router;
