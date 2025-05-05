document.addEventListener('DOMContentLoaded', function() {
    const dlsuDYesRadio = document.getElementById('dlsuD');
    const dlsuDNoRadio = document.getElementById('dlsuDNo');
    const dlsudEmailContainer = document.getElementById('dlsudEmailContainer');
    const dlsudEmailInput = document.getElementById('dlsudEmail');
    const studentNumberInput = document.getElementById('studentNumber');
    const studentNumberNACheckbox = document.getElementById('studentNumberNotApplicable');

    // Function to show/hide the DLSU-D specific fields
    function toggleDlsuDFields(show) {
        if (show) {
            dlsudEmailContainer.classList.remove('hidden'); // Use Tailwind class
            dlsudEmailContainer.classList.add('flex'); // Use 'flex' to enable flex-col
            if (dlsudEmailInput) dlsudEmailInput.required = true; // Make required if shown
            // Student number required status depends on the N/A checkbox
            if (studentNumberInput && studentNumberNACheckbox) {
                 studentNumberInput.required = !studentNumberNACheckbox.checked;
            }
        } else {
            dlsudEmailContainer.classList.add('hidden');
            dlsudEmailContainer.classList.remove('flex');
            if (dlsudEmailInput) dlsudEmailInput.required = false; // Not required if hidden
            if (studentNumberInput) studentNumberInput.required = false;
            // Clear the values when hiding
            if (dlsudEmailInput) dlsudEmailInput.value = '';
            if (studentNumberInput) studentNumberInput.value = '';
            if (studentNumberNACheckbox) studentNumberNACheckbox.checked = false;
            if (studentNumberInput) studentNumberInput.disabled = false; // Re-enable student number input
        }
    }

    // Event listeners for radio buttons
    if (dlsuDYesRadio) {
        dlsuDYesRadio.addEventListener('change', function() {
            if (this.checked) {
                toggleDlsuDFields(true);
            }
        });
    }
    if (dlsuDNoRadio) {
        dlsuDNoRadio.addEventListener('change', function() {
            if (this.checked) {
                toggleDlsuDFields(false);
            }
        });
    }

    // Event listener for the "Not Applicable" checkbox for Student Number
    if (studentNumberNACheckbox && studentNumberInput) {
        studentNumberNACheckbox.addEventListener('change', function() {
            studentNumberInput.disabled = this.checked;
            // Update required status only if DLSU-D 'Yes' is checked
            if (dlsuDYesRadio && dlsuDYesRadio.checked) {
                studentNumberInput.required = !this.checked;
            } else {
                studentNumberInput.required = false; // Not required if not DLSU-D
            }
            if (this.checked) {
                studentNumberInput.value = ''; // Clear the input if N/A is checked
            }
        });
    }

    // Initial check in case the page is reloaded with a radio button selected
     if (dlsuDYesRadio && dlsuDYesRadio.checked) {
         toggleDlsuDFields(true);
          // Also set initial disabled/required state for student number based on checkbox
          if (studentNumberNACheckbox && studentNumberInput) {
              studentNumberInput.disabled = studentNumberNACheckbox.checked;
              studentNumberInput.required = !studentNumberNACheckbox.checked;
          }
     } else {
         toggleDlsuDFields(false);
     }

    // --- Form Submission Logic ---
    const registerForm2 = document.getElementById('registerForm2');
    if (registerForm2) {
        // Clear previous errors on input/change for better UX
        ['lastName', 'firstName', 'dlsudEmail', 'studentNumber'].forEach(fieldName => {
            const input = registerForm2.querySelector(`[name="${fieldName}"]`);
            const errorDiv = registerForm2.querySelector(`.${fieldName}-error`);
            if (input && errorDiv) {
                input.addEventListener('input', () => errorDiv.textContent = '');
            }
        });
        // Clear radio/checkbox errors on change
        ['dlsuD', 'studentNumberNotApplicable'].forEach(fieldName => {
             const inputs = registerForm2.querySelectorAll(`[name="${fieldName}"]`);
             const errorDiv = registerForm2.querySelector(`.${fieldName}-error`); // Assuming error divs exist
             if (inputs.length > 0 && errorDiv) {
                 inputs.forEach(input => input.addEventListener('change', () => errorDiv.textContent = ''));
             }
        });


        registerForm2.addEventListener('submit', async function(event) {
            event.preventDefault();
            // Clear previous errors before new submission attempt
            document.querySelectorAll('.error-text').forEach(el => el.textContent = ''); // Use a common class for error divs if possible

            const submitButton = registerForm2.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true; // Disable button on submit

            const formData = new FormData(registerForm2);
            const data = Object.fromEntries(formData.entries());

            // Adjust data based on checkbox/radio states
            data.dlsuD = data.dlsuD === 'true'; // Convert to boolean

            if (!data.dlsuD) {
                // If not DLSU-D, remove related fields
                delete data.dlsudEmail;
                delete data.studentNumber;
                delete data.studentNumberNotApplicable; // Remove checkbox state if present
            } else {
                // If DLSU-D, handle student number N/A
                if (data.studentNumberNotApplicable === 'on') {
                    // data.studentNumber = 'N/A'; // Revert this change
                    delete data.studentNumber; // Delete studentNumber field if N/A is checked
                }
                // Remove the checkbox state itself, we only need the studentNumber value (or its absence)
                delete data.studentNumberNotApplicable;
            }

            // Clean up empty optional fields (middleInitial, suffix) if needed by backend
            if (data.middleInitial === '') delete data.middleInitial;
            if (data.suffix === '') delete data.suffix;


            console.log("Submitting Add Info:", data);

            try {
                const response = await fetch('/Register/Additional-Info', { // Corrected endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (response.ok && result.success) { // Check for success property from backend
                    alert('Registration successful! Please log in.'); // Or use a more elegant notification
                    window.location.href = '/LogIn'; // Redirect to login page
                } else {
                    // Handle errors: Show specific alert and redirect
                    console.error('Registration step 2 failed:', result.message || result);
                    // Re-enable button before showing alert/redirecting
                    if (submitButton) submitButton.disabled = false;
                    // Show custom alert message
                    alert('Registration failed. Please go back to Step 1.');
                    // Redirect to the first registration step
                    window.location.href = '/Register';
                }
            } catch (error) {
                console.error('Network or fetch error:', error);
                 // Re-enable button on fetch error
                if (submitButton) submitButton.disabled = false;
                // Show custom alert message for network/fetch errors as well
                alert('Registration failed please Go back to step 1.');
                 // Redirect to the first registration step
                window.location.href = '/Register';
            }
        });
    }

    /*----------------------DLSUD EMAIL (Adapted from blocktimer.js)---------------------*/
    function setupDlsudEmailFormatting() {
        const domain = "@dlsud.edu.ph";
        const emailInput = dlsudEmailInput; // Use the existing variable

        if (!emailInput) return; // Exit if the input doesn't exist

        // Function to format the email input on input event
        function formatDlsudEmail() {
            const originalValue = emailInput.value;
            const originalCursorPos = emailInput.selectionStart; // Get cursor position

            // Separate username and domain parts
            let username = originalValue;
            if (originalValue.endsWith(domain)) {
                username = originalValue.substring(0, originalValue.length - domain.length);
            } else if (originalValue.includes(domain)) {
                // If domain is typed in the middle, remove it and anything after it for simplicity
                username = originalValue.substring(0, originalValue.indexOf(domain));
            }

            // Prevent deleting the domain if the cursor is within or at the start of it
            // Allow deletion if the entire input is selected or if backspacing from just after the username
            const isDeletingDomain = originalCursorPos > username.length && originalValue.length < (username + domain).length;

            if (isDeletingDomain && !emailInput.dataset.justSelectedAll) {
                 // If trying to delete part of the domain, reset value and cursor
                 emailInput.value = username + domain;
                 // Place cursor at end of username (before domain)
                 emailInput.setSelectionRange(username.length, username.length);
                 return; // Prevent further processing that might remove the domain
            }

            // Always ensure the domain is appended if there's a username
            let newValue = username;
            if (username.length > 0) {
                newValue += domain;
            } else {
                 // If username becomes empty (e.g., select all + delete), clear the input
                 newValue = '';
                 // Optionally set placeholder back if needed
                 // emailInput.placeholder = domain;
            }

            // Calculate the new cursor position *before* setting the value
            // Keep the cursor within the username part
            const newCursorPos = Math.min(originalCursorPos, username.length);

            if (newValue !== originalValue) {
                emailInput.value = newValue;
            }

            // Use setTimeout to ensure cursor position is set after value update is processed
            setTimeout(() => {
                // Re-check username length in case of rapid typing/deletion before timeout
                // const currentUsername = emailInput.value.substring(0, emailInput.value.indexOf(domain)); // No longer needed for this calculation
                // Set cursor directly to the calculated position before domain append/check
                const finalCursorPos = newCursorPos;
                emailInput.setSelectionRange(finalCursorPos, finalCursorPos);
            }, 0);


            // Reset the flag after processing
            emailInput.dataset.justSelectedAll = 'false';
        }

        // Use 'input' event for real-time formatting
        emailInput.addEventListener("input", formatDlsudEmail);

        // Handle focus to initially format if needed (e.g., pre-filled values)
        emailInput.addEventListener("focus", () => {
             if (emailInput.value.length > 0 && !emailInput.value.endsWith(domain)) {
                 formatDlsudEmail(); // Format on focus if needed
             } else if (emailInput.value.length === 0) {
                 // Optionally add domain placeholder or initial value on focus if empty
                 // emailInput.placeholder = domain; // Ensure placeholder is correct
             } else {
                 // If focused and already formatted, ensure cursor is before domain
                 const usernameLength = emailInput.value.indexOf(domain);
                 if (usernameLength !== -1 && emailInput.selectionStart > usernameLength) {
                     // Use setTimeout here as well for consistency on focus
                     setTimeout(() => {
                         emailInput.setSelectionRange(usernameLength, usernameLength);
                     }, 0);
                 }
             }
        });

         // Handle edge case: User selects all and deletes
         emailInput.addEventListener('keydown', (e) => {
             if ((e.key === 'Backspace' || e.key === 'Delete') && emailInput.selectionStart === 0 && emailInput.selectionEnd === emailInput.value.length) {
                 emailInput.dataset.justSelectedAll = 'true'; // Flag that deletion is happening after select all
             } else {
                 emailInput.dataset.justSelectedAll = 'false';
             }

             // Prevent cursor movement into the domain via arrow keys
             const usernameLength = emailInput.value.indexOf(domain);
             if (usernameLength !== -1) {
                 if (e.key === 'ArrowRight' && emailInput.selectionStart === usernameLength) {
                     e.preventDefault(); // Stop right arrow key if at the end of username
                 }
                 if (e.key === 'ArrowLeft' && emailInput.selectionStart === usernameLength + 1) {
                     // Allow left arrow from start of domain back to end of username
                 } else if (e.key === 'ArrowLeft' && emailInput.selectionStart > usernameLength) {
                      e.preventDefault(); // Stop left arrow if deep inside domain
                      emailInput.setSelectionRange(usernameLength, usernameLength); // Move to end of username
                 }
                 // Prevent Home/End keys from going into the domain easily
                 if (e.key === 'End') {
                     e.preventDefault();
                     emailInput.setSelectionRange(usernameLength, usernameLength);
                 }
                 // Allow Home key to go to the start (position 0)
             }
         });

         // Ensure cursor is positioned correctly after clicks
         emailInput.addEventListener('click', () => {
             const usernameLength = emailInput.value.indexOf(domain);
             if (usernameLength !== -1 && emailInput.selectionStart > usernameLength) {
                 // Use setTimeout here as well for consistency on click
                 setTimeout(() => {
                     emailInput.setSelectionRange(usernameLength, usernameLength);
                 }, 0);
             }
         });

         // Initial format on load if value exists
         if (emailInput.value.length > 0) {
             formatDlsudEmail();
         }
    }

    // Call the setup function
    setupDlsudEmailFormatting();


	/*----------------------STUDENT NUMBER---------------------*/
    // Keep the existing student number input validation logic if studentNumberInput exists
	if (studentNumberInput) {
	    // Allow only numeric input and enforce maxlength
	    studentNumberInput.addEventListener("input", function (e) {
		    // Remove any non-numeric characters
		    this.value = this.value.replace(/\D/g, "").slice(0, 9); // Max 9 digits
	    });

	    // Optional: Prevent pasting non-numeric values (basic check)
        studentNumberInput.addEventListener('paste', (event) => {
            const paste = (event.clipboardData || window.clipboardData).getData('text');
            if (!/^\d+$/.test(paste)) { // If pasted text is not only digits
                event.preventDefault();
                return;
            }
            // Optional: Handle pasting combined with existing value to respect maxlength
            const currentVal = studentNumberInput.value;
            const selectionStart = studentNumberInput.selectionStart;
            const selectionEnd = studentNumberInput.selectionEnd;
            const newVal = currentVal.slice(0, selectionStart) + paste + currentVal.slice(selectionEnd);
            if (newVal.replace(/\D/g, '').length > 9) {
                 event.preventDefault();
                 // Optionally, trim the pasted content to fit
                 const allowedPasteLength = 9 - (currentVal.length - (selectionEnd - selectionStart));
                 if (allowedPasteLength > 0) {
                     const trimmedPaste = paste.replace(/\D/g, '').slice(0, allowedPasteLength);
                     document.execCommand('insertText', false, trimmedPaste);
                 }
            }
        });
	}
});



