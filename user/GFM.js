document.addEventListener("DOMContentLoaded", function () {
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
  
    document.getElementById("add-host").addEventListener("click", function () {
      const hostsContainer = document.getElementById("hosts-container");
      const currentHosts =
        hostsContainer.getElementsByClassName("host-input").length;
  
      // Check if the maximum number of hosts (4) has been reached
      if (currentHosts < 4) {
        // Create a new host input div
        const newHostDiv = document.createElement("div");
        newHostDiv.className = "name-section host-input"; // Added class for styling
  
        // Create the input fields for the new host
        newHostDiv.innerHTML = `
                  <input type="text" name="host-last-name" placeholder="Last Name" required>
                  <input type="text" name="host-first-name" placeholder="First Name" required>
                  <input type="text" name="host-mi" placeholder="M.I">
                  <br>
                  <input type="text" name="host-cys" placeholder="CYS" required>
              `;
  
        // Append the new host input div to the hosts container
        hostsContainer.appendChild(newHostDiv);
      } else {
        alert("Maximum of 4 Hosts allowed."); // Alert the user
      }
    });
  
    document.getElementById("add-technical").addEventListener("click", function () {
        const technicalContainer = document.getElementById("technical-container");
        const currentTechnical =
          technicalContainer.getElementsByClassName("technical-input").length;
  
        // Check if the maximum number of hosts (4) has been reached
        if (currentTechnical < 2) {
          // Create a new host input div
          const newTechnicalDiv = document.createElement("div");
          newTechnicalDiv.className = "name-section technical-input"; // Added class for styling
  
          // Create the input fields for the new host
          newTechnicalDiv.innerHTML = `
                  <input type="text" name="technical-last-name" placeholder="Last Name" required>
                  <input type="text" name="technical-first-name" placeholder="First Name" required>
                  <input type="text" name="technical-mi" placeholder="M.I">
                  <br>
                  <input type="text" name="technical-cys" placeholder="CYS" required>
              `;
  
          // Append the new host input div to the hosts container
          technicalContainer.appendChild(newTechnicalDiv);
        } else {
          alert("Maximum of 2 Technical Staffs allowed."); // Alert the user
        }
      });
  
    const crosspostingRadios = document.querySelectorAll(
      'input[name="crossposting"]'
    );
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