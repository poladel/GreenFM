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
            // Update existing
            Object.assign(schedule, data);
        } else {
            // Create new
            schedule = new Schedule(data);
        }

        await schedule.save();
        res.json({ success: true, schedule });
    } catch (err) {
        console.error("Failed to update schedule:", err);
        res.status(500).json({ error: "Failed to update schedule" });
    }
};

const now = new Date();

// Convert to PH time (UTC+8)
const utc = now.getTime() + now.getTimezoneOffset() * 60000;
const phTime = new Date(utc + 3600000 * 8);

const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const today = days[phTime.getDay()];

const currentMinutes = phTime.getHours() * 60 + phTime.getMinutes();


module.exports = {
    getSchedule,
    updateSchedule
};
