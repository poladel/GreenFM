document.addEventListener('DOMContentLoaded', async () => {
    // Function to refresh the access token
    async function refreshAccessToken() {
        const refreshToken = getCookie('refreshToken'); // Function to get the refresh token from cookies
        if (refreshToken) {
            const response = await fetch('/refresh-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                // Set the new access token in cookies
                document.cookie = `jwt=${data.accessToken}; path=/; max-age=${60}`;
            } else {
                window.location.href = '/LogIn'; // Redirect to login if refresh fails
            }
        }
    }

    // Check if the access token is expired
    function isAccessTokenExpired() {
        const token = getCookie('jwt');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return (Date.now() >= payload.exp * 1000); // Check if token is expired
        }
        return true; // Assume expired if no token
    }

    // Get cookie value by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Check access token and refresh if expired
    if (isAccessTokenExpired()) {
        await refreshAccessToken(); // Refresh token if needed
    }
});
