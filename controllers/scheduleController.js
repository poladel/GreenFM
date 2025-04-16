const Schedule = require("../models/Schedule");

module.exports.postSchedule = async (req, res) => {
  try {
    const { day, time, title, description, schoolYear } = req.body;

    const newSchedule = new Schedule({
      day,
      time,
      title,
      description,
      schoolYear,
    });

    await newSchedule.save();
    res.status(200).json({ message: "Schedule saved successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to save schedule." });
  }
};

module.exports.getSchedule = async (req, res) => {
    try {
      const schedules = await Schedule.find(); // Fetch all schedules
      res.status(200).json(schedules);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch schedules." });
    }
  };

module.exports.getScheduleById = async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id);
        if (!schedule) return res.status(404).json({ message: "Schedule not found" });
        res.status(200).json(schedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch schedule." });
    }
};

module.exports.updateSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!schedule) return res.status(404).json({ message: "Schedule not found" });
        res.status(200).json(schedule);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update schedule." });
    }
};

module.exports.deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) return res.status(404).json({ message: "Schedule not found" });
        res.status(200).json({ message: "Schedule deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete schedule." });
    }
};