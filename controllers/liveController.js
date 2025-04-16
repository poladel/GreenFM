const Live = require('../models/Live');

// GET: render page with latest live video
exports.getLive = async (req, res) => {
    try {
        const video = await Live.findOne().sort({ createdAt: -1 });
        res.render('live', { video });
    } catch (err) {
        console.error('Error getting live video:', err);
        res.status(500).send('Server Error');
    }
};

// POST: save new live video URL
exports.addLive = async (req, res) => {
    try {
        const { url } = req.body;
        await Live.deleteMany(); // optional: remove old one
        await Live.create({ url });
        res.redirect('/live');
    } catch (err) {
        console.error('Error saving live video:', err);
        res.status(500).send('Server Error');
    }
};

// POST: remove current live video (optional)
exports.removeLive = async (req, res) => {
    try {
        await Live.deleteMany({});
        res.redirect('/live');
    } catch (err) {
        console.error('Error removing live video:', err);
        res.status(500).send('Server Error');
    }
};
