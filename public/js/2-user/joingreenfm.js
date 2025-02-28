/*----------------------STUDENT NUMBER---------------------*/
const studentNumberInput = document.getElementById("studentNumber");

// Allow only numeric input and enforce maxlength
studentNumberInput.addEventListener("input", function (e) {
    this.value = this.value.replace(/\D/g, "").slice(0, 9);
});

// Optional: Prevent pasting non-numeric values
studentNumberInput.addEventListener("paste", function (e) {
    e.preventDefault();
});

/*----------------------DLSUD EMAIL---------------------*/
const emailInput = document.getElementById("dlsudEmail");
const domain = "@dlsud.edu.ph";
let shouldAppendDomain = true;

// Function to append the domain if it doesn't already exist
function appendDomain() {
    if (emailInput.value.length > 0 && !emailInput.value.endsWith(domain)) {
        emailInput.value = emailInput.value.replace(domain, "") + domain;
        emailInput.setSelectionRange(emailInput.value.length - domain.length, emailInput.value.length - domain.length);
    }
}

// Event listener for input event
emailInput.addEventListener("input", function (event) {
    if (event.inputType === "deleteContentBackward" || event.inputType === "deleteContentForward") {
        shouldAppendDomain = false;
        return;
    }
    if (shouldAppendDomain) {
        appendDomain();
    }
});

// Reset flag on keydown to allow appending again
emailInput.addEventListener("keydown", function () {
    shouldAppendDomain = true;
});

// Ensure domain is appended when input loses focus
emailInput.addEventListener("blur", function () {
    appendDomain();
});

/*----------------------NOT APPLICABLE---------------------*/
// Function to toggle other input field based on checkbox state
const checkbox = document.getElementById('affiliatedOrgsListNotApplicable');
const input = document.getElementById('affiliatedOrgsListListInput');

function toggleAffiliatedOrgsInputs() {
    input.disabled = checkbox.checked;
}

// Initial setup
toggleAffiliatedOrgsInputs();
checkbox.addEventListener('change', toggleAffiliatedOrgsInputs);

/*----------------------FORM 1 SUBMISSION---------------------*/
document.addEventListener("DOMContentLoaded", function () {
    const form1 = document.getElementById('joingreenfmForm1');

    // Handle form submission
    form1.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Gather form data
        const formData = new FormData(form1);
        const data = Object.fromEntries(formData.entries());

        // Manually handle checkbox for affiliatedOrgsList.notApplicable
        data.affiliatedOrgsList = {
            listInput: formData.get('affiliatedOrgsList.listInput') || '',
            notApplicable: form1.querySelector('#affiliatedOrgsListNotApplicable').checked,
        };

        // Perform validation
        if (validateForm(data)) {
            try {
                const response = await fetch('/JoinGFM-Step1', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (response.ok) {
                    window.location.href = '/JoinGFM-Step2';
                } else {
                    const errorMessage = await response.text();
                    alert(`Error: ${errorMessage}`);
                }
            } catch (error) {
                console.error('Error submitting form:', error);
                alert('There was an error submitting the form. Please try again later.');
            }
        } else {
            alert('Please fill in all required fields.');
        }
    });

    // Validation function
    function validateForm(data) {
        return (
            data.lastName &&
            data.firstName &&
            data.studentNumber &&
            data.dlsudEmail &&
            data.college &&
            data.program &&
            data.collegeYear &&
            data.section &&
            data.facebookUrl &&
            (data.affiliatedOrgsList.listInput || data.affiliatedOrgsList.notApplicable) &&
            data.preferredDepartment &&
            data.staffApplicationReasons &&
            data.departmentApplicationReasons &&
            data.greenFmContribution
        );
    }
});
