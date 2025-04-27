const Schedule = require('../models/Schedule'); // Adjust path

module.exports.postSchedule = async (req, res) => {
  try {
    const {
      day,
      time,
      schoolYear,
      showDetails,
      executiveProducer,
      hosts = [],
      technicalStaff = [],
      creativeStaff,
      submissionId,         // <<< Get submissionId from request body
      confirmationStatus    // <<< Get confirmationStatus from request body
    } = req.body;

    // Validate required fields (including the new ones)
    if (!day || !time || !schoolYear || !showDetails || !executiveProducer || !creativeStaff || !submissionId || !confirmationStatus) {
      // Log which field might be missing for easier debugging
      console.error('Missing required fields for schedule creation:', { day, time, schoolYear, showDetails, executiveProducer, creativeStaff, submissionId, confirmationStatus });
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure confirmationStatus is a valid value if using enum
    const validStatuses = ['Accepted', 'Pending Confirmation'];
    if (!validStatuses.includes(confirmationStatus)) {
        return res.status(400).json({ message: `Invalid confirmationStatus value: ${confirmationStatus}. Must be one of ${validStatuses.join(', ')}` });
    }


    const newSchedule = new Schedule({
      day,
      time,
      schoolYear,
      showDetails,
      executiveProducer,
      hosts,
      technicalStaff,
      creativeStaff,
      submissionId,         // <<< Add submissionId here
      confirmationStatus    // <<< Add confirmationStatus here
    });

    await newSchedule.save();
    // Send back the created schedule object on success (status 201 for created)
    res.status(201).json(newSchedule);
  } catch (error) {
    // Log the detailed error!
    console.error('Detailed Error Saving Schedule:', error);
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
        const updateData = {
            day: req.body.day,
            time: req.body.time,
            schoolYear: req.body.schoolYear,
            "showDetails.title": req.body.showDetails.title,
            "showDetails.type": req.body.showDetails.type,
            "showDetails.description": req.body.showDetails.description,
            "showDetails.objectives": req.body.showDetails.objectives,
            "executiveProducer.lastName": req.body.executiveProducer.lastName,
            "executiveProducer.firstName": req.body.executiveProducer.firstName,
            "executiveProducer.mi": req.body.executiveProducer.mi,
            "executiveProducer.suffix": req.body.executiveProducer.suffix,
            "executiveProducer.cys": req.body.executiveProducer.cys,
            hosts: req.body.hosts,
            technicalStaff: req.body.technicalStaff,
            "creativeStaff.lastName": req.body.creativeStaff.lastName,
            "creativeStaff.firstName": req.body.creativeStaff.firstName,
            "creativeStaff.mi": req.body.creativeStaff.mi,
            "creativeStaff.suffix": req.body.creativeStaff.suffix,
            "creativeStaff.cys": req.body.creativeStaff.cys
        };

        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

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