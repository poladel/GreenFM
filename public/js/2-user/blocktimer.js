document.addEventListener("DOMContentLoaded", function () {
	/*----------------------TYPE OF SHOW---------------------*/
	document.getElementById("blocktimerForm").addEventListener("submit", function (event) {
			const checkboxes = document.querySelectorAll('input[name="show"]');
			const otherCheckbox = document.getElementById("other");
			const otherInput = document.getElementById("other-input");

			const isChecked = Array.from(checkboxes).some(
				(checkbox) => checkbox.checked
			);

			// Check if "Other" is checked and input is empty
			if (otherCheckbox.checked && !otherInput.value.trim()) {
				event.preventDefault();
				alert('Please specify what you mean by "Other".');
				return;
			}

			if (!isChecked) {
				event.preventDefault();
				alert("Please select at least one type of show.");
			}
		});

	/*----------------------ADDING HOST---------------------*/
	document.getElementById("add-host").addEventListener("click", function () {
        const hostsContainer = document.getElementById("hosts-container");
        const currentHosts = hostsContainer.getElementsByClassName("host-input").length;
    
        if (currentHosts < 4) {
            const newHostDiv = document.createElement("div");
            newHostDiv.className = "name-section host-input";
    
            newHostDiv.innerHTML = `
                <input type="text" name="host-last-name" placeholder="Last Name" required>
                <input type="text" name="host-first-name" placeholder="First Name" required>
                <input type="text" name="host-mi" placeholder="M.I">
                <br>
                <input type="text" name="host-cys" placeholder="CYS" required>
                <button type="button" class="remove-host">Remove</button>
            `;
    
            hostsContainer.appendChild(newHostDiv);
    
            // Add event listener for the remove button
            newHostDiv.querySelector(".remove-host").addEventListener("click", function () {
                hostsContainer.removeChild(newHostDiv);
            });
        } else {
            alert("Maximum of 4 Hosts allowed.");
        }
    });
    

	/*----------------------ADDING TECHNICAL STAFF---------------------*/
	document.getElementById("add-technical").addEventListener("click", function () {
        const technicalContainer = document.getElementById("technical-container");
        const currentTechnical = technicalContainer.getElementsByClassName("technical-input").length;
    
        if (currentTechnical < 2) {
            const newTechnicalDiv = document.createElement("div");
            newTechnicalDiv.className = "name-section technical-input";
    
            newTechnicalDiv.innerHTML = `
                <input type="text" name="technical-last-name" placeholder="Last Name" required>
                <input type="text" name="technical-first-name" placeholder="First Name" required>
                <input type="text" name="technical-mi" placeholder="M.I">
                <br>
                <input type="text" name="technical-cys" placeholder="CYS" required>
                <button type="button" class="remove-technical">Remove</button>
            `;
    
            technicalContainer.appendChild(newTechnicalDiv);
    
            // Add event listener for the remove button
            newTechnicalDiv.querySelector(".remove-technical").addEventListener("click", function () {
                technicalContainer.removeChild(newTechnicalDiv);
            });
        } else {
            alert("Maximum of 2 Technical Staffs allowed.");
        }
    });
    

	/*----------------------ALLOW CROSSPOSTING---------------------*/
	const crosspostingRadios = document.querySelectorAll('input[name="crossposting"]');
	const fbLinkContainer = document.getElementById("fb-link-container");

	crosspostingRadios.forEach((radio) => {
		radio.addEventListener("change", function () {
			if (this.value === "Yes") {
				fbLinkContainer.style.display = "block"; // Show input
			} else {
				fbLinkContainer.style.display = "none"; // Hide input
			}
		});
	});

	/*----------------------DLSUD EMAIL---------------------*/
    const emailInput = document.querySelector('input[name="dlsud-email"]');
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

	/*----------------------SIGNATURE UPLOAD---------------------*/
	document.getElementById("signature-upload").addEventListener("change", function (event) {
			const file = event.target.files[0];
			const previewContainer =
				document.getElementById("signature-preview");
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
			}
		});
});

/*document.getElementById('postButton').addEventListener('click', async () => {
    const response = await fetch('/check-auth'); // Your endpoint to check authentication
    const data = await response.json();

    if (data.isAuthenticated) {
        // If authenticated, redirect to the next page
        window.location.href = '/JoinBlocktimer-Step2';
    } else {
        // If not authenticated, display the modal popup
        document.getElementById('loginPopup').style.display = 'block';
    }
});

// Close the modal when the close button is clicked
document.querySelector('.close-button').addEventListener('click', () => {
    document.getElementById('loginPopup').style.display = 'none';
});

// Optional: Close the modal when clicking outside of the modal content
window.addEventListener('click', (event) => {
    const modal = document.getElementById('loginPopup');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});*/

document.getElementById('postButton').addEventListener('click', async () => {
    const response = await fetch('/check-auth'); // Endpoint to check authentication
    const data = await response.json();

    if (data.isAuthenticated) {
        // If authenticated, user can post
        // Add your logic for posting here
    } else {
        // If not authenticated, capture the current URL for redirection
        const redirectUrl = window.location.pathname; // Capture the current URL
        const loginPopup = document.getElementById('loginPopup');
        loginPopup.querySelector('input[name="redirect"]').value = redirectUrl; // Set hidden input value
        loginPopup.style.display = 'block'; // Show the modal
    }
});

// Close the modal when the close button is clicked
document.querySelector('.close-button').addEventListener('click', () => {
    document.getElementById('loginPopup').style.display = 'none';
});

// Optional: Close the modal when clicking outside of the modal content
window.addEventListener('click', (event) => {
    const modal = document.getElementById('loginPopup');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

