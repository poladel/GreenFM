function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}


/*----------------------NOT APPLICABLE---------------------*/
// Define all checkboxes and their associated input fields
const toggles = [
    {
        checkboxId: 'coProponentNotApplicable',
        inputIds: ['coProponentLastName', 'coProponentFirstName', 'coProponentMi', 'coProponentSuffix', 'coProponentCYS']
    },
    {
        checkboxId: 'facultyStaffNotApplicable',
        inputIds: ['facultyStaffLastName', 'facultyStaffFirstName', 'facultyStaffMi', 'facultyStaffSuffix', 'facultyStaffDepartment']
    }
];

// Function to toggle input fields based on checkbox state
function setupToggleInputs({ checkboxId, inputIds }) {
    const checkbox = document.getElementById(checkboxId);
    // Ensure checkbox exists before proceeding
    if (!checkbox) {
        console.warn(`Checkbox with ID "${checkboxId}" not found.`);
        return;
    }
    const inputs = inputIds.map(id => document.getElementById(id));

    function toggleInputs() {
        const isChecked = checkbox.checked;
        inputs.forEach(input => {
            // Ensure input exists before manipulating
            if (input) {
                input.disabled = isChecked;
                if (isChecked) { // Clear value only when disabling
                    input.value = '';
                }
                // Optionally adjust 'required' attribute based on state
                // input.required = !isChecked; // Example: make required only when enabled
            } else {
                // Log if an expected input is missing
                // console.warn(`Input field associated with "${checkboxId}" not found.`);
            }
        });
    }
    // Initial setup: disable inputs if checkbox is checked on page load
    toggleInputs();

    // Event listener to toggle inputs when checkbox state changes
    checkbox.addEventListener('change', toggleInputs);
}


/*----------------------OTHER INPUT---------------------*/
// Function to toggle other input field based on checkbox state
function setupOtherInputToggle() {
    const checkbox = document.getElementById('other');
    const input = document.getElementById('other-input');

    // Ensure both elements exist
    if (!checkbox || !input) {
        console.warn("Could not find 'other' checkbox or 'other-input' field for setup.");
        return;
    }

    function toggleOtherInputs() {
        const isChecked = checkbox.checked;
        input.disabled = !isChecked;
        if (!isChecked) {
            input.value = ''; // Clear value when disabled
        }
        // Optionally make required based on checkbox state
        // input.required = isChecked;
    }

    // Initial setup: enable/disable other input based on checkbox state
    toggleOtherInputs();

    // Event listener to toggle inputs when checkbox state changes
    checkbox.addEventListener('change', toggleOtherInputs);
}


