document.addEventListener('DOMContentLoaded', () => {
    const restrictedLinks = document.querySelectorAll('a[data-restricted]');

    restrictedLinks.forEach(link => {
        link.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default navigation

            const url = event.target.href;

            try {
                const response = await fetch(url, { method: 'GET' });

                if (!response.ok) {
                    const data = await response.json();
                    alert(data.message); // Display the message in a pop-up
                    if (data.redirectUrl) {
                        window.location.href = data.redirectUrl; // Redirect if a URL is provided
                    }
                } else {
                    window.location.href = url; // Proceed with navigation if allowed
                }
            } catch (error) {
                console.error('Error checking route availability:', error);
                alert('An error occurred. Please try again later.');
            }
        });
    });
});