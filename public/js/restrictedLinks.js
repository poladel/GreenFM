document.addEventListener('DOMContentLoaded', () => {
    const restrictedLinks = document.querySelectorAll('a[data-restricted]');

    restrictedLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default navigation

            const url = link.href; // <<< Use link.href instead of event.target.href

            // <<< Add check for valid URL >>>
            if (!url) {
                console.error('Restricted link clicked, but URL is invalid:', link);
                alert('Cannot navigate: Invalid link.');
                return;
            }
            // <<< End check >>>

            try {
                // Fetch the actual URL the link points to.
                // The backend route handler for 'url' should perform the access check.
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        // Add a header to indicate this is an access check request
                        'X-Access-Check': 'true'
                    }
                 });

                // If the response is OK (2xx), it means the backend allowed access directly
                // (or the route doesn't have the check middleware implemented correctly yet).
                // For a dedicated check, the backend should ideally *not* return 200 OK if access is denied.
                if (response.ok) {
                     // If the server responded with the actual page content,
                     // we can navigate. If it sent JSON, handle it.
                     // A simple check: if content-type is json, maybe it's a success message?
                     const contentType = response.headers.get("content-type");
                     if (contentType && contentType.indexOf("application/json") !== -1) {
                         const data = await response.json();
                         // Handle potential success JSON if needed, otherwise navigate
                         console.log("Access check returned JSON on OK:", data);
                         // Assuming OK + JSON means allowed, proceed. Adjust if backend sends success JSON differently.
                         window.location.href = url;
                     } else {
                         // Assume OK means allowed, navigate to the original URL
                         window.location.href = url;
                     }
                } else {
                    // Handle non-OK responses (like 403 Forbidden, 401 Unauthorized, 404 Not Found for config)
                    let data = {};
                    try {
                        // Try to parse potential JSON error body
                        data = await response.json();
                    } catch (e) {
                        console.warn("Could not parse non-OK response as JSON. Status:", response.status);
                        // Use a default message if JSON parsing fails
                        data.message = `Access Denied (Status: ${response.status}). Please check application period or login status.`;
                    }

                    alert(data.message || 'Access Denied.'); // Display the message
                    if (data.redirectUrl) {
                        window.location.href = data.redirectUrl; // Redirect if provided
                    }
                    // If no redirectUrl, stay on the current page after the alert.
                }
            } catch (error) {
                console.error('Error checking route availability:', error);
                alert('An error occurred while checking access. Please try again later.');
            }
        });
    });
});