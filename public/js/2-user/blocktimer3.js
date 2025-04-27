document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('status-container');

    async function fetchSubmissionStatus() {
        try {
            // Fetch the user's most recent submission using the new dedicated endpoint
            const response = await fetch('/my-latest-submission'); // <-- FIX: Use the new route
            if (!response.ok) {
                if (response.status === 404) {
                     statusContainer.innerHTML = '<p>You have no active blocktimer submissions.</p>';
                     return null;
                }
                // Try to get error message from backend response
                let errorMsg = `Failed to fetch status: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch(e) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }
            const submission = await response.json();
            displayStatus(submission);
            return submission; // Return submission for event listeners
        } catch (error) {
            console.error('Error fetching submission status:', error);
            statusContainer.innerHTML = `<p class="error">Error loading application status: ${error.message}</p>`;
            return null;
        }
    }

    function displayStatus(submission) {
        if (!submission) return;

        // Destructure result first
        const { _id, result, showDetails, preferredSchedule, schedule } = submission;
        const showTitle = showDetails?.title || 'Your Show';
        let htmlContent = '';

        // Convert result to lowercase for reliable comparison
        const lowerResult = result ? result.toLowerCase() : 'pending'; // Handle potential null/undefined result

        // Use lowerResult for comparisons
        if (lowerResult === 'accepted') {
            // Check if the associated schedule requires confirmation
            if (schedule && schedule.confirmationStatus === 'Pending Confirmation') {
                htmlContent = `
                    <h4>Schedule Update for "${showTitle}"</h4>
                    <p>Congratulations! Your application has been approved.</p>
                    <p>However, your schedule has been changed to:</p>
                    <p><b>Day:</b> ${schedule.day}</p>
                    <p><b>Time:</b> ${schedule.time}</p>
                    <p>Do you accept this new schedule?</p>
                    <button type="button" class="confirm-btn" data-submission-id="${_id}">Accept New Schedule</button>
                    <button type="button" class="reject-change-btn" data-submission-id="${_id}">Reject Change</button>
                `;
            } else {
                // Standard acceptance
                htmlContent = `
                    <h4>Application Approved: "${showTitle}"</h4>
                    <p>Congratulations! Your application has been approved.</p>
                    <p>Your show is scheduled for:</p>
                    <p><b>Day:</b> ${preferredSchedule?.day || schedule?.day || 'N/A'}</p>
                    <p><b>Time:</b> ${preferredSchedule?.time || schedule?.time || 'N/A'}</p>
                    <p>You can view the full schedule on the GreenFM website.</p>
                     <button type="button" class="acknowledge-btn" data-submission-id="${_id}">Okay</button>
                `;
            }
        } else if (lowerResult === 'rejected') { // <<< Compare lowercase 'rejected'
            htmlContent = `
                <h4>Application Update: "${showTitle}"</h4>
                <p>We regret to inform you that your application has been rejected.</p>
                <p>Thank you for your interest.</p>
                <button type="button" class="acknowledge-btn" data-submission-id="${_id}">Acknowledge</button>
            `;
        } else { // Pending (or any other unexpected value)
            htmlContent = `
                <h4>Application Pending: "${showTitle}"</h4>
                <p>Your application is currently under review.</p>
                <p>Preferred Schedule: ${preferredSchedule?.day || 'N/A'} ${preferredSchedule?.time || 'N/A'}</p>
            `;
        }
        statusContainer.innerHTML = htmlContent;
    }

    // --- Event Listeners ---
    statusContainer.addEventListener('click', async (event) => {
        const button = event.target;
        const submissionId = button.dataset.submissionId;
        let url = '';
        let action = '';

        if (button.classList.contains('confirm-btn')) {
            url = `/submissions/${submissionId}/confirm`; // Use API prefix if applicable
            action = 'confirm';
        } else if (button.classList.contains('reject-change-btn')) {
            url = `/submissions/${submissionId}/reject-change`;
            action = 'reject';
        } else if (button.classList.contains('acknowledge-btn')) {
            url = `/submissions/${submissionId}/acknowledge`;
            action = 'acknowledge';
        } else {
            return; // Ignore clicks not on relevant buttons
        }

        if (!submissionId) return;

        button.disabled = true; // Prevent double clicks
        button.textContent = 'Processing...';

        try {
            const response = await fetch(url, { method: 'POST' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Failed to ${action}`);
            }

            alert(data.message || `${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);

            // Refresh status or redirect
            if (action === 'confirm' || action === 'reject' || action === 'acknowledge') {
                // Maybe redirect or just disable buttons permanently after action
                 window.location.reload(); // Simple refresh
                // Or update UI directly:
                // statusContainer.innerHTML = `<p>${data.message}</p><p>You may close this page or navigate elsewhere.</p>`;
            }

        } catch (error) {
            console.error(`Error during ${action}:`, error);
            alert(`Error: ${error.message}`);
            button.disabled = false; // Re-enable button on error
            button.textContent = button.textContent.replace('Processing...', action === 'confirm' ? 'Accept New Schedule' : action === 'reject' ? 'Reject Change' : 'Acknowledge');
        }
    });

    // --- Initial Load ---
    await fetchSubmissionStatus();

});

// Backend route needed for fetchSubmissionStatus:
// Example: GET /my-latest-submission  <-- Updated comment
// This route should find the ApplyBlocktimer doc where submittedBy === req.user.email,
// sort by submittedOn descending, limit 1, and potentially populate the associated 'schedule' field.