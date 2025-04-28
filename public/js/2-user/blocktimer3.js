document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('status-container');
    let currentUserEmail = null; // Store user email if available
    let currentSubmissionId = null; // Store current submission ID being displayed

    // <<< Initialize Socket.IO >>>
    const socket = io();

    socket.on('connect', () => {
        console.log('User Step 3 Socket Connected:', socket.id);
        // If user email is known, maybe join a room
        // This requires getting the email, e.g., from a logged-in state
        // fetchUserEmail().then(email => {
        //     if (email) {
        //         currentUserEmail = email;
        //         socket.emit('joinUserRoom', email); // Need server handler for this
        //         console.log(`Joined room for ${email}`);
        //     }
        // });
    });

    socket.on('disconnect', () => {
        console.log('User Step 3 Socket Disconnected');
    });

    // <<< Listen for status updates >>>
    socket.on('submissionStatusUpdate', (data) => {
        console.log('Received submissionStatusUpdate (Step 3):', data);
        // Check if the update is for the submission currently displayed
        // This requires knowing the user's email or the displayed submission ID
        // Simple approach: If the update matches the displayed ID, refresh.
        if (data.submissionId === currentSubmissionId) {
             console.log(`Status update matches current submission (${currentSubmissionId}). Refreshing display.`);
             // Re-fetch or directly update the UI using 'data'
             // Direct update is more efficient:
             displayStatusUpdate(data); // Create a function to handle direct updates
        }
        // More robust: Check if data.applicantEmail matches currentUserEmail
        // if (currentUserEmail && data.applicantEmail === currentUserEmail) {
        //     console.log(`Status update for current user (${currentUserEmail}). Refreshing display.`);
        //     fetchSubmissionStatus(); // Re-fetch the latest status
        // }
    });


    async function fetchSubmissionStatus() {
        statusContainer.innerHTML = '<p>Loading application status...</p>'; // Show loading state
        try {
            const response = await fetch('/my-latest-submission');
            if (!response.ok) {
                if (response.status === 404) {
                     statusContainer.innerHTML = '<p>You have no active blocktimer submissions.</p>';
                     currentSubmissionId = null; // Reset ID
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
            currentSubmissionId = submission._id; // Store the ID
            displayStatus(submission); // Initial display
            return submission;
        } catch (error) {
            console.error('Error fetching submission status:', error);
            statusContainer.innerHTML = `<p class="error">Error loading application status: ${error.message}</p>`;
            currentSubmissionId = null; // Reset ID
            return null;
        }
    }

    // --- Function to display the initial status ---
    function displayStatus(submission) {
        if (!submission) {
             statusContainer.innerHTML = '<p>You have no active blocktimer submissions.</p>';
             return;
        }
        currentSubmissionId = submission._id; // Ensure ID is set

        const { _id, result, showDetails, preferredSchedule, schedule } = submission; // 'schedule' might be populated
        const showTitle = showDetails?.title || 'Your Show';
        let htmlContent = '';
        const lowerResult = result ? result.toLowerCase() : 'pending';

        // Determine the effective schedule to display
        let displaySchedule = preferredSchedule;
        if (schedule) { // If schedule object exists (populated), it takes precedence
            displaySchedule = { day: schedule.day, time: schedule.time };
        }

        if (lowerResult === 'accepted') {
            // Check confirmation status directly on the populated schedule object if it exists
            if (schedule && schedule.confirmationStatus === 'Pending Confirmation') {
                 htmlContent = `
                     <h4>Schedule Update for "${showTitle}"</h4>
                     <p>Congratulations! Your application has been approved.</p>
                     <p>However, your schedule has been changed by the admin to:</p>
                     <p><b>Day:</b> ${schedule.day}</p>
                     <p><b>Time:</b> ${schedule.time}</p>
                     <p>Do you accept this new schedule?</p>
                     <button type="button" class="confirm-btn" data-submission-id="${_id}">Accept New Schedule</button>
                     <button type="button" class="reject-change-btn" data-submission-id="${_id}">Reject Change</button>
                 `;
            } else {
                 htmlContent = `
                     <h4>Application Approved: "${showTitle}"</h4>
                     <p>Congratulations! Your application has been approved.</p>
                     <p>Your show is scheduled for:</p>
                     <p><b>Day:</b> ${displaySchedule?.day || 'N/A'}</p>
                     <p><b>Time:</b> ${displaySchedule?.time || 'N/A'}</p>
                      <button type="button" class="acknowledge-btn" data-submission-id="${_id}">Okay</button>
                 `;
            }
        } else if (lowerResult === 'rejected') {
             htmlContent = `
                 <h4>Application Update: "${showTitle}"</h4>
                 <p>We regret to inform you that your application has been rejected.</p>
                 <p>Thank you for your interest.</p>
                 <button type="button" class="acknowledge-btn" data-submission-id="${_id}">Acknowledge</button>
             `;
        } else { // Pending
             htmlContent = `
                 <h4>Application Pending: "${showTitle}"</h4>
                 <p>Your application is currently under review.</p>
                 <p>Requested Schedule: ${preferredSchedule?.day || 'N/A'} ${preferredSchedule?.time || 'N/A'}</p>
                 <p>You will be notified once a decision is made.</p>
             `;
        }
        statusContainer.innerHTML = htmlContent;
    }

    // --- Function to update display based on socket event data ---
    function displayStatusUpdate(data) {
         if (!data || data.submissionId !== currentSubmissionId) return; // Ensure it's the correct submission

         const { result, showTitle, requiresConfirmation, schedule, actionTaken, message } = data;
         let htmlContent = '';
         const lowerResult = result ? result.toLowerCase() : 'pending';

         // Handle specific actions first
         if (actionTaken === 'confirmed') {
             htmlContent = `
                 <h4>Schedule Confirmed for "${showTitle}"</h4>
                 <p>You have accepted the schedule:</p>
                 <p><b>Day:</b> ${schedule?.day || 'N/A'}</p>
                 <p><b>Time:</b> ${schedule?.time || 'N/A'}</p>
                 <p>Thank you! You may close this page.</p>
             `;
         } else if (actionTaken === 'rejected_change') {
              htmlContent = `
                  <h4>Schedule Change Rejected for "${showTitle}"</h4>
                  <p>${message || 'You have rejected the proposed schedule change. Please contact the admin for further steps.'}</p>
                  <p>You may close this page.</p>
              `;
         } else if (actionTaken === 'acknowledged') {
              const ackMsg = lowerResult === 'rejected'
                  ? `You have acknowledged the rejection of your application for "${showTitle}".`
                  : `You have acknowledged the approval of your application for "${showTitle}".`;
              htmlContent = `
                  <h4>Acknowledgement Received</h4>
                  <p>${ackMsg}</p>
                  <p>You may close this page.</p>
              `;
         }
         // Handle general status updates if no specific action message needed
         else if (lowerResult === 'accepted') {
             if (requiresConfirmation && schedule) {
                 htmlContent = `
                     <h4>Schedule Update for "${showTitle}"</h4>
                     <p>Congratulations! Your application has been approved.</p>
                     <p>However, your schedule has been changed by the admin to:</p>
                     <p><b>Day:</b> ${schedule.day}</p>
                     <p><b>Time:</b> ${schedule.time}</p>
                     <p>Do you accept this new schedule?</p>
                     <button type="button" class="confirm-btn" data-submission-id="${currentSubmissionId}">Accept New Schedule</button>
                     <button type="button" class="reject-change-btn" data-submission-id="${currentSubmissionId}">Reject Change</button>
                 `;
             } else {
                 // Use schedule from data if available, otherwise fallback needed
                 const displaySchedule = data.preferredSchedule || { day: 'N/A', time: 'N/A' };
                 htmlContent = `
                     <h4>Application Approved: "${showTitle}"</h4>
                     <p>Congratulations! Your application has been approved.</p>
                     <p>Your show is scheduled for:</p>
                     <p><b>Day:</b> ${displaySchedule.day}</p>
                     <p><b>Time:</b> ${displaySchedule.time}</p>
                      <button type="button" class="acknowledge-btn" data-submission-id="${currentSubmissionId}">Okay</button>
                 `;
             }
         } else if (lowerResult === 'rejected') {
             htmlContent = `
                 <h4>Application Update: "${showTitle}"</h4>
                 <p>We regret to inform you that your application has been rejected.</p>
                 <p>Thank you for your interest.</p>
                 <button type="button" class="acknowledge-btn" data-submission-id="${currentSubmissionId}">Acknowledge</button>
             `;
         } else { // Pending
              const displaySchedule = data.preferredSchedule || { day: 'N/A', time: 'N/A' };
             htmlContent = `
                 <h4>Application Pending: "${showTitle}"</h4>
                 <p>Your application is currently under review.</p>
                 <p>Requested Schedule: ${displaySchedule.day} ${displaySchedule.time}</p>
                 <p>You will be notified once a decision is made.</p>
             `;
         }

         statusContainer.innerHTML = htmlContent;
    }


    // --- Event Listeners for buttons ---
    statusContainer.addEventListener('click', async (event) => {
        const button = event.target;
        // Check if the click is on a button we care about
        if (!button.matches('.confirm-btn, .reject-change-btn, .acknowledge-btn')) {
            return;
        }

        const submissionId = button.dataset.submissionId;
        if (!submissionId || submissionId !== currentSubmissionId) return; // Ensure action is for current submission

        let url = '';
        let action = '';

        if (button.classList.contains('confirm-btn')) {
            url = `/submissions/${submissionId}/confirm`;
            action = 'confirm';
        } else if (button.classList.contains('reject-change-btn')) {
            url = `/submissions/${submissionId}/reject-change`;
            action = 'reject';
        } else if (button.classList.contains('acknowledge-btn')) {
            url = `/submissions/${submissionId}/acknowledge`;
            action = 'acknowledge';
        }

        button.disabled = true;
        button.textContent = 'Processing...';

        try {
            const response = await fetch(url, { method: 'POST' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Failed to ${action}`);
            }

            // Don't show alert, let the socket update handle the UI change
            // alert(data.message || `${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);

            // The socket listener 'submissionStatusUpdate' should receive an event
            // triggered by the backend upon successful action, which will then call displayStatusUpdate.
            // No need to manually reload or update UI here.

        } catch (error) {
            console.error(`Error during ${action}:`, error);
            alert(`Error: ${error.message}`);
            // Re-enable button on error
            button.disabled = false;
            // Restore original text based on action
             if (action === 'confirm') button.textContent = 'Accept New Schedule';
             else if (action === 'reject') button.textContent = 'Reject Change';
             else if (action === 'acknowledge') button.textContent = 'Acknowledge'; // Or 'Okay' depending on context
        }
    });

    // --- Initial Load ---
    await fetchSubmissionStatus();

});

// Backend route needed for fetchSubmissionStatus:
// Example: GET /my-latest-submission  <-- Updated comment
// This route should find the ApplyBlocktimer doc where submittedBy === req.user.email,
// sort by submittedOn descending, limit 1, and potentially populate the associated 'schedule' field.