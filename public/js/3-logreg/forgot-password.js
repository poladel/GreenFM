document.querySelector('.forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.querySelector('#email').value;
    const errorDiv = document.querySelector('.email-error'); // Select the error div

    // Clear any previous error messages
    errorDiv.textContent = '';

    try {
        const response = await fetch('/LogIn/ForgotPassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: data.message, // "Password reset email sent successfully!"
                showConfirmButton: false,
                timer: 1500,
            });
        } else {
            // Display the error message in the errorDiv
            errorDiv.textContent = data.error || 'An error occurred.';
            errorDiv.style.color = 'red'; // Optional: Style the error message
        }
    } catch (err) {
        console.error('Error occurred:', err); // Debugging log
        // Display a generic error message in the errorDiv
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.style.color = 'red'; // Optional: Style the error message
    }
});