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

document.getElementById('blocktimerForm1').addEventListener('submit', function(event) {
    const checkboxes = document.querySelectorAll("input[name^='showDetails']");
    const otherCheckbox = document.getElementById("other");
    const otherInput = document.getElementById("other-input");
    let isChecked = false;

    // Check if at least one checkbox is selected
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            isChecked = true;
        }
    });

    if (!isChecked) {
        alert("Please choose at least one type of show.");
        event.preventDefault(); // Prevent form submission
        return;
    }

    // If "Other" is checked, ensure other-input has a value
    if (otherCheckbox.checked && otherInput.value.trim() === "") {
        alert("Please specify other type of show.");
        event.preventDefault(); // Prevent form submission
        return;
    }
});

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
    const inputs = inputIds.map(id => document.getElementById(id));

    function toggleInputs() {
        const isChecked = checkbox.checked;
        inputs.forEach(input => {
            input.disabled = isChecked;
            input.value = '';
        });
    }
    // Initial setup: disable inputs if checkbox is checked on page load
    toggleInputs();
    
    // Event listener to toggle inputs when checkbox state changes
    checkbox.addEventListener('change', toggleInputs);
}

// Apply the toggle function to each checkbox-input group
toggles.forEach(setupToggleInputs);

    /*----------------------OTHER INPUT---------------------*/
