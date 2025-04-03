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

// Normalize title and singer before saving
PlaylistSchema.pre("save", function (next) {
    this.title = this.title.trim().toLowerCase();
    this.singer = this.singer.trim().toLowerCase();
    next();
});

module.exports = mongoose.model("Playlist", PlaylistSchema);

