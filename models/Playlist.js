const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema({
    title: String,
    singer: String,
    genre: String,
    link: String,
    user: {
        username: String,
        email: String
    },
    likes: [{ email: String }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Playlist", PlaylistSchema);