// Function to toggle other input field based on checkbox state
    const checkbox = document.getElementById('other');
    const input = document.getElementById('other-input');

    function toggleOtherInputs() {
        const isChecked = checkbox.checked;
        input.disabled = (!isChecked);
    }

    // Initial setup: enable other input if checkbox is checked
    toggleOtherInputs();
    
    // Event listener to toggle inputs when checkbox state changes
    checkbox.addEventListener('change', toggleOtherInputs);

    /*----------------------ADDING HOST AND TECHNICAL STAFF---------------------*/
    let hostIndex = 1; // Start from 1 since 0 is already in the HTML
    let technicalIndex = 1; // Start from 1 since 0 is already in the HTML
    
    function addHost() {
        const hostsContainer = document.getElementById("hosts-container");
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;
    
        if (currentHosts < 4) {
            const newHostDiv = document.createElement("div");
            newHostDiv.className = "name-section host-input";
    
            newHostDiv.innerHTML = `
                <input type="text" name="hosts[${hostIndex}].lastName" placeholder="Last Name" required>
                <input type="text" name="hosts[${hostIndex}].firstName" placeholder="First Name" required>
                <input type="text" name="hosts[${hostIndex}].mi" placeholder="M.I.">
                <input type="text" name="hosts[${hostIndex}].suffix" placeholder="Suffix">
                <input type="text" name="hosts[${hostIndex}].cys" placeholder="CYS">
                <button type="button" class="remove-host">Remove</button>
            `;
    
            hostsContainer.appendChild(newHostDiv);
    
            // Add event listener for the remove button
            newHostDiv.querySelector(".remove-host").addEventListener("click", function () {
                hostsContainer.removeChild(newHostDiv);
                updateHostIndices(); // Update indices after removal
                toggleAddHostButton();
            });
    
            hostIndex++; // Increment the host index after adding a new host
        } 
        toggleAddHostButton();
    }
    
    function updateHostIndices() {
        const hostsContainer = document.getElementById("hosts-container");
        const hostInputs = hostsContainer.getElementsByClassName("host-input");
    
        for (let i = 0; i < hostInputs.length; i++) {
            const inputs = hostInputs[i].getElementsByTagName("input");
            inputs[0].name = `hosts[${i}].lastName`;
            inputs[1].name = `hosts[${i}].firstName`;
            inputs[2].name = `hosts[${i}].mi`;
            inputs[3].name = `hosts[${i}].suffix`;
            inputs[4].name = `hosts[${i}].cys`;
        }
    }

    function toggleAddHostButton() {
        const hostsContainer = document.getElementById("hosts-container");
        const addHostButton = document.getElementById("add-host");
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;

        console.log("Current hosts:", currentHosts); // Debugging log
        console.log("Add Host button:", addHostButton); // Debugging log

        addHostButton.disabled = currentHosts >= 4;
        console.log("Button disabled:", addHostButton.disabled); // Debugging log
    }
    
    function addTechnical() {
        const technicalContainer = document.getElementById("technical-container");
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;
    
        if (currentTechnical < 2) {
            const newTechnicalDiv = document.createElement("div");
            newTechnicalDiv.className = "name-section technical-input";
    
            newTechnicalDiv.innerHTML = `
                <input type="text" name="technicalStaff[${technicalIndex}].lastName" placeholder="Last Name" required>
                <input type="text" name="technicalStaff[${technicalIndex}].firstName" placeholder="First Name" required>
                <input type="text" name="technicalStaff[${technicalIndex}].mi" placeholder="M.I.">
                <input type="text" name="technicalStaff[${technicalIndex}].suffix" placeholder="Suffix">
                <input type="text" name="technicalStaff[${technicalIndex}].cys" placeholder="CYS">
                <button type="button" class="remove-technical">Remove</button>
            `;
    
            technicalContainer.appendChild(newTechnicalDiv);
    
            // Add event listener for the remove button
            newTechnicalDiv.querySelector(".remove-technical").addEventListener("click", function () {
                technicalContainer.removeChild(newTechnicalDiv);
                updateTechnicalIndices(); // Update indices after removal
                toggleAddTechnicalButton();
            });
    
            technicalIndex++; // Increment the technical index after adding a new technical staff member
        }
        toggleAddTechnicalButton();
    }
    
    function updateTechnicalIndices() {
        const technicalContainer = document.getElementById("technical-container");
        const technicalInputs = technicalContainer.getElementsByClassName("technical-input");
    
        for (let i = 0; i < technicalInputs.length; i++) {
            const inputs = technicalInputs[i].getElementsByTagName("input");
            inputs[0].name = `technicalStaff[${i}].lastName`;
            inputs[1].name = `technicalStaff[${i}].firstName`;
            inputs[2].name = `technicalStaff[${i}].mi`;
            inputs[3].name = `technicalStaff[${i}].suffix`;
            inputs[4].name = `technicalStaff[${i}].cys`;
        }
    }

    function toggleAddTechnicalButton() {
        const technicalContainer = document.getElementById("technical-container");
        const addTechnicalButton = document.getElementById("add-technical");
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;

        console.log("Current technical:", currentTechnical); // Debugging log
        console.log("Add Technical button:", addTechnicalButton); // Debugging log

        addTechnicalButton.disabled = currentTechnical >= 2;
        console.log("Button disabled:", addTechnicalButton.disabled); // Debugging log
    }
    
    // Event listeners for add buttons
    document.getElementById("add-host").addEventListener("click", addHost);
    document.getElementById("add-technical").addEventListener("click", addTechnical);
    


    /*----------------------ALLOW CROSSPOSTING---------------------*/
    // Existing crossposting logic
    const crosspostingRadios = document.querySelectorAll('input[name="contactInfo.crossposting"]');
    const fbLinkContainer = document.getElementById("fb-link-container");
    const fbLinkInput = document.querySelector('input[name="contactInfo.fbLink"]');
    
    crosspostingRadios.forEach((radio) => {
        radio.addEventListener("change", function () {
            fbLinkContainer.style.display = this.value === "Yes" ? "block" : "none";
            if (this.value !== "Yes") {
                fbLinkInput.value = ""; // Clear the input if 'No' is selected
            }
        });
    });

    // Validation on form submission
    document.getElementById("blocktimerForm1").addEventListener("submit", function(event) {
        // Check if crossposting is "Yes" and fbLinkContainer is visible
        const crosspostingYesSelected = document.querySelector('input[name="contactInfo.crossposting"]:checked').value === "Yes";
        if (crosspostingYesSelected && fbLinkInput.value.trim() === "") {
            event.preventDefault(); // Stop form submission
            alert("Please enter the Facebook Crossposting Link.");
            fbLinkInput.focus(); // Focus the input for user convenience
        }
    });


    /*----------------------DLSUD EMAIL---------------------*/
    const domain = "@dlsud.edu.ph";
    const emailInputOffice = document.getElementById('dlsud-email-office');
    const emailInputContact = document.getElementById('dlsud-email-contact');

    // Function to append the domain
    function appendDomain(emailInput) {
        if (emailInput.value.length > 0 && !emailInput.value.endsWith(domain)) {
            emailInput.value = emailInput.value.replace(domain, "") + domain;
            emailInput.setSelectionRange(emailInput.value.length - domain.length, emailInput.value.length - domain.length);
        }
    }

    // Common event listener function
    function setupEmailInput(emailInput) {
        let shouldAppendDomain = true;

        emailInput.addEventListener("input", function (event) {
            if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
                shouldAppendDomain = false;
                return;
            }
            if (shouldAppendDomain) {
                appendDomain(emailInput);
            }
        });

        emailInput.addEventListener("keydown", function () {
            shouldAppendDomain = true; // Allow appending on keydown
        });

        emailInput.addEventListener("blur", function () {
            appendDomain(emailInput);
        });
    }

    // Set up event listeners for both email inputs
    setupEmailInput(emailInputOffice);
    setupEmailInput(emailInputContact);

