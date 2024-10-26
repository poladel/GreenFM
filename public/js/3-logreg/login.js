const form = document.querySelector('.login-form');
const usernameError = document.querySelector('.username-error');
const passwordError = document.querySelector('.password-error');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset Errors
    usernameError.textContent = "";
    passwordError.textContent = "";

    const username = form.username.value;
    const password = form.password.value;
    const redirectUrl = form.querySelector('input[name="redirect"]').value; // This captures the redirect URL

    // Log the redirect URL to see what is being sent
    console.log('Redirect URL to be sent:', redirectUrl); 

    try {
        const res = await fetch('/LogIn', {
            method: 'POST',
            body: JSON.stringify({ username, password, redirect: redirectUrl }), // Sending redirect URL here
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await res.json();
        console.log('Response data from server:', data); // Log the complete response

        // Handle errors
        if (data.errors) {
            usernameError.textContent = data.errors.username || '';
            passwordError.textContent = data.errors.password || '';
        }

        // Redirect if login is successful
        if (data.user) {
            console.log('Login successful, redirecting to:', data.redirect);
            location.assign(data.redirect || '/'); // Redirect using the URL from the server response
        }
    } catch (err) {
        console.log('Error during fetch:', err); // Log any fetch errors
    }
});

