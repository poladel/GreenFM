document.addEventListener('DOMContentLoaded', function () {
    // --- Tab Switching Logic ---
    const tabContainer = document.getElementById('accountTabs');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    if (tabContainer) {
        tabContainer.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('button.tab-button');
            if (!clickedButton) return; // Ignore clicks outside buttons

            const targetTab = clickedButton.dataset.tab;

            // Update button styles
            tabButtons.forEach(button => {
                button.classList.remove('active-tab');
                if (button === clickedButton) {
                    button.classList.add('active-tab');
                }
            });

            // Show/hide content
            tabContents.forEach(content => {
                if (content.dataset.tabContent === targetTab) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    }
    // --- End Tab Switching Logic ---


    // --- Existing Form Logic (Account Info) ---
    const accountForm = document.getElementById('manage-account-form');
    const userIdInput = accountForm?.querySelector('#userId'); // Scope querySelector
    // --- Add username and email inputs ---
    const usernameInput = accountForm?.querySelector('#username');
    const emailInput = accountForm?.querySelector('#email');
    const lastNameInput = accountForm?.querySelector('#lastName');
    const firstNameInput = accountForm?.querySelector('#firstName');
    const middleInitialInput = accountForm?.querySelector('#middleInitial');
    const suffixInput = accountForm?.querySelector('#suffix');
    const dlsudEmailInput = accountForm?.querySelector('#dlsudEmail');
    const studentNumberInput = accountForm?.querySelector('#studentNumber');
    const editAccountButton = accountForm?.querySelector('#edit-account-button');
    const cancelAccountButton = accountForm?.querySelector('#cancel-account-button');
    const submitAccountButton = accountForm?.querySelector('#submit-account-button');

    // --- Existing Form Logic (Change Password) ---
    const passwordForm = document.getElementById('change-password-form');
    const oldPasswordInput = passwordForm?.querySelector('#password'); // Renamed variable for clarity
    const newPasswordInput = passwordForm?.querySelector('#newPassword');
    const confirmNewPasswordInput = passwordForm?.querySelector('#confirmNewPassword');
    const editPasswordButton = passwordForm?.querySelector('#edit-password-button');
    const cancelPasswordButton = passwordForm?.querySelector('#cancel-password-button');
    const submitPasswordButton = passwordForm?.querySelector('#submit-password-button');
    // --- Add reference to validation container ---
    const newPasswordValidation = passwordForm?.querySelector('#newPasswordValidation');

    // Helper function to apply styles to inputs within a specific form
    function applyInputStyles(inputElement, enabled) {
        if (!inputElement) {
            console.warn("applyInputStyles: Input element not found.");
            return;
        }
        console.log(`applyInputStyles: Setting ${inputElement.id} to enabled=${enabled}`);
        if (enabled) {
            inputElement.readOnly = false;
            inputElement.classList.remove('bg-gray-200', 'text-gray-600', 'cursor-not-allowed', 'border-none'); // Explicitly remove border-none
            inputElement.classList.add('bg-white', 'text-gray-800', 'border', 'border-gray-300', 'focus:border-green-700', 'focus:outline-none', 'p-2.5', 'rounded-lg'); // Ensure padding/rounding are reapplied if needed
        } else {
            inputElement.readOnly = true;
            inputElement.classList.add('bg-gray-200', 'text-gray-600', 'cursor-not-allowed', 'border-none'); // Add border-none back for consistency
            inputElement.classList.remove('bg-white', 'text-gray-800', 'border', 'border-gray-300', 'focus:border-green-700', 'focus:outline-none');
        }
    }

    // --- Account Form State Management ---
    function enableAccountFormEditing() {
        console.log("enableAccountFormEditing called"); // Debug log
        // --- Enable username and email ---
        applyInputStyles(usernameInput, true);
        applyInputStyles(emailInput, true);

        applyInputStyles(lastNameInput, true);
        applyInputStyles(firstNameInput, true);
        applyInputStyles(middleInitialInput, true);
        applyInputStyles(suffixInput, true);
        applyInputStyles(dlsudEmailInput, true); // Only applies if element exists
        applyInputStyles(studentNumberInput, true); // Only applies if element exists

        editAccountButton?.classList.add('hidden');
        cancelAccountButton?.classList.remove('hidden');
        submitAccountButton?.classList.remove('hidden');
    }

    function disableAccountFormEditing() {
        // --- Disable username and email ---
        applyInputStyles(usernameInput, false);
        applyInputStyles(emailInput, false);

        applyInputStyles(lastNameInput, false);
        applyInputStyles(firstNameInput, false);
        applyInputStyles(middleInitialInput, false);
        applyInputStyles(suffixInput, false);
        applyInputStyles(dlsudEmailInput, false); // Only applies if element exists
        applyInputStyles(studentNumberInput, false); // Only applies if element exists

        editAccountButton?.classList.remove('hidden');
        cancelAccountButton?.classList.add('hidden');
        submitAccountButton?.classList.add('hidden');
        // Clear errors when disabling/cancelling
        clearFormErrors(accountForm);
    }

    // --- Password Form State Management ---
    function enablePasswordFormEditing() {
        applyInputStyles(oldPasswordInput, true);
        applyInputStyles(newPasswordInput, true);
        applyInputStyles(confirmNewPasswordInput, true);

        editPasswordButton?.classList.add('hidden');
        cancelPasswordButton?.classList.remove('hidden');
        submitPasswordButton?.classList.remove('hidden');

        // --- Reset and potentially show validation on enable ---
        resetNewPasswordValidation();
        // Optionally show validation immediately if needed, or wait for focus
        // if (newPasswordValidation) newPasswordValidation.classList.remove('hidden');
    }

    function disablePasswordFormEditing() {
        applyInputStyles(oldPasswordInput, false);
        applyInputStyles(newPasswordInput, false);
        applyInputStyles(confirmNewPasswordInput, false);

        // Clear input values when disabling/cancelling
        if(oldPasswordInput) oldPasswordInput.value = '';
        if(newPasswordInput) newPasswordInput.value = '';
        if(confirmNewPasswordInput) confirmNewPasswordInput.value = '';


        editPasswordButton?.classList.remove('hidden');
        cancelPasswordButton?.classList.add('hidden');
        submitPasswordButton?.classList.add('hidden');
        // Clear errors when disabling/cancelling
        clearFormErrors(passwordForm);
        // --- Hide validation box on disable ---
        if (newPasswordValidation) newPasswordValidation.classList.add('hidden');
    }

    // --- New Password Validation Logic ---
    function updateNewPasswordRequirement(elementId, isValid) {
        if (!newPasswordValidation) return;
        const element = newPasswordValidation.querySelector(`#${elementId}`);
        if (element) {
            element.classList.remove('text-green-500', 'text-red-500', 'hidden'); // Reset classes
            if (isValid) {
                element.classList.add('text-green-500', 'hidden'); // Valid and hidden
            } else {
                element.classList.add('text-red-500'); // Invalid and visible
            }
        }
    }

    function checkAllPasswordRequirements(password) {
        const lengthValid = password.length >= 8;
        const uppercaseValid = /[A-Z]/.test(password);
        const lowercaseValid = /[a-z]/.test(password);
        const numberValid = /[0-9]/.test(password);
        // Use a broader range of special characters for validation display
        const specialValid = /[~`!@#$%^&*()_+=\[\]{}|\\:;"'<>,.?/-]/.test(password);

        updateNewPasswordRequirement('new-password-length', lengthValid);
        updateNewPasswordRequirement('new-password-uppercase', uppercaseValid);
        updateNewPasswordRequirement('new-password-lowercase', lowercaseValid);
        updateNewPasswordRequirement('new-password-number', numberValid);
        updateNewPasswordRequirement('new-password-special', specialValid);

        return lengthValid && uppercaseValid && lowercaseValid && numberValid && specialValid;
    }

    function resetNewPasswordValidation() {
         if (!newPasswordValidation) return;
         const requirements = newPasswordValidation.querySelectorAll('.password-requirement');
         requirements.forEach(req => {
             req.classList.remove('text-green-500', 'hidden');
             req.classList.add('text-red-500');
         });
    }

    if (newPasswordInput && newPasswordValidation) {
        newPasswordInput.addEventListener('focus', () => {
            // Show validation only if not all requirements are met
            if (!checkAllPasswordRequirements(newPasswordInput.value)) {
                 newPasswordValidation.classList.remove('hidden');
            }
        });

        newPasswordInput.addEventListener('blur', () => {
            // Hide validation on blur
            newPasswordValidation.classList.add('hidden');
        });

        newPasswordInput.addEventListener('input', () => {
            const password = newPasswordInput.value;
            const allValid = checkAllPasswordRequirements(password);

            // Hide the entire box if all are valid, otherwise ensure it's shown (if focused)
            if (allValid) {
                newPasswordValidation.classList.add('hidden');
            } else if (document.activeElement === newPasswordInput) {
                // Only remove hidden if the input is still focused
                newPasswordValidation.classList.remove('hidden');
            }
        });
    }
    // --- End New Password Validation Logic ---


    // --- Event Listeners for Account Form ---
    if (editAccountButton) {
        editAccountButton.addEventListener('click', () => { // Use arrow function for logging context if needed
             console.log("Edit Account Button clicked"); // Debug log
             enableAccountFormEditing();
        });
    } else {
        console.error("Edit Account Button not found!"); // Error log if button isn't selected
    }
    if (cancelAccountButton) {
        cancelAccountButton.addEventListener('click', () => {
            // Optionally reset fields to original values if needed, or just disable
            disableAccountFormEditing();
            // Consider fetching original user data again if changes were made but not saved
        });
    }
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Add your account update fetch logic here
            console.log("Submitting account info...");
            clearFormErrors(accountForm); // Clear previous errors

            const dataToSend = {
                // --- Include username and email in the data to send ---
                username: usernameInput.value,
                email: emailInput.value,
                lastName: lastNameInput.value,
                firstName: firstNameInput.value,
                middleInitial: middleInitialInput.value,
                suffix: suffixInput.value,
                ...(dlsudEmailInput && { dlsudEmail: dlsudEmailInput.value }),
                ...(studentNumberInput && { studentNumber: studentNumberInput.value }),
            };

            // Add loading state to submit button
            submitAccountButton.disabled = true;
            submitAccountButton.textContent = 'Saving...';

            try {
                // Use the backend route: POST /manage-account
                const response = await fetch(`/manage-account`, {
                    method: 'POST', // Changed from PATCH
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSend)
                });
                const result = await response.json();
                const isSuccess = response.ok && (result.success === true || result.message?.includes('edited'));

                if (isSuccess) {
                    // Restore Toastify
                    Toastify({ text: "Account updated successfully.", duration: 3000, style: { background: "#00722A", color: "white", textAlign: "center" }, position: "center", gravity: "top" }).showToast(); // Added textAlign
                    disableAccountFormEditing();
                } else {
                    console.error("Account update failed:", result);
                    if (result.errors) {
                        displayErrors(accountForm, result.errors);
                        // Restore Toastify
                        Toastify({ text: "Please correct the errors below.", duration: 3000, style: { background: "#dc3545", color: "white", textAlign: "center" }, position: "center", gravity: "top" }).showToast(); // Added textAlign
                    } else {
                         const errorMessage = result.message || result.error || "Failed to update account.";
                         // Restore Toastify
                         Toastify({ text: errorMessage, duration: 3000, style: { background: "#dc3545", color: "white", textAlign: "center" }, position: "center", gravity: "top" }).showToast(); // Added textAlign
                    }
                }
            } catch (err) {
                 console.error("Error submitting account form:", err);
                 // Restore Toastify
                 Toastify({ text: "An error occurred. Please try again.", duration: 3000, style: { background: "#dc3545", color: "white", textAlign: "center" }, position: "center", gravity: "top" }).showToast(); // Added textAlign
            } finally {
                 submitAccountButton.disabled = false;
                 submitAccountButton.textContent = 'Save';
                 // If an error occurred, ensure the form remains editable
                 // Check if the form is still supposed to be in edit mode (e.g., based on button visibility)
                 if (!cancelAccountButton.classList.contains('hidden')) {
                     enableAccountFormEditing(); // Re-enable if cancel button is visible (means it was in edit mode)
                 }
            }
        });
    }

    // --- Event Listeners for Password Form ---
    if (editPasswordButton) {
        editPasswordButton.addEventListener('click', () => { // Use arrow function for logging context if needed
             console.log("Edit Password Button clicked"); // Debug log
             enablePasswordFormEditing();
        });
    } else {
        console.error("Edit Password Button not found!"); // Error log if button isn't selected
    }
    if (cancelPasswordButton) {
        cancelPasswordButton.addEventListener('click', disablePasswordFormEditing);
    }
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // Add your password change fetch logic here
            console.log("Submitting password change...");
            clearFormErrors(passwordForm); // Clear previous errors

            // const userId = userIdInput.value; // No longer needed for URL
            const userEmail = accountForm.querySelector('#email').value; // Get email from the account form
            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value; // Ensure this is defined here
            const confirmNewPassword = confirmNewPasswordInput.value;

            // --- Add check for password requirements before submitting ---
            if (!checkAllPasswordRequirements(newPassword)) {
                 // Ensure validation box is visible to show unmet requirements
                 if (newPasswordValidation) newPasswordValidation.classList.remove('hidden');
                 // Show a general toast or error message
                 Toastify({ text: "New password does not meet all requirements.", duration: 3000, style: { background: "#dc3545", color: "white" }, position: "center", gravity: "top" }).showToast();
                 return; // Stop submission
            }
            // --- End password requirement check ---


            if (newPassword !== confirmNewPassword) {
                displayErrors(passwordForm, { confirmNewPassword: "Passwords do not match." });
                 // Also show a toast for mismatch
                 Toastify({ text: "Passwords do not match.", duration: 3000, style: { background: "#dc3545", color: "white" }, position: "center", gravity: "top" }).showToast();
                return;
            }

             // Add loading state to submit button
            submitPasswordButton.disabled = true;
            submitPasswordButton.textContent = 'Saving...';


            try {
                 // Use the backend route: POST /change-password
                 const response = await fetch(`/change-password`, {
                    method: 'POST', // Changed from PATCH
                    headers: { 'Content-Type': 'application/json' },
                    // Backend expects email, oldPassword, newPassword, confirmNewPassword
                    body: JSON.stringify({ email: userEmail, oldPassword, newPassword, confirmNewPassword })
                });
                const result = await response.json();

                 if (response.ok && result.message.includes('successfully')) { // Check success based on message
                    // Restore Toastify
                    Toastify({ text: "Password changed successfully. You will be logged out.", duration: 4000, style: { background: "#00722A", color: "white" }, position: "center", gravity: "top" }).showToast();
                    disablePasswordFormEditing(); // Clears fields and disables
                    // Redirect to logout after a delay
                    setTimeout(() => {
                        window.location.href = '/LogOut'; // Redirect based on backend response or fixed path
                    }, 4000);
                } else {
                    // Handle errors
                     console.error("Password change failed:", result);
                     // Map backend 'error' string to specific fields if possible
                     let errorsToDisplay = {};
                     let generalErrorMessage = "Failed to change password."; // Default message
                     if (result.error) {
                         generalErrorMessage = result.error; // Use backend error message
                         if (result.error.toLowerCase().includes('old password')) {
                             errorsToDisplay.password = result.error; // Map to old password field
                         } else if (result.error.toLowerCase().includes('passwords do not match')) {
                             errorsToDisplay.confirmNewPassword = result.error;
                         } else if (result.error.toLowerCase().includes('password must be')) {
                             // Display password requirement errors under the new password field
                             errorsToDisplay.newPassword = result.error;
                             // Ensure validation box is visible if backend reports requirement error
                             if (newPasswordValidation) newPasswordValidation.classList.remove('hidden');
                             // Re-check requirements visually based on current input
                             checkAllPasswordRequirements(newPasswordInput.value);
                         }
                     }

                     // Show specific field errors if any
                     if (Object.keys(errorsToDisplay).length > 0) {
                         displayErrors(passwordForm, errorsToDisplay);
                         // Restore Toastify
                         Toastify({ text: "Please correct the password errors.", duration: 3000, style: { background: "#dc3545", color: "white" }, position: "center", gravity: "top" }).showToast();
                     } else {
                         // Restore Toastify
                         Toastify({ text: generalErrorMessage, duration: 3000, style: { background: "#dc3545", color: "white" }, position: "center", gravity: "top" }).showToast();
                     }
                }

            } catch (err) {
                 console.error("Error submitting password form:", err);
                 // Restore Toastify
                 Toastify({ text: "An error occurred. Please try again.", duration: 3000, style: { background: "#dc3545", color: "white" }, position: "center", gravity: "top" }).showToast();
            } finally {
                 submitPasswordButton.disabled = false;
                 submitPasswordButton.textContent = 'Save';
                 // --- Ensure validation box is hidden if submission failed but requirements are now met ---
                 if (newPasswordInput && checkAllPasswordRequirements(newPasswordInput.value)) {
                     if (newPasswordValidation) newPasswordValidation.classList.add('hidden');
                 }
            }
        });
    }

    // --- Helper Functions for Errors ---
    function clearFormErrors(formElement) {
        if (!formElement) return;
        formElement.querySelectorAll('.error-text').forEach(el => el.textContent = ''); // Assuming error divs have class 'error-text'
        formElement.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
    }

    function displayErrors(formElement, errors) {
         if (!formElement || !errors) return;
         // Example: Map error keys to input names/ids and display
         for (const key in errors) {
             const errorDiv = formElement.querySelector(`.${key}-error`); // e.g., .password-error, .lastName-error
             const inputElement = formElement.querySelector(`[name="${key}"]`);
             if (errorDiv) {
                 errorDiv.textContent = errors[key];
             }
             if (inputElement) {
                 inputElement.classList.add('border-red-500'); // Highlight input with error
             }
         }
    }


    // --- Initial State ---
    disableAccountFormEditing();
    disablePasswordFormEditing();

}); // End DOMContentLoaded