/*----------------------ADDING HOST AND TECHNICAL STAFF---------------------*/
function setupDynamicAddRemove() {
    let hostIndex = document.querySelectorAll('#hosts-container .host-input').length; // Initialize based on existing fields
    let technicalIndex = document.querySelectorAll('#technical-container .technical-input').length; // Initialize based on existing fields

    const hostsContainer = document.getElementById("hosts-container");
    const technicalContainer = document.getElementById("technical-container");
    const addHostButton = document.getElementById("add-host");
    const addTechnicalButton = document.getElementById("add-technical");

    // --- Host Functions ---
    function addHost() {
        if (!hostsContainer) return;
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;

        if (currentHosts < 4) {
            const newHostDiv = document.createElement("div");
            newHostDiv.className = "name-section host-input"; // Use consistent class

            // Use the current hostIndex for the new fields
            newHostDiv.innerHTML = `
                <input type="text" name="hosts[${hostIndex}].lastName" placeholder="Last Name" required>
                <input type="text" name="hosts[${hostIndex}].firstName" placeholder="First Name" required>
                <input type="text" name="hosts[${hostIndex}].mi" placeholder="M.I.">
                <input type="text" name="hosts[${hostIndex}].suffix" placeholder="Suffix">
                <input type="text" name="hosts[${hostIndex}].cys" placeholder="CYS">
                <button type="button" class="remove-btn remove-host">Remove</button> <!-- Use consistent class -->
            `;

            hostsContainer.appendChild(newHostDiv);

            // Add event listener for the new remove button
            newHostDiv.querySelector(".remove-host").addEventListener("click", function () {
                hostsContainer.removeChild(newHostDiv);
                updateHostIndices(); // Update indices after removal
                toggleAddHostButton();
            });

            hostIndex++; // Increment the index for the *next* potential host
        }
        toggleAddHostButton(); // Update button state after adding
    }

    function updateHostIndices() {
        if (!hostsContainer) return;
        const hostInputs = hostsContainer.getElementsByClassName("host-input");
        hostIndex = hostInputs.length; // Reset index based on current count

        for (let i = 0; i < hostInputs.length; i++) {
            const inputs = hostInputs[i].querySelectorAll("input[type='text']"); // More specific selector
            if (inputs.length === 5) { // Ensure all inputs are found
                inputs[0].name = `hosts[${i}].lastName`;
                inputs[1].name = `hosts[${i}].firstName`;
                inputs[2].name = `hosts[${i}].mi`;
                inputs[3].name = `hosts[${i}].suffix`;
                inputs[4].name = `hosts[${i}].cys`;
            } else {
                console.error("Error updating host indices: Input mismatch in row", i);
            }
        }
    }

    function toggleAddHostButton() {
        if (!hostsContainer || !addHostButton) return; // Exit if elements not found
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;
        addHostButton.disabled = currentHosts >= 4;
    }

    // --- Technical Staff Functions ---
    function addTechnical() {
        if (!technicalContainer) return;
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;

        if (currentTechnical < 2) {
            const newTechnicalDiv = document.createElement("div");
            newTechnicalDiv.className = "name-section technical-input"; // Use consistent class

            // Use the current technicalIndex for the new fields
            newTechnicalDiv.innerHTML = `
                <input type="text" name="technicalStaff[${technicalIndex}].lastName" placeholder="Last Name" required>
                <input type="text" name="technicalStaff[${technicalIndex}].firstName" placeholder="First Name" required>
                <input type="text" name="technicalStaff[${technicalIndex}].mi" placeholder="M.I.">
                <input type="text" name="technicalStaff[${technicalIndex}].suffix" placeholder="Suffix">
                <input type="text" name="technicalStaff[${technicalIndex}].cys" placeholder="CYS">
                <button type="button" class="remove-btn remove-technical">Remove</button> <!-- Use consistent class -->
            `;

            technicalContainer.appendChild(newTechnicalDiv);

            // Add event listener for the new remove button
            newTechnicalDiv.querySelector(".remove-technical").addEventListener("click", function () {
                technicalContainer.removeChild(newTechnicalDiv);
                updateTechnicalIndices(); // Update indices after removal
                toggleAddTechnicalButton();
            });

            technicalIndex++; // Increment the index for the *next* potential staff
        }
        toggleAddTechnicalButton(); // Update button state after adding
    }

    function updateTechnicalIndices() {
        if (!technicalContainer) return;
        const technicalInputs = technicalContainer.getElementsByClassName("technical-input");
        technicalIndex = technicalInputs.length; // Reset index based on current count

        for (let i = 0; i < technicalInputs.length; i++) {
            const inputs = technicalInputs[i].querySelectorAll("input[type='text']"); // More specific selector
             if (inputs.length === 5) { // Ensure all inputs are found
                inputs[0].name = `technicalStaff[${i}].lastName`;
                inputs[1].name = `technicalStaff[${i}].firstName`;
                inputs[2].name = `technicalStaff[${i}].mi`;
                inputs[3].name = `technicalStaff[${i}].suffix`;
                inputs[4].name = `technicalStaff[${i}].cys`;
            } else {
                console.error("Error updating technical staff indices: Input mismatch in row", i);
            }
        }
    }

    function toggleAddTechnicalButton() {
        if (!technicalContainer || !addTechnicalButton) return; // Exit if elements not found
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;
        addTechnicalButton.disabled = currentTechnical >= 2;
    }

    // --- Initial Setup ---
    toggleAddHostButton();
    toggleAddTechnicalButton();

    // Event listeners for add buttons
    if (addHostButton) addHostButton.addEventListener("click", addHost);
    if (addTechnicalButton) addTechnicalButton.addEventListener("click", addTechnical);

    // Add event listeners for existing remove buttons on page load
    document.querySelectorAll('.remove-host').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.host-input')?.remove(); // Find closest parent div and remove it safely
            updateHostIndices();
            toggleAddHostButton();
        });
    });
    document.querySelectorAll('.remove-technical').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.technical-input')?.remove(); // Find closest parent div and remove it safely
            updateTechnicalIndices();
            toggleAddTechnicalButton();
        });
    });
}


