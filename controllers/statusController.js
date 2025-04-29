const Status = require('../models/Status');

const getStatus = async (req, res) => {
    try {
        let status = await Status.findOne();
        if (!status) {
            status = new Status();
            await status.save();
        }
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get live status' });
    }
};

const updateStatus = async (req, res) => {
    const user = req.user;

    const isAdminOrStaff =
        user.roles === 'Admin' || user.roles === 'Staff' ||
        (Array.isArray(user.roles) && (user.roles.includes('Admin') || user.roles.includes('Staff')));

    if (!isAdminOrStaff) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        let status = await Status.findOne();
        if (!status) {
            status = new Status();
        }

        status.live = req.body.live;
        status.updatedBy = user._id;
        status.updatedAt = new Date();

        await status.save();
        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update live status' });
    }
};

module.exports = { getStatus, updateStatus };
