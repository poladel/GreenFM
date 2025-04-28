	/*----------------------STUDENT NUMBER---------------------*/
	const studentNumberInput = document.getElementById("studentNumber");

	// Allow only numeric input and enforce maxlength
	studentNumberInput.addEventListener("input", function (e) {
		// Remove any non-numeric characters
		this.value = this.value.replace(/\D/g, "").slice(0, 9);
	});

	// Optional: Prevent pasting non-numeric values
	studentNumberInput.addEventListener("paste", function (e) {
		e.preventDefault(); // Prevent pasting
	});

    /*----------------------DLSUD EMAIL---------------------*/
    const emailInput = document.getElementById("dlsudEmail");
    const domain = "@dlsud.edu.ph";
    
    // Flag to indicate if we should append the domain
    let shouldAppendDomain = true;

    // Function to append the domain if it doesn't already exist
    function appendDomain() {
        // Only append the domain if the user starts typing and the input doesn't already end with the domain
        if (emailInput.value.length > 0 && !emailInput.value.endsWith(domain)) {
            emailInput.value = emailInput.value.replace(domain, "") + domain;
            // Set the cursor position just before the domain
            emailInput.setSelectionRange(emailInput.value.length - domain.length, emailInput.value.length - domain.length);
        }
    }

    // Event listener for input event
    emailInput.addEventListener("input", function (event) {
        // Allow backspace and delete to work normally
        if (
            event.inputType === "deleteContentBackward" ||
            event.inputType === "deleteContentForward"
        ) {
            // Don't apply appending while deleting
            shouldAppendDomain = false;
            return;
        }

        // Append the domain only if we're not deleting
        if (shouldAppendDomain) {
            appendDomain();
        }
    });

    // Reset the flag on keydown to allow appending again
    emailInput.addEventListener("keydown", function () {
        shouldAppendDomain = true; // Allow appending on keydown
    });

    // Ensure the domain is appended when the input loses focus
    emailInput.addEventListener("blur", function () {
        appendDomain();
    });

    /*----------------------NOT APPLICABLE---------------------*/
// Function to toggle other input field based on checkbox state
const checkbox = document.getElementById('affiliatedOrgsListNotApplicable');
const input = document.getElementById('affiliatedOrgsListListInput');

function toggleAffiliatedOrgsInputs() {
    const isChecked = checkbox.checked;
    input.disabled = (isChecked);
}

// Initial setup: enable other input if checkbox is checked
toggleAffiliatedOrgsInputs();

// Event listener to toggle inputs when checkbox state changes
checkbox.addEventListener('change', toggleAffiliatedOrgsInputs);


    /*----------------------FORM 1 SUBMISSION---------------------*/
    document.addEventListener("DOMContentLoaded", function () {
        const form1 = document.getElementById('joingreenfmForm1');
    
        // Handle form submission
        form1.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the default form submission
    
            // Gather form data
            const formData = new FormData(form1);
            const data = Object.fromEntries(formData.entries());

            // Manually handle checkbox for affiliatedOrgsList.notApplicable
            data.affiliatedOrgsList = {
                listInput: formData.get('affiliatedOrgsList.listInput') || '', // Set listInput to an empty string if unchecked
                notApplicable: form1.querySelector('#affiliatedOrgsListNotApplicable').checked, // true if checked, false otherwise
            };
    
            // Perform validation if necessary
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
                        // Redirect to Step 2 upon successful submission
                        window.location.href = '/JoinGFM-Step2';
                    } else {
                        // Handle errors (e.g., show error message)
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
            // Simple validation to check if required fields are filled
            return data.lastName && data.firstName && data.studentNumber && data.dlsudEmail && data.college && data.program && data.collegeYear && data.section && data.facebookUrl && (data.affiliatedOrgsList.listInput || data.affiliatedOrgsList.notApplicable) && data.preferredDepartment && data.staffApplicationReasons && data.departmentApplicationReasons && data.greenFmContribution;
        }
});
