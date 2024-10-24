document.addEventListener("DOMContentLoaded", function () {
	/*----------------------STUDENT NUMBER---------------------*/
	const studentNumberInput = document.querySelector('input[name="student-number"]');

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
});