/*----------------------ALLOW CROSSPOSTING---------------------*/
function setupCrosspostingToggle() {
    const crosspostingRadios = document.querySelectorAll('input[name="contactInfo.crossposting"]');
    const fbLinkContainer = document.getElementById("fb-link-container");
    const fbLinkInput = document.querySelector('input[name="contactInfo.fbLink"]');

    if (!fbLinkContainer || !fbLinkInput || crosspostingRadios.length === 0) { // Check elements exist
         console.warn("Could not find crossposting elements for setup.");
         return;
    }

    function toggleFbLinkDisplay() {
        const selectedValue = document.querySelector('input[name="contactInfo.crossposting"]:checked')?.value;
        fbLinkContainer.style.display = selectedValue === "Yes" ? "block" : "none";
        if (selectedValue !== "Yes") {
            fbLinkInput.value = ""; // Clear the input if 'No' is selected
        }
        // Optionally make required based on selection
        // fbLinkInput.required = selectedValue === "Yes";
    }

    // Initial setup
    toggleFbLinkDisplay();

    crosspostingRadios.forEach((radio) => {
        radio.addEventListener("change", toggleFbLinkDisplay);
    });
}


/*----------------------DLSUD EMAIL---------------------*/
function setupDlsudEmailFormatting() {
    const domain = "@dlsud.edu.ph";
    const emailInputOffice = document.getElementById('dlsud-email-office');
    const emailInputContact = document.getElementById('dlsud-email-contact');

    // Function to format the email input on blur
    function formatDlsudEmail(emailInput) {
        if (!emailInput) return;
        let value = emailInput.value.trim();
        // Remove existing domain if user tries to type it again or pastes it
        value = value.replace(domain, "");
        // Append domain if there's a username part
        if (value.length > 0) {
            emailInput.value = value + domain;
        } else {
            emailInput.value = ''; // Clear if only domain was present or input is empty
        }
    }

    // Common event listener setup
    function setupInput(emailInput) {
        if (!emailInput) return; // Skip if element not found
        emailInput.addEventListener("blur", () => formatDlsudEmail(emailInput));
        // Optional: Add keydown listener to prevent easy deletion of domain if desired
    }

    // Set up event listeners for both email inputs
    setupInput(emailInputOffice);
    setupInput(emailInputContact);
}

/*----------------------SIGNATURE UPLOAD PREVIEW---------------------*/
function setupSignaturePreview() {
    const signatureUploadInput = document.getElementById("signature-upload");
    const previewContainer = document.getElementById("signature-preview");
    const signatureImage = document.getElementById("signature-image");

    if (!signatureUploadInput || !previewContainer || !signatureImage) { // Check elements exist
        console.warn("Could not find signature preview elements for setup.");
        return;
    }

    signatureUploadInput.addEventListener("change", function (event) {
        const file = event.target.files[0];

        if (file && file.type.startsWith('image/')) { // Basic type check
            const reader = new FileReader();

            reader.onload = function (e) {
                signatureImage.src = e.target.result; // Set the src to the file data
                previewContainer.style.display = "block"; // Show the preview
            };
            reader.onerror = function() {
                alert("Error reading signature file.");
                previewContainer.style.display = "none";
                signatureImage.src = "";
            }
            reader.readAsDataURL(file); // Convert the file to a Data URL
        } else {
            previewContainer.style.display = "none"; // Hide the preview if no file or invalid file
            signatureImage.src = ""; // Clear the src
            if (file) { // If a file was selected but invalid type
                alert("Please select a valid image file for the signature (JPG, PNG).");
                signatureUploadInput.value = ''; // Clear the file input
            }
        }
    });
}

