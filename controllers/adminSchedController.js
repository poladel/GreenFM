const AdminSchedule = require('../models/AdminSchedule');
const ScheduleOverride = require('../models/ScheduleOverride'); // Import the new model
const { getDay, addDays, formatISO } = require('date-fns'); // Using date-fns for reliable date calculation

// --- Functions for RECURRING Schedules ---

// createSchedule: Stays the same - handles saving NEW recurring schedules
module.exports.createSchedule = async (req, res) => {
    try {
        const { lastName, firstName, middleInitial, suffix, cys, department, day, time, subject, roomNum, year } = req.body;

        // Validate required fields for recurring
        if (!lastName || !firstName || !cys || !department || !day || !time || !subject || !roomNum) {
            return res.status(400).json({ error: 'All fields (including department) are required for recurring schedule.' });
        }
        const scheduleYear = year || new Date().getFullYear().toString(); // Ensure year is string

        // Check if a recurring schedule already exists for this exact slot/dept/year
        const existing = await AdminSchedule.findOne({ day, time, department, year: scheduleYear });
        if (existing) {
            return res.status(409).json({ error: 'A recurring schedule already exists for this time slot, department, and year.' });
        }

        const newSchedule = new AdminSchedule({
            lastName, firstName, middleInitial, suffix, cys, department, day, time, subject, roomNum,
            year: scheduleYear,
        });

        await newSchedule.save();
        res.status(201).json({ message: 'Recurring schedule saved successfully.' });
    } catch (error) {
        console.error('Error saving recurring schedule:', error);
        res.status(500).json({ error: 'Failed to save recurring schedule.' });
    }
};

// getSchedules: Stays the same - fetches ALL recurring schedules for year/dept
module.exports.getSchedules = async (req, res) => {
    try {
        const { year, department } = req.query;
        if (!year || !department) {
            return res.status(400).json({ error: 'Year and department are required.' });
        }
        // Ensure year is string for comparison if stored as string
        const schedules = await AdminSchedule.find({
            year: year, // Match based on string year
            department: department.trim()
        }).sort({ day: 1, time: 1 });

        // console.log('Fetched recurring schedules:', schedules); // Keep for debugging if needed
        res.status(200).json(schedules);
    } catch (error) {
        console.error('Error fetching recurring schedules:', error);
        res.status(500).json({ error: 'Failed to fetch recurring schedules.' });
    }
};

// getSchedule: **MODIFIED** - Fetches ONE recurring schedule for modal context
module.exports.getSchedule = async (req, res) => {
    try {
        // --- ADD year and department to query params ---
        const { day, time, year, department } = req.query;

        // --- Validate ALL required params ---
        if (!day || !time || !year || !department) {
            return res.status(400).json({ error: 'Day, time, year, and department are required.' });
        }

        // --- ADD year and department to the findOne query ---
        const schedule = await AdminSchedule.findOne({
            day,
            time,
            year: year, // Ensure year matches (as string)
            department: department.trim()
         });
        // console.log('Fetched single recurring schedule:', schedule); // Keep for debugging

        if (!schedule) {
            // Use 404 for not found, but it's not necessarily an "error" in the modal context
            return res.status(404).json({ message: 'Recurring schedule not found for this slot.' });
        }

        res.status(200).json(schedule);
    } catch (error) {
        console.error('Error fetching single recurring schedule:', error);
        res.status(500).json({ error: 'Failed to fetch recurring schedule.' });
    }
};

// updateSchedule: Stays the same - updates fields of an EXISTING recurring schedule
module.exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { cys, subject, roomNum } = req.body; // Only these fields are typically editable for recurring

        if (!cys || !subject || !roomNum) {
            return res.status(400).json({ error: 'CYS, Subject, and Room Number are required.' });
        }

        const updatedSchedule = await AdminSchedule.findByIdAndUpdate(
            id,
            { cys, subject, roomNum },
            { new: true, runValidators: true } // Ensure validators run
        );

        if (!updatedSchedule) {
            return res.status(404).json({ error: 'Recurring schedule not found.' });
        }

        res.status(200).json({ message: 'Recurring schedule updated successfully.', updatedSchedule });
    } catch (error) {
        console.error('Error updating recurring schedule:', error);
        // Handle potential validation errors
        if (error.name === 'ValidationError') {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update recurring schedule.' });
    }
};

// deleteSchedule: Stays the same - deletes a recurring schedule by ID
module.exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedSchedule = await AdminSchedule.findByIdAndDelete(id);
        if (!deletedSchedule) {
            return res.status(404).json({ error: 'Recurring schedule not found.' });
        }
        res.status(200).json({ message: 'Recurring schedule deleted successfully.' });
    } catch (error) {
        console.error('Error deleting recurring schedule:', error);
        res.status(500).json({ error: 'Failed to delete recurring schedule.' });
    }
};


// --- NEW Functions for SPECIFIC DATE Overrides ---

