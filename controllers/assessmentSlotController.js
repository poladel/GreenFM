const AssessmentSlot = require('../models/AssessmentSlot');
const AssessmentPeriod = require('../models/AssessmentPeriod');
const ApplyStaff = require('../models/ApplyStaff');
const { endOfWeek, format } = require('date-fns'); // <-- ADD THIS LINE

// Controller for ADMIN to save a slot as available
exports.saveAssessmentSlot = async (req, res) => {
    try {
        const { date, time, department, year } = req.body;

        // Basic validation
        if (!date || !time || !department || !year) {
            return res.status(400).json({ message: 'Missing required fields (date, time, department, year).' });
        }

        // Optional: Validate against existing AssessmentPeriod for the year
        const period = await AssessmentPeriod.findOne({ year: parseInt(year, 10) });
        if (!period) {
             return res.status(400).json({ message: `No assessment period found for the year ${year}. Cannot save slot.` });
        }

        // Check if slot already exists
        let existingSlot = await AssessmentSlot.findOne({ date, time, department, year });

        if (existingSlot) {
            if (!existingSlot.application) {
                 return res.status(200).json({ message: 'Slot is already marked as available.' });
            } else {
                return res.status(409).json({ message: 'This slot is already booked by an applicant.' });
            }
        } else {
            // Create and save the new slot
            const newSlot = new AssessmentSlot({
                date,
                time,
                department,
                year: parseInt(year, 10),
            });
            await newSlot.save();
            return res.status(201).json({ message: 'Slot marked as available successfully!', slot: newSlot });
        }

    } catch (error) {
        console.error('Error saving assessment slot:', error);
        // Use the specific error message from the catch block
        res.status(500).json({ message: `Server error saving assessment slot: ${error.message}` }); // <-- Include error.message
    }
};

// Controller for USER to get available slots
exports.getAvailableAssessmentSlots = async (req, res) => {
    const { department, year } = req.query;

    if (!department || !year) {
        return res.status(400).json({ message: 'Department and year are required query parameters.' });
    }

    try {
        // Optional: Get assessment period to filter out past slots relative to period end?
        // Or just filter based on current date on frontend? Let's keep it simple for now.

        const slots = await AssessmentSlot.find({ department, year }).sort({ date: 1, time: 1 }); // Sort for frontend convenience
        res.status(200).json(slots);

    } catch (error) {
        console.error('Error fetching available assessment slots:', error);
        res.status(500).json({ message: 'Server error fetching assessment slots.', error: error.message });
    }
};

// --- NEW: Controller for ADMIN to get slots marked available for a specific week ---
exports.getAssessmentSlotsForWeek = async (req, res) => {
    const { weekStart, department, year } = req.query;
    if (!weekStart || !department || !year) {
        return res.status(400).json({ message: 'weekStart, department, and year are required query parameters.' });
    }

    try {
        // Ensure weekStart is treated as local date
        const weekStartDate = new Date(weekStart + 'T00:00:00'); // Assuming weekStart is YYYY-MM-DD

        // Calculate end of the week (Saturday, assuming week starts Sunday)
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 }); // Use imported function

        // Format dates for DB query (ensure this matches your DB date format)
        const startDateString = format(weekStartDate, 'yyyy-MM-dd'); // Use imported function
        const endDateString = format(weekEndDate, 'yyyy-MM-dd'); // Use imported function

        console.log(`Querying AssessmentSlots for Dept: ${department}, Year: ${year}, Between: ${startDateString} and ${endDateString}`);

        const slots = await AssessmentSlot.find({
            department: department,
            year: parseInt(year, 10), // Ensure year is number for query
            date: { $gte: startDateString, $lte: endDateString }
        })
        .populate({
            path: 'application',
            model: 'ApplyStaff',
            select: 'lastName firstName middleInitial suffix section dlsudEmail studentNumber preferredDepartment preferredSchedule'
        })
        .sort({ date: 1, time: 1 });

        res.status(200).json(slots);

    } catch (error) {
        console.error('Error fetching assessment slots for week:', error);
        // Use the specific error message from the catch block
        res.status(500).json({ message: `Server error fetching assessment slots for week: ${error.message}` }); // <-- Include error.message
    }
};
// --- End NEW ---

// --- ADD OR VERIFY THIS CONTROLLER FUNCTION ---
exports.deleteAssessmentSlot = async (req, res) => {
    try {
        const slotId = req.params.id;
        const slot = await AssessmentSlot.findById(slotId);

        if (!slot) {
            return res.status(404).json({ message: 'Available slot not found.' });
        }

        // IMPORTANT: Prevent deletion if the slot is actually booked
        if (slot.application) {
            return res.status(400).json({ message: 'Cannot delete a slot that is already booked.' });
        }

        // Delete the slot if it's not booked
        await AssessmentSlot.findByIdAndDelete(slotId);

        res.status(200).json({ message: 'Available slot deleted successfully.' });

    } catch (error) {
        console.error('Error deleting assessment slot:', error);
        res.status(500).json({ message: `Server error deleting slot: ${error.message}` });
    }
};
// --- END ---

// --- NEW CONTROLLER FUNCTION ---
exports.getBookedAssessmentSlots = async (req, res) => {
    try {
        const { department, year } = req.query;

        if (!department || !year) {
            return res.status(400).json({ message: 'Department and year query parameters are required.' });
        }

        console.log(`API: Fetching BOOKED slots for Dept: ${department}, Year: ${year}`);

        const bookedSlots = await AssessmentSlot.find({
            department: department,
            year: year, // Ensure type matches schema (String or Number?)
            application: { $ne: null } // Find slots WHERE application is NOT NULL
        }).select('date time -_id'); // Select only date and time

        console.log(`API: Found ${bookedSlots.length} booked slots.`);
        res.status(200).json(bookedSlots);

    } catch (error) {
        console.error('Error fetching booked assessment slots:', error);
        res.status(500).json({ message: 'Failed to fetch booked slots' });
    }
};
// --- END NEW CONTROLLER FUNCTION ---