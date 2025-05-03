// --- START OF FILE GreenFM copy/public/js/2-user/joingreenfm3.js ---
// (Keep the rest of the file as it was in the previous message)

document.addEventListener('DOMContentLoaded', async () => {
    const statusContainer = document.getElementById('staff-application-status');
    const spinner = document.getElementById('loading-spinner'); // Get spinner element
    let currentSubmissionId = null;

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
        if (data.submissionId === currentSubmissionId) {
            console.log(`Status update matches current submission (${currentSubmissionId}). Refreshing display.`);
            fetchStaffApplicationStatus(); // Re-fetch to get full, updated data
        } else {
            console.log("Status update ignored (different submission ID).");
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
        const headingStyle = "text-xl font-bold text-greenfm-primary mb-3";
        // Base button style for rejected/pending (original style)
        const baseButtonStyle = "acknowledge-staff-btn mt-4 px-5 py-2 bg-greenfm-primary text-white text-sm font-semibold rounded-lg shadow hover:bg-greenfm-primary-dark focus:outline-none focus:ring-2 focus:ring-greenfm-primary focus:ring-opacity-50 transition duration-150 ease-in-out";
        // Specific style for accepted button (white bg, green text, green border)
        const acceptedButtonStyle = "acknowledge-staff-btn mt-4 px-5 py-2 bg-white text-green-600 border border-green-600 text-sm font-semibold rounded-lg shadow hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-150 ease-in-out";

        if (lowerResult === 'accepted') {
            htmlContent = `
                <h4 class="${headingStyle}">Application Approved!</h4>
                <p class="${baseParagraphStyle}">Congratulations! Your application to join GreenFM (Department: ${preferredDepartment || 'N/A'}) has been <strong class="font-semibold text-green-600">approved</strong>.</p>
                <p class="${baseParagraphStyle}">Welcome to the team!</p>
                <button type="button" class="${acceptedButtonStyle}" data-submission-id="${_id}">Acknowledge & Continue</button>
            `;
        } else if (lowerResult === 'rejected') {
            htmlContent = `
                <h4 class="${headingStyle}">Application Update</h4>
                <p class="${baseParagraphStyle}">Thank you for applying to GreenFM (Department: ${preferredDepartment || 'N/A'}).</p>
                <p class="${baseParagraphStyle}">We regret to inform you that your application has been <strong class="font-semibold text-red-600">rejected</strong> at this time.</p>
                <button type="button" class="${baseButtonStyle}" data-submission-id="${_id}">Acknowledge</button>
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