/*-----SCHEDULE TAB-----*/
const modal = document.getElementById("scheduleModal");

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

// --- GLOBAL STATE VARIABLES ---
let occupiedSlotsByDay = {};
let currentSubmissionSchoolYear = null;
let existingSchedules = [];
let originalSubmissionPreferredTime = null;
let initialSubmissionResult = 'Pending';
let hostIndex = 1;
let technicalIndex = 1;
const MAX_HOSTS = 4; // Example limit
const MAX_TECHNICAL = 2; // Example limit
// --- END GLOBAL STATE VARIABLES ---

// --- GLOBAL HELPER FUNCTIONS ---

// Function to refresh schedule buttons AND update the global schedule list
async function refreshSchedule(selectedYear) {
    console.log("Refreshing schedule for year:", selectedYear);
    try {
        // --- Fetch ACCEPTED Schedules ---
        const scheduleResponse = await fetch(`/schedule?schoolYear=${selectedYear}`);
        if (!scheduleResponse.ok) throw new Error("Failed to fetch accepted schedules");
        const acceptedSchedules = await scheduleResponse.json();
        console.log(`Accepted Schedules for ${selectedYear}:`, acceptedSchedules);

        // --- Fetch PENDING Submissions ---
        let pendingSubmissions = [];
        try {
            // Fetch using capitalized "Pending" as backend expects it now
            const pendingResponse = await fetch(`/submissions?schoolYear=${selectedYear}&result=Pending`);
            if (!pendingResponse.ok) throw new Error("Failed to fetch pending submissions");
            pendingSubmissions = await pendingResponse.json();
            console.log(`Pending Submissions for ${selectedYear}:`, pendingSubmissions);
        } catch (pendingError) {
            console.error("Error fetching pending submissions:", pendingError);
            // Continue even if pending submissions fail to load
        }

        // --- Update the global variable (using accepted schedules for availability checks) ---
        existingSchedules = acceptedSchedules;
        // ---

        // --- Clear existing schedule buttons ---
        document.querySelectorAll(".availablebtn").forEach((button) => {
            button.textContent = "";
            button.classList.remove("schedulebtn", "pendingbtn"); // Remove both classes
            button.disabled = false;
            delete button.dataset.scheduleId;
            delete button.dataset.scheduleSubmissionId;
            delete button.dataset.pendingSubmissionId; // Remove pending ID
        });

        // --- Populate buttons with ACCEPTED schedule data ---
        acceptedSchedules.forEach((schedule) => {
            const button = document.querySelector(
                `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
            );
            if (button) {
                console.log("Updating button for accepted schedule:", schedule);
                button.textContent = schedule.showDetails?.title || "Booked";
                button.classList.add("schedulebtn"); // Add accepted class
                button.dataset.scheduleId = schedule._id;
                if (schedule.submissionId) {
                    button.dataset.scheduleSubmissionId = schedule.submissionId;
                }
                // Optionally disable: button.disabled = true;
            }
        });

        // --- Populate buttons with PENDING submission data (only if not already booked) ---
        pendingSubmissions.forEach((submission) => {
            if (submission.preferredSchedule?.day && submission.preferredSchedule?.time) {
                const button = document.querySelector(
                    `.availablebtn[data-day="${submission.preferredSchedule.day}"][data-time="${submission.preferredSchedule.time}"]`
                );
                // Only update if the button exists AND is not already booked by an accepted schedule
                if (button && !button.classList.contains('schedulebtn')) {
                    console.log("Updating button for pending submission:", submission);
                    button.textContent = `PENDING: ${submission.showDetails?.title || 'N/A'}`;
                    button.classList.add("pendingbtn"); // Add pending class
                    button.dataset.pendingSubmissionId = submission._id; // Store submission ID
                    // Keep button enabled to allow clicking
                } else if (button && button.classList.contains('schedulebtn')) {
                    console.log(`Slot ${submission.preferredSchedule.day} ${submission.preferredSchedule.time} already booked by an accepted schedule. Cannot show pending: ${submission.showDetails?.title}`);
                } else if (!button) {
                    console.log(`Button element not found for pending slot: ${submission.preferredSchedule.day} ${submission.preferredSchedule.time}`);
                }
            }
        });

    } catch (error) {
        console.error("Error updating schedule buttons:", error);
        existingSchedules = []; // Clear global list on error too
        // Clear buttons on error as well
         document.querySelectorAll(".availablebtn").forEach((button) => {
            button.textContent = "";
            button.classList.remove("schedulebtn", "pendingbtn");
            button.disabled = false;
            delete button.dataset.scheduleId;
            delete button.dataset.scheduleSubmissionId;
            delete button.dataset.pendingSubmissionId;
        });
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

// Helper function to reset dynamic input fields (like hosts, technical staff)
function resetDynamicInputs(containerId, inputClass, addFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Keep only the first input group (template)
    const firstInputGroup = container.querySelector(`.${inputClass}`); // <<< CORRECT SELECTOR
    container.innerHTML = ''; // Clear container
    if (firstInputGroup) {
        // Clear values in the template group
        firstInputGroup.querySelectorAll('input').forEach(input => input.value = '');
        // Ensure remove button is hidden on template
        const removeButton = firstInputGroup.querySelector('.remove-host-button, .remove-technical-button');
        if (removeButton) removeButton.style.display = 'none';
        container.appendChild(firstInputGroup); // Add the cleared template back
    }
    // Reset indices
    if (typeof hostIndex !== 'undefined' && containerId === 'hosts-container') hostIndex = 1;
    if (typeof technicalIndex !== 'undefined' && containerId === 'technical-container') technicalIndex = 1;
}

// --- Basic Implementation for Dynamic Row Addition ---
function addHost() {
    const container = document.getElementById('hosts-container');
    const template = container.querySelector('.host-input-group'); // Find the template row
    if (!template || !container) return null; // Exit if template or container not found

    if (hostIndex >= MAX_HOSTS) {
        alert(`Maximum number of hosts (${MAX_HOSTS}) reached.`);
        return null; // Check limit
    }

    const newRow = template.cloneNode(true); // Clone the template

    // Clear input values in the new row
    newRow.querySelectorAll('input').forEach(input => input.value = '');

    // Update name attributes
    newRow.querySelectorAll('input').forEach(input => {
        if (input.name) {
            input.name = input.name.replace(/\[\d+\]/, `[${hostIndex}]`);
        }
        // Update IDs if necessary
        if (input.id) {
             input.id = input.id.replace(/_\d+_/, `_${hostIndex}_`);
        }
    });
    // Update label 'for' attributes
     newRow.querySelectorAll('label').forEach(label => {
        if (label.htmlFor) {
             label.htmlFor = label.htmlFor.replace(/_\d+_/, `_${hostIndex}_`);
        }
    });

    // Add remove button logic
    const removeButton = newRow.querySelector('.remove-host-button');
    if (removeButton) {
        removeButton.style.display = 'inline-block'; // Make it visible
        removeButton.onclick = () => {
            newRow.remove();
            hostIndex--; // Basic decrement
            // After removing, re-evaluate indices of remaining rows if necessary for submission logic
            // updateHostIndices(); // Call a function to re-index if needed
            toggleAddHostButton();
        };
    }

    container.appendChild(newRow); // Add the new row to the container
    hostIndex++; // Increment the index for the *next* add operation
    toggleAddHostButton(); // Update the add button state
    return newRow; // Return the newly added row element
}

function addTechnical() {
    const container = document.getElementById('technical-container');
    const template = container.querySelector('.technical-input-group');
    if (!template || !container) return null;

    if (technicalIndex >= MAX_TECHNICAL) {
        alert(`Maximum number of technical staff (${MAX_TECHNICAL}) reached.`);
        return null; // Check limit
    }

    const newRow = template.cloneNode(true);
    newRow.querySelectorAll('input').forEach(input => input.value = '');

    // Update names and IDs similar to addHost
    newRow.querySelectorAll('input').forEach(input => {
        if (input.name) input.name = input.name.replace(/\[\d+\]/, `[${technicalIndex}]`);
        if (input.id) input.id = input.id.replace(/_\d+_/, `_${technicalIndex}_`);
    });
     newRow.querySelectorAll('label').forEach(label => {
        if (label.htmlFor) label.htmlFor = label.htmlFor.replace(/_\d+_/, `_${technicalIndex}_`);
    });

    // Add remove button logic
    const removeButton = newRow.querySelector('.remove-technical-button');
     if (removeButton) {
        removeButton.style.display = 'inline-block';
        removeButton.onclick = () => {
            newRow.remove();
            technicalIndex--;
            // updateTechnicalIndices(); // Call a function to re-index if needed
            toggleAddTechnicalButton();
        };
    }

    container.appendChild(newRow);
    technicalIndex++;
    toggleAddTechnicalButton();
    return newRow;
}

function toggleAddHostButton() {
    const button = document.getElementById('addHost');
    if (button) button.disabled = hostIndex >= MAX_HOSTS;
}
function toggleAddTechnicalButton() {
    const button = document.getElementById('addTechnical');
    if (button) button.disabled = technicalIndex >= MAX_TECHNICAL;
}
// Placeholder for more complex index updates if needed after removal
function updateHostIndices() { console.warn("updateHostIndices function not fully implemented"); }
function updateTechnicalIndices() { console.warn("updateTechnicalIndices function not fully implemented"); }

// Helper function to populate standard name fields (Last, First, MI, Suffix, CYS/Dept)
function populateNameFields(prefix, person) {
    console.log(`Populating fields for prefix: ${prefix}`, person);
    if (!person) {
        // Clear fields if person data is missing
        const fields = ['LastName', 'FirstName', 'MI', 'Suffix', 'CYS', 'Department'];
        fields.forEach(fieldSuffix => {
            const el = document.getElementById(`${prefix}${fieldSuffix}`);
            if (el) el.value = "";
        });
        return;
    }

    const lastNameEl = document.getElementById(`${prefix}LastName`);
    const firstNameEl = document.getElementById(`${prefix}FirstName`);
    const miEl = document.getElementById(`${prefix}MI`);
    const suffixEl = document.getElementById(`${prefix}Suffix`);
    const cysDeptEl = document.getElementById(`${prefix}CYS`) || document.getElementById(`${prefix}Department`);

    console.log(`Found elements for ${prefix}:`, { lastNameEl, firstNameEl, miEl, suffixEl, cysDeptEl });

    if (lastNameEl) lastNameEl.value = person.lastName || "";
    if (firstNameEl) firstNameEl.value = person.firstName || "";
    if (miEl) miEl.value = person.mi || person.middleInitial || "";
    if (suffixEl) suffixEl.value = person.suffix || "";
    if (cysDeptEl) cysDeptEl.value = person.cys || person.department || "";
}

// Helper function to populate dynamic name fields (like hosts, technical staff)
function populateDynamicNameFields(containerId, inputClass, people, addFunction, updateIndicesFunction, toggleButtonFunction) {
    console.log(`Populating dynamic fields for: ${containerId}`, people);
    const container = document.getElementById(containerId);
    if (!container) return;

    const template = container.querySelector(`.${inputClass}`); // <<< CORRECT SELECTOR
    if (!template) {
        // Update the error message to reflect the correct class name being searched for
        console.error(`Template row with class '${inputClass}' not found in container '${containerId}'`);
        return;
    }

    // Clear existing dynamic rows BUT KEEP the template structure in memory
    container.innerHTML = '';
    container.appendChild(template); // Put template back

    // Reset index before populating
    if (containerId === 'hosts-container') hostIndex = 1;
    if (containerId === 'technical-container') technicalIndex = 1;

    if (Array.isArray(people) && people.length > 0) {
        people.forEach((person, loopIndex) => {
            let targetRow;
            if (loopIndex === 0) {
                // Populate the first person into the template row
                targetRow = template;
                // Ensure template inputs have correct index 0 names/ids
                targetRow.querySelectorAll('input').forEach(input => {
                    if (input.name) input.name = input.name.replace(/\[\d+\]/, `[0]`);
                    if (input.id) input.id = input.id.replace(/_\d+_/, `_0_`);
                });
                 targetRow.querySelectorAll('label').forEach(label => {
                    if (label.htmlFor) label.htmlFor = label.htmlFor.replace(/_\d+_/, `_0_`);
                });
            } else {
                // Add a new row using the provided addFunction for subsequent people
                if (typeof addFunction === 'function') {
                    targetRow = addFunction(); // addFunction increments the global index
                }
            }

            // Populate the target row
            if (targetRow) {
                const lastNameInput = targetRow.querySelector(`input[name$="[lastName]"]`);
                const firstNameInput = targetRow.querySelector(`input[name$="[firstName]"]`);
                const miInput = targetRow.querySelector(`input[name$="[mi]"]`);
                const suffixInput = targetRow.querySelector(`input[name$="[suffix]"]`);
                const cysInput = targetRow.querySelector(`input[name$="[cys]"]`);

                if (lastNameInput) lastNameInput.value = person.lastName || "";
                if (firstNameInput) firstNameInput.value = person.firstName || "";
                if (miInput) miInput.value = person.mi || person.middleInitial || "";
                if (suffixInput) suffixInput.value = person.suffix || "";
                if (cysInput) cysInput.value = person.cys || "";

                // Hide remove button on the first/template row
                if (loopIndex === 0) {
                     const removeButton = targetRow.querySelector('.remove-host-button, .remove-technical-button');
                     if (removeButton) removeButton.style.display = 'none';
                }
            } else {
                 console.warn(`Could not get target row for index ${loopIndex} in ${containerId}`);
            }
        });
        // Update indices after populating (if needed for complex logic)
        // if (typeof updateIndicesFunction === 'function') updateIndicesFunction();
    } else {
        // If no people, clear the values in the template row
        template.querySelectorAll('input').forEach(input => input.value = '');
         const removeButton = template.querySelector('.remove-host-button, .remove-technical-button');
         if (removeButton) removeButton.style.display = 'none'; // Hide remove on template
    }
    // Toggle the add button based on the final count
    if (typeof toggleButtonFunction === 'function') toggleButtonFunction();
}


// --- Main setup on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- Get Element References ---
    const schoolYearConfigForm = document.getElementById("schoolYearConfigForm");
    const schoolYearDropdown = document.getElementById("schoolYear");
    const modalSchoolYearDropdown = document.getElementById("modalSchoolYear");
    const submissionSchoolYearDropdown = document.getElementById("submissionSchoolYear");
    const scheduleButtons = document.querySelectorAll(".availablebtn");
    const closeModal = document.querySelector(".close");
    const saveButton = document.getElementById("saveButton");
    const deleteButton = document.getElementById("deleteButton");
    const scheduleForm = document.getElementById("scheduleForm");
    const scheduleTableBody = document.querySelector(".schedule-table tbody");
    const submissionsTableBody = document.getElementById("submissions-table-body");
    const resultFilter = document.getElementById("resultFilter");
    const submissionForm = document.getElementById("submission-form");
    const submissionSubmitButton = document.querySelector("#submission-form .submit-button");
    const submissionCancelButton = document.querySelector("#submission-form .cancel-button");
    const tabsContainer = document.querySelector(".tabs-container");
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanes = document.querySelectorAll(".tab-pane");
    const addHostButton = document.getElementById("addHost");
    const addTechnicalButton = document.getElementById("addTechnical");

    // --- School Year Configuration Form Submission ---
    if (schoolYearConfigForm) {
        schoolYearConfigForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const startMonth = document.getElementById("startMonth").value;
            const startYear = document.getElementById("startYear").value;
            const endMonth = document.getElementById("endMonth").value;
            const endYear = document.getElementById("endYear").value;

            if (!confirm(`Are you sure you want to save the school year configuration?\nStart: ${startMonth}/${startYear}\nEnd: ${endMonth}/${endYear}`)) {
                alert("Submission canceled.");
                return;
            }

            try {
                const response = await fetch("/schoolYear/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ startMonth, startYear, endMonth, endYear }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    alert(errorData.error || "Failed to save school year configuration");
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

    // --- Fetch initial schedules ---
    const initialYear = schoolYearDropdown ? schoolYearDropdown.value : null;
    if (initialYear) {
        try {
            const response = await fetch(`/schedule?schoolYear=${initialYear}`);
            if (!response.ok) throw new Error("Failed to fetch initial schedules");
            existingSchedules = await response.json();
            console.log(`Fetched initial schedules for ${initialYear}:`, existingSchedules);
            await refreshSchedule(initialYear);
        } catch (error) {
            console.error("Error fetching initial schedules:", error);
            existingSchedules = [];
            await refreshSchedule(initialYear);
        }
    } else {
        console.warn("No initial school year selected, cannot fetch initial schedules.");
    }
    // --- End Fetch initial schedules ---


    // --- Initial Load for Submissions Tab ---
    if (submissionSchoolYearDropdown && submissionSchoolYearDropdown.value) {
        await loadSubmissions();
    } else {
        console.warn("No school year selected in submissionSchoolYearDropdown initially.");
    }
    try {
        clearFields(); // Ensure submission form is initially clear
    } catch(err) {
        console.error("Error during initial clearFields call:", err);
    }

    // --- Helper Functions within DOMContentLoaded ---

    async function fetchSchoolYears() {
        try {
            const response = await fetch("/schoolYear/all");
            if (!response.ok) throw new Error("Failed to fetch school years");
            const schoolYears = await response.json();
            console.log("Fetched school years:", schoolYears);
            return schoolYears;
        } catch (error) {
            console.error("Error fetching school years:", error);
            return [];
        }
    }

    function getCurrentSchoolYear(schoolYears) {
        if (!Array.isArray(schoolYears)) return null;
        const currentDate = new Date();
        return schoolYears.find((year) => {
            if (!year || typeof year.startYear !== 'number' || typeof year.startMonth !== 'number' || typeof year.endYear !== 'number' || typeof year.endMonth !== 'number') {
                console.warn("Skipping invalid school year object:", year);
                return false;
            }
            const startDate = new Date(year.startYear, year.startMonth - 1, 1);
            const endDate = new Date(year.endYear, year.endMonth, 0);
            return currentDate >= startDate && currentDate <= endDate;
        });
    }

    async function populateDropdowns() {
        const schoolYears = await fetchSchoolYears();
        const currentSchoolYearConfig = getCurrentSchoolYear(schoolYears);
        displayCurrentSchoolYearConfig(currentSchoolYearConfig);

        populateDropdown(schoolYearDropdown, schoolYears);
        populateDropdown(modalSchoolYearDropdown, schoolYears);
        populateDropdown(submissionSchoolYearDropdown, schoolYears);

        let yearToSelect = null;
        if (currentSchoolYearConfig) {
            yearToSelect = `${currentSchoolYearConfig.startYear}-${currentSchoolYearConfig.endYear}`;
        } else if (schoolYears.length > 0) {
            const latestYear = schoolYears.sort((a, b) => b.startYear - a.startYear || b.startMonth - a.startMonth)[0];
            if (latestYear && typeof latestYear.startYear === 'number' && typeof latestYear.endYear === 'number') {
                 yearToSelect = `${latestYear.startYear}-${latestYear.endYear}`;
                 console.warn("No matching school year for current date. Defaulting to latest:", yearToSelect);
            } else {
                 console.error("Could not determine latest year from fetched configs:", schoolYears);
            }
        } else {
             console.warn("No school year configurations found.");
        }

        if (yearToSelect) {
            if (schoolYearDropdown) schoolYearDropdown.value = yearToSelect;
            if (modalSchoolYearDropdown) modalSchoolYearDropdown.value = yearToSelect;
            if (submissionSchoolYearDropdown) submissionSchoolYearDropdown.value = yearToSelect;
        }
    }

    function populateDropdown(dropdown, schoolYears) {
        if (!dropdown) return;
        dropdown.innerHTML = "";
        if (!Array.isArray(schoolYears) || schoolYears.length === 0) {
            dropdown.innerHTML = "<option value=''>No Configs</option>";
            dropdown.disabled = true;
            return;
        }
        dropdown.disabled = false;
        schoolYears.forEach((year) => {
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

    // --- TAB SWITCHING LOGIC ---
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.tab-button');
            if (!clickedButton) return;

            const targetTabId = clickedButton.dataset.tab;
            if (!targetTabId) return;

            tabButtons.forEach(button => button.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            clickedButton.classList.add('active');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add('active');
            } else {
                console.error(`Tab pane with ID '${targetTabId}' not found.`);
            }
        });
    }
    // --- END TAB SWITCHING LOGIC ---


    // Main Schedule Year Dropdown Change
    if (schoolYearDropdown) {
        schoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = schoolYearDropdown.value;
            console.log("Selected schoolYearDropdown value (on change):", selectedYear);
            if (modalSchoolYearDropdown) modalSchoolYearDropdown.value = selectedYear;

            try {
                const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
                if (!response.ok) throw new Error("Failed to fetch schedules on year change");
                existingSchedules = await response.json();
                console.log(`Fetched schedules for ${selectedYear} (main dropdown change):`, existingSchedules);
                await refreshSchedule(selectedYear);
            } catch (error) {
                console.error("Error fetching schedules on year change:", error);
                existingSchedules = [];
                await refreshSchedule(selectedYear);
            }
        });
    }

    // Submission Year Dropdown Change
    if (submissionSchoolYearDropdown) {
        submissionSchoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = submissionSchoolYearDropdown.value;
            console.log("Submission year changed. Refreshing schedules and submissions for year:", selectedYear);

            try {
                const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
                if (!response.ok) throw new Error("Failed to fetch schedules for submission year change");
                existingSchedules = await response.json();
                console.log(`Fetched schedules for ${selectedYear} (submission dropdown change):`, existingSchedules);

                await loadSubmissions();
                clearFields();
            } catch (error) {
                console.error("Error fetching schedules for submission year change:", error);
                existingSchedules = [];
                await loadSubmissions();
                clearFields();
            }
        });
    }

    // Submission Result Filter Change
    if (resultFilter) {
        resultFilter.addEventListener("change", async () => {
            await loadSubmissions();
            clearFields();
        });
    }

    // --- EVENT LISTENERS FOR ADD HOST/TECHNICAL BUTTONS ---
    if (addHostButton) {
        addHostButton.addEventListener('click', () => {
            addHost();
        });
    }

    if (addTechnicalButton) {
        addTechnicalButton.addEventListener('click', () => {
            addTechnical();
        });
    }
    // --- END ADD EVENT LISTENERS ---


    // --- Event Delegation for Schedule Button Clicks ---
    if (scheduleTableBody) {
        scheduleTableBody.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('button.availablebtn');
            if (!targetButton) return;

            const day = targetButton.dataset.day;
            const time = targetButton.dataset.time;
            const scheduleId = targetButton.dataset.scheduleId;
            const pendingSubmissionId = targetButton.dataset.pendingSubmissionId;

            // --- Handle PENDING button click ---
            if (pendingSubmissionId && targetButton.classList.contains('pendingbtn')) {
                console.log("Pending button clicked, submission ID:", pendingSubmissionId);

                // 1. Switch to Submissions Tab
                const submissionsTabButton = document.querySelector('.tab-button[data-tab="submissions-tab"]');
                const scheduleTabButton = document.querySelector('.tab-button[data-tab="schedule-tab"]');
                const submissionsTabPane = document.getElementById('submissions-tab');
                const scheduleTabPane = document.getElementById('schedule-tab');

                if (submissionsTabButton && scheduleTabButton && submissionsTabPane && scheduleTabPane) {
                    scheduleTabButton.classList.remove('active');
                    scheduleTabPane.classList.remove('active');
                    submissionsTabButton.classList.add('active');
                    submissionsTabPane.classList.add('active');
                }

                // 2. Ensure correct School Year and Filter are selected
                const currentScheduleYear = document.getElementById("schoolYear")?.value;
                if (submissionSchoolYearDropdown && currentScheduleYear) {
                    submissionSchoolYearDropdown.value = currentScheduleYear;
                }
                if (resultFilter) {
                    resultFilter.value = "Pending";
                }

                // 3. Load submissions for the correct year/filter
                await loadSubmissions();

                // 4. Select the specific submission
                await selectSubmission(pendingSubmissionId, existingSchedules);

                // 5. Scroll to the submission form
                document.getElementById('submission-form')?.scrollIntoView({ behavior: 'smooth' });

            }
            // --- Handle ACCEPTED button click (Open Schedule Modal) ---
            else if (scheduleId && targetButton.classList.contains('schedulebtn')) {
                console.log("Accepted button clicked, schedule ID:", scheduleId);
                openScheduleModal(targetButton);
            }
            // --- Handle AVAILABLE button click (Open Schedule Modal for Creation) ---
            else if (targetButton.classList.contains('availablebtn')) {
                 console.log("Available button clicked, Day:", day, "Time:", time);
                 openScheduleModal(targetButton);
            }
        });
    }

    // --- Function to Open Schedule Modal ---
    async function openScheduleModal(button) {
         if (!modal || !scheduleForm || !saveButton || !deleteButton || !modalSchoolYearDropdown) {
             console.error("Modal or essential modal elements not found!");
             return;
         }
         console.log("Opening schedule modal for button:", button.dataset);

         const day = button.dataset.day;
         const time = button.dataset.time;
         const scheduleId = button.dataset.scheduleId;
         const currentSelectedYear = document.getElementById("schoolYear")?.value;

         // --- Reset form and set defaults for new schedule ---
         scheduleForm.reset();
         scheduleForm.dataset.scheduleId = "";
         scheduleForm.dataset.day = day || "";
         scheduleForm.dataset.time = time || "";

         if (currentSelectedYear) {
             modalSchoolYearDropdown.value = currentSelectedYear;
         }
         saveButton.textContent = "Save";
         deleteButton.style.display = "none";

         // Reset dynamic fields
         resetDynamicInputs("hosts-container", "host-input-group", addHost); // Use correct class
         resetDynamicInputs("technical-container", "technical-input-group", addTechnical); // Use correct class

         // Ensure indices and buttons are reset/toggled correctly
         if (typeof updateHostIndices === 'function') updateHostIndices();
         if (typeof toggleAddHostButton === 'function') toggleAddHostButton();
         if (typeof updateTechnicalIndices === 'function') updateTechnicalIndices();
         if (typeof toggleAddTechnicalButton === 'function') toggleAddTechnicalButton();

         // --- Explicitly Reset Show Type Checkboxes and Other Input ---
         const typeCheckboxes = document.querySelectorAll("input[name='showDetails.type[]']");
         const otherCheckbox = document.getElementById("other");
         const otherInput = document.getElementById("other-input");
         typeCheckboxes.forEach(cb => cb.checked = false);
         if (otherInput) { otherInput.value = ""; otherInput.disabled = true; }
         // --- End Reset ---


         // --- If it's a booked slot (scheduleId exists), fetch and populate data ---
         if (scheduleId) {
             try {
                 const response = await fetch(`/schedule/${scheduleId}`);
                 if (!response.ok) throw new Error("Failed to fetch schedule details");
                 const schedule = await response.json();
                 console.log("Fetched schedule:", schedule);

                 modalSchoolYearDropdown.value = schedule.schoolYear || currentSelectedYear || '';
                 scheduleForm.dataset.scheduleId = schedule._id;

                 // --- Populate modal fields ---
                 const showTitleEl = document.getElementById("showTitle");
                 const showDescEl = document.getElementById("showDescription"); // Use correct ID
                 const showObjectivesEl = document.getElementById("showObjectives"); // Use correct ID

                 if (showTitleEl) showTitleEl.value = schedule.showDetails?.title || "";
                 if (showDescEl) {
                     showDescEl.value = schedule.showDetails?.description || "";
                 } else {
                     console.warn("Element with ID 'showDescription' not found in modal.");
                 }
                 if (showObjectivesEl) {
                     showObjectivesEl.value = schedule.showDetails?.objectives || "";
                 } else {
                     console.warn("Element with ID 'showObjectives' not found in modal.");
                 }

                 populateNameFields("execProducer", schedule.executiveProducer);
                 populateNameFields("creativeStaff", schedule.creativeStaff);

                 populateDynamicNameFields("hosts-container", "host-input-group", schedule.hosts, addHost, updateHostIndices, toggleAddHostButton); // Use correct class
                 populateDynamicNameFields("technical-container", "technical-input-group", schedule.technicalStaff, addTechnical, updateTechnicalIndices, toggleAddTechnicalButton); // Use correct class

                 // --- Populate Show Type Checkboxes ---
                 if (schedule.showDetails && Array.isArray(schedule.showDetails.type)) {
                    const scheduleTypes = schedule.showDetails.type;
                    let otherValue = null;
                    const standardCheckboxValues = Array.from(typeCheckboxes)
                        .filter(cb => cb.id !== 'other')
                        .map(cb => cb.value);

                    scheduleTypes.forEach(type => {
                        const matchingCheckbox = document.querySelector(`input[name='showDetails.type[]'][value="${type}"]`);
                        if (matchingCheckbox) {
                            matchingCheckbox.checked = true;
                        } else if (!standardCheckboxValues.includes(type)) {
                            otherValue = type;
                        }
                    });

                    if (otherValue !== null) {
                        if (otherCheckbox) otherCheckbox.checked = true;
                        if (otherInput) {
                            otherInput.value = otherValue;
                            otherInput.disabled = false;
                        }
                    } else {
                         if (otherInput) otherInput.disabled = true;
                    }
                 }
                 // --- End Populate Show Type Checkboxes ---

                 saveButton.textContent = "Edit";
                 deleteButton.style.display = "inline-block";

             } catch (error) {
                 console.error("Error fetching schedule details:", error);
                 alert("Failed to load schedule details.");
                 if (modal) modal.style.display = "none";
                 return;
             }
         }

         // Display the modal
         if (modal) modal.style.display = "block";
    }

    // --- Modal Event Listeners ---

    if (closeModal) {
        closeModal.onclick = () => {
            if (modal) modal.style.display = "none";
        };
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            // TODO: Implement robust data gathering and validation
            console.warn("Save/Edit schedule logic not fully implemented.");

            const scheduleId = scheduleForm.dataset.scheduleId;
            const method = scheduleId ? 'PATCH' : 'POST';
            const url = scheduleId ? `/schedule/${scheduleId}` : '/schedule';

            // Basic data gathering - NEEDS REFINEMENT for arrays/objects
            const formData = new FormData(scheduleForm);
            const scheduleData = {};

            // Manually structure nested objects and arrays
            scheduleData.showDetails = {};
            scheduleData.executiveProducer = {};
            scheduleData.creativeStaff = {};
            scheduleData.hosts = [];
            scheduleData.technicalStaff = [];
            scheduleData.showDetails.type = [];

            // Iterate through FormData entries
            for (let [key, value] of formData.entries()) {
                // Handle showDetails.type array
                if (key === 'showDetails.type[]') {
                    scheduleData.showDetails.type.push(value);
                }
                // Handle nested objects like executiveProducer.lastName
                else if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    if (parent === 'showDetails') {
                        scheduleData.showDetails[child] = value;
                    } else if (parent === 'executiveProducer') {
                        scheduleData.executiveProducer[child] = value;
                    } else if (parent === 'creativeStaff') {
                        scheduleData.creativeStaff[child] = value;
                    }
                }
                // Handle arrays like hosts[0][lastName]
                else if (key.includes('[')) {
                    const match = key.match(/(\w+)\[(\d+)\]\[(\w+)\]/);
                    if (match) {
                        const arrayName = match[1]; // 'hosts' or 'technicalStaff'
                        const index = parseInt(match[2], 10);
                        const fieldName = match[3]; // 'lastName', 'firstName', etc.

                        if (scheduleData[arrayName]) {
                            // Ensure the object at the index exists
                            if (!scheduleData[arrayName][index]) {
                                scheduleData[arrayName][index] = {};
                            }
                            scheduleData[arrayName][index][fieldName] = value;
                        }
                    }
                }
                 // Handle simple fields (if any) - none expected at top level based on form
                 // else {
                 //     scheduleData[key] = value;
                 // }
            }

            // Add day, time, schoolYear from outside the form elements
            scheduleData.day = scheduleForm.dataset.day;
            scheduleData.time = scheduleForm.dataset.time;
            scheduleData.schoolYear = modalSchoolYearDropdown.value;

            // Handle 'Other' show type - if 'Other' checkbox is checked, use the input value
            const otherCheckbox = document.getElementById('other');
            const otherInput = document.getElementById('other-input');
            if (otherCheckbox?.checked && otherInput?.value) {
                // Remove the placeholder 'Other' value if present and add the custom one
                scheduleData.showDetails.type = scheduleData.showDetails.type.filter(t => t !== 'Other');
                scheduleData.showDetails.type.push(otherInput.value.trim());
            }

            console.log("Prepared schedule data:", scheduleData);

            // Basic Validation (Expand as needed)
            if (!scheduleData.day || !scheduleData.time || !scheduleData.schoolYear) {
                alert("Missing day, time, or school year.");
                return;
            }
            if (!scheduleData.showDetails?.title) {
                alert("Show Title is required.");
                return;
            }
            // Add more validation for required fields...

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scheduleData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to ${method === 'POST' ? 'save' : 'update'} schedule`);
                }
                alert(`Schedule ${method === 'POST' ? 'saved' : 'updated'} successfully!`);
                modal.style.display = 'none';
                await refreshSchedule(schoolYearDropdown.value); // Refresh grid for the current view
            } catch (error) {
                console.error(`Error ${method === 'POST' ? 'saving' : 'updating'} schedule:`, error);
                alert(`Failed to ${method === 'POST' ? 'save' : 'update'} schedule. ${error.message}`);
            }
        });
    }


    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            const scheduleId = scheduleForm.dataset.scheduleId;
            if (!scheduleId) return;

            if (confirm("Are you sure you want to delete this schedule?")) {
                try {
                    const response = await fetch(`/schedule/${scheduleId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Failed to delete schedule');
                    alert('Schedule deleted successfully!');
                    modal.style.display = 'none';
                    await refreshSchedule(schoolYearDropdown.value);
                } catch (error) {
                    console.error('Error deleting schedule:', error);
                    alert('Failed to delete schedule.');
                }
            }
        });
    }

    // --- Submission Form Event Listeners ---
    if (submissionSubmitButton) {
        submissionSubmitButton.addEventListener("click", (e) => {
            const submissionId = e.target.dataset.submissionId;
            if (submissionId) {
                updateSubmission(submissionId);
            } else {
                console.error("No submission ID found on submit button.");
            }
        });
    }

    if (submissionCancelButton) {
        submissionCancelButton.addEventListener("click", () => {
            clearFields();
        });
    }

    // Add listener for preferredDay change to update time options
    const preferredDayDropdown = document.getElementById("preferredDay");
    if (preferredDayDropdown) {
        preferredDayDropdown.addEventListener("change", async () => {
            const selectedDay = preferredDayDropdown.value;
            const preferredTimeDropdown = document.getElementById("preferredTime");
            // Ensure we have a submission ID when changing day/time
            const submissionId = document.querySelector("#submission-form .submit-button")?.dataset.submissionId;

            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';
            preferredTimeDropdown.disabled = true;

            if (!selectedDay || !currentSubmissionSchoolYear) {
                preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>';
                return;
            }

            try {
                // Use existingSchedules global variable
                const occupiedTimes = existingSchedules
                    .filter(schedule =>
                        schedule.day === selectedDay &&
                        schedule.schoolYear === currentSubmissionSchoolYear &&
                        (!submissionId || schedule.submissionId !== submissionId) // Exclude self only if submissionId is known
                    )
                    .map(schedule => schedule.time.trim());

                console.log(`(Day Change) Occupied times for ${selectedDay} in ${currentSubmissionSchoolYear}:`, occupiedTimes);

                preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>';

                let timeSlotAdded = false;
                ALL_TIME_SLOTS.forEach((time) => {
                    if (selectedDay !== 'Friday' && time === '12:01-12:55') return;

                    const normalizedTime = time.trim();
                    const isOccupied = occupiedTimes.includes(normalizedTime);
                    // Check against original time only if we have a submission context
                    const isOriginalTime = submissionId && (normalizedTime === originalSubmissionPreferredTime);

                    if (!isOccupied || isOriginalTime) {
                        const option = document.createElement("option");
                        option.value = normalizedTime;
                        option.textContent = normalizedTime;
                        // Don't pre-select here, let selectSubmission handle pre-selection
                        preferredTimeDropdown.appendChild(option);
                        timeSlotAdded = true;
                    } else {
                         console.log(`(Day Change) Time slot ${normalizedTime} is occupied.`);
                    }
                });

                preferredTimeDropdown.disabled = !timeSlotAdded;
                if (!timeSlotAdded) {
                    preferredTimeDropdown.innerHTML = '<option value="" disabled selected>No times available</option>';
                }

            } catch (error) {
                console.error("Error updating time slots:", error);
                preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Error loading times</option>';
            }
        });
    }


}); // End DOMContentLoaded

/*-----SUBMISSIONS TAB FUNCTIONS (Defined outside DOMContentLoaded for broader scope)-----*/

// Fetch and display submissions in the table
async function loadSubmissions() {
    const tableBody = document.getElementById("submissions-table-body");
    if (!tableBody) return;

    try {
        const schoolYearDropdown = document.getElementById("submissionSchoolYear");
        const schoolYear = schoolYearDropdown ? schoolYearDropdown.value : null;

        if (!schoolYear) {
            console.warn("loadSubmissions: No school year selected.");
            tableBody.innerHTML = '<tr><td colspan="5">Please select a school year.</td></tr>';
            return;
        }

        const resultFilter = document.getElementById("resultFilter");
        const result = resultFilter ? resultFilter.value : "All";
        const queryParams = new URLSearchParams({ schoolYear });
        if (result && result !== "All") queryParams.append("result", result);

        const response = await fetch(`/submissions?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch submissions: ${response.statusText}`);

        const submissions = await response.json();
        console.log(`Submissions for ${schoolYear} (Filter: ${result}):`, submissions);

        tableBody.innerHTML = "";

        if (Array.isArray(submissions) && submissions.length > 0) {
            submissions.forEach((submission) => {
                const row = document.createElement("tr");
                const displayResult = submission.result ? submission.result.charAt(0).toUpperCase() + submission.result.slice(1) : "Pending";
                row.classList.add(`result-${(submission.result || 'Pending').toLowerCase()}`);
                row.innerHTML = `
                    <td>${submission.showDetails?.title || "N/A"}</td>
                    <td>${submission.organizationName || "N/A"}</td>
                    <td>${submission.preferredSchedule?.day || "N/A"} ${submission.preferredSchedule?.time || "N/A"}</td>
                    <td>${displayResult}</td>
                    <td><button type="button" class="select-btn" data-id="${submission._id}">Select</button></td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No submissions found for the selected criteria.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading submissions:", error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load submissions. Please try again.</td></tr>';
        }
    }
}