async function uploadFileToServer(file) {
    const formData = new FormData();
    formData.append('file', file); // Key should match server-side expectation (e.g., 'file' or 'signature')

    try {
        // Consider showing a specific spinner for upload if needed
        const response = await fetch('/upload-signature', { // Ensure this route exists and handles POST
            method: 'POST',
            body: formData,
            // Add headers if needed (e.g., CSRF token from meta tag or cookie)
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to parse JSON error, fallback to status text
            throw new Error(`Signature upload failed: ${errorData.message || response.statusText}`);
        }

        const uploadResponse = await response.json();
        if (!uploadResponse.url) {
             throw new Error('Signature upload succeeded but server did not return a URL.');
        }
        return { url: uploadResponse.url }; // Return the URL from the server response
    } catch (error) {
        console.error('File upload error details:', error); // Log detailed error
        // Rethrow a user-friendly error
        throw new Error(`Signature upload failed. Please check the file and try again. (${error.message})`);
    }
}

/*----------------------FORM 1 SUBMISSION (runs on DOMContentLoaded)---------------------*/
document.addEventListener("DOMContentLoaded", function () {
    // Initialize all setup functions
    toggles.forEach(setupToggleInputs);
    setupOtherInputToggle();
    setupDynamicAddRemove();
    setupCrosspostingToggle();
    setupDlsudEmailFormatting();
    setupSignaturePreview();

    const form1 = document.getElementById('blocktimerForm1');
    if (!form1) {
        console.error("Blocktimer Form 1 (#blocktimerForm1) not found!");
        return; // Stop if form doesn't exist
    }

    form1.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default synchronous submission ALWAYS

        // --- START PRELIMINARY VALIDATION ---
        const otherCheckbox = form1.querySelector("#other");
        const otherInput = form1.querySelector("#other-input");
        const showTypeCheckboxes = form1.querySelectorAll("input[name='showDetails.type[]']"); // Correct selector

        // 1. Check Show Type Selection
        let atLeastOneTypeChecked = false;
        showTypeCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                atLeastOneTypeChecked = true;
            }
        });

        if (!atLeastOneTypeChecked) {
            alert("Please choose at least one type of show.");
            return; // Stop execution
        }

        // 2. Check 'Other' Input if 'Other' is checked
        if (otherCheckbox && otherCheckbox.checked) {
            if (!otherInput || otherInput.value.trim() === "") {
                alert("Please specify the 'Other' show type in the input field.");
                otherInput?.focus(); // Focus the input if possible
                return; // Stop execution
            }
        }

        // 3. Check Crossposting Link if 'Yes' is selected
        const crosspostingYesSelected = form1.querySelector('input[name="contactInfo.crossposting"]:checked')?.value === "Yes";
        const fbLinkInputForSubmit = form1.querySelector('input[name="contactInfo.fbLink"]');
        if (crosspostingYesSelected && (!fbLinkInputForSubmit || fbLinkInputForSubmit.value.trim() === "")) {
            alert("Please enter the Facebook Crossposting Link (required when 'Yes' is selected).");
            fbLinkInputForSubmit?.focus();
            return; // Stop submission
        }

        // 4. Check Signature File Presence
        const signatureFileInput = document.getElementById('signature-upload');
        if (!signatureFileInput?.files || signatureFileInput.files.length === 0) {
             alert("Please upload the proponent's signature.");
             signatureFileInput?.focus();
             return; // Stop submission
        }
        // --- END PRELIMINARY VALIDATION ---


        // If preliminary validation passes, show spinner and proceed
        showSpinner();

        try {
            // --- Data Collection ---
            const formData = new FormData(form1);
            const data = {
                proponent: {},
                coProponent: {},
                showDetails: { type: [] }, // Initialize type as array
                executiveProducer: {},
                facultyStaff: {},
                hosts: [],
                technicalStaff: [],
                creativeStaff: {},
                contactInfo: {}
                // proponentSignature will be added after upload
            };

            // Helper to set nested properties safely
            function setNestedValue(obj, path, value) {
                const keys = path.split('.');
                let current = obj;
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    // Basic handling for nested objects, arrays handled separately
                    if (!current[key]) {
                        current[key] = {};
                    }
                    current = current[key];
                }
                const lastKey = keys.at(-1);
                // Handle 'notApplicable' checkboxes specifically
                 if (lastKey === 'notApplicable' && value === 'on') {
                    current[lastKey] = true;
                 } else if (lastKey === 'notApplicable') {
                     // If checkbox is not 'on', it won't be in FormData.
                     // We'll handle setting default false later if needed.
                 }
                 else {
                    current[lastKey] = value;
                 }
            }

            // Process FormData into the data object
            for (let [key, value] of formData.entries()) {
                // Skip array fields and file input here, handle them separately
                if (key.startsWith('hosts[') || key.startsWith('technicalStaff[') || key === 'showDetails.type[]' || key === 'signature-upload') {
                    continue;
                }
                setNestedValue(data, key, value);
            }

             // Collect show types (including 'Other' value if applicable)
             const showTypeCheckboxesChecked = form1.querySelectorAll('input[name="showDetails.type[]"]:checked');
             showTypeCheckboxesChecked.forEach(checkbox => {
                 if (checkbox.id === 'other') {
                     const otherInputValue = form1.querySelector('#other-input')?.value.trim();
                     if (otherInputValue) { // Only add if 'Other' input has value (already validated)
                         data.showDetails.type.push(otherInputValue);
                     }
                 } else {
                     data.showDetails.type.push(checkbox.value);
                 }
             });


            // Collect hosts (ensure required fields are present)
            document.querySelectorAll('#hosts-container .host-input').forEach((hostDiv) => {
                // Use querySelector within the specific hostDiv context
                const lastName = hostDiv.querySelector(`input[name$=".lastName"]`)?.value.trim();
                const firstName = hostDiv.querySelector(`input[name$=".firstName"]`)?.value.trim();
                const mi = hostDiv.querySelector(`input[name$=".mi"]`)?.value.trim();
                const suffix = hostDiv.querySelector(`input[name$=".suffix"]`)?.value.trim();
                const cys = hostDiv.querySelector(`input[name$=".cys"]`)?.value.trim();

                // Only add if required fields (lastName, firstName) are present
                if (lastName && firstName) {
                    data.hosts.push({ lastName, firstName, mi, suffix, cys });
                }
            });

            // Collect technical staff (ensure required fields are present)
            document.querySelectorAll('#technical-container .technical-input').forEach((techDiv) => {
                const lastName = techDiv.querySelector(`input[name$=".lastName"]`)?.value.trim();
                const firstName = techDiv.querySelector(`input[name$=".firstName"]`)?.value.trim();
                const mi = techDiv.querySelector(`input[name$=".mi"]`)?.value.trim();
                const suffix = techDiv.querySelector(`input[name$=".suffix"]`)?.value.trim();
                const cys = techDiv.querySelector(`input[name$=".cys"]`)?.value.trim();

                 // Only add if required fields (lastName, firstName) are present
                if (lastName && firstName) {
                    data.technicalStaff.push({ lastName, firstName, mi, suffix, cys });
                }
            });

            // Ensure 'notApplicable' fields default to false if not present (i.e., not checked)
            if (!data.coProponent.hasOwnProperty('notApplicable')) data.coProponent.notApplicable = false;
            if (!data.facultyStaff.hasOwnProperty('notApplicable')) data.facultyStaff.notApplicable = false;


            // --- Signature Upload ---
            const signatureFile = signatureFileInput.files[0]; // Already checked for presence
            const uploadResult = await uploadFileToServer(signatureFile); // This will throw error if upload fails
            data.proponentSignature = uploadResult.url; // Add URL to data object
            // --- End Signature Upload ---


            // --- Final Validation on collected 'data' object ---
            // This checks the integrity of the collected data before sending
            let validationErrors = [];
            if (!data.organizationType) validationErrors.push("Organization Type");
            if (!data.organizationName) validationErrors.push("Organization Name");
            if (!data.proponent?.lastName || !data.proponent?.firstName) validationErrors.push("Proponent Name");
            // Check co-proponent only if notApplicable is false
            if (data.coProponent?.notApplicable === false && (!data.coProponent?.lastName || !data.coProponent?.firstName)) validationErrors.push("Co-Proponent Name (or check N/A)");
            if (!data.showDetails?.title) validationErrors.push("Show Title");
            if (!data.showDetails?.type || data.showDetails.type.length === 0) validationErrors.push("Show Type");
            if (!data.showDetails?.description) validationErrors.push("Show Description");
            if (!data.showDetails?.objectives) validationErrors.push("Show Objectives");
            if (!data.executiveProducer?.lastName || !data.executiveProducer?.firstName) validationErrors.push("Executive Producer Name");
             // Check faculty/staff only if notApplicable is false
            if (data.facultyStaff?.notApplicable === false && (!data.facultyStaff?.lastName || !data.facultyStaff?.firstName)) validationErrors.push("Faculty/Staff Adviser Name (or check N/A)");
            if (!data.hosts || data.hosts.length === 0) validationErrors.push("At least one Host");
            if (!data.technicalStaff || data.technicalStaff.length === 0) validationErrors.push("At least one Technical Staff");
            if (!data.creativeStaff?.lastName || !data.creativeStaff?.firstName) validationErrors.push("Creative Staff Name");
            if (!data.agreement) validationErrors.push("Agreement Checkbox");
            if (!data.contactInfo?.dlsudEmail) validationErrors.push("DLSU-D Email");
            if (!data.contactInfo?.contactEmail) validationErrors.push("Contact Email");
            if (!data.contactInfo?.contactFbLink) validationErrors.push("Contact FB Link");
            if (data.contactInfo?.crossposting === 'Yes' && !data.contactInfo?.fbLink) validationErrors.push("Crossposting FB Link (since 'Yes' selected)");
            if (!data.proponentSignature) validationErrors.push("Proponent Signature (Upload Issue)"); // Should have URL if upload succeeded


            if (validationErrors.length > 0) {
                // This indicates an issue with data collection logic if preliminary checks passed
                alert(`Data collection error. Please check the following fields:\n- ${validationErrors.join('\n- ')}`);
                console.error('Final data validation failed:', validationErrors);
                console.log('Collected data:', data);
                hideSpinner();
                return;
            }
            // --- End Final Validation ---


            // --- Submit Data to Server ---
            console.log('Final data being sent to /JoinBlocktimer-Step1:', JSON.stringify(data, null, 2));

            const response = await fetch('/JoinBlocktimer-Step1', { // Ensure this route exists
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add other headers like CSRF token if needed
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                // Redirect on success
                window.location.href = '/JoinBlocktimer-Step2';
                // Spinner will be hidden by page navigation
            } else {
                // Handle server-side errors (e.g., validation errors from backend)
                const errorData = await response.json().catch(() => ({ message: `Server error: ${response.statusText}` }));
                console.error('Server responded with error:', errorData);
                alert(`Error submitting form: ${errorData.error || errorData.message || 'Unknown server error'}`);
                hideSpinner(); // Hide spinner on error
            }
            // --- End Submit Data ---

        } catch (error) {
            // Catch errors from uploadFileToServer or fetch/network issues
            console.error('Error during form submission process:', error);
            alert(`An error occurred: ${error.message}`);
            hideSpinner(); // Hide spinner on any error during async process
        }
    }); // End submit listener
}); // End DOMContentLoaded
