document.addEventListener("DOMContentLoaded", function () {
    /*----------------------TYPE OF SHOW---------------------*/
    document.getElementById("blocktimerForm1").addEventListener("submit", function (event) {
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
            fbLinkContainer.style.display = this.value === "Yes" ? "block" : "none";
        });
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
        }
    });
});
