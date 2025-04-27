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

// --- GLOBAL STATE VARIABLES --- <<< VERIFY THESE ARE PRESENT AND AT TOP LEVEL
let occupiedSlotsByDay = {};
let currentSubmissionSchoolYear = null;
let existingSchedules = [];
let originalSubmissionPreferredTime = null;
let initialSubmissionResult = 'Pending';
let hostIndex = 1; // <<< ENSURE THIS LINE EXISTS GLOBALLY
let technicalIndex = 1; // <<< ENSURE THIS LINE EXISTS GLOBALLY
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
    const firstInputGroup = container.querySelector(`.${inputClass}-group`);
    container.innerHTML = ''; // Clear container
    if (firstInputGroup) {
        // Clear values in the template group
        firstInputGroup.querySelectorAll('input').forEach(input => input.value = '');
        container.appendChild(firstInputGroup); // Add the cleared template back
    }
    // Reset indices (assuming index variables are global or accessible)
    // Make sure hostIndex and technicalIndex are defined globally if used here
    if (typeof hostIndex !== 'undefined' && containerId === 'hosts-container') hostIndex = 1;
    if (typeof technicalIndex !== 'undefined' && containerId === 'technical-container') technicalIndex = 1;
    // Call the add function once if needed to ensure one row is visible
    // if (typeof addFunction === 'function') addFunction();
}

// --- Basic Implementation for Dynamic Row Addition ---
// NOTE: Assumes your template group has class 'host-input-group' or 'technical-input-group'
// NOTE: Assumes your container has id 'hosts-container' or 'technical-container'
// NOTE: Assumes global hostIndex and technicalIndex variables exist and track the *next* index to use

