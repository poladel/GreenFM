const Schedule = require('../models/Schedule');

// GET the latest schedule
const getSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findOne().sort({ createdAt: -1 });
        res.json(schedule);
    } catch (err) {
        console.error("Failed to get schedule:", err);
        res.status(500).json({ error: "Failed to load schedule" });
    }
};

// UPDATE or CREATE schedule
const updateSchedule = async (req, res) => {
    try {
        const data = req.body;

        let schedule = await Schedule.findOne();
        if (schedule) {
            // Update existing schedule
            Object.assign(schedule, data);
        } else {
            // Create new schedule
            schedule = new Schedule(data);
        }

        await schedule.save();
        res.json({ success: true, schedule });
    } catch (err) {
        console.error("Failed to update schedule:", err);
        res.status(500).json({ error: "Failed to update schedule" });
    }
};

module.exports = {
    getSchedule,
    updateSchedule
};
