const Schedule = require("../models/Schedule");

module.exports.postSchedule = async (req, res) => {
  try {
    const { 
      day,
      time,
      schoolYear,
      showDetails: {
        title: showTitle,
        type: showType = [],
        description: showDescription,
        objectives: showObjectives
      },
      executiveProducer: {
        lastName: execProducerLastName,
        firstName: execProducerFirstName,
        mi: execProducerMI,
        suffix: execProducerSuffix,
        cys: execProducerCYS
      },
      hosts = [], // array of hosts
      technicalStaff = [], // array of technical staff
      creativeStaff: {
        lastName: creativeStaffLastName,
        firstName: creativeStaffFirstName,
        mi: creativeStaffMI,
        suffix: creativeStaffSuffix,
        cys: creativeStaffCYS
      }
    } = req.body;

    const newSchedule = new Schedule({
      day,
      time,
      schoolYear,
      showDetails: {
        title: showTitle,
        type: showType,
        description: showDescription,
        objectives: showObjectives
      },
      executiveProducer: {
        lastName: execProducerLastName,
        firstName: execProducerFirstName,
        mi: execProducerMI,
        suffix: execProducerSuffix,
        cys: execProducerCYS
      },
      hosts,
      technicalStaff, 
      creativeStaff: {
        lastName: creativeStaffLastName,
        firstName: creativeStaffFirstName,
        mi: creativeStaffMI,
        suffix: creativeStaffSuffix,
        cys: creativeStaffCYS
      }
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