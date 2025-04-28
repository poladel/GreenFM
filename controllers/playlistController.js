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

        // Normalize input for searching: trim spaces and convert to lowercase
        const normalizedTitle = songTitle.trim().toLowerCase();
        const normalizedSinger = singer.trim().toLowerCase();

        // Check if the song already exists in the database
        const existingSong = await Playlist.findOne({
            title: normalizedTitle,
            singer: normalizedSinger
        }).collation({ locale: 'en', strength: 2 }); // Case-insensitive collation

        if (existingSong) {
            return res.json({ success: false, message: "This song by the artist already exists in the playlist." });
        }

        // Generate the YouTube Music link
        const link = await fetchYouTubeMusicLink(songTitle, singer);

        // Save the song exactly as the user inputs it
        const newSong = new Playlist({
            title: songTitle.trim(), // Save the original input
            singer: singer.trim(),  // Save the original input
            genre: genre.trim(),
            link,
            user: { username: user.username, email: user.email }
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
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // Allow Admins to delete any song
        if (user.roles !== 'Admin' && song.user.email !== user.email) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        await Playlist.findByIdAndDelete(songId);
        res.json({ success: true, message: "Song deleted successfully" });
    } catch (error) {
        console.error("Error deleting song:", error);
        res.status(500).json({ success: false, message: "Error deleting song" });
    }
};

module.exports.toggleLike = async (req, res) => {
    try {
        const songId = req.params.id;
        const userEmail = req.user.email;

        if (!songId) {
            console.error("Error: Song ID is undefined.");
            return res.status(400).json({ success: false, message: "Song ID is required." });
        }

        const song = await Playlist.findById(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // Check if the user has already liked the song
        const hasLiked = song.likes.some((like) => like.email === userEmail);

        if (hasLiked) {
            // If already liked, remove the user from the likes array
            song.likes = song.likes.filter((like) => like.email !== userEmail);
        } else {
            // If not liked, add the user to the likes array
            song.likes.push({ email: userEmail });
        }

        await song.save();

        res.json({ success: true, likesCount: song.likes.length });
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ success: false, message: "Error toggling like" });
    }
};

module.exports.getTopSongs = async (req, res) => {
    try {
        const topSongs = await Playlist.aggregate([
            {
                $addFields: {
                    likesCount: { $size: "$likes" } // Add a field for the number of likes
                }
            },
            {
                $sort: { likesCount: -1 } // Sort by the number of likes in descending order
            },
            {
                $limit: 5 // Limit to top 5 songs
            }
        ]);

        res.json({ success: true, topSongs });
    } catch (error) {
        console.error("Error fetching top songs:", error);
        res.status(500).json({ success: false, message: "Error fetching top songs" });
    }
};


