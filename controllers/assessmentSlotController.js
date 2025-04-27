const AssessmentSlot = require('../models/AssessmentSlot');
const AssessmentPeriod = require('../models/AssessmentPeriod');
const ApplyStaff = require('../models/ApplyStaff');
const { endOfWeek, format } = require('date-fns');

// <<< NEW HELPER FUNCTION >>>
// Fetches distinct available dates for a dept/year and emits an update
const emitAvailableDates = async (io, department, year) => {
    if (!io) {
        console.error("Socket.IO instance (io) is not available in emitAvailableDates. Skipping emit.");
        return;
    }
    try {
        // Find distinct dates where a slot exists for the dept/year and is NOT booked
        const availableDates = await AssessmentSlot.distinct('date', {
            department: department,
            year: parseInt(year, 10), // Ensure year is a number for query
            application: null // Crucial: Only count slots that are actually available
        });

        // Sort dates for consistent order in the dropdown
        availableDates.sort();

        const eventName = 'availableDatesUpdated';
        const payload = {
            department: department,
            year: parseInt(year, 10),
            availableDates: availableDates // Array of date strings like "YYYY-MM-DD"
        };

        console.log(`Emitting ${eventName} for ${department} ${year}:`, availableDates);
        io.emit(eventName, payload); // Broadcast globally or target specific rooms if needed

    } catch (error) {
        console.error(`Error fetching/emitting available dates for ${department} ${year}:`, error);
    }
};
// <<< END HELPER FUNCTION >>>


// Controller for ADMIN to save a slot as available
exports.saveAssessmentSlot = async (req, res) => {
    try {
        // <<< CORRECT: Get admin name fields DIRECTLY from req.user >>>
        const adminFirstName = req.user?.firstName;
        const adminLastName = req.user?.lastName;
        const adminMiddleInitial = req.user?.middleInitial || ""; // Provide default if optional
        const adminSuffix = req.user?.suffix || ""; // Provide default if optional

        // <<< Get other details from req.body >>>
        const { date, time, department, year } = req.body;
        const io = req.io;

        // <<< CORRECT Validation: Check direct name fields >>>
        if (!adminLastName || !adminFirstName) { // Check the required fields
             console.error("Admin first/last name not found in session (req.user). User might not be logged in or session data is missing.");
             return res.status(401).json({ message: 'Authentication error: Admin name details not found in session.' });
        }
        if (!date || !time || !department || !year) {
            return res.status(400).json({ message: 'Missing required fields (date, time, department, year).' });
        }
        // <<< End Updated Validation >>>


        // Check if assessment period exists and if the date is within it
        const assessmentPeriod = await AssessmentPeriod.findOne({ year: parseInt(year, 10) });
        if (!assessmentPeriod) {
            return res.status(400).json({ message: `Assessment period for year ${year} not found.` });
        }
        const slotDate = new Date(date + 'T00:00:00'); // Ensure comparison at midnight UTC or local as needed
        const periodStartDate = new Date(assessmentPeriod.startDate);
        const periodEndDate = new Date(assessmentPeriod.endDate);
        if (slotDate < periodStartDate || slotDate > periodEndDate) {
            return res.status(400).json({ message: `Slot date ${date} is outside the assessment period.` });
        }


        // Check for existing slot
        const existingSlot = await AssessmentSlot.findOne({ date, time, department, year: parseInt(year, 10) });

        if (existingSlot) {
            if (existingSlot.application) {
                return res.status(409).json({ message: 'This slot is already booked and cannot be modified.' });
            } else {
                // If it exists but isn't booked, maybe update adminName? Or just return confirmation.
                // For now, let's assume we don't need to update if it already exists and is available.
                // Optionally update adminName if it's different:
                // existingSlot.adminName = adminNameFromSession;
                // await existingSlot.save();
                return res.status(200).json({ message: 'Slot already marked as available.', slot: existingSlot });
            }
        } else {
            // Create and save the new slot, constructing the adminName object
            const newSlot = new AssessmentSlot({
                date,
                time,
                department,
                year: parseInt(year, 10),
                // <<< CORRECT: Construct the adminName object >>>
                adminName: {
                    firstName: adminFirstName,
                    lastName: adminLastName,
                    middleInitial: adminMiddleInitial,
                    suffix: adminSuffix
                }
            });
            await newSlot.save();

            // Emit standard update for admin grid (include adminName if needed)
            const updateData = {
                action: 'created',
                slot: {
                    _id: newSlot._id,
                    date,
                    time,
                    department,
                    year: newSlot.year,
                    adminName: newSlot.adminName, // Include in emitted data
                    application: null
                }
            };
            if (io) {
                 io.emit('assessmentSlotUpdate', updateData);
                 console.log(`Emitted assessmentSlotUpdate (created) for ${date} ${time}`);
            } else {
                 console.warn("Socket.IO instance not found on req in saveAssessmentSlot. Cannot emit assessmentSlotUpdate.");
            }

            await emitAvailableDates(io, department, year);

            return res.status(201).json({ message: 'Slot marked as available successfully!', slot: newSlot });
        }

    } catch (error) {
        console.error('Error saving assessment slot:', error);
        // Handle potential duplicate key errors more gracefully
        if (error.code === 11000) {
             return res.status(409).json({ message: 'This exact time slot already exists for this department and year.' });
        }
        res.status(500).json({ message: `Server error saving assessment slot: ${error.message}` });
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
        res.status(500).json({ message: `Server error fetching assessment slots for week: ${error.message}` });
    }
};
// --- End NEW ---

// --- ADD OR VERIFY THIS CONTROLLER FUNCTION ---
exports.deleteAssessmentSlot = async (req, res) => {
    try {
        const slotId = req.params.id;
        const io = req.io; // Get io instance from request object
        const slot = await AssessmentSlot.findById(slotId);

        if (!slot) return res.status(404).json({ message: 'Available slot not found.' });
        if (slot.application) return res.status(400).json({ message: 'Cannot delete a slot that is already booked.' });

        // <<< Store details BEFORE deleting >>>
        const department = slot.department;
        const year = slot.year;
        // <<< End Store >>>

        await AssessmentSlot.findByIdAndDelete(slotId);

        // Emit standard update for admin grid
        const updateData = {
            action: 'deleted',
            slot: { _id: slot._id, date: slot.date, time: slot.time, department: slot.department, year: slot.year }
        };
         if (io) { // Check if io exists before emitting
             io.emit('assessmentSlotUpdate', updateData);
             console.log(`Emitted assessmentSlotUpdate (deleted) for ${slot.date} ${slot.time}`);
         } else {
             console.warn("Socket.IO instance not found on req in deleteAssessmentSlot. Cannot emit assessmentSlotUpdate.");
         }


        // <<< ADDED: Emit updated available dates list using stored details >>>
        await emitAvailableDates(io, department, year);
        // <<< END ADDED >>>

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