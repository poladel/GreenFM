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
    input.disabled = !checkbox.checked;
}

// Initial setup: enable other input if checkbox is checked
toggleOtherInputs();
checkbox.addEventListener('change', toggleOtherInputs);

/*----------------------ADDING HOST AND TECHNICAL STAFF---------------------*/
let hostIndex = document.querySelectorAll("input[name^='hosts']").length;
let technicalIndex = document.querySelectorAll("input[name^='technicalStaff']").length;

// Function to add a new host
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

        newHostDiv.querySelector(".remove-host").addEventListener("click", function () {
            hostsContainer.removeChild(newHostDiv);
            updateHostIndices();
        });

        hostIndex++;
    } else {
        alert("Maximum of 4 Hosts allowed.");
    }
}

// Function to update host indices after removal
function updateHostIndices() {
    const hostInputs = document.querySelectorAll(".host-input");

    hostInputs.forEach((host, index) => {
        host.querySelectorAll("input").forEach((input, inputIndex) => {
            input.name = `hosts[${index}].${['lastName', 'firstName', 'mi', 'cys'][inputIndex]}`;
        });
    });
}

// Function to add a new technical staff member
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

        newTechnicalDiv.querySelector(".remove-technical").addEventListener("click", function () {
            technicalContainer.removeChild(newTechnicalDiv);
            updateTechnicalIndices();
        });

        technicalIndex++;
    } else {
        alert("Maximum of 2 Technical Staffs allowed.");
    }
}

// Function to update technical staff indices after removal
function updateTechnicalIndices() {
    const technicalInputs = document.querySelectorAll(".technical-input");

    technicalInputs.forEach((staff, index) => {
        staff.querySelectorAll("input").forEach((input, inputIndex) => {
            input.name = `technicalStaff[${index}].${['lastName', 'firstName', 'mi', 'cys'][inputIndex]}`;
        });
    });
}

// Adding event listeners for buttons to add hosts and technical staff
document.getElementById("add-host").addEventListener("click", addHost);
document.getElementById("add-technical").addEventListener("click", addTechnical);

/*----------------------SIGNATURE UPLOAD PREVIEW---------------------*/
document.getElementById("signature-upload").addEventListener("change", function (event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById("signature-preview");
    const signatureImage = document.getElementById("signature-image");

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            signatureImage.src = e.target.result;
            previewContainer.style.display = "block";
        };

        reader.readAsDataURL(file);
    } else {
        previewContainer.style.display = "none";
        signatureImage.src = "";
    }
});

/*----------------------DLSUD EMAIL APPEND---------------------*/
const domain = "@dlsud.edu.ph";
const emailInputs = document.querySelectorAll("#dlsud-email-office, #dlsud-email-contact");

function appendDomain(emailInput) {
    if (emailInput.value.length > 0 && !emailInput.value.endsWith(domain)) {
        emailInput.value = emailInput.value.replace(domain, "") + domain;
        emailInput.setSelectionRange(emailInput.value.length - domain.length, emailInput.value.length - domain.length);
    }
}

emailInputs.forEach(input => {
    input.addEventListener("blur", function () {
        appendDomain(input);
    });
});
