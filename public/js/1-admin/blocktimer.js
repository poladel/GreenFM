/*-----SCHEDULE TAB-----*/
document.addEventListener("DOMContentLoaded", async () => {
    const scheduleButtons = document.querySelectorAll(".availablebtn");
    const modal = document.getElementById("scheduleModal");
    const scheduleForm = document.getElementById("scheduleForm");
    const closeModal = document.querySelector(".close");
    const saveButton = document.getElementById("saveButton");
    const deleteButton = document.getElementById("deleteButton");

    // Fetch schedules from the server
    try {
        const response = await fetch("/schedule"); // Ensure the correct endpoint is used
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const schedules = await response.json();

        // Populate buttons with schedule data
        schedules.forEach((schedule) => {
            const button = document.querySelector(
                `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
            );
            if (button) {
                button.textContent = schedule.title; // Set the title of the show
                button.classList.add("schedulebtn"); // Add a class to indicate it's scheduled
                button.dataset.scheduleId = schedule._id; // Store the schedule ID for editing
            }
        });
    } catch (error) {
        console.error("Error fetching schedules:", error);
    }

    // Open modal on button click
    scheduleButtons.forEach((button) => {
        button.addEventListener("click", async (e) => {
            const day = button.dataset.day;
            const time = button.dataset.time;
            const scheduleId = button.dataset.scheduleId;

            // Populate the form with existing data if available
            if (scheduleId) {
                try {
                    const response = await fetch(`/schedule/${scheduleId}`);
                    if (!response.ok) throw new Error("Failed to fetch schedule details");

                    const schedule = await response.json();
                    scheduleForm.dataset.scheduleId = schedule._id; // Store the schedule ID in the form
                    scheduleForm.dataset.day = day;
                    scheduleForm.dataset.time = time;

                    // Populate form fields
                    document.getElementById("title").value = schedule.title || "";
                    document.getElementById("description").value = schedule.description || "";

                    // Change "Save" button to "Edit" and show the "Delete" button
                    saveButton.textContent = "Edit";
                    deleteButton.style.display = "inline-block";
                } catch (error) {
                    console.error("Error fetching schedule details:", error);
                }
            } else {
                // If no schedule exists, clear the form
                scheduleForm.dataset.scheduleId = "";
                scheduleForm.dataset.day = day;
                scheduleForm.dataset.time = time;
                scheduleForm.reset();

                // Change "Edit" button back to "Save" and hide the "Delete" button
                saveButton.textContent = "Save";
                deleteButton.style.display = "none";
            }

            modal.style.display = "block";
        });
    });

    // Close modal
    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Save or Edit schedule
    saveButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const formData = new FormData(scheduleForm);
        formData.append("day", scheduleForm.dataset.day);
        formData.append("time", scheduleForm.dataset.time);

        const data = Object.fromEntries(formData.entries());
        data.schoolYear = new Date().getFullYear().toString();

        const scheduleId = scheduleForm.dataset.scheduleId;
        const method = scheduleId ? "PATCH" : "POST";
        const url = scheduleId ? `/schedule/${scheduleId}` : "/schedule";

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                alert(scheduleId ? "Schedule updated successfully!" : "Schedule saved successfully!");
                modal.style.display = "none";

                // Update button with show title
                const button = document.querySelector(
                    `.availablebtn[data-day="${data.day}"][data-time="${data.time}"]`
                );
                button.textContent = data.title;
                button.classList.add("schedulebtn");
            } else {
                alert("Failed to save schedule.");
            }
        } catch (error) {
            console.error("Error saving schedule:", error);
        }
    });

    // Delete schedule
    deleteButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const scheduleId = scheduleForm.dataset.scheduleId;
        if (!scheduleId) return;

        const confirmDelete = confirm("Are you sure you want to delete this schedule?");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/schedule/${scheduleId}`, {
                method: "DELETE",
            });

            if (response.ok) {
                alert("Schedule deleted successfully!");
                modal.style.display = "none";

                // Clear the button text and re-enable it
                const button = document.querySelector(
                    `.availablebtn[data-day="${scheduleForm.dataset.day}"][data-time="${scheduleForm.dataset.time}"]`
                );
                button.textContent = "";
                button.classList.remove("schedulebtn");
                button.disabled = false;
            } else {
                alert("Failed to delete schedule.");
            }
        } catch (error) {
            console.error("Error deleting schedule:", error);
        }
    });
});

