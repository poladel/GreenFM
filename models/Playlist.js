const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    songs: [
        {
            title: { type: String, required: true },
            artist: { type: String, required: true },
            youtubeUrl: { type: String, required: true }
        }
    ]
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
