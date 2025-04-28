document.querySelector('.reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.querySelector('#email').value;
    const newPassword = document.querySelector('#new-password').value;
    const confirmNewPassword = document.querySelector('#confirm-new-pass').value;
    const newPasswordErrorDiv = document.querySelector('.new-password-error'); // Error div for new password
    const confirmNewPasswordErrorDiv = document.querySelector('.confirm-new-pass-error'); // Error div for confirm password

    // Clear any previous error messages
    newPasswordErrorDiv.textContent = '';
    confirmNewPasswordErrorDiv.textContent = '';

    // Client-side validation
    let hasError = false;

    if (newPassword !== confirmNewPassword) {
        confirmNewPasswordErrorDiv.textContent = 'Passwords do not match.';
        confirmNewPasswordErrorDiv.style.color = 'red'; // Optional: Style the error message
        hasError = true; // Mark that there is an error
    } else if (newPassword.length < 8) {
        newPasswordErrorDiv.textContent = 'Password must be at least 8 characters long.';
        newPasswordErrorDiv.style.color = 'red'; // Optional: Style the error message
        hasError = true; // Mark that there is an error
    }

    // Stop form submission if there are validation errors
    if (hasError) {
        console.log('Client-side validation failed. Form not submitted.'); // Debugging log
        return; // Stop execution
    }

    try {
        const response = await fetch('/LogIn/ResetPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, newPassword, confirmNewPassword })
        });

        const data = await response.json();
        console.log('Response from server:', data); // Debugging log

        if (response.ok) {
            // Redirect to login page with the username as a query parameter
            const username = data.username; // Use the username from the server response
            window.location.href = `/LogIn?username=${encodeURIComponent(username)}`;
        } else {
            // Display the error message in the newPasswordErrorDiv
            newPasswordErrorDiv.textContent = data.error || 'An error occurred.';
            newPasswordErrorDiv.style.color = 'red'; // Optional: Style the error message
        }
    } catch (err) {
        console.error('Error occurred in frontend:', err); // Debugging log
        // Display a generic error message in the newPasswordErrorDiv
        confirmNewPasswordErrorDiv.textContent = 'An error occurred. Please try again.';
        confirmNewPasswordErrorDiv.style.color = 'red'; // Optional: Style the error message
    }
});