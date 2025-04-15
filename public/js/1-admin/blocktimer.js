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
        document.getElementById('proponentSignature').src = submission.proponentSignature;
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
    } catch (error) {
        console.error('Error fetching submission details:', error);
        alert('Failed to load submission details.');
    }
}

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

