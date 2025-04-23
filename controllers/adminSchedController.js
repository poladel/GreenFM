const AdminSchedule = require('../models/AdminSchedule');

module.exports.createSchedule = async (req, res) => {
    try {
        const { lastName, firstName, middleInitial, suffix, cys, department, day, time, subject, roomNum, year } = req.body;

        // Validate required fields
        if (!lastName || !firstName || !cys || !day || !time || !subject || !roomNum) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Default year to the current year if not provided
        const scheduleYear = year || new Date().getFullYear();

        // Create a new schedule entry
        const newSchedule = new AdminSchedule({
            lastName,
            firstName,
            middleInitial,
            suffix,
            cys,
            department,
            day,
            time,
            subject,
            roomNum,
            year: scheduleYear,
        });

        await newSchedule.save();
        res.status(201).json({ message: 'Schedule saved successfully.' });
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).json({ error: 'Failed to save schedule.' });
    }
};

module.exports.getSchedules = async (req, res) => {
    try {
        const { year, department } = req.query;

        if (!year || !department) {
            return res.status(400).json({ error: 'Year and department are required.' });
        }

        const schedules = await AdminSchedule.find({ 
            year: parseInt(year), // Ensure year is treated as a number
            department: department.trim() // Ensure department matches exactly
        }).sort({ day: 1, time: 1 });
        
        console.log('Fetched schedules:', schedules);
        res.status(200).json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules.' });
    }
};

module.exports.getSchedule = async (req, res) => {
    try {
        const { day, time } = req.query;

        if (!day || !time) {
            return res.status(400).json({ error: 'Day and time are required.' });
        }

        const schedule = await AdminSchedule.findOne({ day, time });
        console.log('Fetched schedule:', schedule);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }

        res.status(200).json(schedule);
    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ error: 'Failed to fetch schedule.' });
    }
};

module.exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { cys, subject, roomNum } = req.body;

        if (!cys || !subject || !roomNum) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const updatedSchedule = await AdminSchedule.findByIdAndUpdate(
            id,
            { cys, subject, roomNum },
            { new: true }
        );

        if (!updatedSchedule) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }

        res.status(200).json({ message: 'Schedule updated successfully.', updatedSchedule });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: 'Failed to update schedule.' });
    }
};

module.exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedSchedule = await AdminSchedule.findByIdAndDelete(id);

        if (!deletedSchedule) {
            return res.status(404).json({ error: 'Schedule not found.' });
        }

        res.status(200).json({ message: 'Schedule deleted successfully.' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule.' });
    }
};