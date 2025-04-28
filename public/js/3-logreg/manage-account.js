document.addEventListener('DOMContentLoaded', function () {
    const editButton = document.querySelector('.manage-account-form .login-button');
    const inputs = document.querySelectorAll('.manage-account-form input');
    const passwordEditButton = document.querySelector('.change-password-form .login-button');
    const passwordInputs = document.querySelectorAll('.change-password-form input');
    const oldPasswordInput = document.querySelector('#password');
    const newPasswordInput = document.querySelector('#newPassword');
    const confirmNewPasswordInput = document.querySelector('#confirmNewPassword');

    const usernameErrorDiv = document.querySelector('.username-error');
    const emailErrorDiv = document.querySelector('.email-error');
    const lastNameErrorDiv = document.querySelector('.lastName-error');
    const firstNameErrorDiv = document.querySelector('.firstName-error');
    const studentNumberErrorDiv = document.querySelector('.studentNumber-error');

    // Store original values for reverting on cancel
    const originalValues = {};
    inputs.forEach(input => {
        originalValues[input.id] = input.value;
    });

    // Handle Edit button click for manage-account-form
    editButton.addEventListener('click', function () {
        // Enable the input fields
        inputs.forEach(input => {
            input.removeAttribute('disabled');
        });

        // Remove the Edit button
        editButton.remove();

        // Create Save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save';
        saveButton.type = 'submit'; // Set type to "submit" to trigger form submission
        saveButton.className = 'save-button';

        // Create Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.type = 'button';
        cancelButton.className = 'cancel-button';

        // Append Save and Cancel buttons to the form
        const form = document.querySelector('.manage-account-form');
        form.appendChild(saveButton);
        form.appendChild(cancelButton);

        // Handle Cancel button click
        cancelButton.addEventListener('click', function () {
            // Revert inputs to original values
            inputs.forEach(input => {
                input.value = originalValues[input.id];
                input.setAttribute('disabled', true); // Disable the input fields
            });

            // Clear previous error messages
            usernameErrorDiv.textContent = '';
            emailErrorDiv.textContent = '';
            lastNameErrorDiv.textContent = '';
            firstNameErrorDiv.textContent = '';
            studentNumberErrorDiv.textContent = '';

            // Remove Save and Cancel buttons
            saveButton.remove();
            cancelButton.remove();

            // Re-add the Edit button
            form.appendChild(editButton);
        });
    });

    // Handle form submission for manage-account-form
    document.querySelector('.manage-account-form').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default form submission

        const formData = {};
        const usernameInput = document.querySelector('#username');
        const emailInput = document.querySelector('#email');
        const lastNameInput = document.querySelector('#lastName');
        const firstNameInput = document.querySelector('#firstName');
        const studentNumberInput = document.querySelector('#studentNumber');

        const usernameErrorDiv = document.querySelector('.username-error');
        const emailErrorDiv = document.querySelector('.email-error');
        const lastNameErrorDiv = document.querySelector('.lastName-error');
        const firstNameErrorDiv = document.querySelector('.firstName-error');
        const studentNumberErrorDiv = document.querySelector('.studentNumber-error');

        // Clear previous error messages
        usernameErrorDiv.textContent = '';
        emailErrorDiv.textContent = '';
        lastNameErrorDiv.textContent = '';
        firstNameErrorDiv.textContent = '';
        studentNumberErrorDiv.textContent = '';

        let hasError = false;

        // Validate username (should not be empty)
        if (!usernameInput.value.trim()) {
            usernameErrorDiv.textContent = 'Username is required.';
            usernameErrorDiv.style.color = 'red';
            hasError = true;
        }
        
        // Validate email (should not be empty)
        if (!emailInput.value.trim()) {
            emailErrorDiv.textContent = 'Email is required.';
            emailErrorDiv.style.color = 'red';
            hasError = true;
        }

        // Validate lastName (should not be empty)
        if (!lastNameInput.value.trim()) {
            lastNameErrorDiv.textContent = 'Last Name is required.';
            lastNameErrorDiv.style.color = 'red';
            hasError = true;
        }

        // Validate firstName (should not be empty)
        if (!firstNameInput.value.trim()) {
            firstNameErrorDiv.textContent = 'First Name is required.';
            firstNameErrorDiv.style.color = 'red';
            hasError = true;
        }

        // Validate studentNumber (must be numbers only and 9 digits)
        const studentNumberValue = studentNumberInput.value.trim();
        if (!/^\d{9}$/.test(studentNumberValue)) {
            studentNumberErrorDiv.textContent = 'Student Number must be 9 digits.';
            studentNumberErrorDiv.style.color = 'red';
            hasError = true;
        }

        // Stop form submission if there are validation errors
        if (hasError) {
            return;
        }

        // Collect input values by name
        const inputs = document.querySelectorAll('.manage-account-form input');
        inputs.forEach(input => {
            formData[input.name] = input.value;
        });

        console.log('Form Data:', formData); // Debugging: Log form data

        try {
            const response = await fetch('/manage-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData) // Send data as JSON
            });

            const data = await response.json();
            console.log('Response Data:', data); // Debugging: Log response data

            if (response.ok) {
                alert(data.message); // Display success message
                location.reload(); // Reload the page to reflect changes
            } else {
                console.error('Error:', data.error); // Log error
                alert(data.error || 'An error occurred while updating your account.');
            }
        } catch (err) {
            console.error('Error occurred while updating account:', err);
            alert('An error occurred. Please try again.');
        }
    });

    // Handle Edit button click for change-password-form
    passwordEditButton.addEventListener('click', function () {
        const oldPasswordErrorDiv = document.querySelector('.password-error');
        const newPasswordErrorDiv = document.querySelector('.newPassword-error');
        const confirmNewPasswordErrorDiv = document.querySelector('.confirmNewPassword-error');

        /*oldPasswordErrorDiv.textContent = '';
        newPasswordErrorDiv.textContent = '';
        confirmNewPasswordErrorDiv.textContent = '';*/

        passwordInputs.forEach(input => {
            input.removeAttribute('disabled'); // Enable the input fields
        });

        // Remove the Edit button
        passwordEditButton.remove();

        // Create Save button
        const savePasswordButton = document.createElement('button');
        savePasswordButton.textContent = 'Save';
        savePasswordButton.type = 'submit'; // Set type to "submit" to trigger form submission
        savePasswordButton.className = 'save-password-button';

        // Create Cancel button
        const cancelPasswordButton = document.createElement('button');
        cancelPasswordButton.textContent = 'Cancel';
        cancelPasswordButton.type = 'button';
        cancelPasswordButton.className = 'password-cancel-button';

        // Append Save and Cancel buttons to the form
        const passwordForm = document.querySelector('.change-password-form');
        passwordForm.appendChild(savePasswordButton);
        passwordForm.appendChild(cancelPasswordButton);

        // Handle Cancel button click
        cancelPasswordButton.addEventListener('click', function () {
            // Revert inputs to original values
            passwordInputs.forEach(input => {
                input.value = ''; // Clear password fields
                input.setAttribute('disabled', true); // Disable the input fields
            });

            oldPasswordErrorDiv.textContent = '';
            newPasswordErrorDiv.textContent = '';
            confirmNewPasswordErrorDiv.textContent = '';

            // Remove Save and Cancel buttons
            savePasswordButton.remove();
            cancelPasswordButton.remove();

            // Re-add the Edit button
            passwordForm.appendChild(passwordEditButton);
            passwordEditButton.textContent = 'Edit';
            passwordEditButton.type = 'button'; // Change button type back to button
        });
    });

    // Handle form submission for change-password-form
    document.querySelector('.change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.querySelector('#email').value;
        const oldPassword = oldPasswordInput.value; // Get the old password
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;
        const oldPasswordErrorDiv = document.querySelector('.password-error');
        const newPasswordErrorDiv = document.querySelector('.newPassword-error');
        const confirmNewPasswordErrorDiv = document.querySelector('.confirmNewPassword-error');

        // Clear any previous error messages
        oldPasswordErrorDiv.textContent = '';
        newPasswordErrorDiv.textContent = '';
        confirmNewPasswordErrorDiv.textContent = '';

        // Client-side validation
        let hasError = false;

        if (!oldPassword) {
            oldPasswordErrorDiv.textContent = 'Old password is required.';
            oldPasswordErrorDiv.style.color = 'red';
            hasError = true;
        }

        if (newPassword !== confirmNewPassword) {
            confirmNewPasswordErrorDiv.textContent = 'Passwords do not match.';
            confirmNewPasswordErrorDiv.style.color = 'red';
            hasError = true;
        } else {
            // Validate password requirements
            if (newPassword.length < 8) {
                newPasswordErrorDiv.textContent = 'Password must be at least 8 characters long.';
                newPasswordErrorDiv.style.color = 'red';
                hasError = true;
            }
            if (!/[A-Z]/.test(newPassword)) {
                newPasswordErrorDiv.textContent = 'Password must contain at least one uppercase letter.';
                newPasswordErrorDiv.style.color = 'red';
                hasError = true;
            }
            if (!/[a-z]/.test(newPassword)) {
                newPasswordErrorDiv.textContent = 'Password must contain at least one lowercase letter.';
                newPasswordErrorDiv.style.color = 'red';
                hasError = true;
            }
            if (!/[0-9]/.test(newPassword)) {
                newPasswordErrorDiv.textContent = 'Password must contain at least one number.';
                newPasswordErrorDiv.style.color = 'red';
                hasError = true;
            }
            if (!/[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/]/.test(newPassword)) {
                newPasswordErrorDiv.textContent = 'Password must contain at least one special character.';
                newPasswordErrorDiv.style.color = 'red';
                hasError = true;
            }
        }

        if (hasError) {
            return; // Stop form submission if there are validation errors
        }

        try {
            const response = await fetch('/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, oldPassword, newPassword, confirmNewPassword })
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message); // Display success message
                if (data.redirect) {
                    window.location.href = data.redirect; // Redirect to /LogOut
                }
            } else {
                if (data.error.includes('Old password')) {
                    oldPasswordErrorDiv.textContent = data.error;
                    oldPasswordErrorDiv.style.color = 'red';
                } else {
                    newPasswordErrorDiv.textContent = data.error || 'An error occurred.';
                    newPasswordErrorDiv.style.color = 'red';
                }
            }
        } catch (err) {
            console.error('Error occurred while changing password:', err);
            confirmNewPasswordErrorDiv.textContent = 'An error occurred. Please try again.';
            confirmNewPasswordErrorDiv.style.color = 'red';
        }
    });
});