// playlistController.js (Updated)
const Playlist = require("../models/Playlist");

async function fetchYouTubeMusicLink(songTitle, singer) {
    try {
        const searchQuery = encodeURIComponent(`${songTitle} ${singer}`);
        return `https://music.youtube.com/search?q=${searchQuery}`;
    } catch (error) {
        console.error("Error constructing YouTube Music link:", error);
        throw new Error("Failed to construct YouTube Music link");
    }
}

module.exports.recommendSong = async (req, res) => {
    try {
        const { songTitle, singer, genre } = req.body;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!songTitle || !singer || !genre) {
            return res.json({ success: false, message: "Please provide song title, singer, and genre" });
        }

        const link = await fetchYouTubeMusicLink(songTitle, singer);

        const newSong = new Playlist({
            title: songTitle,
            singer,
            genre,
            link,
            user: { name: user.name, email: user.email }
        });

        await newSong.save().catch((err) => {
            console.error("Error saving song to database:", err);
            return res.json({ success: false, message: "Failed to save song to the database" });
        });

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

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

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