/*-----SUBMISSIONS TAB-----*/
// Fetch and display submissions in the table
async function loadSubmissions() {
    try {
        const response = await fetch('/submissions');
        const submissions = await response.json();

        const tableBody = document.getElementById('submissions-table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        if (Array.isArray(submissions) && submissions.length > 0) {
            submissions.forEach(submission => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${submission.showDetails.title}</td>
                    <td>${submission.organizationName}</td>
                    <td>${submission.preferredSchedule.day} ${submission.preferredSchedule.time}</td>
                    <td><button type="button" class="select-btn" data-id="${submission._id}">Select</button></td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners to "Select" buttons
            document.querySelectorAll('.select-btn').forEach(button => {
                button.addEventListener('click', () => selectSubmission(button.dataset.id));
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No submissions available.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
        document.getElementById('submissions-table-body').innerHTML = '<tr><td colspan="4">Failed to load submissions.</td></tr>';
    }
}

// Populate the form with the selected submission's details
async function selectSubmission(submissionId) {
    try {
        const response = await fetch(`/submissions/${submissionId}`);
        const submission = await response.json();

        // Populate the form fields
        document.getElementById('organizationName').value = submission.organizationName;
        document.getElementById('organizationType').value = submission.organizationType;
        document.getElementById('proponentName').value = `${submission.proponent.lastName}, ${submission.proponent.firstName} ${submission.proponent.middleInitial ?? ''} ${submission.proponent.suffix ?? ''}`;
        document.getElementById('proponentCYS').value = `${submission.proponent.cys ?? ''}`;
        if (submission.coProponent.notApplicable) {
            document.getElementById('coProponentName').value = 'N/A';
            document.getElementById('coProponentCYS').value = 'N/A';
        } else {
            document.getElementById('coProponentName').value = `${submission.coProponent.lastName}, ${submission.coProponent.firstName} ${submission.coProponent.middleInitial ?? ''} ${submission.coProponent.suffix ?? ''}`;
            document.getElementById('coProponentCYS').value = `${submission.coProponent.cys ?? ''}`;
        }
        document.getElementById('executiveProducer').value = `${submission.executiveProducer.lastName}, ${submission.executiveProducer.firstName} ${submission.executiveProducer.middleInitial ?? ''} ${submission.executiveProducer.suffix ?? ''}`;
        document.getElementById('executiveProducerCYS').value = `${submission.executiveProducer.cys ?? ''}`;
        if (submission.facultyStaff.notApplicable) {
            document.getElementById('facultyStaff').value = 'N/A';
            document.getElementById('facultyStaffDepartment').value = 'N/A';
        } else {
            document.getElementById('facultyStaff').value = `${submission.facultyStaff.lastName}, ${submission.facultyStaff.firstName} ${submission.facultyStaff.middleInitial ?? ''} ${submission.facultyStaff.suffix ?? ''}`;
            document.getElementById('facultyStaffDepartment').value = `${submission.facultyStaff.cys ?? ''}`;
        }

        document.getElementById('host-container').innerHTML = '';

        // Iterate over the hosts array and populate the fields
        submission.hosts.forEach((host, index) => {
            const hostField = document.createElement('div');
            hostField.innerHTML = `
                <label for="host${index}">Host Name:</label>
                <input type="text" id="host${index}" name="host${index}" value="${host.lastName}, ${host.firstName} ${host.middleInitial ?? ''} ${host.suffix ?? ''}" readonly>
                
                <label for="hostCYS${index}">Host CYS:</label>
                <input type="text" id="hostCYS${index}" name="hostCYS${index}" value="${host.cys ?? ''}" readonly>
            `;
            document.getElementById('host-container').appendChild(hostField);
        });

        document.getElementById('technicalStaff-container').innerHTML = '';

        // Iterate over the hosts array and populate the fields
        submission.technicalStaff.forEach((technicalStaff, index) => {
            const technicalStaffField = document.createElement('div');
            technicalStaffField.innerHTML = `
                <label for="technicalStaff${index}">technicalStaff Name:</label>
                <input type="text" id="technicalStaff${index}" name="technicalStaff${index}" value="${technicalStaff.lastName}, ${technicalStaff.firstName} ${technicalStaff.middleInitial ?? ''} ${technicalStaff.suffix ?? ''}" readonly>
                
                <label for="technicalStaffCYS${index}">technicalStaff CYS:</label>
                <input type="text" id="technicalStaffCYS${index}" name="technicalStaffCYS${index}" value="${technicalStaff.cys ?? ''}" readonly>
            `;
            document.getElementById('technicalStaff-container').appendChild(technicalStaffField);
        });

        document.getElementById('creativeStaff').value = `${submission.creativeStaff.lastName}, ${submission.creativeStaff.firstName} ${submission.creativeStaff.middleInitial ?? ''} ${submission.creativeStaff.suffix ?? ''}`;
        document.getElementById('creativeStaffCYS').value = `${submission.creativeStaff.cys ?? ''}`;
        document.getElementById('dlsudEmail').value = submission.contactInfo.dlsudEmail;
        document.getElementById('contactEmail').value = submission.contactInfo.contactEmail;
        document.getElementById('contactFbLink').value = submission.contactInfo.contactFbLink;
        if (submission.contactInfo.crossposting === 'Yes') {
            document.getElementById('FbLink').value = submission.contactInfo.fbLink;
            document.getElementById('FbLink-container').style.display = 'block'; // Ensure it is visible
        } else {
            document.getElementById('FbLink-container').style.display = 'none'; // Properly hide the element
            document.getElementById('FbLink').value = ''; // Clear the value to avoid stale data
        }
        if (submission.proponentSignature) {
            const proponentSignatureImg = document.getElementById('proponentSignature');
            proponentSignatureImg.src = submission.proponentSignature;
            proponentSignatureImg.style.display = 'block'; // Show the image
        } else {
            document.getElementById('proponentSignature').style.display = 'none'; // Hide the image
        }
        document.getElementById('showTitle').value = submission.showDetails.title;
        document.getElementById('showType').value = submission.showDetails.type;
        document.getElementById('showDescription').value = submission.showDetails.description;
        document.getElementById('showObjectives').value = submission.showDetails.objectives;
        document.getElementById('preferredDay').value = submission.preferredSchedule.day;
        document.getElementById('preferredTime').value = submission.preferredSchedule.time;

        // Show the form
        document.getElementById('result').disabled = false;

        // Enable the "Cancel" and "Submit" buttons
        document.querySelector('.cancel-button').disabled = false;
        document.querySelector('.submit-button').disabled = false;
        
        document.querySelector('.submit-button').dataset.submissionId = submissionId;
    } catch (error) {
        console.error('Error fetching submission details:', error);
        alert('Failed to load submission details.');
    }
}

async function updateSubmission(submissionId) {
    const result = document.getElementById('result').value;

    const updates = { result };

    try {
        const response = await fetch(`/submissions/${submissionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Submission updated successfully!');
            loadSubmissions(); // Reload the submissions table
            clearFields(); // Clear the form fields
        } else {
            alert(result.error || 'Failed to update submission');
        }
    } catch (error) {
        console.error('Error updating submission:', error);
        alert('Failed to update submission');
    }
}

// Add event listener to the "Submit" button
document.querySelector('.submit-button').addEventListener('click', () => {
    const submissionId = document.querySelector('.submit-button').dataset.submissionId;
    if (submissionId) {
        updateSubmission(submissionId);
    } else {
        alert('No submission selected');
    }
});

document.querySelector('.cancel-button').addEventListener('click', () => {
    clearFields();
});

// Load submissions on page load
document.addEventListener('DOMContentLoaded', loadSubmissions);

// Tab switching logic
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'active' class from all buttons and tabs
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));

        // Add 'active' class to the clicked button and corresponding tab
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

function clearFields() {
    // Clear all form fields
    document.getElementById('organizationName').value = '';
    document.getElementById('organizationType').value = '';
    document.getElementById('proponentName').value = '';
    document.getElementById('proponentCYS').value = '';
    document.getElementById('coProponentName').value = '';
    document.getElementById('coProponentCYS').value = '';
    document.getElementById('executiveProducer').value = '';
    document.getElementById('executiveProducerCYS').value = '';
    document.getElementById('facultyStaff').value = '';
    document.getElementById('facultyStaffDepartment').value = '';
    document.getElementById('host-container').innerHTML = '';
    document.getElementById('technicalStaff-container').innerHTML = '';
    document.getElementById('creativeStaff').value = '';
    document.getElementById('creativeStaffCYS').value = '';
    document.getElementById('dlsudEmail').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactFbLink').value = '';
    document.getElementById('FbLink').value = '';
    document.getElementById('FbLink-container').style.display = 'none';
    document.getElementById('proponentSignature').style.display = 'none';
    document.getElementById('showTitle').value = '';
    document.getElementById('showType').value = '';
    document.getElementById('showDescription').value = '';
    document.getElementById('showObjectives').value = '';
    document.getElementById('preferredDay').value = '';
    document.getElementById('preferredTime').value = '';

    // Disable the "Cancel" and "Submit" buttons
    document.querySelector('.cancel-button').disabled = true;
    document.querySelector('.submit-button').disabled = true;

    // Optionally, disable the form or reset any other state
    document.getElementById('result').disabled = true;
}

