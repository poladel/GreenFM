document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('staff-application-status');
    let currentSubmissionId = null; // Store the ID of the submission being displayed

    // --- SPINNER FUNCTIONS ---
    function showSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'block';
    }

    function hideSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.style.display = 'none';
    }
    // --- END SPINNER FUNCTIONS ---

    // <<< Initialize Socket.IO >>>
    const socket = io({
        auth: {
            token: document.cookie.split('jwt=')[1]?.split(';')[0] // Send token
        }
    });

    socket.on('connect', () => console.log('Join GFM Step 3 Socket Connected:', socket.id));
    socket.on('disconnect', () => console.log('Join GFM Step 3 Socket Disconnected'));

    // <<< Listen for Staff Submission Status Updates >>>
    socket.on('staffSubmissionStatusUpdate', (data) => {
        console.log('Received staffSubmissionStatusUpdate:', data);
        // Check if the update is for the submission currently displayed
        if (data.submissionId === currentSubmissionId) {
            console.log(`Status update matches current submission (${currentSubmissionId}). Refreshing display.`);
            // Re-render the status display with the new data
            // We need the full submission object structure expected by displayStatus
            // The event currently sends { submissionId, result, preferredDepartment }
            // We might need to fetch the full details again, or enhance the event data
            // Simple approach: Re-fetch
            fetchStaffApplicationStatus();
            // Alternative: Enhance event data and displayStatus to accept partial updates
            // displayStatus(data); // If displayStatus can handle partial data
        } else {
            console.log("Status update ignored (different submission ID).");
        }
    });
    // <<< End Listener >>>

    async function fetchStaffApplicationStatus() {
        if (!statusContainer) return;
        showSpinner();
        try {
            const response = await fetch('/my-latest-staff-application'); // Use the new route

            if (!response.ok) {
                if (response.status === 404) {
                    statusContainer.innerHTML = '<p>You have no active staff applications.</p>';
                    return null;
                }
                let errorMsg = `Failed to fetch status: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                } catch (e) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            const submission = await response.json();
            currentSubmissionId = submission._id; // <<< Store the ID
            displayStatus(submission);
            return submission; // Return for potential event listeners

        } catch (error) {
            console.error('Error fetching staff application status:', error);
            statusContainer.innerHTML = `<p class="error">Error loading application status: ${error.message}</p>`;
            return null;
        } finally {
            hideSpinner();
        }
    }

    function displayStatus(submission) {
        if (!submission || !statusContainer) return;
        currentSubmissionId = submission._id; // Ensure ID is set here too

        const { _id, result, preferredDepartment } = submission;
        const lowerResult = result ? result.toLowerCase() : 'pending';
        let htmlContent = '';

        if (lowerResult === 'accepted') {
            htmlContent = `
                <h4>Application Approved!</h4>
                <p>Congratulations! Your application to join GreenFM (Department: ${preferredDepartment || 'N/A'}) has been <strong>approved</strong>.</p>
                <p>Welcome to the team!</p>
                <button type="button" class="acknowledge-staff-btn" data-submission-id="${_id}">Acknowledge & Continue</button>
            `;
        } else if (lowerResult === 'rejected') {
            htmlContent = `
                <h4>Application Update</h4>
                <p>Thank you for applying to GreenFM (Department: ${preferredDepartment || 'N/A'}).</p>
                <p>We regret to inform you that your application has been <strong>rejected</strong> at this time.</p>
                <button type="button" class="acknowledge-staff-btn" data-submission-id="${_id}">Acknowledge</button>
            `;
        } else { // Pending
            htmlContent = `
                <h4>Application Pending</h4>
                <p>Your application to join GreenFM (Department: ${preferredDepartment || 'N/A'}) is currently under review.</p>
                <p>Please check back later for updates.</p>
            `;
        }
        statusContainer.innerHTML = htmlContent;

        // Add event listener AFTER rendering the button
        const acknowledgeBtn = statusContainer.querySelector('.acknowledge-staff-btn');
        if (acknowledgeBtn) {
            acknowledgeBtn.addEventListener('click', handleAcknowledge);
        }
    }

    async function handleAcknowledge(event) {
        const submissionId = event.target.dataset.submissionId;
        if (!submissionId) return;

        showSpinner();
        try {
            const response = await fetch(`/staff-applications/${submissionId}/acknowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json(); // Always parse JSON

            if (!response.ok && response.status !== 404) { // Handle non-404 errors normally
                throw new Error(data.message || 'Failed to acknowledge result.');
            }

            // --- Check for logout flag and redirect ---
            alert(data.message || 'Result acknowledged.'); // Show message from backend
            if (data.logout && data.redirectUrl) {
                window.location.href = data.redirectUrl; // Redirect to login
            } else {
                // Fallback redirect if needed, though login is expected
                window.location.href = '/';
            }
            // --- End Check ---

        } catch (error) {
            console.error('Error acknowledging result:', error);
            alert(`Error: ${error.message}`);
            // Optionally redirect to login even on error
            // window.location.href = '/login';
        } finally {
            hideSpinner(); // Hide spinner regardless of outcome
        }
    }

    // --- Initial Load ---
    fetchStaffApplicationStatus();

});