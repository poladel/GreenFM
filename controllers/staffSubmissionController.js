const ApplyStaff = require('../models/ApplyStaff'); // Make sure ApplyStaff model is required
// ... other requires ...

// --- NEW Submission Controller Functions ---

// Get distinct school years from submissions
exports.getSubmissionYears = async (req, res) => {
    try {
        const years = await ApplyStaff.distinct('schoolYear');
        // Sort years if needed, e.g., descending
        years.sort((a, b) => b.localeCompare(a));
        res.status(200).json(years);
    } catch (error) {
        console.error("Error fetching distinct submission years:", error);
        res.status(500).json({ message: "Failed to fetch submission years" });
    }
};

// Get submissions based on filters
exports.getSubmissions = async (req, res) => {
    try {
        const { year, status, department, id } = req.query; // Add id for fetching single

        const query = {};

        if (id) {
            // If ID is provided, fetch only that one (for detail view)
            query._id = id;
        } else {
            // Apply filters if no ID
            if (year) {
                query.schoolYear = year;
            } else {
                // Default to current year if no year specified? Or handle error?
                // For now, let's require year or fetch all if none provided
                // query.schoolYear = new Date().getFullYear().toString(); // Example default
            }

            if (status && status !== 'All') {
                query.result = status;
            }

            if (department && department !== 'All') {
                query.preferredDepartment = department;
            }
        }


        console.log("Submission Query:", query); // Log the query

        // Select fields needed for the table or full details
        const selection = id ? '' : 'lastName firstName middleInitial suffix studentNumber preferredDepartment result'; // Empty string selects all if ID is present

        const submissions = await ApplyStaff.find(query)
            .select(selection)
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json(submissions);

    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).json({ message: "Failed to fetch submissions" });
    }
};

// Update submission result
exports.updateSubmissionResult = async (req, res) => {
    try {
        const { id } = req.params;
        const { result } = req.body; // Expecting { "result": "Accepted" | "Rejected" | "Pending" }

        if (!result || !['Pending', 'Accepted', 'Rejected'].includes(result)) {
            return res.status(400).json({ message: 'Invalid result value provided.' });
        }

        const updatedSubmission = await ApplyStaff.findByIdAndUpdate(
            id,
            { result: result },
            { new: true, runValidators: true } // Return updated doc, run schema validators
        );

        if (!updatedSubmission) {
            return res.status(404).json({ message: 'Submission not found.' });
        }

        console.log(`Submission ${id} status updated to ${result}`);
        res.status(200).json({ message: 'Submission status updated successfully.', submission: updatedSubmission });

    } catch (error) {
        console.error("Error updating submission result:", error);
        res.status(500).json({ message: 'Failed to update submission status.' });
    }
};

// --- END NEW Submission Controller Functions ---

// ... other admin controller functions ...