// playlistController.js (Updated)
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

module.exports.deleteSong = async (req, res) => {
    try {
        const songId = req.params.id;
        const user = req.user;

        const song = await Playlist.findById(songId);
        if (!song) {
            return res.json({ success: false, message: "Song not found" });
        }

        if (song.user.email !== user.email) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        await Playlist.findByIdAndDelete(songId);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting song:", error);
        res.json({ success: false, message: "Error deleting song" });
    }
};
