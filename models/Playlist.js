const mongoose = require("mongoose");

const PlaylistSchema = new mongoose.Schema({
    title: String,
    singer: String,
    link: String,
    user: {
        name: String,
        email: String
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Playlist", PlaylistSchema);

