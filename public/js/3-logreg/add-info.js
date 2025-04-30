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
                    data.studentNumber = 'N/A'; // Set student number to N/A
                }
                // Remove the checkbox state itself, we only need the studentNumber value
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

    /*----------------------DLSUD EMAIL---------------------*/
    // Keep the existing DLSUD email domain appending logic if dlsudEmailInput exists
    if (dlsudEmailInput) {
        const domain = "@dlsud.edu.ph";
        let shouldAppendDomain = true;

        function appendDomain() {
            if (dlsudEmailInput.value.length > 0 && !dlsudEmailInput.value.endsWith(domain)) {
                // Prevent appending if the input is just the domain itself or empty
                if (dlsudEmailInput.value !== domain.substring(1)) { // Check without '@'
                     dlsudEmailInput.value = dlsudEmailInput.value.replace(domain, "") + domain;
                     // Set cursor position before the domain
                     const cursorPos = dlsudEmailInput.value.length - domain.length;
                     dlsudEmailInput.setSelectionRange(cursorPos, cursorPos);
                }
            }
        }

        dlsudEmailInput.addEventListener("input", function (event) {
            // More robust check for deletion
            if (event.inputType && event.inputType.startsWith("delete")) {
                shouldAppendDomain = false;
                return;
            }
            if (shouldAppendDomain) {
                appendDomain();
            }
        });

        dlsudEmailInput.addEventListener("keydown", function (event) {
             // Reset flag unless it's a backspace/delete key at the start of the domain part
             const cursorPos = dlsudEmailInput.selectionStart;
             const domainStartIndex = dlsudEmailInput.value.length - domain.length;
             if ((event.key === 'Backspace' && cursorPos > domainStartIndex) ||
                 (event.key === 'Delete' && cursorPos >= domainStartIndex)) {
                 shouldAppendDomain = false; // Allow deletion within the domain part
             } else {
                 shouldAppendDomain = true;
             }
        });

        dlsudEmailInput.addEventListener("focus", function() {
            // Ensure domain is appended or cursor is placed correctly on focus
             if (dlsudEmailInput.value.length > 0 && !dlsudEmailInput.value.endsWith(domain)) {
                 appendDomain();
             } else if (dlsudEmailInput.value.endsWith(domain)) {
                 // Place cursor before domain on focus if it ends with domain
                 const cursorPos = dlsudEmailInput.value.length - domain.length;
                 // Use setTimeout to ensure focus is fully established
                 setTimeout(() => dlsudEmailInput.setSelectionRange(cursorPos, cursorPos), 0);
             }
        });

        dlsudEmailInput.addEventListener("blur", function () {
            // Append domain on blur if necessary
            if (dlsudEmailInput.value.length > 0 && !dlsudEmailInput.value.endsWith(domain)) {
                 appendDomain();
            }
            // Optional: Remove domain if input is empty or just '@dlsud.edu.ph'
            if (dlsudEmailInput.value === domain) {
                // dlsudEmailInput.value = ''; // Uncomment to clear if only domain remains
            }
        });
    }

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



