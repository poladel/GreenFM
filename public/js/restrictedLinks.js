document.addEventListener('DOMContentLoaded', function() {
    // Select links that might need restriction checks
    // Using data-restricted attribute is a good practice
    const restrictedLinks = document.querySelectorAll('a[data-restricted]');

    restrictedLinks.forEach(link => {
        link.addEventListener('click', async function(event) {
            event.preventDefault(); // Prevent default link navigation first

            try {
                // Make a request to the backend to check if access is allowed
                // Use the link's href as the endpoint to check, assuming it points to a check route
                // Or define a specific check endpoint like '/check-access?target=' + encodeURIComponent(link.href)
                // For this example, let's assume a dedicated check endpoint:
                const checkUrl = '/check-staff-application-access'; // Adjust this endpoint as needed

                const response = await fetch(checkUrl); // Example endpoint

                if (!response.ok) {
                    // Handle non-OK responses (e.g., server error, or specific 4xx errors)
                    const errorData = await response.json().catch(() => ({})); // Try to parse JSON error
                    console.error('Access check failed:', response.status, errorData.message);

                    // If the server sends a specific redirect for failure (like login page)
                    if (errorData.redirectUrl) {
                        if (errorData.message) {
                            alert(errorData.message); // Show message first
                        }
                        window.location.href = errorData.redirectUrl;
                    } else {
                        // Show generic error if no specific redirect provided
                        alert(errorData.message || 'Could not verify access. Please try again later.');
                    }
                    return; // Stop further execution
                }

                // If response is OK (2xx), parse the JSON data
                const data = await response.json();

                if (data.allowed) {
                    // If allowed, proceed to the link's original destination
                    window.location.href = link.href;
                } else {
                    // If not allowed (but response was OK), redirect based on server instructions
                    if (data.redirectUrl) {
                        // Display the alert message before redirecting
                        if (data.message) {
                            alert(data.message);
                        }
                        window.location.href = data.redirectUrl;
                    } else if (data.message) {
                        // If only a message is provided, show it
                        alert(data.message);
                         // Optional: Stay on the current page or redirect to home?
                         // window.location.href = '/'; // Example: redirect home
                    } else {
                        // Fallback if server response is unexpected (OK but no clear instruction)
                        alert('Access denied.');
                    }
                }

            } catch (error) {
                console.error('Error checking access:', error);
                alert('An error occurred while checking access. Please try again.');
                // Decide fallback behavior on network/client-side error
                // window.location.href = link.href; // Example: Proceed anyway (less secure)
            }
        });
    });
});