function addHost() {
    const container = document.getElementById('hosts-container');
    const template = container.querySelector('.host-input-group'); // Find the template row
    if (!template || !container) return null; // Exit if template or container not found

    if (hostIndex >= MAX_HOSTS) return null; // Check limit

    const newRow = template.cloneNode(true); // Clone the template

    // Clear input values in the new row
    newRow.querySelectorAll('input').forEach(input => input.value = '');

    // IMPORTANT: Update name attributes if they rely on index (e.g., hosts[0][lastName] -> hosts[1][lastName])
    // This example assumes names might be like 'hosts[INDEX][fieldName]'
    newRow.querySelectorAll('input').forEach(input => {
        if (input.name) {
            input.name = input.name.replace(/\[\d+\]/, `[${hostIndex}]`);
        }
        // Update IDs if necessary, e.g., id="host_0_lastName" -> id="host_1_lastName"
        if (input.id) {
             input.id = input.id.replace(/_\d+_/, `_${hostIndex}_`);
        }
    });
    // Update label 'for' attributes if necessary
     newRow.querySelectorAll('label').forEach(label => {
        if (label.htmlFor) {
             label.htmlFor = label.htmlFor.replace(/_\d+_/, `_${hostIndex}_`);
        }
    });


    // Add remove button logic if needed for the new row
    const removeButton = newRow.querySelector('.remove-host-button'); // Assuming a remove button exists
    if (removeButton) {
        removeButton.style.display = 'inline-block'; // Make it visible
        removeButton.onclick = () => {
            newRow.remove();
            // Decrement index? Update indices? Handle carefully.
            // For simplicity here, we might just let updateIndices fix it later.
            hostIndex--; // Basic decrement, might need more robust handling
            toggleAddHostButton();
        };
    } else {
         // Optionally create and append a remove button dynamically
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

    if (technicalIndex >= MAX_TECHNICAL) return null;

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


    // Add remove button logic if needed
    const removeButton = newRow.querySelector('.remove-technical-button');
     if (removeButton) {
        removeButton.style.display = 'inline-block';
        removeButton.onclick = () => {
            newRow.remove();
            technicalIndex--;
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
    // This line needs access to the global hostIndex
    if (button) button.disabled = hostIndex >= MAX_HOSTS;
}
function toggleAddTechnicalButton() {
    const button = document.getElementById('addTechnical');
    // This line needs access to the global technicalIndex
    if (button) button.disabled = technicalIndex >= MAX_TECHNICAL;
}
function updateHostIndices() { console.warn("updateHostIndices function not fully implemented"); /* ... Add your logic ... */ }
function updateTechnicalIndices() { console.warn("updateTechnicalIndices function not fully implemented"); /* ... Add your logic ... */ }

// Helper function to populate standard name fields (Last, First, MI, Suffix, CYS/Dept)
function populateNameFields(prefix, person) {
    console.log(`Populating fields for prefix: ${prefix}`, person);
    if (!person) {
        // Clear fields if person data is missing
        const fields = ['LastName', 'FirstName', 'MI', 'Suffix', 'CYS', 'Department']; // Add all relevant suffixes
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
    // Handle CYS or Department based on prefix (adjust IDs as needed)
    const cysDeptEl = document.getElementById(`${prefix}CYS`) || document.getElementById(`${prefix}Department`);

    console.log(`Found elements for ${prefix}:`, { lastNameEl, firstNameEl, miEl, suffixEl, cysDeptEl });

    if (lastNameEl) lastNameEl.value = person.lastName || "";
    if (firstNameEl) firstNameEl.value = person.firstName || "";
    if (miEl) miEl.value = person.mi || person.middleInitial || ""; // Check both possible keys
    if (suffixEl) suffixEl.value = person.suffix || "";
    if (cysDeptEl) cysDeptEl.value = person.cys || person.department || ""; // Check both possible keys
}

// Helper function to populate dynamic name fields (like hosts, technical staff)
function populateDynamicNameFields(containerId, inputClass, people, addFunction, updateIndicesFunction, toggleButtonFunction) {
    console.log(`Populating dynamic fields for: ${containerId}`, people);
    const container = document.getElementById(containerId);
    if (!container) return;

    // Find the template row (assuming the first group is the template)
    const template = container.querySelector(`.${inputClass}-group`);
    if (!template) {
        console.error(`Template row with class '${inputClass}-group' not found in container '${containerId}'`);
        return;
    }

    // Clear existing dynamic rows BUT KEEP the template structure in memory
    container.innerHTML = '';
    container.appendChild(template); // Put template back (it will be populated or cleared)

    // Reset index before populating (start from 0 for the loop, 1 for adding new rows)
    let currentIndex = 0;
    if (containerId === 'hosts-container') hostIndex = 1; // Reset global index for adding
    if (containerId === 'technical-container') technicalIndex = 1; // Reset global index for adding


    if (Array.isArray(people) && people.length > 0) {
        people.forEach((person, loopIndex) => {
            let targetRow;
            if (loopIndex === 0) {
                // Populate the first person into the template row
                targetRow = template;
                // Ensure template inputs have correct index 0 names/ids if needed
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
                    // addFunction should handle incrementing the global index (hostIndex/technicalIndex)
                    // and return the newly added row
                    targetRow = addFunction();
                }
            }

            // Populate the target row (either template or newly added row)
            if (targetRow) {
                // Use more specific selectors if possible, otherwise rely on structure
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

                // Hide remove button on the first/template row if applicable
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
    const schoolYearDropdown = document.getElementById("schoolYear"); // Schedule tab year dropdown
    const modalSchoolYearDropdown = document.getElementById("modalSchoolYear"); // Modal year dropdown
    const submissionSchoolYearDropdown = document.getElementById("submissionSchoolYear"); // Submission tab year dropdown
    const scheduleButtons = document.querySelectorAll(".availablebtn"); // Initial buttons (might be empty)
    const closeModal = document.querySelector(".close"); // Modal close button
    const saveButton = document.getElementById("saveButton"); // Modal save button
    const deleteButton = document.getElementById("deleteButton"); // Modal delete button
    const scheduleForm = document.getElementById("scheduleForm"); // Modal form
    const scheduleTableBody = document.querySelector(".schedule-table tbody"); // Schedule table body for delegation
    const submissionsTableBody = document.getElementById("submissions-table-body"); // Submissions table body
    const resultFilter = document.getElementById("resultFilter"); // Submission result filter dropdown
    const submissionForm = document.getElementById("submission-form"); // Submission details form
    const submissionSubmitButton = document.querySelector("#submission-form .submit-button"); // Submission form submit button
    const submissionCancelButton = document.querySelector("#submission-form .cancel-button"); // Submission form cancel button
    const tabsContainer = document.querySelector(".tabs-container"); // <<< ADD
    const tabButtons = document.querySelectorAll(".tab-button"); // <<< ADD
    const tabPanes = document.querySelectorAll(".tab-pane"); // <<< ADD
    const addHostButton = document.getElementById("addHost"); // <<< ADD
    const addTechnicalButton = document.getElementById("addTechnical"); // <<< ADD

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

    // --- Fetch initial schedules ---
    const initialYear = schoolYearDropdown ? schoolYearDropdown.value : null;
    if (initialYear) {
        try {
            // Fetch initial accepted schedules for the default/current year
            const response = await fetch(`/schedule?schoolYear=${initialYear}`);
            if (!response.ok) throw new Error("Failed to fetch initial schedules");
            existingSchedules = await response.json(); // Populate global existingSchedules
            console.log(`Fetched initial schedules for ${initialYear}:`, existingSchedules);
            // Refresh the visual schedule grid (which also fetches pending)
            await refreshSchedule(initialYear);
        } catch (error) {
            console.error("Error fetching initial schedules:", error);
            existingSchedules = []; // Reset on error
            await refreshSchedule(initialYear); // Attempt refresh even on error (might clear grid)
        }
    } else {
        console.warn("No initial school year selected, cannot fetch initial schedules.");
    }
    // --- End Fetch initial schedules ---


    // --- Initial Load for Submissions Tab ---
    if (submissionSchoolYearDropdown && submissionSchoolYearDropdown.value) {
        await loadSubmissions(); // Load submissions for the initially selected year
    } else {
        console.warn(
            "No school year selected in submissionSchoolYearDropdown initially."
        );
        // Optionally load submissions for the default/latest year if needed
    }
    clearFields(); // Ensure submission form is initially clear

    // --- Helper Functions within DOMContentLoaded ---

    // Fetches all school year configurations
    async function fetchSchoolYears() {
        try {
            const response = await fetch("/schoolYear/all"); // Endpoint to get all configs
            if (!response.ok) throw new Error("Failed to fetch school years");
            const schoolYears = await response.json();
            console.log("Fetched school years:", schoolYears);
            return schoolYears;
        } catch (error) {
            console.error("Error fetching school years:", error);
            return [];
        }
    }

    // Finds the configuration matching the current date
    function getCurrentSchoolYear(schoolYears) {
        if (!Array.isArray(schoolYears)) return null;
        const currentDate = new Date();
        return schoolYears.find((year) => {
            if (!year || typeof year.startYear !== 'number' || typeof year.startMonth !== 'number' || typeof year.endYear !== 'number' || typeof year.endMonth !== 'number') {
                console.warn("Skipping invalid school year object:", year);
                return false;
            }
            const startDate = new Date(year.startYear, year.startMonth - 1, 1); // Start of the month
            const endDate = new Date(year.endYear, year.endMonth, 0); // End of the month
            return currentDate >= startDate && currentDate <= endDate;
        });
    }

    // Populates all school year dropdowns and sets the current/latest year
    async function populateDropdowns() {
        const schoolYears = await fetchSchoolYears();

        // Display Current Config
        const currentSchoolYearConfig = getCurrentSchoolYear(schoolYears);
        displayCurrentSchoolYearConfig(currentSchoolYearConfig);

        // Populate Dropdowns
        populateDropdown(schoolYearDropdown, schoolYears);
        populateDropdown(modalSchoolYearDropdown, schoolYears);
        populateDropdown(submissionSchoolYearDropdown, schoolYears);

        // Set Dropdown Values
        let yearToSelect = null;
        if (currentSchoolYearConfig) {
            yearToSelect = `${currentSchoolYearConfig.startYear}-${currentSchoolYearConfig.endYear}`;
        } else if (schoolYears.length > 0) {
            // Fallback to the latest year if no current one matches
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

    // Generic function to populate a single dropdown
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

    // --- ADD TAB SWITCHING LOGIC ---
    if (tabsContainer) {
        tabsContainer.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.tab-button');
            if (!clickedButton) return; // Ignore clicks not on a button

            const targetTabId = clickedButton.dataset.tab;
            if (!targetTabId) return; // Ignore buttons without data-tab

            // Remove active class from all buttons and panes
            tabButtons.forEach(button => button.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to the clicked button and corresponding pane
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
            if (modalSchoolYearDropdown) modalSchoolYearDropdown.value = selectedYear; // Sync modal dropdown

            try {
                // Refetch accepted schedules for the new year
                const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
                if (!response.ok) throw new Error("Failed to fetch schedules on year change");
                existingSchedules = await response.json(); // Update global accepted schedules
                console.log(`Fetched schedules for ${selectedYear} (main dropdown change):`, existingSchedules);
                // Refresh the grid (which also fetches pending for the new year)
                await refreshSchedule(selectedYear);
            } catch (error) {
                console.error("Error fetching schedules on year change:", error);
                existingSchedules = []; // Reset on error
                await refreshSchedule(selectedYear); // Attempt refresh (might clear grid)
            }
        });
    }

    // Submission Year Dropdown Change
    if (submissionSchoolYearDropdown) {
        submissionSchoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = submissionSchoolYearDropdown.value;
            console.log("Submission year changed. Refreshing schedules and submissions for year:", selectedYear);

            try {
                // Refetch accepted schedules for the newly selected year to update availability checks
                const response = await fetch(`/schedule?schoolYear=${selectedYear}`);
                if (!response.ok) throw new Error("Failed to fetch schedules for submission year change");
                existingSchedules = await response.json(); // Update global accepted schedules
                console.log(`Fetched schedules for ${selectedYear} (submission dropdown change):`, existingSchedules);

                // Reload submissions table for the selected year/filter
                await loadSubmissions();
                clearFields(); // Clear detail form when year changes
            } catch (error) {
                console.error("Error fetching schedules for submission year change:", error);
                existingSchedules = []; // Clear schedules on error
                await loadSubmissions(); // Still try to load submissions table
                clearFields();
            }
        });
    }

    // Submission Result Filter Change
    if (resultFilter) {
        resultFilter.addEventListener("change", async () => {
            await loadSubmissions(); // Reload table when filter changes
            clearFields(); // Clear form when filter changes
        });
    }

    // --- ADD EVENT LISTENERS FOR ADD HOST/TECHNICAL BUTTONS ---
    if (addHostButton) {
        addHostButton.addEventListener('click', () => {
            addHost(); // Call the globally defined addHost function
        });
    }

    if (addTechnicalButton) {
        addTechnicalButton.addEventListener('click', () => {
            addTechnical(); // Call the globally defined addTechnical function
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
                    submissionSchoolYearDropdown.value = currentScheduleYear; // Match the year
                }
                if (resultFilter) {
                    resultFilter.value = "Pending"; // Set filter to Pending
                }

                // 3. Load submissions for the correct year/filter
                await loadSubmissions(); // Reload table based on new filter/year settings

                // 4. Select the specific submission (using updated global existingSchedules)
                await selectSubmission(pendingSubmissionId, existingSchedules);

                // 5. Scroll to the submission form (optional)
                document.getElementById('submission-form')?.scrollIntoView({ behavior: 'smooth' });

            }
            // --- Handle ACCEPTED button click (Open Schedule Modal) ---
            else if (scheduleId && targetButton.classList.contains('schedulebtn')) {
                console.log("Accepted button clicked, schedule ID:", scheduleId);
                openScheduleModal(targetButton); // Open modal for editing
            }
            // --- Handle AVAILABLE button click (Open Schedule Modal for Creation) ---
            else if (targetButton.classList.contains('availablebtn')) {
                 console.log("Available button clicked, Day:", day, "Time:", time);
                 openScheduleModal(targetButton); // Open modal for creation
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
         const scheduleId = button.dataset.scheduleId; // Might be undefined for new slots
         const currentSelectedYear = document.getElementById("schoolYear")?.value; // Year from main schedule dropdown

         // --- Reset form and set defaults for new schedule ---
         scheduleForm.reset(); // Reset native form elements
         scheduleForm.dataset.scheduleId = ""; // Clear schedule ID attribute
         scheduleForm.dataset.day = day || ""; // Store day for saving
         scheduleForm.dataset.time = time || ""; // Store time for saving

         // Set modal year dropdown to match the main schedule view
         if (currentSelectedYear) {
             modalSchoolYearDropdown.value = currentSelectedYear;
         }
         saveButton.textContent = "Save"; // Default button text
         deleteButton.style.display = "none"; // Hide delete button initially

         // Reset dynamic fields and show type checkboxes specifically
         resetDynamicInputs("hosts-container", "host-input", addHost);
         resetDynamicInputs("technical-container", "technical-input", addTechnical);

         // Ensure indices and buttons are reset/toggled correctly
         // These functions access the global hostIndex/technicalIndex
         if (typeof updateHostIndices === 'function') updateHostIndices();
         if (typeof toggleAddHostButton === 'function') toggleAddHostButton(); // <<< CALL SITE
         if (typeof updateTechnicalIndices === 'function') updateTechnicalIndices();
         if (typeof toggleAddTechnicalButton === 'function') toggleAddTechnicalButton();


         // --- Explicitly Reset Show Type Checkboxes and Other Input ---
         const typeCheckboxes = document.querySelectorAll("input[name='showDetails.type[]']");
         const otherCheckbox = document.getElementById("other"); // Assuming id="other" for the 'Other' checkbox
         const otherInput = document.getElementById("other-input"); // Assuming id="other-input" for the text field
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

                 // Set modal dropdown to the year from the database (overrides main dropdown selection)
                 modalSchoolYearDropdown.value = schedule.schoolYear || currentSelectedYear || '';

                 // Store schedule ID on the form for saving/updating
                 scheduleForm.dataset.scheduleId = schedule._id;

                 // --- Populate modal fields ---
                 const showTitleEl = document.getElementById("showTitle");
                 const showDescEl = document.getElementById("showDescription"); // Check this ID matches your HTML
                 const showObjectivesEl = document.getElementById("showObjectives"); // <<< ADD: Assuming id="showObjectives"

                 if (showTitleEl) showTitleEl.value = schedule.showDetails?.title || "";
                 if (showDescEl) {
                     showDescEl.value = schedule.showDetails?.description || "";
                 } else {
                     console.warn("Element with ID 'showDescription' not found in modal."); // <<< ADD: Check if element exists
                 }
                 if (showObjectivesEl) { // <<< ADD: Populate Objectives
                     showObjectivesEl.value = schedule.showDetails?.objectives || "";
                 } else {
                     console.warn("Element with ID 'showObjectives' not found in modal."); // <<< ADD: Check if element exists
                 }


                 // Populate name fields using helper function
                 populateNameFields("execProducer", schedule.executiveProducer);
                 populateNameFields("creativeStaff", schedule.creativeStaff);

                 // Populate dynamic fields using helper function
                 populateDynamicNameFields("hosts-container", "host-input", schedule.hosts, addHost, updateHostIndices, toggleAddHostButton);
                 populateDynamicNameFields("technical-container", "technical-input", schedule.technicalStaff, addTechnical, updateTechnicalIndices, toggleAddTechnicalButton);

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
                            // Assume it's the custom value for 'Other' if not a standard checkbox value
                            otherValue = type;
                        }
                    });

                    // Handle the 'Other' checkbox and input field
                    if (otherValue !== null) {
                        if (otherCheckbox) otherCheckbox.checked = true;
                        if (otherInput) {
                            otherInput.value = otherValue;
                            otherInput.disabled = false; // Enable the text input
                        }
                    } else {
                         if (otherInput) otherInput.disabled = true; // Ensure disabled if no custom value
                    }
                 }
                 // --- End Populate Show Type Checkboxes ---

                 // Update button text and visibility for editing
                 saveButton.textContent = "Edit";
                 deleteButton.style.display = "inline-block"; // Show delete button

             } catch (error) {
                 console.error("Error fetching schedule details:", error);
                 alert("Failed to load schedule details.");
                 if (modal) modal.style.display = "none"; // Close modal on error
                 return; // Stop further execution
             }
         }

         // Display the modal
         if (modal) modal.style.display = "block";
    }

    // --- Modal Event Listeners ---

    // Close Modal
    if (closeModal) {
        closeModal.onclick = () => {
            if (modal) modal.style.display = "none";
        };
    }

    // Close Modal on outside click
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    // Save/Edit Schedule Button
    if (saveButton) {
        saveButton.addEventListener("click", async () => {
            // ... Add your logic to gather data from the scheduleForm ...
            // ... Determine if it's a POST (new) or PATCH (edit) based on scheduleForm.dataset.scheduleId ...
            // ... Send fetch request ...
            // ... Handle response, show alerts, refresh schedule, close modal ...
            console.warn("Save/Edit schedule logic not fully implemented.");
            // Example structure:
            /*
            const scheduleId = scheduleForm.dataset.scheduleId;
            const method = scheduleId ? 'PATCH' : 'POST';
            const url = scheduleId ? `/schedule/${scheduleId}` : '/schedule';
            const formData = new FormData(scheduleForm); // Or gather data manually
            const scheduleData = { ... Object.fromEntries(formData.entries()) }; // Basic conversion, needs refinement for nested objects/arrays
            scheduleData.day = scheduleForm.dataset.day; // Get day/time from dataset
            scheduleData.time = scheduleForm.dataset.time;
            scheduleData.schoolYear = modalSchoolYearDropdown.value;
            // ... structure scheduleData correctly based on your Schedule model ...

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(scheduleData)
                });
                if (!response.ok) throw new Error('Failed to save schedule');
                alert('Schedule saved successfully!');
                modal.style.display = 'none';
                await refreshSchedule(schoolYearDropdown.value); // Refresh grid for the current view
            } catch (error) {
                console.error('Error saving schedule:', error);
                alert('Failed to save schedule.');
            }
            */
        });
    }

    // Delete Schedule Button
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
                    await refreshSchedule(schoolYearDropdown.value); // Refresh grid
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
            clearFields(); // Clear the form on cancel
        });
    }

    // Add listener for preferredDay change to update time options
    const preferredDayDropdown = document.getElementById("preferredDay");
    if (preferredDayDropdown) {
        preferredDayDropdown.addEventListener("change", async () => {
            const selectedDay = preferredDayDropdown.value;
            const preferredTimeDropdown = document.getElementById("preferredTime");
            const submissionId = document.querySelector(".submit-button").dataset.submissionId; // Get current submission ID

            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';
            preferredTimeDropdown.disabled = true;

            if (!selectedDay || !currentSubmissionSchoolYear) {
                preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>';
                return;
            }

            try {
                // Refetch schedules for the year if needed, or use existingSchedules if guaranteed up-to-date
                // Using existingSchedules which should be updated when the submission year dropdown changes
                const occupiedTimes = existingSchedules
                    .filter(schedule => schedule.day === selectedDay && schedule.schoolYear === currentSubmissionSchoolYear && schedule.submissionId !== submissionId) // Exclude self
                    .map(schedule => schedule.time.trim());

                console.log(`(Day Change) Occupied times for ${selectedDay} in ${currentSubmissionSchoolYear}:`, occupiedTimes);

                preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>'; // Reset options

                let timeSlotAdded = false;
                ALL_TIME_SLOTS.forEach((time) => {
                    if (selectedDay !== 'Friday' && time === '12:01-12:55') return; // Skip Friday-only slot if not Friday

                    const normalizedTime = time.trim();
                    const isOccupied = occupiedTimes.includes(normalizedTime);
                    // Allow the original time slot even if it appears occupied (might be occupied by itself before update)
                    const isOriginalTime = normalizedTime === originalSubmissionPreferredTime;

                    // Add if not occupied by another, OR if it's the time currently saved for this submission
                    if (!isOccupied || isOriginalTime) {
                        const option = document.createElement("option");
                        option.value = normalizedTime;
                        option.textContent = normalizedTime;
                        if (isOriginalTime) {
                            option.selected = true; // Pre-select the original time
                        }
                        preferredTimeDropdown.appendChild(option);
                        timeSlotAdded = true;
                    } else {
                         console.log(`(Day Change) Time slot ${normalizedTime} is occupied.`);
                    }
                });

                preferredTimeDropdown.disabled = !timeSlotAdded; // Disable if no slots were added
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
        const result = resultFilter ? resultFilter.value : "All"; // Use capitalized value from dropdown
        const queryParams = new URLSearchParams({ schoolYear });
        // Append result filter (capitalized) if not 'All'
        if (result && result !== "All") queryParams.append("result", result);

        const response = await fetch(`/submissions?${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch submissions: ${response.statusText}`);

        const submissions = await response.json();
        console.log(`Submissions for ${schoolYear} (Filter: ${result}):`, submissions);

        tableBody.innerHTML = ""; // Clear previous entries

        if (Array.isArray(submissions) && submissions.length > 0) {
            submissions.forEach((submission) => {
                const row = document.createElement("tr");
                // Capitalize result for display consistency
                const displayResult = submission.result
                    ? submission.result.charAt(0).toUpperCase() + submission.result.slice(1)
                    : "Pending";
                // Add class based on result (lowercase for CSS consistency)
                row.classList.add(`result-${(submission.result || 'Pending').toLowerCase()}`);
                row.innerHTML = `
                    <td>${submission.showDetails?.title || "N/A"}</td>
                    <td>${submission.organizationName || "N/A"}</td>
                    <td>${submission.preferredSchedule?.day || "N/A"} ${
                    submission.preferredSchedule?.time || "N/A"
                }</td>
                    <td>${displayResult}</td>
                    <td><button type="button" class="select-btn" data-id="${
                        submission._id
                    }">Select</button></td>
                `;
                tableBody.appendChild(row);
            });

            // Add event listeners to the newly created select buttons using delegation on the table body
            // This avoids re-adding listeners every time loadSubmissions runs
            // Ensure this listener is added only once, perhaps in DOMContentLoaded

        } else {
            tableBody.innerHTML =
                '<tr><td colspan="5">No submissions found for the selected criteria.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading submissions:", error);
        if (tableBody) {
            tableBody.innerHTML =
                '<tr><td colspan="5">Failed to load submissions. Please try again.</td></tr>';
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
                // Use the globally scoped existingSchedules variable
                selectSubmission(submissionId, existingSchedules);
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

        // Store original preferred time and school year
        originalSubmissionPreferredTime = submission.preferredSchedule?.time || null;
        currentSubmissionSchoolYear = submission.schoolYear; // Store the school year from the submission

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
            // Assuming facultyStaff uses 'department' instead of 'cys'
            document.getElementById("facultyStaffDepartment").value = submission.facultyStaff?.department || "";
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
            fbLinkContainer.style.display = "block";
        } else {
            fbLinkContainer.style.display = "none";
            fbLinkInput.value = "";
        }

        const proponentSignatureImg = document.getElementById("proponentSignature");
        if (submission.proponentSignature) {
            proponentSignatureImg.src = submission.proponentSignature;
            proponentSignatureImg.style.display = "block";
        } else {
            proponentSignatureImg.src = "";
            proponentSignatureImg.style.display = "none";
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

        preferredDayDropdown.value = selectedDay; // Set the day dropdown

        // Populate time dropdown based on selected day and availability
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a time</option>';
        preferredTimeDropdown.disabled = true; // Disable initially

        if (selectedDay && currentSubmissionSchoolYear) {
            // Filter schedulesForAvailability for the specific day and year, excluding self
            const occupiedTimes = schedulesForAvailability
                .filter(schedule => schedule.day === selectedDay && schedule.schoolYear === currentSubmissionSchoolYear && schedule.submissionId !== submissionId)
                .map(schedule => schedule.time.trim());

            console.log(`Occupied times for ${selectedDay} in ${currentSubmissionSchoolYear} (excluding current submission ${submissionId}):`, occupiedTimes);

            let timeSlotAdded = false;
            ALL_TIME_SLOTS.forEach((time) => {
                if (selectedDay !== 'Friday' && time === '12:01-12:55') return; // Skip Friday-only slot if not Friday

                const normalizedTime = time.trim();
                const isOccupied = occupiedTimes.includes(normalizedTime);
                // Allow the original time slot even if it appears occupied (might be occupied by itself before update)
                const isOriginalTime = normalizedTime === originalSubmissionPreferredTime;

                // Add if not occupied by another, OR if it's the time currently saved for this submission
                if (!isOccupied || isOriginalTime) {
                    const option = document.createElement("option");
                    option.value = normalizedTime;
                    option.textContent = normalizedTime;
                    if (isOriginalTime) {
                        option.selected = true; // Pre-select the original time
                    }
                    preferredTimeDropdown.appendChild(option);
                    timeSlotAdded = true;
                } else {
                     console.log(`Time slot ${normalizedTime} is occupied by another schedule.`);
                }
            });

            preferredTimeDropdown.disabled = !timeSlotAdded; // Disable if no slots were added
            if (!timeSlotAdded && selectedTime) {
                 // If the selected time itself wasn't added (edge case?), add it manually but disabled? Or just show no times.
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

        // Set Result Dropdown (use capitalized value)
        const dbResult = submission.result || "Pending";
        resultDropdown.value = dbResult.charAt(0).toUpperCase() + dbResult.slice(1);

        // --- Enable/Disable Form Elements Based on Result ---
        initialSubmissionResult = resultDropdown.value; // Store the capitalized initial result
        const isDecided = initialSubmissionResult !== 'Pending';
        resultDropdown.disabled = isDecided;
        preferredDayDropdown.disabled = isDecided;
        preferredTimeDropdown.disabled = isDecided || preferredTimeDropdown.disabled; // Keep disabled if no times available
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
    // Clean up potential extra spaces or leading/trailing commas
    formattedName = formattedName.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
    if (formattedName === ",") return "N/A"; // Handle case where only comma exists

    return formattedName || "N/A";
}


// Update submission result and potentially create/update/delete schedule
async function updateSubmission(submissionId) {
    const resultDropdown = document.getElementById("result");
    const newResult = resultDropdown.value; // Capitalized: "Accepted" or "Rejected"
    const preferredDay = document.getElementById("preferredDay").value;
    const preferredTime = document.getElementById("preferredTime").value;
    const selectedYear = currentSubmissionSchoolYear; // Use the stored school year

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
            const conflictCheckResponse = await fetch(
                `/schedule?day=${preferredDay}&time=${preferredTime}&schoolYear=${selectedYear}`
            );
            if (!conflictCheckResponse.ok) throw new Error("Failed to check existing schedules for conflicts");
            const conflictingSchedules = await conflictCheckResponse.json();
            const actualConflict = conflictingSchedules.find(sch => sch.submissionId !== submissionId);

            if (actualConflict) {
                alert(
                    `${preferredDay} (${preferredTime}) is already occupied by '${actualConflict.showDetails?.title || 'another show'}' in ${selectedYear}. Please choose a different time/day or reject.`
                );
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
        // Send lowercase result as backend might expect it (or adjust backend)
        // Let's assume backend now expects Capitalized based on previous fixes
        result: newResult,
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
        initialSubmissionResult = newResult; // Update the initial state

        // Disable form elements after successful irreversible update
        if (newResult === 'Accepted' || newResult === 'Rejected') {
            resultDropdown.disabled = true;
            document.getElementById("preferredDay").disabled = true;
            document.getElementById("preferredTime").disabled = true;
            document.querySelector(".submit-button").disabled = true;
        }

        // --- Handle Schedule Creation/Update/Deletion ---
        const scheduleDisplayYear = document.getElementById("schoolYear").value; // Year for refreshing main grid

        if (newResult === "Accepted") {
            // Refetch submission to get potentially updated details if needed
            const submissionResponse = await fetch(`/submissions/${submissionId}`);
            if (!submissionResponse.ok) throw new Error("Failed to re-fetch submission after update.");
            const submission = await submissionResponse.json();

            if (!submission.preferredSchedule?.day || !submission.preferredSchedule?.time) {
                throw new Error("Updated submission is missing preferred schedule details.");
            }

            const scheduleData = {
                day: submission.preferredSchedule.day,
                time: submission.preferredSchedule.time, // Ensure it's a string if needed
                showDetails: submission.showDetails || {},
                executiveProducer: submission.executiveProducer || {},
                hosts: submission.hosts || [],
                technicalStaff: submission.technicalStaff || [],
                creativeStaff: submission.creativeStaff || {},
                schoolYear: selectedYear, // Use the year from the update context
                submissionId: submissionId
            };
            console.log("Schedule data being prepared:", scheduleData);

            // Check if schedule exists for this submission
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
                await refreshSchedule(scheduleDisplayYear); // Refresh the main schedule grid
            }

        } else if (newResult === "Rejected") {
            // Delete associated schedule if it exists
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

        // --- Final Steps ---
        loadSubmissions(); // Reload the submissions table

    } catch (error) {
        console.error("Error during submission update process:", error);
        alert(`An error occurred: ${error.message}`);
        // Consider re-enabling fields if the update failed critically
        // if (initialSubmissionResult === 'Pending') { ... re-enable fields ... }
    }
}


// Clear submission detail fields and reset state
function clearFields() {
    // Clear all form fields
    const form = document.getElementById('submission-form');
    if (form) {
        // Clear standard inputs
        form.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(input => {
            if (!input.readOnly) { // Don't clear readonly fields unnecessarily, though their values will be overwritten
                input.value = "";
            }
        });
        // Clear specific read-only fields that display dynamic data
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
        document.getElementById("creativeStaff").value = "";
        document.getElementById("creativeStaffCYS").value = "";
        document.getElementById("dlsudEmail").value = "";
        document.getElementById("contactEmail").value = "";
        document.getElementById("contactFbLink").value = "";
        document.getElementById("FbLink").value = "";
        document.getElementById("show-title").value = "";
        document.getElementById("showType").value = ""; // Assuming this is a text input displaying types
        document.getElementById("showDescription").value = "";
        document.getElementById("show-objectives").value = "";

        // Clear dynamic containers
        const hostContainer = document.getElementById("host-container");
        const techContainer = document.getElementById("technicalStaff-container");
        if (hostContainer) hostContainer.innerHTML = "<p>Select a submission to view details.</p>";
        if (techContainer) techContainer.innerHTML = "<p>Select a submission to view details.</p>";

        // Hide FB Link container and signature
        const fbLinkContainer = document.getElementById("FbLink-container");
        if (fbLinkContainer) fbLinkContainer.style.display = "none";
        const sigImg = document.getElementById("proponentSignature");
        if (sigImg) {
            sigImg.src = "";
            sigImg.style.display = "none";
        }

        // Reset dropdowns
        const preferredDayDropdown = document.getElementById("preferredDay");
        const preferredTimeDropdown = document.getElementById("preferredTime");
        const resultDropdown = document.getElementById("result");

        if (preferredDayDropdown) preferredDayDropdown.value = "";
        if (preferredTimeDropdown) {
            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a day first</option>';
            preferredTimeDropdown.disabled = true;
        }
        if (resultDropdown) resultDropdown.value = "Pending"; // Reset to default

        // Reset state variables
        initialSubmissionResult = 'Pending';
        originalSubmissionPreferredTime = null;
        currentSubmissionSchoolYear = null;

        // Disable form elements
        if (resultDropdown) resultDropdown.disabled = true;
        if (preferredDayDropdown) preferredDayDropdown.disabled = true;
        preferredTimeDropdown.disabled = true;
        document.querySelector(".cancel-button").disabled = true;
        const submitButton = document.querySelector(".submit-button");
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.removeAttribute('data-submission-id');
        }

        console.log("Submission detail fields cleared.");
    } else {
        console.error("Submission form not found for clearing.");
    }
}