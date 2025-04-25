const AssessmentSlot = require('../models/AssessmentSlot');
const { startOfWeek, endOfWeek, format } = require('date-fns');

// Controller for ADMIN to save a slot as available
exports.saveAssessmentSlot = async (req, res) => {
    const { date, time, department, year } = req.body;
    // --- Get admin details from authenticated user ---
    const adminUser = req.user; // Assuming middleware adds user object

    if (!adminUser) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    // --- ---

    if (!date || !time || !department || !year) {
        return res.status(400).json({ message: 'Missing required fields (date, time, department, year).' });
    }

    try {
        // Optional: Validate against the assessment period for the year
        const period = await AssessmentPeriod.findOne({ year: parseInt(year, 10) });
        if (period) {
            const slotDate = new Date(date + 'T00:00:00'); // Treat date as local
            const startDate = new Date(period.startDate);
            const endDate = new Date(period.endDate);
             startDate.setHours(0,0,0,0);
             endDate.setHours(23,59,59,999);

            if (slotDate < startDate || slotDate > endDate) {
                return res.status(400).json({ message: `Slot date ${date} is outside the assessment period for ${year}.` });
            }
        } else {
             console.warn(`Assessment period for year ${year} not found for validation.`);
             // Decide if you want to block saving or just warn
        }


        // --- Prepare admin name object ---
        const adminNameData = {
            lastName: adminUser.lastName,
            firstName: adminUser.firstName,
            middleInitial: adminUser.middleInitial || '', // Handle optional fields
            suffix: adminUser.suffix || ''
        };
        // --- ---

        // Use findOneAndUpdate with upsert to create or ensure existence
        const query = { date, time, department, year };
        // --- Include adminName in the data to be saved/updated ---
        const updateData = {
            date,
            time,
            department,
            year,
            adminName: adminNameData // Add the admin's name
        };
        // --- ---
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };

        const savedSlot = await AssessmentSlot.findOneAndUpdate(query, updateData, options);

        res.status(200).json({ message: `Slot ${date} ${time} for ${department} marked as available by ${adminUser.firstName} ${adminUser.lastName}.`, slot: savedSlot });

    } catch (error) {
        if (error.code === 11000) {
            // If it already exists, maybe update the admin name? Or just confirm existence.
            // Let's just confirm existence for now.
             const existingSlot = await AssessmentSlot.findOne({ date, time, department, year });
             return res.status(200).json({ message: `Slot ${date} ${time} for ${department} was already marked as available.`, slot: existingSlot });
        }
        console.error('Error saving assessment slot:', error);
        res.status(500).json({ message: 'Server error saving assessment slot.', error: error.message });
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
        const weekStartDate = new Date(weekStart + 'T00:00:00');
        const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });
        const startDateString = format(weekStartDate, 'yyyy-MM-dd');
        const endDateString = format(weekEndDate, 'yyyy-MM-dd');

        console.log(`Querying AssessmentSlots for Dept: ${department}, Year: ${year}, Between: ${startDateString} and ${endDateString}`);

        const slots = await AssessmentSlot.find({
            department: department,
            year: year,
            date: { $gte: startDateString, $lte: endDateString }
        })
        // --- Populate necessary application details if booked ---
        .populate({
            path: 'application', // Field name in AssessmentSlot model
            model: 'ApplyStaff', // Explicitly state the model to populate from
            // Select fields needed for display and modal
            select: 'lastName firstName middleInitial suffix section dlsudEmail studentNumber preferredDepartment preferredSchedule'
        })
        // --- End Populate ---
        .sort({ date: 1, time: 1 });

        res.status(200).json(slots);

    } catch (error) {
        console.error('Error fetching assessment slots for week:', error);
        res.status(500).json({ message: 'Server error fetching assessment slots for week.', error: error.message });
    }
};
// --- End NEW ---