const axios = require("axios");
const Playlist = require("../models/Playlist");



async function fetchYouTubeMusicLink(songTitle, singer) {
    try {
        const searchQuery = encodeURIComponent(`${songTitle} ${singer}`);
        return `https://music.youtube.com/search?q=${searchQuery}`;
    } catch (error) {
        console.error("Error constructing YouTube Music link:", error);
        return "#";
    }
}


// Fetch the playlist (for API or internal use)
module.exports.getPlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.find().sort({ createdAt: -1 });
        res.json({ success: true, playlist });
    } catch (error) {
        console.error("Error fetching playlist:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// Recommend a song
module.exports.recommendSong = async (req, res) => {
    try {
        const { songTitle, singer } = req.body;
        const user = req.user;

        if (!songTitle || !singer) {
            return res.json({ success: false, message: "Please provide both song title and singer" });
        }

        const link = await fetchYouTubeMusicLink(songTitle, singer);

        const newSong = new Playlist({
            title: songTitle,
            singer,
            link,
            user: { name: user.name, email: user.email }
        });

        await newSong.save();
        res.json({ success: true });
    } catch (error) {
        console.error("Error recommending song:", error);
        res.json({ success: false, message: "Error recommending song" });
    }
};
