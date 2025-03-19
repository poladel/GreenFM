const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const Playlist = require('../models/Playlist');

const router = express.Router();

// Function to generate YouTube Music search URL
function generateYouTubeMusicLink(song, artist) {
    const searchQuery = encodeURIComponent(`${song} ${artist}`);
    return `https://music.youtube.com/search?q=${searchQuery}`;
}

// Add song to playlist
router.post('/playlist/add', requireAuth, async (req, res) => {
    const { title, artist } = req.body;
    const userId = req.user._id;

    try {
        const youtubeUrl = generateYouTubeMusicLink(title, artist);

        let playlist = await Playlist.findOne({ userId });
        if (!playlist) {
            playlist = new Playlist({ userId, songs: [] });
        }

        playlist.songs.push({ title, artist, youtubeUrl });
        await playlist.save();

        res.json({ success: true, message: 'Song added to playlist', playlist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Fetch user's playlist
router.get('/playlist', requireAuth, async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ userId: req.user._id });
        res.render('2-user/5-playlist', { playlist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