// Add event listener for select buttons using delegation (add this inside DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    const submissionsTableBody = document.getElementById("submissions-table-body");
    if (submissionsTableBody) {
        submissionsTableBody.addEventListener('click', (event) => {
            if (event.target.classList.contains('select-btn')) {
                const submissionId = event.target.dataset.id;
                selectSubmission(submissionId, existingSchedules); // Pass global schedules
            }
        });
    }
});


// Populate the form with the selected submission's details
async function selectSubmission(submissionId, schedulesForAvailability) {
    console.log("Selecting submission:", submissionId, "using schedules:", schedulesForAvailability);
    try {
        const response = await fetch(`/submissions/${submissionId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch submission details: ${response.statusText}`);
        }
        const submission = await response.json();

        originalSubmissionPreferredTime = submission.preferredSchedule?.time || null;
        currentSubmissionSchoolYear = submission.schoolYear;

        // --- Populate Read-only Fields (Using unique IDs for submission form) ---
        // Ensure these IDs exist and are unique in the submission form section of your EJS
        document.getElementById("submissionOrganizationName").value = submission.organizationName || ""; // Assuming this ID is unique or intended for submission form
        document.getElementById("submissionOrganizationType").value = submission.organizationType || ""; // Assuming unique
        document.getElementById("submissionProponentName").value = formatName(submission.proponent); // Assuming unique
        document.getElementById("submissionProponentCYS").value = submission.proponent?.cys || ""; // Assuming unique

        if (submission.coProponent?.notApplicable) {
            document.getElementById("submissionCoProponentName").value = "N/A"; // Assuming unique
            document.getElementById("submissionCoProponentCYS").value = "N/A"; // Assuming unique
        } else {
            document.getElementById("submissionCoProponentName").value = formatName(submission.coProponent); // Assuming unique
            document.getElementById("submissionCoProponentCYS").value = submission.coProponent?.cys || ""; // Assuming unique
        }

        document.getElementById("executiveProducer").value = formatName(submission.executiveProducer); // Assuming unique
        document.getElementById("executiveProducerCYS").value = submission.executiveProducer?.cys || ""; // Assuming unique

        if (submission.facultyStaff?.notApplicable) {
            document.getElementById("facultyStaff").value = "N/A"; // Assuming unique
            document.getElementById("facultyStaffDepartment").value = "N/A"; // Assuming unique
        } else {
            document.getElementById("facultyStaff").value = formatName(submission.facultyStaff); // Assuming unique
            document.getElementById("facultyStaffDepartment").value = submission.facultyStaff?.department || ""; // Assuming unique
        }

        // Populate Hosts (Read-only) - Assuming unique container ID "submissionHostContainer"
        const subHostContainer = document.getElementById("submissionHostContainer"); // Use unique ID
        if (subHostContainer) {
            subHostContainer.innerHTML = ""; // Clear previous
            if (submission.hosts && submission.hosts.length > 0) {
                submission.hosts.forEach((host, index) => {
                    const hostField = document.createElement("div");
                    hostField.className = 'readonly-field-group';
                    // Use unique IDs for generated elements if needed, though maybe not necessary if just display
                    hostField.innerHTML = `
                        <label>Host ${index + 1} Name:</label>
                        <input type="text" value="${formatName(host)}" readonly>
                        <label>Host ${index + 1} CYS:</label>
                        <input type="text" value="${host.cys || ""}" readonly>
                    `;
                    subHostContainer.appendChild(hostField);
                });
            } else {
                subHostContainer.innerHTML = "<p>No hosts listed.</p>";
            }
        } else { console.warn("selectSubmission: Container 'submissionHostContainer' not found."); }


        // Populate Technical Staff (Read-only) - Assuming unique container ID "submissionTechnicalStaffContainer"
        const subTechContainer = document.getElementById("submissionTechnicalStaffContainer"); // Use unique ID
         if (subTechContainer) {
            subTechContainer.innerHTML = ""; // Clear previous
            if (submission.technicalStaff && submission.technicalStaff.length > 0) {
                submission.technicalStaff.forEach((tech, index) => {
                    const techField = document.createElement("div");
                    techField.className = 'readonly-field-group';
                    techField.innerHTML = `
                        <label>Tech Staff ${index + 1} Name:</label>
                        <input type="text" value="${formatName(tech)}" readonly>
                        <label>Tech Staff ${index + 1} CYS:</label>
                        <input type="text" value="${tech.cys || ""}" readonly>
                    `;
                    subTechContainer.appendChild(techField);
                });
            } else {
                subTechContainer.innerHTML = "<p>No technical staff listed.</p>";
            }
        } else { console.warn("selectSubmission: Container 'submissionTechnicalStaffContainer' not found."); }


        // Use unique IDs for submission form elements
        const subShowDescEl = document.getElementById("submissionShowDescription");
        if (subShowDescEl) subShowDescEl.value = submission.showDetails?.description || ""; else console.warn("selectSubmission: Missing 'submissionShowDescription'");

        const subCreativeStaffEl = document.getElementById("submissionCreativeStaff");
        if (subCreativeStaffEl) subCreativeStaffEl.value = formatName(submission.creativeStaff); else console.warn("selectSubmission: Missing 'submissionCreativeStaff'");

        const subCreativeStaffCYSEl = document.getElementById("submissionCreativeStaffCYS");
        if (subCreativeStaffCYSEl) subCreativeStaffCYSEl.value = submission.creativeStaff?.cys || ""; else console.warn("selectSubmission: Missing 'submissionCreativeStaffCYS'");

        const subDlsudEmailEl = document.getElementById("submissionDlsudEmail"); // Assuming unique ID
        if (subDlsudEmailEl) subDlsudEmailEl.value = submission.contactInfo?.dlsudEmail || ""; else console.warn("selectSubmission: Missing 'submissionDlsudEmail'");

        const subContactEmailEl = document.getElementById("submissionContactEmail"); // Assuming unique ID
        if (subContactEmailEl) subContactEmailEl.value = submission.contactInfo?.contactEmail || ""; else console.warn("selectSubmission: Missing 'submissionContactEmail'");

        const subContactFbLinkEl = document.getElementById("submissionContactFbLink"); // Assuming unique ID
        if (subContactFbLinkEl) subContactFbLinkEl.value = submission.contactInfo?.contactFbLink || ""; else console.warn("selectSubmission: Missing 'submissionContactFbLink'");

        // Handle FB Link visibility - Assuming unique IDs "submissionFbLinkContainer" and "submissionFbLink"
        const subFbLinkContainer = document.getElementById("submissionFbLinkContainer");
        const subFbLinkInput = document.getElementById("submissionFbLink");
        if (subFbLinkContainer && subFbLinkInput) {
            if (submission.contactInfo?.crossposting === "Yes") {
                subFbLinkInput.value = submission.contactInfo?.fbLink || "";
                subFbLinkContainer.style.display = "block";
            } else {
                subFbLinkContainer.style.display = "none";
                subFbLinkInput.value = "";
            }
        } else { console.warn("selectSubmission: Missing FB Link container or input for submission form."); }

        // Handle Signature - Assuming unique ID "submissionProponentSignature"
        const subProponentSignatureImg = document.getElementById("submissionProponentSignature");
        if (subProponentSignatureImg) {
            if (submission.proponentSignature) {
                subProponentSignatureImg.src = submission.proponentSignature;
                subProponentSignatureImg.style.display = "block";
            } else {
                subProponentSignatureImg.src = "";
                subProponentSignatureImg.style.display = "none";
            }
        } else { console.warn("selectSubmission: Missing signature image element for submission form."); }


        // Assuming unique IDs for these as well
        const subShowTitleEl = document.getElementById("submissionShowTitle");
        if (subShowTitleEl) subShowTitleEl.value = submission.showDetails?.title || ""; else console.warn("selectSubmission: Missing 'submissionShowTitle'");

        const subShowTypeEl = document.getElementById("submissionShowType");
        if (subShowTypeEl) {
             subShowTypeEl.value = Array.isArray(submission.showDetails?.type)
                ? submission.showDetails.type.join(', ')
                : (submission.showDetails?.type || "");
        } else { console.warn("selectSubmission: Missing 'submissionShowType'"); }

        const subShowObjectivesEl = document.getElementById("submissionShowObjectives");
        if (subShowObjectivesEl) subShowObjectivesEl.value = submission.showDetails?.objectives || ""; else console.warn("selectSubmission: Missing 'submissionShowObjectives'");
        // --- End Populate Read-only Fields ---


        // --- Populate Editable Fields (Preferred Schedule, Result) ---
        // These IDs are likely intended to be unique to the submission form's editable section
        const preferredDayDropdown = document.getElementById("preferredDay");
        const preferredTimeDropdown = document.getElementById("preferredTime");
        const resultDropdown = document.getElementById("result");

        if (!preferredDayDropdown || !preferredTimeDropdown || !resultDropdown) {
            console.error("selectSubmission: Missing one or more editable dropdowns (preferredDay, preferredTime, result).");
            return; // Stop if essential elements are missing
        }

        const selectedDay = submission.preferredSchedule?.day || "";
        const selectedTime = submission.preferredSchedule?.time || "";

        preferredDayDropdown.value = selectedDay;

        // Populate time dropdown based on selected day and availability
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>';
        preferredTimeDropdown.disabled = true;

        if (selectedDay && currentSubmissionSchoolYear) {
            const occupiedTimes = schedulesForAvailability
                .filter(schedule => schedule.day === selectedDay && schedule.schoolYear === currentSubmissionSchoolYear && schedule.submissionId !== submissionId)
                .map(schedule => schedule.time.trim());

            console.log(`Occupied times for ${selectedDay} in ${currentSubmissionSchoolYear} (excluding current submission ${submissionId}):`, occupiedTimes);

            let timeSlotAdded = false;
            ALL_TIME_SLOTS.forEach((time) => {
                if (selectedDay !== 'Friday' && time === '12:01-12:55') return;

                const normalizedTime = time.trim();
                const isOccupied = occupiedTimes.includes(normalizedTime);
                const isCurrentSubmissionTime = normalizedTime === selectedTime;

                if (!isOccupied || isCurrentSubmissionTime) {
                    const option = document.createElement("option");
                    option.value = normalizedTime;
                    option.textContent = normalizedTime;
                    if (isCurrentSubmissionTime) {
                        option.selected = true; // Pre-select
                    }
                    preferredTimeDropdown.appendChild(option);
                    timeSlotAdded = true;
                } else {
                     console.log(`Time slot ${normalizedTime} is occupied by another schedule.`);
                }
            });

            preferredTimeDropdown.disabled = !timeSlotAdded;
            if (!timeSlotAdded && selectedTime) {
                 console.warn(`Previously selected time ${selectedTime} is no longer available and no other slots found.`);
                 preferredTimeDropdown.innerHTML = '<option value="" disabled selected>No times available</option>';
            } else if (!timeSlotAdded) {
                 preferredTimeDropdown.innerHTML = '<option value="" disabled selected>No times available</option>';
            } else if (!selectedTime) {
                 preferredTimeDropdown.value = ""; // Ensure default is selected if no time was initially set
            }

        } else {
            console.warn("Cannot populate times: Day or Year not selected/available.");
            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a day first</option>';
        }

        // Set Result Dropdown
        const dbResult = submission.result || "Pending";
        resultDropdown.value = dbResult.charAt(0).toUpperCase() + dbResult.slice(1);

        // --- Enable/Disable Form Elements ---
        initialSubmissionResult = resultDropdown.value;
        const isDecided = initialSubmissionResult !== 'Pending';
        resultDropdown.disabled = isDecided;
        preferredDayDropdown.disabled = isDecided;
        preferredTimeDropdown.disabled = isDecided || preferredTimeDropdown.disabled;

        const subCancelBtn = document.querySelector("#submission-form .cancel-button");
        if (subCancelBtn) subCancelBtn.disabled = false;

        const subSubmitBtn = document.querySelector("#submission-form .submit-button");
        if (subSubmitBtn) {
            subSubmitBtn.disabled = isDecided;
            subSubmitBtn.dataset.submissionId = submissionId;
        }

    } catch (error) {
        console.error("Error fetching or populating submission details:", error);
        alert("Failed to load submission details.");
        clearFields();
    }
}