module.exports.createOrUpdateOverride = async (req, res) => {
    try {
        const {
            lastName, firstName, middleInitial, suffix, // Admin details
            cys, department, date, time, subject, roomNum, year, // Override details
            status // 'unavailable' or 'available'
        } = req.body;

        // Validate required fields for override
        if (!lastName || !firstName || !cys || !department || !date || !time || !subject || !roomNum || !year || !status) {
            return res.status(400).json({ error: 'All fields are required for schedule override.' });
        }
        if (!['unavailable', 'available'].includes(status)) {
             return res.status(400).json({ error: 'Invalid status provided for override.' });
        }

        // Use findOneAndUpdate with upsert: true to create or update based on unique combination
        const filter = { date, time, department, year };
        const update = {
            lastName, firstName, middleInitial, suffix,
            cys, subject, roomNum, status
            // Note: department, date, time, year are in the filter, not needed in update unless they could change (unlikely here)
        };
        const options = {
            new: true, // Return the modified document
            upsert: true, // Create if it doesn't exist
            runValidators: true, // Ensure model validations run
            setDefaultsOnInsert: true // Apply defaults if creating
        };

        const savedOverride = await ScheduleOverride.findOneAndUpdate(filter, update, options);

        res.status(200).json({ message: 'Schedule override saved successfully.', override: savedOverride });

    } catch (error) {
        console.error('Error saving schedule override:', error);
         if (error.name === 'ValidationError') {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to save schedule override.' });
    }
};

// Optional: Add a function to delete an override, e.g., by its unique _id
module.exports.deleteOverride = async (req, res) => {
     try {
        const { id } = req.params; // Assuming you pass the override's _id in the URL
        const deletedOverride = await ScheduleOverride.findByIdAndDelete(id);
        if (!deletedOverride) {
            return res.status(404).json({ error: 'Schedule override not found.' });
        }
        res.status(200).json({ message: 'Schedule override deleted successfully.' });
    } catch (error) {
        console.error('Error deleting schedule override:', error);
        res.status(500).json({ error: 'Failed to delete schedule override.' });
    }
};


// --- NEW Function to make a recurring slot AVAILABLE for a specific date ---
// This will be triggered by the frontend when "deleting for a week"
module.exports.createAvailabilityOverride = async (req, res) => {
    try {
        const {
            // Details identifying the recurring slot
            recurringDay, // e.g., "Monday"
            time,
            department,
            year, // Year the recurring schedule applies to
            // Details identifying the specific week/date
            targetDate, // The specific YYYY-MM-DD date to make available
            // Admin details for tracking
            lastName,
            firstName,
            middleInitial,
            suffix
        } = req.body;

        // Basic Validation
        if (!recurringDay || !time || !department || !year || !targetDate || !lastName || !firstName) {
            return res.status(400).json({ error: 'Missing required fields to create availability override.' });
        }

        // Validate targetDate format (simple check)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
             return res.status(400).json({ error: 'Invalid targetDate format. Use YYYY-MM-DD.' });
        }

        // Prepare override data
        const filter = { date: targetDate, time, department, year };
        const update = {
            lastName, firstName, middleInitial, suffix,
            status: 'available', // Explicitly set status to available
            // Use placeholder values for booking details as this slot is now free
            cys: 'N/A',
            subject: 'Slot Available',
            roomNum: 'N/A',
            // Ensure fields from filter are also set on insert
            date: targetDate,
            time,
            department,
            year
        };
        const options = {
            new: true,
            upsert: true, // Create if no override exists, update if one does
            runValidators: true,
            setDefaultsOnInsert: true
        };

        const savedOverride = await ScheduleOverride.findOneAndUpdate(filter, update, options);

        res.status(200).json({ message: `Slot ${time} on ${targetDate} marked as available.`, override: savedOverride });

    } catch (error) {
        console.error('Error creating availability override:', error);
        if (error.name === 'ValidationError') {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create availability override.' });
    }
};


// --- Function for Combined Weekly View (keep existing) ---
module.exports.getWeeklyAvailability = async (req, res) => {
    try {
        const { weekStart, department } = req.query; // weekStart should be YYYY-MM-DD

        if (!weekStart || !department) {
            return res.status(400).json({ error: 'weekStart date and department are required.' });
        }

        const startDate = new Date(weekStart);
        if (isNaN(startDate.getTime())) {
             return res.status(400).json({ error: 'Invalid weekStart date format.' });
        }
        startDate.setUTCHours(0, 0, 0, 0); // Normalize start date

        const endDate = new Date(startDate);
        endDate.setUTCDate(startDate.getUTCDate() + 6); // Get end of the week (Sunday)
        endDate.setUTCHours(23, 59, 59, 999); // Ensure it covers the whole last day

        const year = startDate.getUTCFullYear().toString(); // Get year as string

        // 1. Fetch Recurring Schedules for the department and year
        const recurring = await AdminSchedule.find({
            department: department.trim(),
            year: year
        });

        // 2. Fetch Overrides within the specific week date range for the department
        const overrides = await ScheduleOverride.find({
            department: department.trim(),
            year: year, // Filter by year first for efficiency if indexed
            date: { // Filter by the specific dates within the week
                $gte: startDate.toISOString().split('T')[0], // YYYY-MM-DD >= weekStart
                $lte: endDate.toISOString().split('T')[0]   // YYYY-MM-DD <= weekEnd
            }
        });

        res.status(200).json({
            recurring,
            overrides
        });

    } catch (error) {
        console.error('Error fetching weekly availability:', error);
        res.status(500).json({ error: 'Failed to fetch weekly availability.' });
    }
};