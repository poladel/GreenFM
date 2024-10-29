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
        inputIds: ['coProponentLastName', 'coProponentFirstName', 'coProponentMi', 'coProponentCYS']
    },
    {
        checkboxId: 'facultyStaffNotApplicable',
        inputIds: ['facultyStaffLastName', 'facultyStaffFirstName', 'facultyStaffMi', 'facultyStaffDepartment']
    }
    // Add more sets as needed
];

// Function to toggle input fields based on checkbox state
function setupToggleInputs({ checkboxId, inputIds }) {
    const checkbox = document.getElementById(checkboxId);
    const inputs = inputIds.map(id => document.getElementById(id));

    function toggleInputs() {
        const isChecked = checkbox.checked;
        inputs.forEach(input => {
            input.disabled = isChecked;
        });
    }

    // Initial setup: disable inputs if checkbox is checked on page load
    toggleInputs();
    
    // Event listener to toggle inputs when checkbox state changes
    checkbox.addEventListener('change', toggleInputs);
}

// Apply the toggle function to each checkbox-input group
toggles.forEach(setupToggleInputs);

    /*----------------------ADDING HOST---------------------*/
    let hostIndex = document.querySelectorAll("input[name^='hosts']").length; // Start with the existing hosts
    let technicalIndex = document.querySelectorAll("input[name^='technicalStaff']").length; // Start with the existing technical staff

function addHost() {
    const hostsContainer = document.getElementById("hosts-container");
    const currentHosts = hostsContainer.getElementsByClassName("host-input").length;

    if (currentHosts < 4) {
        const newHostDiv = document.createElement("div");
        newHostDiv.className = "name-section host-input";

        newHostDiv.innerHTML = `
            <input type="text" name="hosts[${hostIndex}].lastName" placeholder="Last Name" required>
            <input type="text" name="hosts[${hostIndex}].firstName" placeholder="First Name" required>
            <input type="text" name="hosts[${hostIndex}].mi" placeholder="M.I">
            <input type="text" name="hosts[${hostIndex}].cys" placeholder="CYS">
            <button type="button" class="remove-host">Remove</button>
        `;

        hostsContainer.appendChild(newHostDiv);

        // Add event listener for the remove button
        newHostDiv.querySelector(".remove-host").addEventListener("click", function () {
            hostsContainer.removeChild(newHostDiv);
        });

        hostIndex++; // Increment the host index after adding a new host
    } else {
        alert("Maximum of 4 Hosts allowed.");
    }
}

/*----------------------ADDING TECHNICAL STAFF---------------------*/
function addTechnical() {
    const technicalContainer = document.getElementById("technical-container");
    const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;

    if (currentTechnical < 2) {
        const newTechnicalDiv = document.createElement("div");
        newTechnicalDiv.className = "name-section technical-input";

        newTechnicalDiv.innerHTML = `
            <input type="text" name="technicalStaff[${technicalIndex}].lastName" placeholder="Last Name" required>
            <input type="text" name="technicalStaff[${technicalIndex}].firstName" placeholder="First Name" required>
            <input type="text" name="technicalStaff[${technicalIndex}].mi" placeholder="M.I">
            <input type="text" name="technicalStaff[${technicalIndex}].cys" placeholder="CYS">
            <button type="button" class="remove-technical">Remove</button>
        `;

        technicalContainer.appendChild(newTechnicalDiv);

        // Add event listener for the remove button
        newTechnicalDiv.querySelector(".remove-technical").addEventListener("click", function () {
            technicalContainer.removeChild(newTechnicalDiv);
        });

        technicalIndex++; // Increment the technical index after adding a new staff
    } else {
        alert("Maximum of 2 Technical Staffs allowed.");
    }
}

// Adding event listeners for buttons to add hosts and technical staff
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

    /*----------------------SIGNATURE UPLOAD---------------------*/
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