document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.forgot-password-form');
    const emailError = document.querySelector('.email-error');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = form.email.value;
            const submitButton = form.querySelector('button[type="submit"]');

            // Clear previous errors
            if (emailError) emailError.textContent = '';
            if (submitButton) submitButton.disabled = true;

            try {
                const res = await fetch('/LogIn/ForgotPassword', { 
                    method: 'POST',
                    body: JSON.stringify({ email }),
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    form.reset(); // Clear the form
                    if (emailError) emailError.textContent = ''; // Ensure error div is cleared on success
                } else {
                    // Handle errors
                    let errorMessage = data.message || (data.errors ? Object.values(data.errors).join(', ') : 'Failed to send reset email. Please try again.');

                    // Check for specific "email not found" error from backend
                    const emailNotFound = (data.message && data.message.toLowerCase().includes('email not found')) ||
                                          (data.errors?.email && data.errors.email.toLowerCase().includes('email not found'));

                    if (emailNotFound) {
                        errorMessage = "Email not registered."; // Custom message for inline display
                        if (emailError) emailError.textContent = errorMessage;
                    } else {
                        // Display the generic error from backend inline
                        if (emailError) emailError.textContent = errorMessage;
                    }
                }

            } catch (err) {
                console.error('Forgot Password Error:', err);
            } finally {
                 if (submitButton) submitButton.disabled = false;
            }
        });
    }
});