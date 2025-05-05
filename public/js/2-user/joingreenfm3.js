// --- START OF FILE GreenFM copy/public/js/2-user/joingreenfm3.js ---
// (Keep the rest of the file as it was in the previous message)

document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('staff-application-status');
    const spinner = document.getElementById('loading-spinner'); // Get spinner element
    let currentSubmissionId = null;
    const currentUserId = document.body.dataset.userId; // <<< Get User ID from body data attribute

    // --- UPDATED SPINNER FUNCTIONS ---
    function showSpinner() {
        // Use Tailwind classes for visibility
        if (spinner) {
            spinner.classList.remove('hidden');
            spinner.classList.add('block'); // Or 'flex' if your spinner uses flex for centering
        }
    }

    function hideSpinner() {
        // Use Tailwind classes for visibility
        if (spinner) {
            spinner.classList.add('hidden');
            spinner.classList.remove('block'); // Or 'flex'
        }
    }
    // --- END UPDATED SPINNER FUNCTIONS ---

    // <<< Initialize Socket.IO >>>
    const socket = io(); // Removed auth token here, will authenticate via event

    socket.on('connect', () => {
        console.log('Join GFM Step 3 Socket Connected:', socket.id);
        // <<< Emit authenticate event with user ID >>>
        if (currentUserId) {
            console.log(`Emitting authenticate event for user: ${currentUserId}`);
            socket.emit('authenticate', currentUserId);
        } else {
            console.error("User ID not found in body dataset. Cannot authenticate socket.");
        }
    });

    // <<< Listen for successful authentication from server >>>
    socket.on('auth_success', (data) => {
        console.log(`Socket authentication successful for user: ${data.userId}`);
        // You could potentially trigger the initial fetch here if needed,
        // but DOMContentLoaded already handles it.
    });

    // <<< Listen for authentication failure (optional but good practice) >>>
    socket.on('auth_failure', (data) => {
        console.error(`Socket authentication failed: ${data.error}`);
        // Handle failure, e.g., show an error message to the user
    });


    socket.on('disconnect', () => console.log('Join GFM Step 3 Socket Disconnected'));

    // <<< Listen for Staff Submission Status Updates >>>
    socket.on('staffSubmissionStatusUpdate', (data) => {
        console.log('Received staffSubmissionStatusUpdate:', data);
        // Check if the update is for the submission currently being viewed
        if (data.submissionId === currentSubmissionId) {
            console.log(`Status update matches current submission (${currentSubmissionId}). Refreshing display.`);
            fetchStaffApplicationStatus(); // Re-fetch to get full, updated data and redraw UI
        } else {
            console.log(`Status update received for ${data.submissionId}, but currently viewing ${currentSubmissionId}. Ignoring.`);
        }
    });
    // <<< End Listener >>>

    async function fetchStaffApplicationStatus() {
        if (!statusContainer) return;
        showSpinner();
        try {
            const response = await fetch('/my-latest-staff-application');

            if (!response.ok) {
                if (response.status === 404) {
                    statusContainer.innerHTML = '<p class="text-gray-600">You have no active staff applications.</p>'; // Added Tailwind class
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
            currentSubmissionId = submission._id;
            displayStatus(submission);
            return submission;

        } catch (error) {
            console.error('Error fetching staff application status:', error);
            statusContainer.innerHTML = `<p class="text-red-600 font-semibold">Error loading application status: ${error.message}</p>`; // Added Tailwind class
            return null;
        } finally {
            hideSpinner();
        }
    }

    function displayStatus(submission) {
        if (!submission || !statusContainer) return;
        currentSubmissionId = submission._id;

        const { _id, result, preferredDepartment } = submission;
        const lowerResult = result ? result.toLowerCase() : 'pending';
        let htmlContent = '';

        // Apply Tailwind classes directly in the HTML strings
        const baseParagraphStyle = "text-base text-gray-700 mb-2";
        const headingStyle = "text-xl font-bold text-green-800 mb-3"; // Adjusted heading color slightly for theme
        // Dark green button style for rejected/pending (and now accepted too)
        const darkGreenButtonStyle = "acknowledge-staff-btn mt-4 px-5 py-2 bg-green-800 text-white text-sm font-semibold rounded-lg shadow hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-opacity-50 transition duration-150 ease-in-out";

        if (lowerResult === 'accepted') {
            htmlContent = `
                <h4 class="${headingStyle}">Application Approved!</h4>
                <p class="${baseParagraphStyle}">Congratulations! Your application to join GreenFM (Department: ${preferredDepartment || 'N/A'}) has been <strong class="font-semibold text-green-600">approved</strong>.</p>
                <p class="${baseParagraphStyle}">Welcome to the team!</p>
                <button type="button" class="${darkGreenButtonStyle}" data-submission-id="${_id}">Acknowledge & Continue</button>
            `;
        } else if (lowerResult === 'rejected') {
            htmlContent = `
                <h4 class="${headingStyle}">Application Update</h4>
                <p class="${baseParagraphStyle}">Thank you for applying to GreenFM (Department: ${preferredDepartment || 'N/A'}).</p>
                <p class="${baseParagraphStyle}">We regret to inform you that your application has been <strong class="font-semibold text-red-600">rejected</strong> at this time.</p>
                <button type="button" class="${darkGreenButtonStyle}" data-submission-id="${_id}">Acknowledge</button>
            `;
        } else { // Pending
            htmlContent = `
                <h4 class="${headingStyle}">Application Pending</h4>
                <p class="${baseParagraphStyle}">Your application to join GreenFM (Department: ${preferredDepartment || 'N/A'}) is currently under review.</p>
                <p class="${baseParagraphStyle}">Please check back later for updates.</p>
            `;
            // No button for pending status
        }
        statusContainer.innerHTML = htmlContent;

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

            const data = await response.json();

            if (!response.ok && response.status !== 404) {
                throw new Error(data.message || 'Failed to acknowledge result.');
            }

             // Show message regardless of logout status now
             alert(data.message || 'Result acknowledged.');

             // Redirect logic
             if (data.logout && data.redirectUrl) {
                 console.log("Logging out and redirecting to:", data.redirectUrl);
                 window.location.href = data.redirectUrl;
             } else {
                 // If not logging out, maybe just go home? Or stay? Let's default to home.
                 console.log("Acknowledgement successful, redirecting to home.");
                 window.location.href = '/';
             }


        } catch (error) {
            console.error('Error acknowledging result:', error);
            alert(`Error: ${error.message}`);
        } finally {
            hideSpinner();
        }
    }

    // Initial Load
    fetchStaffApplicationStatus();

}); // End DOMContentLoaded
// --- END OF FILE GreenFM copy/public/js/2-user/joingreenfm3.js ---