/*-----SCHEDULE TAB-----*/
const modal = document.getElementById("scheduleModal");

// Function to refresh schedule buttons AND update the global schedule list
async function refreshSchedule(selectedYear) {
    console.log("Refreshing schedule for year:", selectedYear); // Debugging log
    try {
        const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const schedules = await response.json();
        console.log(`Schedules for ${selectedYear}:`, schedules); // Debugging log

        // --- Update the global variable ---
        existingSchedules = schedules; // <<< ADD THIS LINE
        // ---

        // Clear existing schedule buttons
        document.querySelectorAll(".availablebtn").forEach((button) => {
            button.textContent = ""; // Clear text
            button.classList.remove("schedulebtn"); // Remove booked class
            button.disabled = false; // Re-enable button
            delete button.dataset.scheduleId; // Remove schedule ID
            delete button.dataset.scheduleSubmissionId; // Remove linked submission ID
        });

        // Populate buttons with updated schedule data
        schedules.forEach((schedule) => { // Use the locally fetched 'schedules' here
            const button = document.querySelector(
                `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
            );
            if (button) {
                console.log("Updating button for schedule:", schedule);
                button.textContent = schedule.showDetails?.title || "Booked"; // Use title or default
                button.classList.add("schedulebtn"); // Add booked class
                button.dataset.scheduleId = schedule._id; // Add schedule ID
                if (schedule.submissionId) {
                    button.dataset.scheduleSubmissionId = schedule.submissionId; // Store linked submission ID
                }
                // Optionally disable booked buttons if needed: button.disabled = true;
            }
        });
    } catch (error) {
        console.error("Error updating schedule buttons:", error);
        existingSchedules = []; // Clear global list on error too
    }
}

// Add this function to format and display the configuration
function displayCurrentSchoolYearConfig(config) {
    const displayElement = document.getElementById('currentSchoolYearConfigDisplay');
    if (!displayElement) return; // Exit if element not found

    if (!config) {
        displayElement.textContent = 'No current school year configuration set.';
        return;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Validate month numbers
    if (config.startMonth < 1 || config.startMonth > 12 || config.endMonth < 1 || config.endMonth > 12) {
        console.error("Invalid month number in config:", config);
        displayElement.textContent = 'Invalid configuration data.';
        return;
    }

    const startMonthName = monthNames[config.startMonth - 1];
    const endMonthName = monthNames[config.endMonth - 1];

    const schoolYearText = `${config.startYear}-${config.endYear}`;
    const dateRangeText = `${startMonthName} ${config.startYear} - ${endMonthName} ${config.endYear}`;

    displayElement.textContent = `Current School Year ${schoolYearText}: ${dateRangeText}`;
}

// Define all possible time slots (match your schedule table)
const ALL_TIME_SLOTS = [
    "9:10-9:55",
    "10:00-10:55",
    "11:00-11:55",
    "12:01-12:55", // Note: Friday only in your example, handle accordingly if needed
    "1:00-1:55",
    "2:00-2:55",
    "3:00-3:55",
    "4:00-4:50"
];

// Store occupied slots globally or within the scope of submission selection
let occupiedSlotsByDay = {};
let currentSubmissionSchoolYear = null; // Store the school year of the selected submission
let existingSchedules = []; // <<< Declare existingSchedules in a broader scope
let originalSubmissionPreferredTime = null; // Store the original preferred time of the selected submission

// Main setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => { // Made async
    const schoolYearConfigForm = document.getElementById("schoolYearConfigForm");
    const schoolYearDropdown = document.getElementById("schoolYear");
    const modalSchoolYearDropdown = document.getElementById("modalSchoolYear");
    const submissionSchoolYearDropdown = document.getElementById("submissionSchoolYear");
    const scheduleButtons = document.querySelectorAll(".availablebtn");
    const closeModal = document.querySelector(".close");
    const saveButton = document.getElementById("saveButton"); // Ensure saveButton is defined
    const deleteButton = document.getElementById("deleteButton"); // Ensure deleteButton is defined
    const scheduleForm = document.getElementById("scheduleForm"); // Ensure scheduleForm is defined

    // --- School Year Configuration Form Submission ---
    if (schoolYearConfigForm) {
        schoolYearConfigForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const startMonth = document.getElementById("startMonth").value;
            const startYear = document.getElementById("startYear").value;
            const endMonth = document.getElementById("endMonth").value;
            const endYear = document.getElementById("endYear").value;

            if (
                !confirm(
                    `Are you sure you want to save the school year configuration?\nStart: ${startMonth}/${startYear}\nEnd: ${endMonth}/${endYear}`
                )
            ) {
                alert("Submission canceled.");
                return;
            }

            try {
                const response = await fetch("/schoolYear/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        startMonth,
                        startYear,
                        endMonth,
                        endYear,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    alert(
                        errorData.error ||
                            "Failed to save school year configuration"
                    );
                    return;
                }

                const result = await response.json();
                alert(result.message);
                await populateDropdowns(); // Repopulate dropdowns and refresh display after saving
            } catch (error) {
                console.error("Error saving school year configuration:", error);
                alert("Failed to save school year configuration");
            }
        });
    }

    // --- Initial Population and Setup ---
    await populateDropdowns(); // This now handles fetching configs and displaying the current one

    // --- Fetch initial schedules AFTER populating dropdowns and setting the year ---
    const initialYear = schoolYearDropdown ? schoolYearDropdown.value : null;
    if (initialYear) {
        try {
            const response = await fetch(`/schedule?schoolYear=${initialYear}`);
            if (!response.ok) throw new Error("Failed to fetch initial schedules");
            existingSchedules = await response.json(); // Populate global existingSchedules
            console.log(`Fetched initial schedules for ${initialYear}:`, existingSchedules);
            await refreshSchedule(initialYear); // Refresh the visual schedule grid
        } catch (error) {
            console.error("Error fetching initial schedules:", error);
            existingSchedules = []; // Reset on error
        }
    } else {
        console.warn("No initial school year selected, cannot fetch initial schedules.");
    }
    // --- End Fetch initial schedules ---


    if (submissionSchoolYearDropdown && submissionSchoolYearDropdown.value) {
        await loadSubmissions(); // Now load submissions, existingSchedules should be populated
    } else {
        console.warn(
            "No school year selected in submissionSchoolYearDropdown initially."
        );
        // Optionally load submissions for the default/latest year if needed
    }

    // --- Helper Functions within DOMContentLoaded ---
    async function fetchSchoolYears() {
        try {
            // Use the correct endpoint that exists
            const response = await fetch("/schoolYear/all");
            if (!response.ok) throw new Error("Failed to fetch school years");

            const schoolYears = await response.json();
            console.log("Fetched school years:", schoolYears); // Debugging log
            return schoolYears;
        } catch (error) {
            console.error("Error fetching school years:", error);
            return [];
        }
    }

    function getCurrentSchoolYear(schoolYears) {
        if (!Array.isArray(schoolYears)) return null; // Add check for array type
        const currentDate = new Date();
        return schoolYears.find((year) => {
            // Add validation for year properties
            if (!year || typeof year.startYear !== 'number' || typeof year.startMonth !== 'number' || typeof year.endYear !== 'number' || typeof year.endMonth !== 'number') {
                console.warn("Skipping invalid school year object:", year);
                return false;
            }
            const startDate = new Date(year.startYear, year.startMonth - 1);
            // Set end date to the *end* of the end month
            const endDate = new Date(year.endYear, year.endMonth, 0); // Day 0 gets the last day of the previous month
            return currentDate >= startDate && currentDate <= endDate;
        });
    }

    async function populateDropdowns() {
        const schoolYears = await fetchSchoolYears(); // Fetch all configs

        // --- Display Current Config ---
        const currentSchoolYearConfig = getCurrentSchoolYear(schoolYears);
        displayCurrentSchoolYearConfig(currentSchoolYearConfig); // Display the found current config
        // ---

        populateDropdown(schoolYearDropdown, schoolYears);
        populateDropdown(modalSchoolYearDropdown, schoolYears);
        populateDropdown(submissionSchoolYearDropdown, schoolYears);

        // Set dropdowns to current year if found
        if (currentSchoolYearConfig) {
            const currentYearValue = `${currentSchoolYearConfig.startYear}-${currentSchoolYearConfig.endYear}`;
            // Check if dropdowns exist before setting value
            if (schoolYearDropdown) schoolYearDropdown.value = currentYearValue;
            if (modalSchoolYearDropdown) modalSchoolYearDropdown.value = currentYearValue;
            if (submissionSchoolYearDropdown) submissionSchoolYearDropdown.value = currentYearValue;
        } else {
            console.warn("No matching school year found for the current date.");
            // Optionally set to the latest year if no current one is found
            if (schoolYears.length > 0 && schoolYearDropdown && modalSchoolYearDropdown && submissionSchoolYearDropdown) {
                const latestYear = schoolYears.sort((a, b) => b.startYear - a.startYear || b.startMonth - a.startMonth)[0];
                const latestYearValue = `${latestYear.startYear}-${latestYear.endYear}`;
                schoolYearDropdown.value = latestYearValue;
                modalSchoolYearDropdown.value = latestYearValue;
                submissionSchoolYearDropdown.value = latestYearValue;
            }
        }

        // // Removed schedule refresh from here, moved to after initial schedule fetch
        // if (schoolYearDropdown && schoolYearDropdown.value) {
        //     await refreshSchedule(schoolYearDropdown.value);
        // } else {
        //     console.warn("Cannot refresh schedule, no year selected in main dropdown.");
        // }
    }

    function populateDropdown(dropdown, schoolYears) {
        if (!dropdown) return; // Exit if dropdown doesn't exist
        dropdown.innerHTML = ""; // Clear existing options
        if (!Array.isArray(schoolYears) || schoolYears.length === 0) {
            dropdown.innerHTML = "<option value=''>No Configs</option>";
            dropdown.disabled = true;
            return;
        }
        dropdown.disabled = false;
        schoolYears.forEach((year) => {
            // Add validation for year properties before creating option
            if (!year || typeof year.startYear !== 'number' || typeof year.endYear !== 'number') {
                 console.warn("Skipping invalid year object for dropdown:", year);
                 return;
            }
            const option = document.createElement("option");
            option.value = `${year.startYear}-${year.endYear}`;
            option.textContent = `${year.startYear}-${year.endYear}`;
            dropdown.appendChild(option);
        });
    }

    // --- Event Listeners ---

    // Main Schedule Year Dropdown Change
    if (schoolYearDropdown) {
        schoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = schoolYearDropdown.value;
            console.log(
                "Selected schoolYearDropdown value (on change):",
                selectedYear
            );

            // Update the modalSchoolYearDropdown to match the selected year
            if (modalSchoolYearDropdown) modalSchoolYearDropdown.value = selectedYear;

            // --- Refetch schedules for the new year and update global variable ---
            try {
                const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
                if (!response.ok) throw new Error("Failed to fetch schedules on year change");
                existingSchedules = await response.json(); // Update global existingSchedules
                console.log(`Fetched schedules for ${selectedYear} (main dropdown change):`, existingSchedules);
                await refreshSchedule(selectedYear); // Refresh the visual schedule grid
            } catch (error) {
                console.error("Error fetching schedules on year change:", error);
                existingSchedules = []; // Reset on error
                await refreshSchedule(selectedYear); // Still try to refresh grid (might clear it)
            }
            // --- End Refetch ---
        });
    }

    // Submission Year Dropdown Change
    if (submissionSchoolYearDropdown) {
        submissionSchoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = submissionSchoolYearDropdown.value;
            console.log("Refreshing schedules and submissions for year:", selectedYear); // Debugging log

            try {
                // Refetch schedules for the newly selected year to update availability
                const response = await fetch(
                    `/schedule?schoolYear=${selectedYear}`
                );
                if (!response.ok) throw new Error("Failed to fetch schedules");

                existingSchedules = await response.json(); // Update global existingSchedules
                console.log(
                    `Fetched schedules for ${selectedYear} (submission dropdown change):`,
                    existingSchedules
                );

                // Reload submissions for the selected year
                await loadSubmissions();
                clearFields(); // Clear detail form when year changes
            } catch (error) {
                console.error(
                    "Error fetching schedules for the selected year:",
                    error
                );
                existingSchedules = []; // Clear schedules on error
                await loadSubmissions(); // Still try to load submissions
                clearFields();
            }
        });
    }

    // Schedule Button Click (Open Modal)
    scheduleButtons.forEach((button) => {
        button.addEventListener("click", async () => {
            if (!modal) return; // Don't proceed if modal doesn't exist
            console.log("Button clicked:", button.dataset); // Debugging log

            const day = button.dataset.day;
            const time = button.dataset.time;
            const scheduleId = button.dataset.scheduleId;
            const currentSelectedYear = schoolYearDropdown ? schoolYearDropdown.value : null; // Get current year from main dropdown

            // Reset form and set defaults for new schedule
            if (scheduleForm) {
                scheduleForm.reset(); // Reset standard form elements
                scheduleForm.dataset.scheduleId = ""; // Clear schedule ID
                scheduleForm.dataset.day = day;
                scheduleForm.dataset.time = time;
            }
            if (modalSchoolYearDropdown && currentSelectedYear) {
                modalSchoolYearDropdown.value = currentSelectedYear;
            }
            if (saveButton) saveButton.textContent = "Save";
            if (deleteButton) deleteButton.style.display = "none";

            // Reset dynamic fields (checkboxes, hosts, tech)
            document.querySelectorAll("input[name='showDetails.type[]']").forEach(cb => cb.checked = false);
            const otherCheckbox = document.getElementById("other");
            const otherInput = document.getElementById("other-input");
            if(otherCheckbox) otherCheckbox.checked = false;
            if(otherInput) {
                otherInput.value = "";
                otherInput.disabled = true;
            }
            resetDynamicInputs("hosts-container", "host-input", addHost);
            resetDynamicInputs("technical-container", "technical-input", addTechnical);
            hostIndex = 1; // Reset index counter
            technicalIndex = 1; // Reset index counter
            toggleAddHostButton();
            toggleAddTechnicalButton();


            // If it's a booked slot, fetch and populate data
            if (scheduleId) {
                try {
                    const response = await fetch(`/schedule/${scheduleId}`);
                    if (!response.ok)
                        throw new Error("Failed to fetch schedule details");

                    const schedule = await response.json();
                    console.log("Fetched schedule:", schedule); // Debugging log

                    // Set modal dropdown to the year from the database
                    if (modalSchoolYearDropdown) {
                        modalSchoolYearDropdown.value = schedule.schoolYear || currentSelectedYear || '';
                    }

                    if (scheduleForm) {
                        scheduleForm.dataset.scheduleId = schedule._id; // Set the schedule ID
                        // Day and time are already set from button click
                    }

                    // Populate modal fields (ensure elements exist)
                    const showTitleEl = document.getElementById("showTitle");
                    if (showTitleEl) showTitleEl.value = schedule.showDetails?.title || "";
                    const showDescEl = document.getElementById("show-description");
                    if (showDescEl) showDescEl.value = schedule.showDetails?.description || "";
                    const showObjEl = document.getElementById("showObjectives");
                    if (showObjEl) showObjEl.value = schedule.showDetails?.objectives || "";

                    // Populate show type checkboxes
                    const showTypeCheckboxes = document.querySelectorAll("input[name='showDetails.type[]']");
                    if (schedule.showDetails?.type && Array.isArray(schedule.showDetails.type)) {
                        showTypeCheckboxes.forEach((checkbox) => {
                            checkbox.checked = schedule.showDetails.type.includes(
                                checkbox.value
                            );
                        });
                    } // No else needed, already reset

                    // Handle "Other" checkbox and input
                    if (otherCheckbox && otherInput && schedule.showDetails?.type && Array.isArray(schedule.showDetails.type)) {
                        const otherValue = schedule.showDetails.type.find(
                            (type) => !Array.from(showTypeCheckboxes).some(cb => cb.value === type && cb !== otherCheckbox)
                        );

                        if (otherValue) {
                            otherCheckbox.checked = true;
                            otherInput.value = otherValue;
                            otherInput.disabled = false;
                        } // No else needed, already reset
                    }

                    // Populate executive producer fields
                    populateNameFields("execProducer", schedule.executiveProducer);

                    // Populate creative staff fields
                    populateNameFields("creativeStaff", schedule.creativeStaff);

                    // Populate hosts
                    populateDynamicNameFields("hosts-container", "host-input", schedule.hosts, addHost, updateHostIndices, toggleAddHostButton);

                    // Populate technical staff
                    populateDynamicNameFields("technical-container", "technical-input", schedule.technicalStaff, addTechnical, updateTechnicalIndices, toggleAddTechnicalButton);

                    if (saveButton) saveButton.textContent = "Edit";
                    if (deleteButton) deleteButton.style.display = "inline-block";

                } catch (error) {
                    console.error("Error fetching schedule details:", error);
                    alert("Failed to load schedule details.");
                    if (modal) modal.style.display = "none"; // Close modal on error
                    return; // Prevent showing modal with potentially bad data
                }
            }

            if (modal) modal.style.display = "block";
        });
    });

    // Modal Close Button
    if (closeModal) {
        closeModal.addEventListener("click", () => {
            if (modal) modal.style.display = "none";
        });
    }

    // Close modal if clicked outside of it
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            if (modal) modal.style.display = "none";
        }
    });

    // Schedule Form 'Other' Checkbox Logic
    const checkbox = document.getElementById("other");
    const input = document.getElementById("other-input");

    function toggleOtherInputs() {
        if (!checkbox || !input) return;
        const isChecked = checkbox.checked;
        input.disabled = !isChecked;
        if (!isChecked) input.value = ""; // Clear value when disabled
    }

    if (checkbox) {
        toggleOtherInputs(); // Initial check
        checkbox.addEventListener("change", toggleOtherInputs);
    }

    // --- Dynamic Input Field Logic (Hosts, Technical Staff) ---
    let hostIndex = 1; // Initialized assuming one default host input exists
    let technicalIndex = 1; // Initialized assuming one default tech input exists

    function addHost(isDefault = false) {
        addDynamicInput("hosts-container", "host-input", "hosts", hostIndex, 4, isDefault, "remove-host", updateHostIndices, toggleAddHostButton);
        if (!isDefault) hostIndex++;
    }

    function updateHostIndices() {
        hostIndex = updateDynamicIndices("hosts-container", "host-input", "hosts", "remove-host", updateHostIndices, toggleAddHostButton);
    }

    function toggleAddHostButton() {
        toggleAddButton("hosts-container", "host-input", "add-host", 4);
    }

    function addTechnical(isDefault = false) {
        addDynamicInput("technical-container", "technical-input", "technicalStaff", technicalIndex, 2, isDefault, "remove-technical", updateTechnicalIndices, toggleAddTechnicalButton);
        if (!isDefault) technicalIndex++;
    }

    function updateTechnicalIndices() {
        technicalIndex = updateDynamicIndices("technical-container", "technical-input", "technicalStaff", "remove-technical", updateTechnicalIndices, toggleAddTechnicalButton);
    }

    function toggleAddTechnicalButton() {
        toggleAddButton("technical-container", "technical-input", "add-technical", 2);
    }

    // Generic function to add dynamic name input sections
    function addDynamicInput(containerId, inputClass, namePrefix, indexCounter, maxLimit, isDefault, removeClass, updateFn, toggleFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const currentCount = container.getElementsByClassName(inputClass).length;

        if (currentCount < maxLimit) {
            const indexToAdd = isDefault ? 0 : indexCounter;
            const newDiv = document.createElement("div");
            newDiv.className = `name-section ${inputClass}`;

            newDiv.innerHTML = `
                <input type="text" name="${namePrefix}[${indexToAdd}].lastName" placeholder="Last Name" required>
                <input type="text" name="${namePrefix}[${indexToAdd}].firstName" placeholder="First Name" required>
                <input type="text" name="${namePrefix}[${indexToAdd}].mi" placeholder="M.I.">
                <input type="text" name="${namePrefix}[${indexToAdd}].suffix" placeholder="Suffix">
                <input type="text" name="${namePrefix}[${indexToAdd}].cys" placeholder="CYS">
                ${!isDefault ? `<button type="button" class="${removeClass}">Remove</button>` : ''}
            `;

            container.appendChild(newDiv);

            if (!isDefault) {
                newDiv.querySelector(`.${removeClass}`).addEventListener("click", function () {
                    container.removeChild(newDiv);
                    updateFn();
                    toggleFn();
                });
            }
        }
        toggleFn(); // Update button state after adding
    }

    // Generic function to update indices of dynamic inputs
    function updateDynamicIndices(containerId, inputClass, namePrefix, removeClass, updateFn, toggleFn) {
        const container = document.getElementById(containerId);
        if (!container) return 0;
        const inputs = container.getElementsByClassName(inputClass);

        for (let i = 0; i < inputs.length; i++) {
            const nameInputs = inputs[i].getElementsByTagName("input");
            if (nameInputs.length >= 5) { // Basic check
                nameInputs[0].name = `${namePrefix}[${i}].lastName`;
                nameInputs[1].name = `${namePrefix}[${i}].firstName`;
                nameInputs[2].name = `${namePrefix}[${i}].mi`;
                nameInputs[3].name = `${namePrefix}[${i}].suffix`;
                nameInputs[4].name = `${namePrefix}[${i}].cys`;
            }
            // Update remove button logic
            const removeBtn = inputs[i].querySelector(`.${removeClass}`);
            if (i === 0 && removeBtn) {
                removeBtn.remove(); // Remove button from the first element
            } else if (i > 0 && !removeBtn) {
                // Add remove button if missing on subsequent elements
                const button = document.createElement('button');
                button.type = 'button';
                button.className = removeClass;
                button.textContent = 'Remove';
                button.addEventListener('click', function() {
                    container.removeChild(inputs[i]);
                    updateFn();
                    toggleFn();
                });
                inputs[i].appendChild(button);
            }
        }
        return inputs.length; // Return the current count to reset the index counter
    }

    // Generic function to toggle the state of an "Add" button
    function toggleAddButton(containerId, inputClass, buttonId, maxLimit) {
        const container = document.getElementById(containerId);
        const addButton = document.getElementById(buttonId);
        if (!container || !addButton) return;
        const currentCount = container.getElementsByClassName(inputClass).length;
        addButton.disabled = currentCount >= maxLimit;
    }

    // Helper to reset dynamic inputs (like hosts, tech staff)
    function resetDynamicInputs(containerId, inputClass, addFn) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = ''; // Clear all existing inputs
            addFn(true); // Add back the default first input section
        }
    }

    // Helper to populate standard name fields (Exec Producer, Creative Staff)
    function populateNameFields(prefix, data) {
        const lastNameEl = document.getElementById(`${prefix}LastName`);
        if (lastNameEl) lastNameEl.value = data?.lastName || "";
        const firstNameEl = document.getElementById(`${prefix}FirstName`);
        if (firstNameEl) firstNameEl.value = data?.firstName || "";
        const miEl = document.getElementById(`${prefix}MI`);
        if (miEl) miEl.value = data?.mi || "";
        const suffixEl = document.getElementById(`${prefix}Suffix`);
        if (suffixEl) suffixEl.value = data?.suffix || "";
        const cysEl = document.getElementById(`${prefix}CYS`);
        if (cysEl) cysEl.value = data?.cys || "";
    }

    // Helper to populate dynamic name fields (Hosts, Tech Staff)
    function populateDynamicNameFields(containerId, inputClass, dataArray, addFn, updateFn, toggleFn) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = ""; // Clear existing
        if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
            dataArray.forEach((item, index) => {
                const isDefault = index === 0;
                addFn(isDefault); // Add the input structure
                // Now populate the newly added structure
                const currentInputs = container.getElementsByClassName(inputClass);
                const targetDiv = currentInputs[currentInputs.length - 1]; // Get the last added div
                if (targetDiv) {
                    const lastNameInput = targetDiv.querySelector(`input[name$='.lastName']`);
                    if (lastNameInput) lastNameInput.value = item.lastName || '';
                    const firstNameInput = targetDiv.querySelector(`input[name$='.firstName']`);
                    if (firstNameInput) firstNameInput.value = item.firstName || '';
                    const miInput = targetDiv.querySelector(`input[name$='.mi']`);
                    if (miInput) miInput.value = item.mi || '';
                    const suffixInput = targetDiv.querySelector(`input[name$='.suffix']`);
                    if (suffixInput) suffixInput.value = item.suffix || '';
                    const cysInput = targetDiv.querySelector(`input[name$='.cys']`);
                    if (cysInput) cysInput.value = item.cys || '';
                }
            });
        } else {
            addFn(true); // Ensure at least one default input exists if data is empty/null
        }
        updateFn(); // Renumber indices after populating
        toggleFn(); // Update add button state
    }


    // Add event listeners for "Add" buttons
    const addHostBtn = document.getElementById("add-host");
    if (addHostBtn) addHostBtn.addEventListener("click", () => addHost(false)); // Pass false for non-default
    const addTechBtn = document.getElementById("add-technical");
    if (addTechBtn) addTechBtn.addEventListener("click", () => addTechnical(false)); // Pass false for non-default

    // Initial state check for add buttons
    toggleAddHostButton();
    toggleAddTechnicalButton();

    // Schedule Modal Save Button Logic
    if (saveButton) {
        saveButton.addEventListener("click", async (e) => {
            e.preventDefault(); // Prevent default form submission

            if (!scheduleForm) return;

            // Check if the form is valid (HTML5 validation)
            if (!scheduleForm.checkValidity()) {
                scheduleForm.reportValidity();
                return;
            }

            // Validate show type selection (at least one checkbox or 'Other' filled)
            const selectedTypesCheckboxes = document.querySelectorAll("input[name='showDetails.type[]']:checked");
            const otherCheckbox = document.getElementById("other");
            const otherInput = document.getElementById("other-input");
            let finalSelectedTypes = Array.from(selectedTypesCheckboxes).map(cb => cb.value);

            if (selectedTypesCheckboxes.length === 0 && (!otherCheckbox || !otherCheckbox.checked)) {
                 alert("Please choose at least one type of show.");
                 return;
            }

            if (otherCheckbox && otherCheckbox.checked) {
                if (!otherInput || otherInput.value.trim() === "") {
                    alert("Please specify the 'Other' type of show.");
                    otherInput?.focus(); // Focus the input if possible
                    return;
                }
                const otherValue = otherInput.value.trim();
                // Add other value, removing the placeholder 'Other' value if present
                finalSelectedTypes = finalSelectedTypes.filter(type => type !== otherCheckbox.value);
                if (!finalSelectedTypes.includes(otherValue)) { // Avoid duplicates
                    finalSelectedTypes.push(otherValue);
                }
            } else {
                 // If 'Other' checkbox exists but is not checked, ensure its placeholder value is removed
                 if (otherCheckbox) {
                    finalSelectedTypes = finalSelectedTypes.filter(type => type !== otherCheckbox.value);
                 }
            }


            // Collect form data manually into a structured object
            const data = {};

            // Basic schedule info from form dataset and modal dropdown
            data.day = scheduleForm.dataset.day;
            data.time = scheduleForm.dataset.time;
            const modalYearEl = document.getElementById("modalSchoolYear");
            data.schoolYear = modalYearEl ? modalYearEl.value : null;

            if (!data.day || !data.time || !data.schoolYear) {
                alert("Missing essential schedule information (Day, Time, or School Year).");
                return;
            }

            // Show Details
            data.showDetails = {
                title: document.getElementById("showTitle")?.value || "",
                type: finalSelectedTypes, // Use the validated/processed types
                description: document.getElementById("show-description")?.value || "",
                objectives: document.getElementById("showObjectives")?.value || "",
            };

            // Executive Producer
            data.executiveProducer = {
                lastName: document.getElementById("execProducerLastName")?.value || "",
                firstName: document.getElementById("execProducerFirstName")?.value || "",
                mi: document.getElementById("execProducerMI")?.value || "",
                suffix: document.getElementById("execProducerSuffix")?.value || "",
                cys: document.getElementById("execProducerCYS")?.value || "",
            };

            // Hosts
            data.hosts = Array.from(document.querySelectorAll("#hosts-container .host-input")).map(
                (host) => ({
                    lastName: host.querySelector("input[name$='.lastName']")?.value || "",
                    firstName: host.querySelector("input[name$='.firstName']")?.value || "",
                    mi: host.querySelector("input[name$='.mi']")?.value || "",
                    suffix: host.querySelector("input[name$='.suffix']")?.value || "",
                    cys: host.querySelector("input[name$='.cys']")?.value || "",
                })
            ).filter(h => h.lastName || h.firstName); // Filter out empty host entries

             // Technical Staff
            data.technicalStaff = Array.from(
                document.querySelectorAll("#technical-container .technical-input")
            ).map((tech) => ({
                lastName: tech.querySelector("input[name$='.lastName']")?.value || "",
                firstName: tech.querySelector("input[name$='.firstName']")?.value || "",
                mi: tech.querySelector("input[name$='.mi']")?.value || "",
                suffix: tech.querySelector("input[name$='.suffix']")?.value || "",
                cys: tech.querySelector("input[name$='.cys']")?.value || "",
            })).filter(t => t.lastName || t.firstName); // Filter out empty tech entries

            // Creative Staff
            data.creativeStaff = {
                lastName: document.getElementById("creativeStaffLastName")?.value || "",
                firstName: document.getElementById("creativeStaffFirstName")?.value || "",
                mi: document.getElementById("creativeStaffMI")?.value || "",
                suffix: document.getElementById("creativeStaffSuffix")?.value || "",
                cys: document.getElementById("creativeStaffCYS")?.value || "",
            };

            // Determine if this is a new schedule or an update
            const scheduleId = scheduleForm.dataset.scheduleId;
            const method = scheduleId ? "PATCH" : "POST";
            const url = scheduleId ? `/schedule/${scheduleId}` : "/schedule";

            console.log("Submitting schedule data:", { url, method, data }); // Log data being sent

            try {
                const response = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const responseData = await response.json(); // Try to parse JSON regardless of status

                if (response.ok) {
                    alert(
                        responseData.message || (scheduleId
                            ? "Schedule updated successfully!"
                            : "Schedule saved successfully!")
                    );
                    if (modal) modal.style.display = "none";

                    // Dynamically update the schedule buttons for the currently viewed year
                    const currentDisplayYear =
                        document.getElementById("schoolYear")?.value;
                    if (currentDisplayYear) await refreshSchedule(currentDisplayYear);

                } else {
                     console.error("Failed to save schedule:", responseData);
                     alert(responseData.error || responseData.message || "Failed to save schedule. Status: " + response.status);
                }
            } catch (error) {
                console.error("Error saving schedule:", error);
                alert("An error occurred while saving the schedule.");
            }
        });
    }

    // Schedule Modal Delete Button Logic
    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            if (!scheduleForm) return;
            const scheduleId = scheduleForm.dataset.scheduleId;

            console.log("Schedule ID to delete:", scheduleId); // Debugging log

            if (!scheduleId) {
                alert("No schedule selected to delete.");
                return;
            }

            const confirmDelete = confirm(
                "Are you sure you want to delete this schedule?"
            );
            if (!confirmDelete) return;

            try {
                const response = await fetch(`/schedule/${scheduleId}`, {
                    method: "DELETE",
                });

                console.log("Delete response status:", response.status); // Debugging log

                if (response.ok) {
                    const result = await response.json(); // Get success message
                    alert(result.message || "Schedule deleted successfully!");
                    if (modal) modal.style.display = "none";

                    // Refresh the schedule buttons to reflect the deletion
                    const currentDisplayYear = document.getElementById("schoolYear")?.value;
                    if (currentDisplayYear) {
                        console.log("Refreshing schedule for year:", currentDisplayYear); // Debugging log
                        await refreshSchedule(currentDisplayYear);
                    }
                } else {
                    // Handle non-OK responses
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = { error: "Failed to parse error response." };
                    }
                    console.error("Failed to delete schedule:", errorData);
                    alert(errorData.error || errorData.message || "Failed to delete schedule.");
                }
            } catch (error) {
                // Only handle actual network/parsing errors here
                console.error("Error deleting schedule:", error);
                alert("An error occurred while trying to delete the schedule.");
            }
        });
    }

    // --- SUBMISSIONS TAB ---
    const resultFilterDropdown = document.getElementById("resultFilter");
    if (resultFilterDropdown) {
        resultFilterDropdown.addEventListener("change", () => {
            loadSubmissions(); // Reload submissions based on filter
            clearFields(); // Clear details form when filter changes
        });
    }

    // Preferred Day change listener in Submission Details
    const preferredDayDropdown = document.getElementById("preferredDay");
    const preferredTimeDropdown = document.getElementById("preferredTime");
    if (preferredDayDropdown && preferredTimeDropdown) {
        preferredDayDropdown.addEventListener("change", () => {
            const selectedDay = preferredDayDropdown.value;
            // Use the globally stored school year for the current submission
            const selectedYear = currentSubmissionSchoolYear;
            // Get the submission ID from the submit button's dataset
            const submissionId = document.querySelector(".submit-button")?.dataset.submissionId;

            console.log("Preferred Day Changed:", selectedDay);
            console.log("Selected Year for Availability:", selectedYear);
            console.log("Existing Schedules for Availability:", existingSchedules);

            // Clear and enable the time dropdown
            preferredTimeDropdown.innerHTML =
                '<option value="" disabled selected>Select a time</option>';
            preferredTimeDropdown.disabled = !selectedDay; // Disable if no day selected

            if (!selectedDay || !selectedYear) {
                console.warn("Day or Year not selected, cannot populate times.");
                preferredTimeDropdown.disabled = true; // Ensure disabled
                return;
            }

            // Filter out times that are already occupied for the selected day and year
            // Make sure to exclude the schedule belonging to the *current* submission if submissionId is known
            const occupiedTimes = existingSchedules
                .filter(
                    (schedule) =>
                        schedule.day === selectedDay &&
                        schedule.schoolYear === selectedYear &&
                        (!submissionId || schedule.submissionId !== submissionId) // Exclude current submission's schedule
                )
                .map((schedule) => schedule.time.trim());

            console.log(`Occupied Times for ${selectedDay} in ${selectedYear} (excluding current submission if known):`, occupiedTimes);

            // Populate the time dropdown ONLY with available times
            ALL_TIME_SLOTS.forEach((time) => {
                // Special handling for Friday 12:01-12:55 if needed
                if (selectedDay !== 'Friday' && time === '12:01-12:55') {
                    return; // Skip this slot if not Friday
                }

                const normalizedTime = time.trim(); // Normalize time format
                const isOccupied = occupiedTimes.includes(normalizedTime);

                // Add the option ONLY if it's not occupied
                if (!isOccupied) {
                    const option = document.createElement("option");
                    option.value = normalizedTime;
                    option.textContent = normalizedTime;
                    preferredTimeDropdown.appendChild(option);
                } else {
                    console.log(`Time slot ${normalizedTime} on ${selectedDay} is occupied.`);
                }
            });

            // After populating with available slots, try to select the original preferred time
            // Use the globally stored originalSubmissionPreferredTime
            if (originalSubmissionPreferredTime && preferredTimeDropdown.querySelector(`option[value="${originalSubmissionPreferredTime}"]`)) {
                 // Check if the original time exists among the *available* options we just added
                 console.log(`Reselecting original preferred time: ${originalSubmissionPreferredTime}`);
                 preferredTimeDropdown.value = originalSubmissionPreferredTime;
            } else {
                 // If the original time is not available for the new day, reset selection
                 console.log(`Original preferred time ${originalSubmissionPreferredTime || 'N/A'} not available for ${selectedDay}. Resetting selection.`);
                 preferredTimeDropdown.value = ""; // Reset to default "Select a time"
            }

            // Re-disable if no valid options were added (only the default "Select a time" exists)
            preferredTimeDropdown.disabled = preferredTimeDropdown.options.length <= 1;

        });
    }

    // Submission Details Submit Button
    const submitBtn = document.querySelector(".submit-button");
    if (submitBtn) {
        submitBtn.addEventListener("click", () => {
            const submissionId = submitBtn.dataset.submissionId;
            if (submissionId) {
                updateSubmission(submissionId);
            } else {
                alert("No submission selected");
            }
        });
    }

    // Submission Details Cancel Button
    const cancelBtn = document.querySelector(".cancel-button");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            clearFields();
        });
    }

    // Tab switching logic
    document.querySelectorAll(".tab-button").forEach((button) => {
        button.addEventListener("click", () => {
            // Remove 'active' class from all buttons and tabs
            document
                .querySelectorAll(".tab-button")
                .forEach((btn) => btn.classList.remove("active"));
            document
                .querySelectorAll(".tab-pane")
                .forEach((tab) => tab.classList.remove("active"));

            // Add 'active' class to the clicked button and corresponding tab
            button.classList.add("active");
            const targetTab = document.getElementById(button.dataset.tab);
            if (targetTab) targetTab.classList.add("active");

            // If switching to submissions tab, ensure details are cleared and potentially reload
            if (button.dataset.tab === 'submissions-tab') {
                clearFields();
                // Optionally reload submissions if needed, though year/filter changes handle it
                // loadSubmissions();
            }
            // If switching to schedule tab, ensure schedule is refreshed for selected year
            if (button.dataset.tab === 'schedule-tab') {
                const currentScheduleYear = schoolYearDropdown ? schoolYearDropdown.value : null;
                if (currentScheduleYear) {
                    refreshSchedule(currentScheduleYear);
                }
            }
        });
    });

    // Set initial active tab (optional, based on your default view)
    const initialActiveButton = document.querySelector('.tab-button.active');
    if (initialActiveButton) {
        const initialTabId = initialActiveButton.dataset.tab;
        const initialTab = document.getElementById(initialTabId);
        if (initialTab) initialTab.classList.add('active');
    } else {
        // Default to the first tab if none are marked active initially
        const firstButton = document.querySelector('.tab-button');
        const firstTab = document.querySelector('.tab-pane');
        if (firstButton && firstTab) {
            firstButton.classList.add('active');
            firstTab.classList.add('active');
        }
    }
    // Initial clear for submission details form
    clearFields();


}); // End DOMContentLoaded for main setup

/*-----SUBMISSIONS TAB FUNCTIONS (Defined outside DOMContentLoaded for broader scope if needed)-----*/

// Fetch and display submissions in the table
async function loadSubmissions() {
    const tableBody = document.getElementById("submissions-table-body");
    if (!tableBody) return; // Exit if table body doesn't exist

    try {
        const schoolYearDropdown = document.getElementById("submissionSchoolYear");
        const schoolYear = schoolYearDropdown ? schoolYearDropdown.value : null;

        if (!schoolYear) {
            console.error("No school year selected in submission dropdown.");
            tableBody.innerHTML = '<tr><td colspan="5">Please select a school year.</td></tr>';
            return; // Exit the function if no school year is selected
        }

        const resultFilter = document.getElementById("resultFilter");
        const result = resultFilter ? resultFilter.value : "All";
        const queryParams = new URLSearchParams({ schoolYear });
        if (result && result !== "All") queryParams.append("result", result);

        const response = await fetch(`/submissions?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch submissions: ${response.statusText}`);

        const submissions = await response.json();
        console.log(`Submissions for ${schoolYear} (Filter: ${result}):`, submissions);

        tableBody.innerHTML = ""; // Clear previous entries

        if (Array.isArray(submissions) && submissions.length > 0) {
            submissions.forEach((submission) => {
                const row = document.createElement("tr");
                // Add a class based on result for potential styling
                row.classList.add(`result-${(submission.result || 'Pending').toLowerCase()}`);
                row.innerHTML = `
                    <td>${submission.showDetails?.title || "N/A"}</td>
                    <td>${submission.organizationName || "N/A"}</td>
                    <td>${submission.preferredSchedule?.day || "N/A"} ${
                    submission.preferredSchedule?.time || "N/A"
                }</td>
                    <td>${submission.result || "Pending"}</td>
                    <td><button type="button" class="select-btn" data-id="${
                        submission._id
                    }">Select</button></td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners to the newly created select buttons
            document.querySelectorAll("#submissions-table-body .select-btn").forEach((button) => {
                button.addEventListener("click", () =>
                    // Use the globally scoped existingSchedules variable
                    selectSubmission(button.dataset.id, existingSchedules) // <<< Use global variable
                );
            });
        } else {
            tableBody.innerHTML =
                '<tr><td colspan="5">No submissions found for the selected criteria.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading submissions:", error);
        if (tableBody) { // Check again in case error happened before fetch
            tableBody.innerHTML =
                '<tr><td colspan="5">Failed to load submissions. Please try again.</td></tr>';
        }
    }
}

// Store the initial result when a submission is selected
let initialSubmissionResult = 'Pending';

// Populate the form with the selected submission's details
async function selectSubmission(submissionId, schedulesForAvailability) {
    // Ensure schedulesForAvailability is the correct, up-to-date list for the selected year
    console.log("Selecting submission:", submissionId, "with schedules:", schedulesForAvailability);
    try {
        const response = await fetch(`/submissions/${submissionId}`);
        if (!response.ok) {
            throw new Error(
                `Failed to fetch submission details: ${response.statusText}`
            );
        }
        const submission = await response.json();

        // --- Store original preferred time ---
        originalSubmissionPreferredTime = submission.preferredSchedule?.time || null; // <<< Store the original time
        // ---

        // --- Store initial result ---
        initialSubmissionResult = submission.result || 'Pending';
        // ---

        // --- Populate Read-only Fields ---
        document.getElementById("organizationName").value = submission.organizationName || "";
        document.getElementById("organizationType").value = submission.organizationType || "";
        document.getElementById("proponentName").value = formatName(submission.proponent);
        document.getElementById("proponentCYS").value = submission.proponent?.cys || "";

        if (submission.coProponent?.notApplicable) {
            document.getElementById("coProponentName").value = "N/A";
            document.getElementById("coProponentCYS").value = "N/A";
        } else {
            document.getElementById("coProponentName").value = formatName(submission.coProponent);
            document.getElementById("coProponentCYS").value = submission.coProponent?.cys || "";
        }

        document.getElementById("executiveProducer").value = formatName(submission.executiveProducer);
        document.getElementById("executiveProducerCYS").value = submission.executiveProducer?.cys || "";

        if (submission.facultyStaff?.notApplicable) {
            document.getElementById("facultyStaff").value = "N/A";
            document.getElementById("facultyStaffDepartment").value = "N/A";
        } else {
            document.getElementById("facultyStaff").value = formatName(submission.facultyStaff);
            document.getElementById("facultyStaffDepartment").value = submission.facultyStaff?.cys || "";
        }

        // Populate Hosts (Read-only)
        const hostContainer = document.getElementById("host-container");
        hostContainer.innerHTML = ""; // Clear previous
        if (submission.hosts && submission.hosts.length > 0) {
            submission.hosts.forEach((host, index) => {
                const hostField = document.createElement("div");
                hostField.className = 'readonly-field-group';
                hostField.innerHTML = `
                    <label for="host${index}">Host ${index + 1} Name:</label>
                    <input type="text" id="host${index}" value="${formatName(host)}" readonly>
                    <label for="hostCYS${index}">Host ${index + 1} CYS:</label>
                    <input type="text" id="hostCYS${index}" value="${host.cys || ""}" readonly>
                `;
                hostContainer.appendChild(hostField);
            });
        } else {
            hostContainer.innerHTML = "<p>No hosts listed.</p>";
        }


        // Populate Technical Staff (Read-only)
        const techContainer = document.getElementById("technicalStaff-container");
        techContainer.innerHTML = ""; // Clear previous
        if (submission.technicalStaff && submission.technicalStaff.length > 0) {
            submission.technicalStaff.forEach((tech, index) => {
                const techField = document.createElement("div");
                techField.className = 'readonly-field-group';
                techField.innerHTML = `
                    <label for="technicalStaff${index}">Tech Staff ${index + 1} Name:</label>
                    <input type="text" id="technicalStaff${index}" value="${formatName(tech)}" readonly>
                    <label for="technicalStaffCYS${index}">Tech Staff ${index + 1} CYS:</label>
                    <input type="text" id="technicalStaffCYS${index}" value="${tech.cys || ""}" readonly>
                `;
                techContainer.appendChild(techField);
            });
        } else {
            techContainer.innerHTML = "<p>No technical staff listed.</p>";
        }


        document.getElementById("creativeStaff").value = formatName(submission.creativeStaff);
        document.getElementById("creativeStaffCYS").value = submission.creativeStaff?.cys || "";
        document.getElementById("dlsudEmail").value = submission.contactInfo?.dlsudEmail || "";
        document.getElementById("contactEmail").value = submission.contactInfo?.contactEmail || "";
        document.getElementById("contactFbLink").value = submission.contactInfo?.contactFbLink || "";

        const fbLinkContainer = document.getElementById("FbLink-container");
        const fbLinkInput = document.getElementById("FbLink");
        if (submission.contactInfo?.crossposting === "Yes") {
            fbLinkInput.value = submission.contactInfo?.fbLink || "";
            fbLinkContainer.style.display = "block"; // Ensure it is visible
        } else {
            fbLinkContainer.style.display = "none"; // Properly hide the element
            fbLinkInput.value = ""; // Clear the value
        }

        const proponentSignatureImg = document.getElementById("proponentSignature");
        if (submission.proponentSignature) {
            proponentSignatureImg.src = submission.proponentSignature;
            proponentSignatureImg.style.display = "block"; // Show the image
        } else {
            proponentSignatureImg.src = ""; // Clear src
            proponentSignatureImg.style.display = "none"; // Hide the image
        }

        document.getElementById("show-title").value = submission.showDetails?.title || "";
        document.getElementById("showType").value = Array.isArray(submission.showDetails?.type)
            ? submission.showDetails.type.join(', ')
            : (submission.showDetails?.type || "");
        document.getElementById("showDescription").value = submission.showDetails?.description || "";
        document.getElementById("show-objectives").value = submission.showDetails?.objectives || "";
        // --- End Populate Read-only Fields ---


        // --- Populate Editable Fields (Preferred Schedule, Result) ---
        const preferredDayDropdown = document.getElementById("preferredDay");
        const preferredTimeDropdown = document.getElementById("preferredTime");
        const resultDropdown = document.getElementById("result");

        const selectedDay = submission.preferredSchedule?.day || "";
        const selectedTime = submission.preferredSchedule?.time || "";
        currentSubmissionSchoolYear = submission.schoolYear; // Store the school year

        preferredDayDropdown.value = selectedDay; // Set the day

        // Populate time dropdown based on selected day and availability
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>'; // Clear existing options
        const selectedYear = currentSubmissionSchoolYear; // Use the stored school year

        // Check if selectedDay and selectedYear are valid before proceeding
        if (selectedDay && selectedYear) {
            // Filter schedulesForAvailability to get occupied times for the specific day and year
            const occupiedTimes = schedulesForAvailability
                .filter(schedule => schedule.day === selectedDay && schedule.schoolYear === selectedYear && schedule.submissionId !== submissionId) // Exclude schedule linked to this submission
                .map(schedule => schedule.time.trim());

            console.log(`Occupied times for ${selectedDay} in ${selectedYear} (excluding current submission):`, occupiedTimes);

            // Iterate through ALL defined time slots
            ALL_TIME_SLOTS.forEach((time) => {
                // Special handling for Friday 12:01-12:55 if needed (adjust condition based on your rules)
                if (selectedDay !== 'Friday' && time === '12:01-12:55') {
                    return; // Skip this slot if not Friday
                }

                const normalizedTime = time.trim();
                const isOccupied = occupiedTimes.includes(normalizedTime);
                const isCurrentSubmissionTime = normalizedTime === selectedTime;

                // Add the time slot if it's not occupied by *another* submission,
                // OR if it's the time currently saved for *this* submission.
                if (!isOccupied || isCurrentSubmissionTime) {
                    const option = document.createElement("option");
                    option.value = normalizedTime;
                    option.textContent = normalizedTime;
                    if (isCurrentSubmissionTime) {
                        option.selected = true; // Pre-select the submission's current time
                    }
                    preferredTimeDropdown.appendChild(option);
                } else {
                     console.log(`Time slot ${normalizedTime} is occupied by another schedule.`);
                }
            });

            // If the selectedTime wasn't added (e.g., it became occupied by someone else), reset selection
            // This check might be redundant if the logic above correctly adds the current time, but keep for safety.
            if (selectedTime && !preferredTimeDropdown.querySelector(`option[value="${selectedTime}"]`)) {
                 console.warn(`Previously selected time ${selectedTime} is no longer available.`);
                 preferredTimeDropdown.value = ""; // Reset selection
            } else if (!selectedTime) {
                 preferredTimeDropdown.value = ""; // Ensure default is selected if no time was initially set
            }

        } else {
            console.warn("Cannot populate times: Day or Year not selected/available.");
            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select day first</option>';
            preferredTimeDropdown.disabled = true; // Disable if day/year missing
        }

        resultDropdown.value = submission.result.charAt(0).toUpperCase() + submission.result.slice(1) || "Pending"; // Set result, capitalize first letter

        // --- Enable/Disable Form Elements Based on Result ---
        const isDecided = initialSubmissionResult !== 'Pending';
        resultDropdown.disabled = isDecided;
        preferredDayDropdown.disabled = isDecided;
        // Disable time dropdown if decided, or if no day is selected, or if no options were populated
        preferredTimeDropdown.disabled = isDecided || !selectedDay || preferredTimeDropdown.options.length <= 1;
        document.querySelector(".cancel-button").disabled = false; // Always enable cancel
        document.querySelector(".submit-button").disabled = isDecided; // Disable submit if decided
        document.querySelector(".submit-button").dataset.submissionId = submissionId; // Set ID for submit button

    } catch (error) {
        console.error("Error fetching or populating submission details:", error);
        alert("Failed to load submission details.");
        clearFields(); // Clear fields on error
    }
}

// Helper function to format names consistently
function formatName(person) {
    if (!person) return "N/A";
    // Ensure properties exist before accessing
    const lastName = person.lastName || "";
    const firstName = person.firstName || "";
    const mi = person.middleInitial || person.mi || "";
    const suffix = person.suffix || "";

    let formattedName = `${lastName}, ${firstName}`;
    if (mi) formattedName += ` ${mi}`;
    if (suffix) formattedName += ` ${suffix}`;

    return formattedName.trim().replace(/, $/, ''); // Trim and remove trailing comma if only last name exists
}


// Update submission result and potentially create/update/delete schedule
async function updateSubmission(submissionId) {
    const resultDropdown = document.getElementById("result");
    const newResult = resultDropdown.value; // e.g., "Accepted" or "Rejected"
    const preferredDay = document.getElementById("preferredDay").value;
    const preferredTime = document.getElementById("preferredTime").value;
    const selectedYear = currentSubmissionSchoolYear; // Use the stored school year

    // --- Confirmation Check for irreversible actions ---
    if (initialSubmissionResult === 'Pending' && (newResult === 'Accepted' || newResult === 'Rejected')) {
        const action = newResult === 'Accepted' ? 'Accept' : 'Reject';
        if (!confirm(`Are you sure you want to ${action} this submission? This action is irreversible.`)) {
            resultDropdown.value = initialSubmissionResult.charAt(0).toUpperCase() + initialSubmissionResult.slice(1); // Reset dropdown if cancelled
            return;
        }
    }
    // --- End Confirmation Check ---

    // --- Validations ---
    if (newResult === "Pending") {
        alert("Please select a RESULT (Accepted or Rejected) before submitting.");
        return;
    }

    if (!preferredDay) {
        alert("Please select a preferred DAY before submitting.");
        return;
    }

    if (!preferredTime || preferredTime === "Select a time") {
        alert("Please select a preferred TIME before submitting.");
        return;
    }

    // --- Check for Schedule Conflicts (only if Accepting) ---
    if (newResult === "Accepted") {
        try {
            // Fetch schedules specifically for the target slot and year
            const conflictCheckResponse = await fetch(
                `/schedule?day=${preferredDay}&time=${preferredTime}&schoolYear=${selectedYear}`
            );
            if (!conflictCheckResponse.ok) throw new Error("Failed to check existing schedules for conflicts");

            const conflictingSchedules = await conflictCheckResponse.json();

            // Find if there's an existing schedule in this slot *not* linked to the current submission
            const actualConflict = conflictingSchedules.find(sch => sch.submissionId !== submissionId);

            if (actualConflict) {
                alert(
                    `${preferredDay} (${preferredTime}) is already occupied by another schedule ('${actualConflict.showDetails?.title || 'Unknown'}') in ${selectedYear}. Please choose a different time or day.`
                );
                return; // Stop the update process
            }
        } catch (error) {
            console.error("Error checking existing schedules for conflicts:", error);
            alert("An error occurred while checking the schedule availability. Please try again.");
            return; // Stop the update process
        }
    }

    // --- Prepare Update Payload ---
    const updates = {
        // Convert result to lowercase to match potential backend enum expectations
        result: newResult.toLowerCase(),
        preferredSchedule: { // Always send the selected schedule
            day: preferredDay,
            time: preferredTime
        }
    };
    console.log("Sending updates:", updates); // Log the payload being sent

    // --- Update Submission ---
    try {
        const patchResponse = await fetch(`/submissions/${submissionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });

        const resultData = await patchResponse.json(); // Try parsing JSON

        if (!patchResponse.ok) {
            // Log the specific error from the backend if available
            console.error("Backend Error:", resultData);
            throw new Error(resultData.error || resultData.message || `Failed to update submission (Status: ${patchResponse.status})`);
        }

        alert("Submission updated successfully!");
        initialSubmissionResult = newResult; // Update the initial state for subsequent checks

        // --- Disable form elements after successful irreversible update ---
        if (newResult === 'Accepted' || newResult === 'Rejected') {
            resultDropdown.disabled = true;
            document.getElementById("preferredDay").disabled = true;
            document.getElementById("preferredTime").disabled = true;
            document.querySelector(".submit-button").disabled = true;
        }

        // --- Handle Schedule Creation/Update/Deletion based on Result ---
        const scheduleDisplayYear = document.getElementById("schoolYear").value; // Year for refreshing schedule grid

        if (newResult === "Accepted") {
            // Fetch the fully updated submission data to ensure we have all details
            const submissionResponse = await fetch(`/submissions/${submissionId}`);
            if (!submissionResponse.ok) throw new Error("Failed to re-fetch submission after update.");
            const submission = await submissionResponse.json();

            if (!submission.preferredSchedule || !submission.preferredSchedule.day || !submission.preferredSchedule.time) {
                throw new Error("Updated submission is missing preferred schedule details needed for schedule creation.");
            }

            // Prepare schedule data from the submission
            const scheduleData = {
                day: submission.preferredSchedule.day,
                time: submission.preferredSchedule.time.toString(),
                showDetails: {
                    title: submission.showDetails?.title || "N/A",
                    type: submission.showDetails?.type || [],
                    description: submission.showDetails?.description || "",
                    objectives: submission.showDetails?.objectives || "",
                },
                executiveProducer: submission.executiveProducer || {},
                hosts: submission.hosts || [],
                technicalStaff: submission.technicalStaff || [],
                creativeStaff: submission.creativeStaff || {},
                schoolYear: selectedYear, // Use the year selected during the update process
                submissionId: submissionId // Link schedule to submission
            };

            console.log("Schedule data being prepared:", scheduleData);

            // Check if a schedule linked to this submission already exists
            const checkScheduleResponse = await fetch(`/schedule/bySubmission/${submissionId}`);
            let existingScheduleId = null;
            if (checkScheduleResponse.ok) {
                const existingSchedule = await checkScheduleResponse.json();
                if (existingSchedule) {
                    existingScheduleId = existingSchedule._id;
                }
            } else if (checkScheduleResponse.status !== 404) {
                // Handle errors other than Not Found when checking
                console.error("Error checking for existing schedule:", await checkScheduleResponse.text());
            }

            const scheduleMethod = existingScheduleId ? 'PATCH' : 'POST';
            const scheduleUrl = existingScheduleId ? `/schedule/${existingScheduleId}` : '/schedule';

            console.log(`Attempting to ${scheduleMethod} schedule at ${scheduleUrl}`);

            const scheduleResponse = await fetch(scheduleUrl, {
                method: scheduleMethod,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(scheduleData),
            });

            const scheduleResultData = await scheduleResponse.json();
            if (!scheduleResponse.ok) {
                 console.error(`Failed to ${scheduleMethod} schedule:`, scheduleResultData);
                 alert(`Submission was accepted, but failed to ${existingScheduleId ? 'update' : 'save'} the schedule entry. Please check manually.`);
            } else {
                alert(`Schedule ${existingScheduleId ? 'updated' : 'saved'} successfully!`);
                await refreshSchedule(scheduleDisplayYear); // Refresh the main schedule grid
            }

        } else if (newResult === "Rejected") {
            // If rejecting, check if an associated schedule exists and delete it
            try {
                const checkScheduleResponse = await fetch(`/schedule/bySubmission/${submissionId}`);
                if (checkScheduleResponse.ok) {
                    const existingSchedule = await checkScheduleResponse.json();
                    if (existingSchedule && existingSchedule._id) {
                        console.log(`Found existing schedule ${existingSchedule._id} for rejected submission ${submissionId}. Deleting...`);
                        const deleteResponse = await fetch(`/schedule/${existingSchedule._id}`, { method: 'DELETE' });
                        if (deleteResponse.ok) {
                            alert("Associated schedule for the rejected submission has been removed.");
                            await refreshSchedule(scheduleDisplayYear); // Refresh schedule display
                        } else {
                            console.error("Failed to delete associated schedule:", await deleteResponse.text());
                            alert("Submission was rejected, but failed to remove the associated schedule entry. Please check manually.");
                        }
                    }
                } else if (checkScheduleResponse.status !== 404) {
                     console.error("Error checking for schedule to delete during rejection:", await checkScheduleResponse.text());
                }
            } catch (scheduleCheckError) {
                console.error("Error checking/deleting associated schedule during rejection:", scheduleCheckError);
                alert("An error occurred while trying to remove the associated schedule for the rejected submission.");
            }
        }

        // --- Final Steps ---
        loadSubmissions(); // Reload the submissions table to reflect the change

    } catch (error) {
        console.error("Error during submission update process:", error);
        // Display the specific error message from the backend or the generic one
        alert(`An error occurred: ${error.message}`);
        // Optionally re-enable fields if the PATCH failed early
        // resultDropdown.disabled = false; // etc.
    }
}


// Clear submission detail fields and reset state
function clearFields() {
    // Clear all form fields
    document.getElementById("organizationName").value = "";
    document.getElementById("organizationType").value = "";
    document.getElementById("proponentName").value = "";
    document.getElementById("proponentCYS").value = "";
    document.getElementById("coProponentName").value = "";
    document.getElementById("coProponentCYS").value = "";
    document.getElementById("executiveProducer").value = "";
    document.getElementById("executiveProducerCYS").value = "";
    document.getElementById("facultyStaff").value = "";
    document.getElementById("facultyStaffDepartment").value = "";
    document.getElementById("host-container").innerHTML = "<p>Select a submission to view details.</p>"; // Placeholder
    document.getElementById("technicalStaff-container").innerHTML = "<p>Select a submission to view details.</p>"; // Placeholder
    document.getElementById("creativeStaff").value = "";
    document.getElementById("creativeStaffCYS").value = "";
    document.getElementById("dlsudEmail").value = "";
    document.getElementById("contactEmail").value = "";
    document.getElementById("contactFbLink").value = "";
    document.getElementById("FbLink").value = "";
    document.getElementById("FbLink-container").style.display = "none";
    const sigImg = document.getElementById("proponentSignature");
    sigImg.src = "";
    sigImg.style.display = "none";
    document.getElementById("show-title").value = "";
    document.getElementById("showType").value = "";
    document.getElementById("showDescription").value = "";
    document.getElementById("show-objectives").value = "";

    const preferredDayDropdown = document.getElementById("preferredDay");
    const preferredTimeDropdown = document.getElementById("preferredTime");
    const resultDropdown = document.getElementById("result");

    if (preferredDayDropdown) preferredDayDropdown.value = "";
    if (preferredTimeDropdown) {
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a day first</option>';
        preferredTimeDropdown.disabled = true;
    }
    if (resultDropdown) resultDropdown.value = "Pending";

    // Reset initial state variable
    initialSubmissionResult = 'Pending';
    originalSubmissionPreferredTime = null; // Reset original time

    // Disable the form elements that should be disabled when no submission is selected
    if (resultDropdown) resultDropdown.disabled = true;
    if (preferredDayDropdown) preferredDayDropdown.disabled = true;
    document.querySelector(".cancel-button").disabled = true;
    document.querySelector(".submit-button").disabled = true;
    document.querySelector(".submit-button").removeAttribute('data-submission-id'); // Remove submission ID

    console.log("Submission detail fields cleared.");
}