// Helper function to format names consistently
function formatName(person) {
    if (!person) return "N/A";
    const lastName = person.lastName || "";
    const firstName = person.firstName || "";
    const mi = person.middleInitial || person.mi || "";
    const suffix = person.suffix || "";

    let parts = [];
    if (lastName) parts.push(lastName + ",");
    if (firstName) parts.push(firstName);
    if (mi) parts.push(mi);
    if (suffix) parts.push(suffix);

    let formattedName = parts.join(" ");
    formattedName = formattedName.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
    if (formattedName === ",") return "N/A";

    return formattedName || "N/A";
}


// Update submission result and potentially create/update/delete schedule
async function updateSubmission(submissionId) {
    const resultDropdown = document.getElementById("result");
    const preferredDay = document.getElementById("preferredDay").value;
    const preferredTime = document.getElementById("preferredTime").value;

    if (!resultDropdown || !preferredDay || !preferredTime) {
        alert("Error: Could not find result, day, or time dropdowns.");
        return;
    }

    const newResult = resultDropdown.value;
    const selectedYear = currentSubmissionSchoolYear;

    // --- Confirmation Check ---
    if (initialSubmissionResult === 'Pending' && (newResult === 'Accepted' || newResult === 'Rejected')) {
        const action = newResult === 'Accepted' ? 'Accept' : 'Reject';
        if (!confirm(`Are you sure you want to ${action} this submission? This action is irreversible.`)) {
            resultDropdown.value = initialSubmissionResult; // Reset dropdown
            return;
        }
    }

    // --- Validations ---
    if (newResult === "Pending") {
        alert("Please select a RESULT (Accepted or Rejected) before submitting.");
        return;
    }
    if (!preferredDay) {
        alert("Please select a preferred DAY before submitting.");
        return;
    }
    if (!preferredTime || preferredTime === "Select a time" || preferredTime === "No times available" || preferredTime === "Select day first" || preferredTime === "Loading...") {
        alert("Please select an available preferred TIME before submitting.");
        return;
    }

    // --- Check for Schedule Conflicts (only if Accepting) ---
    if (newResult === "Accepted") {
        try {
            const conflictCheckResponse = await fetch(`/schedule?day=${preferredDay}&time=${preferredTime}&schoolYear=${selectedYear}`);
            if (!conflictCheckResponse.ok) throw new Error("Failed to check existing schedules for conflicts");
            const conflictingSchedules = await conflictCheckResponse.json();
            const actualConflict = conflictingSchedules.find(sch => sch.submissionId !== submissionId);

            if (actualConflict) {
                alert(`${preferredDay} (${preferredTime}) is already occupied by '${actualConflict.showDetails?.title || 'another show'}' in ${selectedYear}. Please choose a different time/day or reject.`);
                return;
            }
        } catch (error) {
            console.error("Error checking existing schedules for conflicts:", error);
            alert("An error occurred while checking schedule availability. Please try again.");
            return;
        }
    }

    // --- Prepare Update Payload ---
    const updates = {
        result: newResult, // Assuming backend expects Capitalized
        preferredSchedule: {
            day: preferredDay,
            time: preferredTime
        }
    };
    console.log("Sending updates:", updates);

    // --- Update Submission ---
    try {
        const patchResponse = await fetch(`/submissions/${submissionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
        });

        const resultData = await patchResponse.json();

        if (!patchResponse.ok) {
            console.error("Backend Error updating submission:", resultData);
            throw new Error(resultData.error || resultData.message || `Failed to update submission (Status: ${patchResponse.status})`);
        }

        alert("Submission updated successfully!");
        initialSubmissionResult = newResult;

        if (newResult === 'Accepted' || newResult === 'Rejected') {
            resultDropdown.disabled = true;
            document.getElementById("preferredDay").disabled = true;
            document.getElementById("preferredTime").disabled = true;
            const submitBtn = document.querySelector("#submission-form .submit-button");
            if (submitBtn) submitBtn.disabled = true;
        }

        // --- Handle Schedule Creation/Update/Deletion ---
        const scheduleDisplayYear = document.getElementById("schoolYear").value;

        if (newResult === "Accepted") {
            const submissionResponse = await fetch(`/submissions/${submissionId}`);
            if (!submissionResponse.ok) throw new Error("Failed to re-fetch submission after update.");
            const submission = await submissionResponse.json();

            if (!submission.preferredSchedule?.day || !submission.preferredSchedule?.time) {
                throw new Error("Updated submission is missing preferred schedule details.");
            }

            const scheduleData = {
                day: submission.preferredSchedule.day,
                time: submission.preferredSchedule.time,
                showDetails: submission.showDetails || {},
                executiveProducer: submission.executiveProducer || {},
                hosts: submission.hosts || [],
                technicalStaff: submission.technicalStaff || [],
                creativeStaff: submission.creativeStaff || {},
                schoolYear: selectedYear,
                submissionId: submissionId
            };
            console.log("Schedule data being prepared:", scheduleData);

            const checkScheduleResponse = await fetch(`/schedule/bySubmission/${submissionId}`);
            let existingScheduleId = null;
            if (checkScheduleResponse.ok) {
                const existingSchedule = await checkScheduleResponse.json();
                if (existingSchedule) existingScheduleId = existingSchedule._id;
            } else if (checkScheduleResponse.status !== 404) {
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
                 alert(`Submission accepted, but failed to ${existingScheduleId ? 'update' : 'save'} schedule. Error: ${scheduleResultData.error || 'Unknown error'}`);
            } else {
                alert(`Schedule ${existingScheduleId ? 'updated' : 'saved'} successfully!`);
                await refreshSchedule(scheduleDisplayYear);
            }

        } else if (newResult === "Rejected") {
            try {
                const checkScheduleResponse = await fetch(`/schedule/bySubmission/${submissionId}`);
                if (checkScheduleResponse.ok) {
                    const existingSchedule = await checkScheduleResponse.json();
                    if (existingSchedule?._id) {
                        console.log(`Deleting existing schedule ${existingSchedule._id} for rejected submission...`);
                        const deleteResponse = await fetch(`/schedule/${existingSchedule._id}`, { method: 'DELETE' });
                        if (deleteResponse.ok) {
                            alert("Associated schedule removed for rejected submission.");
                            await refreshSchedule(scheduleDisplayYear);
                        } else {
                            console.error("Failed to delete associated schedule:", await deleteResponse.text());
                            alert("Submission rejected, but failed to remove associated schedule.");
                        }
                    }
                } else if (checkScheduleResponse.status !== 404) {
                     console.error("Error checking for schedule to delete:", await checkScheduleResponse.text());
                }
            } catch (scheduleCheckError) {
                console.error("Error checking/deleting schedule during rejection:", scheduleCheckError);
            }
        }

        loadSubmissions(); // Reload the submissions table

    } catch (error) {
        console.error("Error during submission update process:", error);
        alert(`An error occurred: ${error.message}`);
    }
}


// Clear submission detail fields and reset state
function clearFields() {
    console.log("Attempting to clear submission fields...");
    const form = document.getElementById('submission-form');
    if (form) {

        // Clear specific read-only fields (using unique IDs where applicable)
        const fieldsToClear = [
            "submissionOrganizationName", "submissionOrganizationType", "submissionProponentName", "submissionProponentCYS",
            "submissionCoProponentName", "submissionCoProponentCYS", "executiveProducer", "executiveProducerCYS",
            "facultyStaff", "facultyStaffDepartment",
            "submissionCreativeStaff", // Unique ID
            "submissionCreativeStaffCYS", // Unique ID
            "submissionDlsudEmail", // Unique ID
            "submissionContactEmail", // Unique ID
            "submissionContactFbLink", // Unique ID
            "submissionFbLink", // Unique ID
            "submissionShowTitle", // Unique ID
            "submissionShowType", // Unique ID
            "submissionShowDescription", // Unique ID
            "submissionShowObjectives" // Unique ID
        ];

        fieldsToClear.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Check if it's a textarea or input
                if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                    el.value = "";
                }
            } else {
                console.warn(`clearFields: Missing element with ID '${id}'`);
            }
        });

        // Clear dynamic containers (using unique IDs)
        const subHostContainer = document.getElementById("submissionHostContainer");
        if (subHostContainer) subHostContainer.innerHTML = "<p>Select a submission to view details.</p>";
        else console.warn("clearFields: Missing 'submissionHostContainer'");

        const subTechContainer = document.getElementById("submissionTechnicalStaffContainer");
        if (subTechContainer) subTechContainer.innerHTML = "<p>Select a submission to view details.</p>";
        else console.warn("clearFields: Missing 'submissionTechnicalStaffContainer'");

        // Hide FB Link container (using unique ID)
        const subFbLinkContainer = document.getElementById("submissionFbLinkContainer");
        if (subFbLinkContainer) subFbLinkContainer.style.display = "none";
        else console.warn("clearFields: Missing 'submissionFbLinkContainer'");

        // Hide Signature (using unique ID)
        const subSigImg = document.getElementById("submissionProponentSignature");
        if (subSigImg) {
            subSigImg.src = "";
            subSigImg.style.display = "none";
        } else { console.warn("clearFields: Missing 'submissionProponentSignature'"); }


        // Reset dropdowns (These are the editable ones, likely unique to submission form)
        const preferredDayDropdown = document.getElementById("preferredDay");
        const preferredTimeDropdown = document.getElementById("preferredTime");
        const resultDropdown = document.getElementById("result");

        if (preferredDayDropdown) {
            preferredDayDropdown.value = "";
            preferredDayDropdown.disabled = true; // Disable initially
        } else {
            console.error("clearFields: Could not find element with ID 'preferredDay'");
        }

        if (preferredTimeDropdown) {
            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a day first</option>';
            preferredTimeDropdown.disabled = true;
        } else {
            console.error("clearFields: Could not find element with ID 'preferredTime'");
        }

        if (resultDropdown) {
            try {
                resultDropdown.value = "Pending";
                resultDropdown.disabled = true; // Disable initially
            } catch (e) {
                console.error("clearFields: Error setting value for 'result' dropdown:", e);
            }
        } else {
            console.error("clearFields: Could not find element with ID 'result'. Check EJS file and script timing.");
        }

        // Reset state variables
        initialSubmissionResult = 'Pending';
        originalSubmissionPreferredTime = null;
        currentSubmissionSchoolYear = null;

        // Disable buttons
        const subCancelBtn = document.querySelector("#submission-form .cancel-button");
        if (subCancelBtn) subCancelBtn.disabled = true;

        const subSubmitBtn = document.querySelector("#submission-form .submit-button");
        if (subSubmitBtn) {
            subSubmitBtn.disabled = true;
            subSubmitBtn.removeAttribute('data-submission-id');
        }

        console.log("Submission detail fields cleared.");
    } else {
        console.error("Submission form with id 'submission-form' not found for clearing.");
    }
}