/*----------------------SIGNATURE UPLOAD PREVIEW---------------------*/
document.getElementById("signature-upload").addEventListener("change", function (event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById("signature-preview");
    const signatureImage = document.getElementById("signature-image");

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            signatureImage.src = e.target.result; // Set the src to the file data
            previewContainer.style.display = "block"; // Show the preview
        };

        reader.readAsDataURL(file); // Convert the file to a Data URL
    } else {
        previewContainer.style.display = "none"; // Hide the preview if no file is selected
        signatureImage.src = ""; // Clear the src
    }
});

async function uploadFileToServer(file) {
    const formData = new FormData();
    formData.append('file', file); // Append the file to the FormData

    try {
        const response = await fetch('/upload-signature', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('File upload failed: ' + response.statusText);
        }

        const uploadResponse = await response.json();
        return { url: uploadResponse.url }; // Return the URL from the server response
    } catch (error) {
        throw new Error('File upload failed: ' + error.message);
    }
}

/*----------------------FORM 1 SUBMISSION---------------------*/
document.addEventListener("DOMContentLoaded", function () {
    toggleAddHostButton();
    toggleAddTechnicalButton();
    const form1 = document.getElementById('blocktimerForm1');    

    form1.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Show the spinner when the "Next" button is clicked
        showSpinner();

        const formData = new FormData(form1);

        // Collect all selected show types
        const showTypeArray = Array.from(document.querySelectorAll('input[name="showDetails.type[]"]:checked')).map(el => el.value);

        // Handle 'Other' input
        const otherInput = document.getElementById('other-input');
        if (otherInput.value.trim() !== '') {
            const otherValue = otherInput.value.trim();
            // Check if "Other" input is already included to prevent duplicates
            if (!showTypeArray.includes(otherValue)) {
                showTypeArray.push(otherValue);
            }
        }

        // Clear previous show types from FormData and append the array
        formData.delete('showDetails.type[]'); // Remove duplicates
        showTypeArray.forEach(type => formData.append('showDetails.type[]', type));

        // Convert formData to an object for further processing
        const data = { showDetails: {}, hosts: [], technicalStaff: [] };

        // Fill the data object from formData
        formData.forEach((value, key) => {
            if (key.endsWith('[]')) {
                const cleanKey = key.slice(0, -2); // Remove the '[]'
                if (!data.showDetails[cleanKey]) {
                    data.showDetails[cleanKey] = [];
                }
                data.showDetails[cleanKey].push(value);
            } else {
                const keys = key.split('.');
                let temp = data;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!temp[keys[i]]) temp[keys[i]] = {};
                    temp = temp[keys[i]];
                }

                // Check if the field is a checkbox and convert to Boolean
                if (key === 'coProponent.notApplicable' || key === 'facultyStaff.notApplicable') {
                    temp[keys[keys.length - 1]] = value === 'on'; // Convert to Boolean
                } else {
                    temp[keys[keys.length - 1]] = value; // Assign value directly for other fields
                }
            }
        });

        // Assign the showTypeArray directly to showDetails.type
        data.showDetails.type = showTypeArray;

        // Collect hosts
        document.querySelectorAll('.host-input').forEach((host) => {
            const lastName = host.querySelector('[name^="hosts["][name$=".lastName"]').value.trim();
            const firstName = host.querySelector('[name^="hosts["][name$=".firstName"]').value.trim();
            const mi = host.querySelector('[name^="hosts["][name$=".mi"]').value.trim();
            const suffix = host.querySelector('[name^="hosts["][name$=".suffix"]').value.trim();
            const cys = host.querySelector('[name^="hosts["][name$=".cys"]').value.trim();

            if (lastName && firstName) {
                data.hosts.push({ lastName, firstName, mi, suffix, cys });
            }
        });

        // Collect technical staff
        document.querySelectorAll('.technical-input').forEach((staff) => {
            const lastName = staff.querySelector('[name^="technicalStaff["][name$=".lastName"]').value.trim();
            const firstName = staff.querySelector('[name^="technicalStaff["][name$=".firstName"]').value.trim();
            const mi = staff.querySelector('[name^="technicalStaff["][name$=".mi"]').value.trim();
            const suffix = staff.querySelector('[name^="technicalStaff["][name$=".suffix"]').value.trim();
            const cys = staff.querySelector('[name^="technicalStaff["][name$=".cys"]').value.trim();

            if (lastName && firstName) {
                data.technicalStaff.push({ lastName, firstName, mi, suffix, cys });
            }
        });

        // Debugging logs for initial data collection
        console.log('Show Types:', showTypeArray);
        console.log('Hosts:', data.hosts);
        console.log('Technical Staff:', data.technicalStaff);

        // Validation logic
        const requiredFields = [
            { name: 'organizationType', condition: data.organizationType },
            { name: 'organizationName', condition: data.organizationName },
            { name: 'proponent.lastName', condition: data.proponent?.lastName },
            { name: 'proponent.firstName', condition: data.proponent?.firstName },
            { name: 'showDetails.title', condition: data.showDetails?.title },
            { name: 'showDetails.type', condition: Array.isArray(data.showDetails?.type) && data.showDetails.type.length > 0 },
            { name: 'showDetails.description', condition: data.showDetails?.description },
            { name: 'showDetails.objectives', condition: data.showDetails?.objectives },
            { name: 'executiveProducer.lastName', condition: data.executiveProducer?.lastName },
            { name: 'executiveProducer.firstName', condition: data.executiveProducer?.firstName },
            { name: 'hosts', condition: Array.isArray(data.hosts) && data.hosts.length > 0 },
            { name: 'technicalStaff', condition: Array.isArray(data.technicalStaff) && data.technicalStaff.length > 0 },
            { name: 'creativeStaff.firstName', condition: data.creativeStaff?.firstName },
            { name: 'creativeStaff.lastName', condition: data.creativeStaff?.lastName },
            { name: 'agreement', condition: data.agreement },
            { name: 'contactInfo.dlsudEmail', condition: data.contactInfo?.dlsudEmail },
            { name: 'contactInfo.contactEmail', condition: data.contactInfo?.contactEmail },
            { name: 'contactInfo.contactFbLink', condition: data.contactInfo?.contactFbLink },
            { 
                name: 'contactInfo.fbLink', 
                condition: data.contactInfo?.crossposting === 'Yes' ? !!data.contactInfo?.fbLink : true 
            },
            { name: 'proponentSignature', condition: data.proponentSignature },
        ];

        const validationErrors = requiredFields.filter(field => !field.condition).map(field => field.name);

        if (validationErrors.length > 0) {
            alert(`Please fill in all required fields: ${validationErrors.join(', ')}`);
            console.log('User input data:', data); // Console log user input for debugging
            hideSpinner(); // Hide spinner if validation fails
            return;
        }

        // Attempting to upload the signature
        try {
            const signatureFileInput = document.getElementById('signature-upload');
            const signatureFile = signatureFileInput.files[0];

            if (signatureFile) {
                const { url: proponentSignatureUrl } = await uploadFileToServer(signatureFile);
                data.proponentSignature = proponentSignatureUrl;
            }

            // Submission logic
            const response = await fetch('/JoinBlocktimer-Step1', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                window.location.href = '/JoinBlocktimer-Step2';
            } else {
                const errorMessage = await response.text();
                alert(`Error: ${errorMessage}`);
                hideSpinner(); // Hide spinner if submission fails
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('There was an error uploading the signature. Please try again.');
            hideSpinner(); // Hide spinner if an error occurs
        }
    });
});
