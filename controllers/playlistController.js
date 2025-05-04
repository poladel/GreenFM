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
        const io = req.io; // <<< Use req.io

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!songTitle || !singer || !genre) {
            // Use 400 for bad request
            return res.status(400).json({ success: false, message: "Please provide song title, singer, and genre" });
        }

        // Normalize input for searching: trim spaces and convert to lowercase
        const normalizedTitle = songTitle.trim().toLowerCase();
        const normalizedSinger = singer.trim().toLowerCase();

        // Check if the song already exists in the database (case-insensitive)
        const existingSong = await Playlist.findOne({
            title: { $regex: new RegExp(`^${normalizedTitle}$`, 'i') },
            singer: { $regex: new RegExp(`^${normalizedSinger}$`, 'i') }
        });

        if (existingSong) {
            // Use 409 Conflict for existing resource
            return res.status(409).json({ success: false, message: "This song by the artist already exists in the playlist." });
        }

        // Generate the YouTube Music link
        const link = await fetchYouTubeMusicLink(songTitle, singer);

        const newSong = new Playlist({
            title: songTitle.trim(),
            singer: singer.trim(),
            genre: genre.trim(),
            link,
            user: { username: user.username, email: user.email }
        });

        const savedSong = await newSong.save(); // Save and get the saved document

        // Populate user details if needed for emission
        const songToEmit = savedSong.toObject();
        songToEmit.user = { username: user.username, email: user.email };

        // Emit event to all clients
        if (io) {
            io.emit('playlistUpdated', songToEmit); // Emit the full new song data
            console.log('[Playlist Recommend] Emitted playlistUpdated event.');
        } else {
            console.warn('[Playlist Recommend] Socket.IO instance (req.io) not found. Cannot emit event.'); // <<< Updated warning message
        }

        // Respond with success (no need to send the song back, client updates via socket)
        res.status(201).json({ success: true }); // Use 201 Created status

    } catch (error) {
        console.error("Error recommending song:", error);
        // Use 500 for internal server errors
        res.status(500).json({ success: false, message: "Error recommending song" });
    }
};

module.exports.deleteSong = async (req, res) => {
    try {
        const songId = req.params.id;
        const user = req.user;
        const io = req.io; // <<< Use req.io

        if (!user) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const song = await Playlist.findById(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // --- PERMISSION CHECK ---
        // Allow Admins/Staff to delete any song OR the user who requested it
        const isOwner = song.user?.email === user.email;
        let isAdminOrStaff = false;
        if (user.roles) {
            if (typeof user.roles === 'string') {
                // Handle string role
                isAdminOrStaff = user.roles === 'Admin' || user.roles === 'Staff';
            } else if (Array.isArray(user.roles)) {
                // Handle array roles
                isAdminOrStaff = user.roles.includes('Admin') || user.roles.includes('Staff');
            }
        }

        if (!isOwner && !isAdminOrStaff) {
            // If not the owner AND not Admin/Staff, deny access
            return res.status(403).json({ success: false, message: "Forbidden: You do not have permission to delete this song." });
        }
        // --- END PERMISSION CHECK ---

        const deletedSong = await Playlist.findByIdAndDelete(songId);

        if (!deletedSong) {
             // Should not happen if findById found it, but good safeguard
             return res.status(404).json({ success: false, message: "Song not found during delete operation" });
        }

        // Emit event to all clients
        if (io) {
            io.emit('songDeleted', { songId: songId }); // Send the ID of the deleted song
            console.log('[Playlist Delete] Emitted songDeleted event for ID:', songId);
        } else {
            console.warn('[Playlist Delete] Socket.IO instance (req.io) not found. Cannot emit event.'); // <<< Updated warning message
        }

        res.json({ success: true, message: "Song deleted successfully" });
    } catch (error) {
        console.error("Error deleting song:", error);
        res.status(500).json({ success: false, message: "Error deleting song" });
    }
};

module.exports.toggleLike = async (req, res) => {
    try {
        const songId = req.params.id;
        const userEmail = req.user?.email; // Safely access email
        const io = req.io; // <<< Use req.io

        if (!userEmail) {
             return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        if (!songId) {
            console.error("Error: Song ID is undefined.");
            return res.status(400).json({ success: false, message: "Song ID is required." });
        }

        const song = await Playlist.findById(songId);
        if (!song) {
            return res.status(404).json({ success: false, message: "Song not found" });
        }

        // Ensure likes array exists
        if (!Array.isArray(song.likes)) {
            song.likes = [];
        }

        const hasLikedIndex = song.likes.findIndex((like) => like.email === userEmail);
        let liked = false; // Track if the action resulted in a like

        if (hasLikedIndex > -1) {
            // If already liked, remove the user from the likes array
            song.likes.splice(hasLikedIndex, 1);
            liked = false;
        } else {
            // If not liked, add the user to the likes array
            song.likes.push({ email: userEmail });
            liked = true;
        }

        await song.save();

        const likesCount = song.likes.length;

        // Emit event to all clients
        if (io) {
            // Send songId, new count, the user who triggered, and their new like status
            io.emit('songLiked', { songId: songId, likesCount: likesCount, userEmail: userEmail, liked: liked });
            console.log('[Playlist Like] Emitted songLiked event for ID:', songId);
        } else {
            console.warn('[Playlist Like] Socket.IO instance (req.io) not found. Cannot emit event.'); // <<< Updated warning message
        }

        // Return liked status along with count to the requesting client
        res.json({ success: true, likesCount: likesCount, liked: liked });
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


