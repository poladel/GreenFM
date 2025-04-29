const Schedule = require('../models/Schedule'); // Adjust path
const { io } = require('../server'); // Assuming io is exported from your main server file

// --- Modify postSchedule, updateSchedule, deleteSchedule ---
// (Note: Most schedule changes seem to happen via blocktimerController,
// but adding events here provides robustness if schedules are managed directly)

module.exports.postSchedule = async (req, res) => {
  // <<< ADD LOGGING HERE >>>
  console.log('--- Received Request Body ---');
  console.log(req.body);
  console.log('---------------------------');

  try {
    const {
      day,
      time,
      schoolYear,
      showDetails,
      executiveProducer,
      hosts = [], // Default to empty array if not provided
      technicalStaff = [], // Default to empty array if not provided
      creativeStaff,
      submissionId,         // Get submissionId from request body (might be undefined for direct creation)
      confirmationStatus = 'Accepted' // Default to 'Accepted' if not provided or for direct creation
    } = req.body;

    // <<< REPLACE EXISTING VALIDATION WITH THIS >>>
    // Define all required fields based on your Schedule model
    // Adjust this list based on your actual Schedule model requirements
    const requiredTopLevel = ['day', 'time', 'schoolYear', 'showDetails', 'executiveProducer', 'creativeStaff', 'hosts', 'technicalStaff'];
    const missingFields = requiredTopLevel.filter(field => !(field in req.body));

    // Check if required fields are missing OR if required arrays are empty
    // Modify the array checks based on whether your Schedule model *requires* at least one host/tech staff
    const hostsRequiredAndEmpty = requiredTopLevel.includes('hosts') && (!req.body.hosts || req.body.hosts.length === 0);
    const techStaffRequiredAndEmpty = requiredTopLevel.includes('technicalStaff') && (!req.body.technicalStaff || req.body.technicalStaff.length === 0);

    if (missingFields.length > 0 || hostsRequiredAndEmpty || techStaffRequiredAndEmpty) {
       console.error('Validation Failed - Missing or Empty Required Fields:', missingFields);
       if (hostsRequiredAndEmpty) console.error('Reason: hosts array is required and empty/missing.');
       if (techStaffRequiredAndEmpty) console.error('Reason: technicalStaff array is required and empty/missing.');
       console.error('Received Body:', req.body); // Log again on error
       // Send back a more informative error message
       return res.status(400).json({
           message: 'Missing or invalid required fields',
           missing: missingFields,
           hostsRequiredAndEmpty: hostsRequiredAndEmpty,
           techStaffRequiredAndEmpty: techStaffRequiredAndEmpty,
           received: req.body
       });
    }
    // <<< END REPLACEMENT VALIDATION >>>


    // Ensure confirmationStatus is a valid value if using enum (optional check)
    // const validStatuses = ['Accepted', 'Pending Confirmation']; // Example
    // if (!validStatuses.includes(confirmationStatus)) {
    //     return res.status(400).json({ message: `Invalid confirmationStatus value: ${confirmationStatus}. Must be one of ${validStatuses.join(', ')}` });
    // }


    const newSchedule = new Schedule({
      day,
      time,
      schoolYear,
      showDetails,
      executiveProducer,
      hosts, // Use the destructured value (which defaults to [])
      technicalStaff, // Use the destructured value (which defaults to [])
      creativeStaff,
      submissionId,         // Add submissionId (will be undefined if not provided)
      confirmationStatus    // Add confirmationStatus (defaults to 'Accepted')
    });

    await newSchedule.save();

    // <<< Emit schedule update event >>>
    // Ensure req.io is available (passed via middleware or globally accessible)
    if (req.io) {
        req.io.emit('scheduleUpdate', {
            action: 'create',
            day: newSchedule.day,
            time: newSchedule.time,
            schoolYear: newSchedule.schoolYear,
            showTitle: newSchedule.showDetails?.title || 'N/A', // Use optional chaining
            status: newSchedule.confirmationStatus,
            scheduleId: newSchedule._id // Include ID for potential client-side use
        });
    } else {
        console.warn("Socket.io instance (req.io) not found in scheduleController.postSchedule. Cannot emit event.");
    }


    // Send back the created schedule object on success (status 201 for created)
    res.status(201).json({ message: 'Schedule created', schedule: newSchedule }); // Send object with message and schedule

  } catch (error) {
    // Log the detailed error!
    console.error('Detailed Error Saving Schedule:', error);
    // Check for Mongoose validation errors specifically
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to save schedule.", error: error.message }); // Include error message
  }
};

module.exports.getSchedule = async (req, res) => {
  try {
      const { day, time, schoolYear } = req.query;

      // Build the filter object dynamically based on the query parameters
      const filter = {};
      if (day) filter.day = day;
      if (time) filter.time = time;
      if (schoolYear) filter.schoolYear = schoolYear;

      // Fetch schedules based on the filter
      const schedules = await Schedule.find(filter);
      res.json(schedules);
  } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
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

module.exports.getScheduleBySubmissionId = async (req, res) => {
    const { submissionId } = req.params;
    try {
        const schedule = await Schedule.findOne({ submissionId: submissionId });
        if (!schedule) {
            // It's okay if not found, return 404 so frontend knows to POST
            return res.status(404).json({ message: 'No schedule found for this submission ID.' });
        }
        res.status(200).json(schedule);
    } catch (error) {
        console.error('Error fetching schedule by submission ID:', error);
        res.status(500).json({ message: 'Server error fetching schedule by submission ID.', error: error.message });
    }
};

module.exports.updateSchedule = async (req, res) => {
    try {
        // It's generally safer and cleaner to update the whole subdocument if possible,
        // or use specific fields if you know exactly what's changing.
        // Using $set with dot notation is fine but can become verbose.
        const updateData = req.body; // Get the whole body

        // Remove fields that shouldn't be directly updated this way (like _id, timestamps)
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.__v;

        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, // Use $set to update only provided fields
            { new: true, runValidators: true } // Return the updated doc and run schema validators
        );

        if (!schedule) return res.status(404).json({ message: "Schedule not found" });

        // <<< Emit schedule update event >>>
        if (req.io) {
            req.io.emit('scheduleUpdate', {
                action: 'update',
                day: schedule.day,
                time: schedule.time,
                schoolYear: schedule.schoolYear,
                showTitle: schedule.showDetails?.title || 'N/A',
                status: schedule.confirmationStatus,
                scheduleId: schedule._id
            });
        } else {
             console.warn("Socket.io instance (req.io) not found in scheduleController.updateSchedule. Cannot emit event.");
        }


        res.status(200).json({ message: 'Schedule updated', schedule: schedule });
    } catch (error) {
        console.error('Error updating schedule:', error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update schedule.", error: error.message });
    }
};


module.exports.deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findByIdAndDelete(req.params.id);
        if (!schedule) return res.status(404).json({ message: "Schedule not found" });

        // <<< Emit schedule update event >>>
        if (req.io) {
            req.io.emit('scheduleUpdate', {
                action: 'delete',
                day: schedule.day,
                time: schedule.time,
                schoolYear: schedule.schoolYear,
                scheduleId: schedule._id // Include ID
            });
        } else {
             console.warn("Socket.io instance (req.io) not found in scheduleController.deleteSchedule. Cannot emit event.");
        }


        res.status(200).json({ message: "Schedule deleted successfully." });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ message: "Failed to delete schedule.", error: error.message });
    }
};