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
let originalSubmissionPreferredDay = null; // <<< ADDED
let initialSubmissionResult = 'Pending';
let hostIndex = 1; // Start index at 1 assuming template is index 0 conceptually
let technicalIndex = 1; // Start index at 1 assuming template is index 0 conceptually
const MAX_HOSTS = 4;
const MAX_TECHNICAL = 2;
let socket = null; // <<< Add socket variable
// --- END GLOBAL STATE VARIABLES ---

// --- SPINNER FUNCTIONS ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = 'block'; // Use block or flex depending on your CSS
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}
// --- END SPINNER FUNCTIONS ---


// --- GLOBAL HELPER FUNCTIONS ---

// Function to refresh schedule buttons AND update the global schedule list
async function refreshSchedule(selectedYear) {
    console.log("Refreshing schedule for year:", selectedYear);
    try {
        // --- Fetch Schedules (including confirmation status) ---
        const scheduleResponse = await fetch(`/schedule?schoolYear=${selectedYear}`);
        if (!scheduleResponse.ok) throw new Error("Failed to fetch schedules");
        const schedulesWithStatus = await scheduleResponse.json();
        console.log(`Fetched Schedules for ${selectedYear}:`, schedulesWithStatus);

        // --- Fetch PENDING Submissions ---
        let pendingSubmissions = [];
        try {
            const pendingResponse = await fetch(`/submissions?schoolYear=${selectedYear}&result=Pending`);
            if (!pendingResponse.ok) throw new Error("Failed to fetch pending submissions");
            pendingSubmissions = await pendingResponse.json();
            console.log(`Pending Submissions for ${selectedYear}:`, pendingSubmissions);
        } catch (pendingError) {
            console.error("Error fetching pending submissions:", pendingError);
            // Continue even if pending submissions fail to load
        }

        // --- Update the global variable ---
        existingSchedules = schedulesWithStatus; // Update global list

        // --- Clear existing schedule buttons ---
        document.querySelectorAll(".availablebtn").forEach((button) => {
            button.textContent = "";
            button.classList.remove("schedulebtn", "pendingbtn", "pending-confirmation-btn", "confirmationbtn"); // Added confirmationbtn
            button.disabled = false; // <<< Ensure buttons start enabled
            delete button.dataset.scheduleId;
            delete button.dataset.scheduleSubmissionId;
            delete button.dataset.pendingSubmissionId;
        });

        // --- Populate buttons with schedule data (using schedulesWithStatus) ---
        schedulesWithStatus.forEach((schedule) => {
            const button = document.querySelector(
                `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
            );
            if (button) {
                button.textContent = schedule.showDetails?.title || "Booked";
                button.dataset.scheduleId = schedule._id;
                if (schedule.submissionId) {
                    button.dataset.scheduleSubmissionId = schedule.submissionId;
                }

                // Apply class based on confirmationStatus
                if (schedule.confirmationStatus === 'Pending Confirmation') {
                    button.classList.add("pending-confirmation-btn"); // Keep this class for logic if needed
                    button.classList.add("confirmationbtn"); // Add visual class
                    button.textContent = `CONFIRM?: ${button.textContent}`;
                    // button.disabled = true; // <<< REMOVE THIS LINE - Allow click to open modal
                } else {
                    button.classList.add("schedulebtn");
                    // button.disabled = true; // <<< REMOVE THIS LINE - Allow click to open modal
                }
            }
        });

        // --- Populate buttons with PENDING submission data ---
        pendingSubmissions.forEach((submission) => {
             if (submission.preferredSchedule?.day && submission.preferredSchedule?.time) {
                const button = document.querySelector(
                    `.availablebtn[data-day="${submission.preferredSchedule.day}"][data-time="${submission.preferredSchedule.time}"]`
                );
                // Only mark as pending if the slot isn't already booked or pending confirmation
                if (button && !button.classList.contains('schedulebtn') && !button.classList.contains('confirmationbtn')) {
                    console.log("Updating button for pending submission:", submission);
                    button.textContent = `PENDING: ${submission.showDetails?.title || 'N/A'}`;
                    button.classList.add("pendingbtn");
                    button.dataset.pendingSubmissionId = submission._id;
                    button.disabled = false; // Make pending clickable
                } else if (button && (button.classList.contains('schedulebtn') || button.classList.contains('confirmationbtn'))) {
                    console.log(`Slot ${submission.preferredSchedule.day} ${submission.preferredSchedule.time} already booked/pending confirmation. Cannot show pending: ${submission.showDetails?.title}`);
                    // Ensure the button remains clickable to view the existing schedule
                    button.disabled = false; // <<< Ensure booked/confirmation slots remain clickable
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
            button.classList.remove("schedulebtn", "pendingbtn", "pending-confirmation-btn", "confirmationbtn");
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
    const firstInputGroup = container.querySelector(`.${inputClass}`);
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
    if (containerId === 'hosts-container') hostIndex = 1;
    if (containerId === 'technical-container') technicalIndex = 1;
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
    return newRow; // Return the newly added row
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

    const template = container.querySelector(`.${inputClass}`);
    if (!template) {
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


// --- Function to update a single schedule button ---
function updateScheduleButton(data) {
    const { action, day, time, schoolYear, showTitle, status, scheduleId, submissionId } = data; // Include IDs
    const currentYear = document.getElementById("schoolYear")?.value;

    // Only update if the event matches the currently viewed school year
    if (schoolYear !== currentYear) {
        console.log(`Schedule update ignored (wrong year: ${schoolYear}, current: ${currentYear})`);
        return;
    }

    const button = document.querySelector(`.availablebtn[data-day="${day}"][data-time="${time}"]`);
    if (!button) {
        console.warn(`Button not found for update: ${day} ${time}`);
        return;
    }

    console.log(`Updating button ${day} ${time} - Action: ${action}, Status: ${status}`);

    // Reset button state first
    button.disabled = false; // <<< Ensure button is enabled by default
    button.classList.remove("schedulebtn", "pendingbtn", "confirmationbtn", "pending-confirmation-btn"); // Remove all status classes
    button.textContent = ""; // Clear text initially
    delete button.dataset.scheduleId;
    delete button.dataset.scheduleSubmissionId;
    delete button.dataset.pendingSubmissionId;


    if (action === 'delete') {
        button.textContent = ""; // Or "Available" if you prefer
        // Ensure it's clickable (already enabled)
    } else if (action === 'pending') {
        button.textContent = `Pending: ${showTitle || 'N/A'}`;
        button.classList.add("pendingbtn");
        button.dataset.pendingSubmissionId = submissionId; // Use submissionId for pending
        button.disabled = false; // Make pending clickable
    } else if (action === 'create' || action === 'update' || action === 'update_status') {
        if (status === 'Accepted') {
            button.textContent = showTitle || 'Scheduled';
            button.classList.add("schedulebtn");
            button.dataset.scheduleId = scheduleId; // Use scheduleId for booked
            if (submissionId) button.dataset.scheduleSubmissionId = submissionId;
            // button.disabled = true; // <<< REMOVE THIS - Keep clickable
        } else if (status === 'Pending Confirmation') {
            button.textContent = `Confirm: ${showTitle || 'N/A'}`;
            button.classList.add("confirmationbtn"); // Add a new class for styling
            button.classList.add("pending-confirmation-btn"); // Keep for logic if needed
            button.dataset.scheduleId = scheduleId; // Use scheduleId for booked
            if (submissionId) button.dataset.scheduleSubmissionId = submissionId;
            // button.disabled = true; // <<< REMOVE THIS - Keep clickable
        } else { // Default back to available if status is unexpected or cleared
             button.textContent = "";
        }
    } else {
         button.textContent = ""; // Default to empty/available
    }
}

// --- REVISED populateTimeOptions FUNCTION ---
async function populateTimeOptions(selectedDay, timeToSelect = null) {
    const preferredTimeDropdown = document.getElementById("preferredTime");
    if (!preferredTimeDropdown) {
        console.error("populateTimeOptions: preferredTime dropdown not found.");
        return;
    }

    // Get context: current submission ID and school year
    const submissionId = document.getElementById('submissionIdHidden')?.value;
    const schoolYear = currentSubmissionSchoolYear; // Use the global variable

    preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';
    preferredTimeDropdown.disabled = true;

    if (!selectedDay || !schoolYear) {
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select day first</option>';
        return;
    }

    try {
        // Use existingSchedules global variable
        const occupiedTimes = existingSchedules
            .filter(schedule =>
                schedule.day === selectedDay &&
                schedule.schoolYear === schoolYear &&
                (!submissionId || schedule.submissionId !== submissionId) // Exclude self only if submissionId is known
            )
            .map(schedule => schedule.time.trim());

        console.log(`(populateTimeOptions) Occupied times for ${selectedDay} in ${schoolYear} (excluding self: ${submissionId}):`, occupiedTimes);

        preferredTimeDropdown.innerHTML = '<option value="" disabled>Select a time</option>'; // Start with default disabled option

        let timeSlotAdded = false;
        let timeSelected = false;
        ALL_TIME_SLOTS.forEach((time) => {
            // Skip Friday 12:01-12:55 if needed
            if (selectedDay !== 'Friday' && time === '12:01-12:55') return;

            const normalizedTime = time.trim();
            const isOccupied = occupiedTimes.includes(normalizedTime);

            // Determine if this slot should be selectable:
            // It's selectable if it's NOT occupied,
            // OR if it IS occupied BUT it's the original time slot FOR THE ORIGINAL DAY.
            const isTheOriginalSlot = submissionId &&
                                      selectedDay === originalSubmissionPreferredDay && // <<< Check if day matches original
                                      normalizedTime === originalSubmissionPreferredTime;

            if (!isOccupied || isTheOriginalSlot) {
                const option = document.createElement("option");
                option.value = normalizedTime;
                option.textContent = normalizedTime;

                // Pre-select if it matches the timeToSelect argument (passed when selecting/updating)
                if (normalizedTime === timeToSelect) {
                    option.selected = true;
                    timeSelected = true;
                }
                preferredTimeDropdown.appendChild(option);
                timeSlotAdded = true;
            } else {
                 console.log(`(populateTimeOptions) Time slot ${normalizedTime} is occupied and not the original slot for this day.`);
            }
        });

        preferredTimeDropdown.disabled = !timeSlotAdded;
        if (!timeSlotAdded) {
            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>No times available</option>';
        } else if (!timeSelected && timeToSelect === null) { // Only reset if not trying to select a specific time
            // If slots were added but none matched timeToSelect/original, select the default "Select a time"
             preferredTimeDropdown.value = ""; // Ensure the default disabled option is selected
        } else if (!timeSelected && timeToSelect !== null) {
            console.warn(`(populateTimeOptions) Requested time ${timeToSelect} not available or occupied.`);
            // Keep the first available option selected by default, or explicitly set to ""
            preferredTimeDropdown.value = "";
        }


    } catch (error) {
        console.error("Error populating time slots:", error);
        preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Error loading times</option>';
    }
}
// --- END REVISED FUNCTION ---


// --- Main setup on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- Initialize Socket.IO ---
    socket = io(); // Connect to the server

    // --- Socket Event Listeners ---
    socket.on('connect', () => {
        console.log('Admin Socket Connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Admin Socket Disconnected');
    });

    socket.on('scheduleUpdate', (data) => {
        console.log('Received scheduleUpdate:', data);
        // Update the specific button based on the data
        updateScheduleButton(data);
        // Optionally, update the global existingSchedules array if needed elsewhere
        // This requires fetching the updated schedule list or merging the change
        // For now, rely on refreshSchedule called after manual actions
    });

     socket.on('newSubmission', (data) => {
         console.log('Received newSubmission:', data);
         const currentSubmissionsYear = document.getElementById("submissionSchoolYear")?.value;
         // Only add if it matches the current view or if no year is selected (or handle differently)
         if (data.schoolYear === currentSubmissionsYear) {
             addSubmissionRow(data); // Create a function to add a row dynamically
             // Maybe show a notification
             alert(`New submission received for ${data.showTitle}`);
         }
     });

     socket.on('submissionAdminUpdate', async (data) => { // <<< MAKE ASYNC
         console.log('Received submissionAdminUpdate:', data);
         const currentSubmissionsYear = document.getElementById("submissionSchoolYear")?.value;
         // Update the row in the submissions table if it matches the current view
         if (data.schoolYear === currentSubmissionsYear) {
             updateSubmissionRow(data);
         }
         // If the submission details form is open for this ID, update its status/schedule fields
         const submissionFormIdInput = document.getElementById('submissionIdHidden');
         if (submissionFormIdInput && submissionFormIdInput.value === data.submissionId) {
             const resultDropdown = document.getElementById('result');
             const preferredDay = document.getElementById('preferredDay');

             if(resultDropdown) resultDropdown.value = data.result.charAt(0).toUpperCase() + data.result.slice(1);
             if(preferredDay) preferredDay.value = data.preferredDay;

             // <<< CALL populateTimeOptions HERE >>>
             // Pass the updated day and time to pre-select
             await populateTimeOptions(data.preferredDay, data.preferredTime);
             // <<< END CALL >>>

             // Update enable/disable state based on new result
             const isDecided = data.result !== 'pending';
             if (resultDropdown) resultDropdown.disabled = isDecided;
             if (preferredDay) preferredDay.disabled = isDecided;
             const preferredTimeDropdown = document.getElementById('preferredTime');
             if (preferredTimeDropdown) preferredTimeDropdown.disabled = isDecided || preferredTimeDropdown.options.length <= 1; // Also disable if no options

             const subSubmitBtn = document.querySelector("#submission-form .submit-button");
             if (subSubmitBtn) subSubmitBtn.disabled = isDecided;
         }
     });


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
    const otherCheckbox = document.getElementById("other");
    const otherInput = document.getElementById("other-input");
    const preferredDayDropdown = document.getElementById("preferredDay"); // <<< Get reference here

    // --- School Year Configuration Form Submission ---
    if (schoolYearConfigForm) {
        schoolYearConfigForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const startMonth = document.getElementById("startMonth").value;
            const startYearInput = document.getElementById("startYear");
            const endMonth = document.getElementById("endMonth").value;
            const endYearInput = document.getElementById("endYear");

            const startYear = parseInt(startYearInput.value, 10);
            const endYear = parseInt(endYearInput.value, 10);

            // --- Validation ---
            if (isNaN(startYear) || isNaN(endYear)) {
                alert("Please enter valid numeric years.");
                return;
            }

            if (endYear < startYear) {
                alert("End Year cannot be before Start Year.");
                return;
            }

            if (endYear > startYear + 1) {
                alert("The school year range cannot span more than two consecutive years (e.g., 2024-2025).");
                return;
            }
            // --- End Validation ---


            if (!confirm(`Are you sure you want to save the school year configuration?\nStart: ${startMonth}/${startYear}\nEnd: ${endMonth}/${endYear}`)) {
                alert("Submission canceled.");
                return;
            }

            try {
                const response = await fetch("/schoolYear/config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    // Send the parsed numbers
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
            // No need to fetch here, refreshSchedule does it
            await refreshSchedule(initialYear);
        } catch (error) {
            console.error("Error during initial schedule refresh:", error);
            // refreshSchedule handles clearing on error
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
            const endDate = new Date(year.endYear, year.endMonth, 0); // Last day of end month
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

            // Check if the clicked tab is already active
            if (clickedButton.classList.contains('active')) {
                return; // Do nothing if clicking the already active tab
            }

            tabButtons.forEach(button => button.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            clickedButton.classList.add('active');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add('active');

                // If the newly activated tab is the schedule tab, clear the submission form fields
                if (targetTabId === 'schedule-tab') {
                    console.log("Switched to Schedule tab, clearing submission form fields.");
                    clearFields();
                }

            } else {
                console.error(`Tab pane with ID '${targetTabId}' not found.`);
            }
        });
    }
    // --- END TAB SWITCHING LOGIC ---


    // --- Dropdown Change Listeners ---
    // Main Schedule Year Dropdown Change
    if (schoolYearDropdown) {
        schoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = schoolYearDropdown.value;
            console.log("Selected schoolYearDropdown value (on change):", selectedYear);
            if (modalSchoolYearDropdown) modalSchoolYearDropdown.value = selectedYear;
            await refreshSchedule(selectedYear); // Refresh schedule handles fetching
        });
    }

    // Submission Year Dropdown Change
    if (submissionSchoolYearDropdown) {
        submissionSchoolYearDropdown.addEventListener("change", async () => {
            const selectedYear = submissionSchoolYearDropdown.value;
            console.log("Submission year changed. Refreshing submissions for year:", selectedYear);
            // No need to fetch schedules here unless absolutely necessary for context
            // existingSchedules should be updated by the main dropdown or sockets
            await loadSubmissions();
            clearFields();
        });
    }

    // Submission Result Filter Change
    if (resultFilter) {
        resultFilter.addEventListener("change", async () => {
            await loadSubmissions();
            clearFields();
        });
    }

    // --- ADD HOST/TECHNICAL BUTTON LISTENERS ---
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
    // --- END ADD HOST/TECHNICAL BUTTON LISTENERS ---


    // --- Schedule Table Click Listener ---
    if (scheduleTableBody) {
        scheduleTableBody.addEventListener('click', async (event) => {
            // Target any button with a data-day attribute
            const targetButton = event.target.closest('button[data-day]');
            if (!targetButton) return; // Exit if the click wasn't on a schedule button

            const day = targetButton.dataset.day;
            const time = targetButton.dataset.time;
            const scheduleId = targetButton.dataset.scheduleId;
            const pendingSubmissionId = targetButton.dataset.pendingSubmissionId; // Retrieve ID

            // --- Handle PENDING button click ---
            // <<< MODIFY THIS BLOCK >>>
            if (targetButton.classList.contains('pendingbtn')) { // Check class first
                // THEN check if ID exists and is not undefined/empty
                if (pendingSubmissionId && pendingSubmissionId !== 'undefined') {
                    console.log("--- Pending Button Click ---");
                    console.log("Submission ID:", pendingSubmissionId); // Should have a valid ID here
                    showSpinner();
                    try {
                        // 1. Get Element References (Check if they exist)
                        const submissionsTabButton = document.querySelector('.tab-button[data-tab="submissions-tab"]');
                        const scheduleTabButton = document.querySelector('.tab-button[data-tab="schedule-tab"]');
                        const submissionsTabPane = document.getElementById('submissions-tab');
                        const scheduleTabPane = document.getElementById('schedule-tab');
                        const currentScheduleYear = document.getElementById("schoolYear")?.value; // Get year from schedule tab

                        if (!submissionsTabButton || !scheduleTabButton || !submissionsTabPane || !scheduleTabPane) {
                            throw new Error("Tab switching elements not found.");
                        }
                        if (!submissionSchoolYearDropdown) {
                             throw new Error("Submission school year dropdown not found.");
                        }
                         if (!resultFilter) {
                             throw new Error("Result filter dropdown not found.");
                        }
                        if (!currentScheduleYear) {
                             throw new Error("Could not determine current schedule year.");
                        }

                        console.log("Current Schedule Year:", currentScheduleYear);

                        // 2. Set Dropdown/Filter Values FIRST
                        submissionSchoolYearDropdown.value = currentScheduleYear;
                        resultFilter.value = "Pending"; // Set filter to Pending
                        console.log("Set Submission Year Dropdown to:", submissionSchoolYearDropdown.value);
                        console.log("Set Result Filter to:", resultFilter.value);


                        // 3. Switch Tabs Visually
                        scheduleTabButton.classList.remove('active');
                        scheduleTabPane.classList.remove('active');
                        submissionsTabButton.classList.add('active');
                        submissionsTabPane.classList.add('active');
                        console.log("Switched to Submissions tab.");

                        // 4. Load Submissions (Await this to ensure table is populated before selecting)
                        console.log("Loading submissions...");
                        await loadSubmissions(); // This uses the values set in step 2
                        console.log("Submissions loaded.");

                        // 5. Select the specific submission (Await this to populate the form)
                        console.log("Selecting submission:", pendingSubmissionId);
                        await selectSubmission(pendingSubmissionId); // Call with the valid ID
                        console.log("Submission selected and form populated.");

                        // 6. Scroll to the submission form
                        const subForm = document.getElementById('submission-form');
                        if (subForm) {
                            subForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            console.log("Scrolled to submission form.");
                        } else {
                            console.warn("Submission form not found for scrolling.");
                        }

                    } catch (error) {
                        console.error("Error handling pending button click:", error);
                        alert(`Error processing request: ${error.message}`);
                    } finally {
                        hideSpinner();
                    }
                } else {
                    // Log an error if the button has the class but no valid ID
                    console.error("Pending button clicked, but pendingSubmissionId dataset is missing or invalid!", targetButton.dataset);
                    alert("Error: Could not retrieve submission details for this pending slot. The associated ID is missing.");
                    // Optionally hide spinner if shown earlier, though unlikely here
                    // hideSpinner();
                }
            }
            // <<< END MODIFICATION >>>
            // --- Handle ACCEPTED/CONFIRMATION button click (Open Schedule Modal) ---
            else if (scheduleId && (targetButton.classList.contains('schedulebtn') || targetButton.classList.contains('confirmationbtn'))) {
                console.log("Booked/Pending Confirmation button clicked, schedule ID:", scheduleId);
                openScheduleModal(targetButton);
            }
            // --- Handle AVAILABLE button click (Open Schedule Modal for Creation) ---
            else if (!scheduleId && !pendingSubmissionId && !targetButton.classList.contains('schedulebtn') && !targetButton.classList.contains('confirmationbtn') && !targetButton.classList.contains('pendingbtn')) {
                 console.log("Available button clicked, Day:", day, "Time:", time);
                 openScheduleModal(targetButton);
            }
            // Optional: Add logging if no condition matches
            else {
                console.log("Clicked button doesn't match expected states (Available, Pending, Booked, Confirmation):", targetButton.classList, targetButton.dataset);
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
         typeCheckboxes.forEach(cb => cb.checked = false);
         if (otherCheckbox) otherCheckbox.checked = false; // Uncheck 'Other'
         if (otherInput) {
             otherInput.disabled = true;
             otherInput.value = ""; // Clear the input field
         }
         // --- End Reset ---


         // --- If it's a booked slot (scheduleId exists), fetch and populate data ---
         if (scheduleId) {
             try {
                 showSpinner(); // Show spinner while fetching
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
                            // If the type doesn't match any standard checkbox value, assume it's the 'Other' value
                            otherValue = type;
                        }
                    });

                    if (otherValue !== null && otherCheckbox && otherInput) {
                        otherCheckbox.checked = true;
                        otherInput.value = otherValue;
                        otherInput.disabled = false;
                    } else if (otherInput) {
                         otherInput.disabled = true; // Ensure disabled if no other value found
                    }
                 }
                 // --- End Populate Show Type Checkboxes ---

                 saveButton.textContent = "Edit";
                 deleteButton.style.display = "inline-block";

             } catch (error) {
                 console.error("Error fetching schedule details:", error);
                 alert("Failed to load schedule details.");
                 if (modal) modal.style.display = 'none';
                 return;
             } finally {
                 hideSpinner(); // Hide spinner after fetch attempt
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
            console.log("Save/Edit button clicked.");

            const scheduleId = scheduleForm.dataset.scheduleId;
            const method = scheduleId ? 'PATCH' : 'POST';
            const url = scheduleId ? `/schedule/${scheduleId}` : '/schedule';

            // --- Data Gathering ---
            const formData = new FormData(scheduleForm);
            const scheduleData = {
                showDetails: {},
                executiveProducer: {},
                creativeStaff: {},
                hosts: [],
                technicalStaff: [],
                // day, time, schoolYear added later
            };

            // Process FormData into the data object
            for (let [key, value] of formData.entries()) {
                // Skip array fields and file input here, handle them separately
                if (key.startsWith('hosts[') || key.startsWith('technicalStaff[') || key === 'showDetails.type[]') {
                    continue;
                }
                // Handle nested objects
                if (key.includes('.')) {
                    const [parent, child] = key.split('.');
                    if (!scheduleData[parent]) scheduleData[parent] = {};
                    scheduleData[parent][child] = value;
                } else {
                    // Handle top-level fields (if any - unlikely in this form structure)
                    scheduleData[key] = value;
                }
            }

            // Collect show types (including 'Other' value if applicable)
            scheduleData.showDetails.type = [];
            const showTypeCheckboxesChecked = scheduleForm.querySelectorAll('input[name="showDetails.type[]"]:checked');
            showTypeCheckboxesChecked.forEach(checkbox => {
                if (checkbox.id === 'other') {
                    const otherInputValue = scheduleForm.querySelector('#other-input')?.value.trim();
                    if (otherInputValue) { // Only add if 'Other' input has value
                        scheduleData.showDetails.type.push(otherInputValue);
                    }
                } else {
                    scheduleData.showDetails.type.push(checkbox.value);
                }
            });

            // <<< START REVISED HOST COLLECTION >>>
            document.querySelectorAll('#hosts-container .host-input-group').forEach((hostDiv) => {
                const lastNameInput = hostDiv.querySelector(`input[name$="[lastName]"]`);
                const firstNameInput = hostDiv.querySelector(`input[name$="[firstName]"]`);

                // Check the actual value property, not the attribute
                const lastName = lastNameInput ? lastNameInput.value.trim() : "";
                const firstName = firstNameInput ? firstNameInput.value.trim() : "";

                // Only add if BOTH required fields have a value
                if (lastName && firstName) {
                    scheduleData.hosts.push({
                        lastName,
                        firstName,
                        mi: hostDiv.querySelector(`input[name$="[mi]"]`)?.value.trim() || "", // Use || "" for safety
                        suffix: hostDiv.querySelector(`input[name$="[suffix]"]`)?.value.trim() || "",
                        cys: hostDiv.querySelector(`input[name$="[cys]"]`)?.value.trim() || ""
                    });
                } else {
                    // Optional: Log if a row was skipped due to missing name
                    if (lastName || firstName) { // Log if at least one name field was filled but not both
                         console.log("Skipping host row: Missing either first or last name.", {lastName, firstName});
                    }
                }
            });

            // <<< START REVISED TECHNICAL STAFF COLLECTION >>>
            document.querySelectorAll('#technical-container .technical-input-group').forEach((techDiv) => {
                const lastNameInput = techDiv.querySelector(`input[name$="[lastName]"]`);
                const firstNameInput = techDiv.querySelector(`input[name$="[firstName]"]`);

                const lastName = lastNameInput ? lastNameInput.value.trim() : "";
                const firstName = firstNameInput ? firstNameInput.value.trim() : "";

                // Only add if BOTH required fields have a value
                if (lastName && firstName) {
                    scheduleData.technicalStaff.push({
                        lastName,
                        firstName,
                        mi: techDiv.querySelector(`input[name$="[mi]"]`)?.value.trim() || "",
                        suffix: techDiv.querySelector(`input[name$="[suffix]"]`)?.value.trim() || "",
                        cys: techDiv.querySelector(`input[name$="[cys]"]`)?.value.trim() || ""
                    });
                } else {
                     if (lastName || firstName) {
                         console.log("Skipping technical staff row: Missing either first or last name.", {lastName, firstName});
                    }
                }
            });
            // <<< END REVISED TECHNICAL STAFF COLLECTION >>>

            console.log("Prepared schedule data:", scheduleData); // Check the collected arrays here

            // Add day, time, schoolYear from outside the form elements
            scheduleData.day = scheduleForm.dataset.day;
            scheduleData.time = scheduleForm.dataset.time;
            scheduleData.schoolYear = modalSchoolYearDropdown.value;

            // --- Validation ---
            let validationErrors = [];
            if (!scheduleData.day || !scheduleData.time) validationErrors.push("Day/Time context missing");
            if (!scheduleData.schoolYear) validationErrors.push("School Year");
            if (!scheduleData.showDetails?.title) validationErrors.push("Show Title");
            if (!scheduleData.showDetails?.type || scheduleData.showDetails.type.length === 0) validationErrors.push("At least one Show Type");
            if (otherCheckbox?.checked && (!otherInput || !otherInput.value.trim())) validationErrors.push("Specify 'Other' show type");
            if (!scheduleData.executiveProducer?.lastName || !scheduleData.executiveProducer?.firstName) validationErrors.push("Executive Producer Name");
            if (!scheduleData.creativeStaff?.lastName || !scheduleData.creativeStaff?.firstName) validationErrors.push("Creative Staff Name");
            if (scheduleData.hosts.length === 0) validationErrors.push("At least one Host");
            if (scheduleData.technicalStaff.length === 0) validationErrors.push("At least one Technical Staff");
            // Add more specific validation as needed

            if (validationErrors.length > 0) {
                alert(`Please fix the following errors:\n- ${validationErrors.join('\n- ')}`);
                return;
            }
            // --- End Validation ---

            console.log("Prepared schedule data:", scheduleData);

            showSpinner();
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
            } finally {
                hideSpinner();
            }
        });
    }


    if (deleteButton) {
        deleteButton.addEventListener("click", async () => {
            const scheduleId = scheduleForm.dataset.scheduleId;
            if (!scheduleId) return;

            if (confirm("Are you sure you want to delete this schedule?")) {
                showSpinner();
                try {
                    const response = await fetch(`/schedule/${scheduleId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Failed to delete schedule');
                    alert('Schedule deleted successfully!');
                    modal.style.display = 'none';
                    await refreshSchedule(schoolYearDropdown.value);
                } catch (error) {
                    console.error('Error deleting schedule:', error);
                    alert('Failed to delete schedule.');
                } finally {
                    hideSpinner();
                }
            }
        });
    }

    // --- Submission Form Event Listeners ---
    if (submissionSubmitButton) {
        submissionSubmitButton.addEventListener("click", (e) => {
            // ID is now stored in hidden input, not button dataset
            updateSubmission(); // Call updateSubmission without ID argument
        });
    }

    if (submissionCancelButton) {
        submissionCancelButton.addEventListener("click", () => {
            clearFields();
        });
    }

    // --- Modify preferredDayDropdown change listener ---
    if (preferredDayDropdown) {
        preferredDayDropdown.addEventListener("change", async () => {
            const selectedDay = preferredDayDropdown.value;
            // <<< CALL populateTimeOptions HERE >>>
            // Pass only the selected day. timeToSelect is null because we are just browsing options.
            // The function will use global originalSubmissionPreferredDay/Time for the check.
            await populateTimeOptions(selectedDay, null);
            // <<< END CALL >>>
        });
    }
    // --- REMOVE the old time population logic from the preferredDayDropdown listener ---


    // --- ADD THIS LISTENER for the 'Other' checkbox in the modal ---
    if (otherCheckbox && otherInput) {
        otherCheckbox.addEventListener('change', () => {
            otherInput.disabled = !otherCheckbox.checked;
            if (!otherCheckbox.checked) {
                otherInput.value = ''; // Clear the input if checkbox is unchecked
            }
        });
    } else {
        console.warn("Could not find 'other' checkbox or 'other-input' field for event listener setup.");
    }
    // --- END 'Other' checkbox listener ---


}); // End DOMContentLoaded

/*-----SUBMISSIONS TAB FUNCTIONS -----*/

// --- Add function to dynamically add a submission row ---
function addSubmissionRow(submission) {
    const tableBody = document.getElementById("submissions-table-body");
    if (!tableBody) return;

    // Use submission._id if submissionId is not present (for new submissions)
    const id = submission.submissionId || submission._id;
    const displayResult = submission.result ? submission.result.charAt(0).toUpperCase() + submission.result.slice(1) : "Pending";

    const newRow = tableBody.insertRow(0); // Insert at the top
    newRow.setAttribute('data-submission-id', id); // Add data attribute
    newRow.classList.add(`result-${(submission.result || 'Pending').toLowerCase()}`); // Add class for styling

    newRow.innerHTML = `
        <td>${submission.showTitle || 'N/A'}</td>
        <td>${submission.submittedBy || submission.organizationName || 'N/A'}</td>
        <td>${submission.preferredDay || 'N/A'} at ${submission.preferredTime || 'N/A'}</td>
        <td><span class="status-${(submission.result || 'pending').toLowerCase()}">${displayResult}</span></td>
        <td><button class="select-btn" data-id="${id}">Select</button></td>
    `;
     // No need to re-attach listener if using delegation (added below)
}

// --- Add function to dynamically update a submission row ---
function updateSubmissionRow(submission) {
    const tableBody = document.getElementById("submissions-table-body");
    const resultFilter = document.getElementById("resultFilter"); // Get the filter dropdown
    if (!tableBody || !resultFilter) return;

    const currentFilter = resultFilter.value; // Get the current filter value ("All", "Pending", "Accepted", "Rejected")
    const submissionResult = submission.result; // Lowercase result from socket data
    const id = submission.submissionId || submission._id; // Use consistent ID

    const row = tableBody.querySelector(`tr[data-submission-id="${id}"]`);

    // Check if the submission's new status matches the current filter
    const matchesFilter = (currentFilter === "All" || currentFilter.toLowerCase() === submissionResult);

    if (row && matchesFilter) {
        // Row exists and matches filter: Update the row content
        console.log(`Updating row content for submission: ${id}`);
        const statusCell = row.cells[3]; // Assuming status is the 4th column (index 3)
        const scheduleCell = row.cells[2]; // Assuming schedule is the 3rd column
        const capitalizedResult = submissionResult.charAt(0).toUpperCase() + submissionResult.slice(1);

        if (statusCell) {
            statusCell.innerHTML = `<span class="status-${submissionResult.toLowerCase()}">${capitalizedResult}</span>`;
        }
        if (scheduleCell) {
            scheduleCell.textContent = `${submission.preferredDay || 'N/A'} at ${submission.preferredTime || 'N/A'}`;
        }
        // Update class on row
        row.className = `result-${submissionResult.toLowerCase()}`; // Reset class based on new result

    } else if (row && !matchesFilter) {
        // Row exists but NO LONGER matches filter: Remove the row
        console.log(`Removing row for submission ${id} as it no longer matches filter '${currentFilter}'`);
        row.remove();

    } else if (!row && matchesFilter) {
        // Row doesn't exist, but it SHOULD match the filter: Add the row
        console.log(`Adding row for submission ${id} as it now matches filter '${currentFilter}'`);
        addSubmissionRow(submission); // Reuse the add row function

    } else {
        // Row doesn't exist and doesn't match filter: Do nothing
        console.log(`Ignoring update for submission ${id} - Row not found and does not match filter '${currentFilter}'`);
    }
}


// Fetch and display submissions in the table
async function loadSubmissions() {
    const tableBody = document.getElementById("submissions-table-body");
    if (!tableBody) return;

    try {
        showSpinner();
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

        tableBody.innerHTML = ""; // Clear existing rows

        if (Array.isArray(submissions) && submissions.length > 0) {
            submissions.forEach((submission) => {
                // Pass the correct data structure to addSubmissionRow
                addSubmissionRow({
                    submissionId: submission._id, // Ensure ID is passed correctly
                    showTitle: submission.showDetails?.title,
                    submittedBy: submission.submittedBy || submission.organizationName,
                    preferredDay: submission.preferredSchedule?.day,
                    preferredTime: submission.preferredSchedule?.time,
                    result: submission.result || 'Pending'
                });
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No submissions found for the selected criteria.</td></tr>';
        }
    } catch (error) {
        console.error("Error loading submissions:", error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load submissions. Please try again.</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

// Add event listener for select buttons using delegation (add this inside DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    const submissionsTableBody = document.getElementById("submissions-table-body");
    if (submissionsTableBody) {
        submissionsTableBody.addEventListener('click', async (event) => { // Make async
            if (event.target.classList.contains('select-btn')) {
                const submissionId = event.target.dataset.id;
                if (submissionId) {
                    showSpinner(); // Show spinner before async call
                    await selectSubmission(submissionId); // Await the selection
                    // Spinner hidden inside selectSubmission's finally block
                } else {
                    console.error("Select button clicked but no submission ID found.");
                }
            }
        });
    }
});


// --- Modify selectSubmission ---
async function selectSubmission(submissionId) {
    console.log("Selecting submission:", submissionId);
    // Add hidden input to store the ID in the form
    let idInput = document.getElementById('submissionIdHidden');
    if (!idInput) {
        idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.id = 'submissionIdHidden';
        idInput.name = 'submissionIdHidden';
        document.getElementById('submission-form').appendChild(idInput);
    }
    idInput.value = submissionId;


    try {
        showSpinner();
        // Fetch submission details from the backend using the ID
        const response = await fetch(`/submissions/${submissionId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch submission details: ${response.statusText}`);
        }
        const submission = await response.json();

        // Store the current school year for this submission context
        currentSubmissionSchoolYear = submission.schoolYear;

        // <<< STORE ORIGINAL DAY AND TIME >>>
        originalSubmissionPreferredDay = submission.preferredSchedule?.day;
        originalSubmissionPreferredTime = submission.preferredSchedule?.time;
        // <<< END STORE >>>

        // --- Populate form fields ---
        // Populate Read-only Fields (Using unique IDs for submission form)
        document.getElementById('submissionOrganizationName').value = submission.organizationName || '';
        document.getElementById('submissionOrganizationType').value = submission.organizationType || '';
        document.getElementById('submissionProponentName').value = formatName(submission.proponent);
        document.getElementById('submissionProponentCYS').value = submission.proponent?.cys || '';

        if (submission.coProponent?.notApplicable) {
            document.getElementById('submissionCoProponentName').value = 'N/A';
            document.getElementById('submissionCoProponentCYS').value = 'N/A';
        } else {
            document.getElementById('submissionCoProponentName').value = formatName(submission.coProponent);
            document.getElementById('submissionCoProponentCYS').value = submission.coProponent?.cys || '';
        }

        document.getElementById('executiveProducer').value = formatName(submission.executiveProducer); // Assuming ID exists
        document.getElementById('executiveProducerCYS').value = submission.executiveProducer?.cys || ''; // Assuming ID exists

        if (submission.facultyStaff?.notApplicable) {
            document.getElementById('facultyStaff').value = 'N/A'; // Assuming ID exists
            document.getElementById('facultyStaffDepartment').value = 'N/A'; // Assuming ID exists
        } else {
            document.getElementById('facultyStaff').value = formatName(submission.facultyStaff); // Assuming ID exists
            document.getElementById('facultyStaffDepartment').value = submission.facultyStaff?.department || ''; // Assuming ID exists
        }

        // Populate Hosts (Read-only)
        const subHostContainer = document.getElementById("submissionHostContainer");
        if (subHostContainer) {
            subHostContainer.innerHTML = ""; // Clear previous
            if (submission.hosts && submission.hosts.length > 0) {
                submission.hosts.forEach((host, index) => {
                    const hostField = document.createElement("div");
                    hostField.className = 'readonly-field-group';
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


        // Populate Technical Staff (Read-only)
        const subTechContainer = document.getElementById("submissionTechnicalStaffContainer");
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


        // Populate other read-only fields
        document.getElementById("submissionShowTitle").value = submission.showDetails?.title || "";
        document.getElementById("submissionShowType").value = Array.isArray(submission.showDetails?.type)
            ? submission.showDetails.type.join(', ')
            : (submission.showDetails?.type || "");
        document.getElementById("submissionShowDescription").value = submission.showDetails?.description || "";
        document.getElementById("submissionShowObjectives").value = submission.showDetails?.objectives || "";
        document.getElementById("submissionCreativeStaff").value = formatName(submission.creativeStaff);
        document.getElementById("submissionCreativeStaffCYS").value = submission.creativeStaff?.cys || "";
        document.getElementById("submissionDlsudEmail").value = submission.contactInfo?.dlsudEmail || "";
        document.getElementById("submissionContactEmail").value = submission.contactInfo?.contactEmail || "";
        document.getElementById("submissionContactFbLink").value = submission.contactInfo?.contactFbLink || "";

        // Handle FB Link visibility
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

        // Handle Signature
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


        // --- Populate Editable Fields ---
        const preferredDayDropdown = document.getElementById("preferredDay");
        const resultDropdown = document.getElementById("result");

        if (!preferredDayDropdown || !resultDropdown) { // Check only these two initially
            console.error("selectSubmission: Missing preferredDay or result dropdown.");
            return;
        }

        const selectedDay = submission.preferredSchedule?.day || "";
        const selectedTime = submission.preferredSchedule?.time || ""; // Get the time from the submission

        preferredDayDropdown.value = selectedDay;

        // <<< CALL populateTimeOptions HERE >>>
        // Populate time dropdown based on selected day and pre-select the submission's time
        await populateTimeOptions(selectedDay, selectedTime);
        // <<< END CALL >>>

        // Set Result Dropdown
        const dbResult = submission.result || "Pending";
        resultDropdown.value = dbResult.charAt(0).toUpperCase() + dbResult.slice(1);

        // --- Enable/Disable Form Elements ---
        initialSubmissionResult = resultDropdown.value; // Store initial result correctly
        const isDecided = initialSubmissionResult !== 'Pending';
        resultDropdown.disabled = isDecided;
        preferredDayDropdown.disabled = isDecided;

        // Disable time dropdown based on isDecided OR if no slots were available
        const preferredTimeDropdown = document.getElementById("preferredTime"); // Get it again after population
        if (preferredTimeDropdown) {
             preferredTimeDropdown.disabled = isDecided || preferredTimeDropdown.options.length <= 1; // Check if only the placeholder/disabled option is there
        }

        // Enable Cancel button
        const subCancelBtn = document.querySelector("#submission-form .cancel-button");
        if (subCancelBtn) subCancelBtn.disabled = false;

        // Enable/Disable Submit button
        const subSubmitBtn = document.querySelector("#submission-form .submit-button");
        if (subSubmitBtn) {
            subSubmitBtn.disabled = isDecided;
            // No need to set dataset ID here, it's handled by the hidden input
        }

    } catch (error) {
        console.error("Error fetching or populating submission details:", error);
        alert("Failed to load submission details.");
        clearFields(); // Clear fields on error
    } finally {
        hideSpinner();
    }
}


// --- Modify updateSubmission to use the stored ID ---
async function updateSubmission() { // Removed submissionId parameter
    const submissionId = document.getElementById('submissionIdHidden').value;
    if (!submissionId) {
        alert("No submission selected.");
        return;
    }
    const resultDropdown = document.getElementById("result");
    const preferredDayDropdown = document.getElementById("preferredDay"); // Get dropdown element
    const preferredTimeDropdown = document.getElementById("preferredTime"); // Get dropdown element

    if (!resultDropdown || !preferredDayDropdown || !preferredTimeDropdown) {
        alert("Essential form elements (result, day, time) not found.");
        return;
    }

    const preferredDay = preferredDayDropdown.value;
    const preferredTime = preferredTimeDropdown.value;

    const newResult = resultDropdown.value; // This is "Accepted", "Rejected", "Pending"
    const selectedYear = currentSubmissionSchoolYear; // Use stored year

    // Confirmation Check (using initialSubmissionResult stored in selectSubmission)
    if (initialSubmissionResult === 'Pending' && (newResult === 'Accepted' || newResult === 'Rejected')) {
        if (!confirm(`You are changing the status from Pending to ${newResult}. Are you sure?`)) {
            resultDropdown.value = initialSubmissionResult; // Reset dropdown
            return; // Stop if user cancels
        }
    } else if (initialSubmissionResult !== 'Pending' && newResult !== initialSubmissionResult) { // Compare directly with stored value
         if (!confirm(`You are changing the status from ${initialSubmissionResult} to ${newResult}. Are you sure?`)) {
             resultDropdown.value = initialSubmissionResult; // Reset dropdown
             return; // Stop if user cancels
         }
    }


    // Validations
    if (newResult === "Pending") {
        alert("Cannot manually set status back to Pending via this form. Use 'Accepted' or 'Rejected'.");
        return;
    }
    if (!preferredDay) {
        alert("Please select a Preferred Day.");
        return;
    }
    // Check if preferredTime is empty or still has a placeholder value
    if (!preferredTime || preferredTimeDropdown.selectedIndex <= 0) { // Index 0 is usually the disabled placeholder
        alert("Please select a valid Preferred Time slot.");
        return;
    }

    // Check for Schedule Conflicts (only if Accepting)
    if (newResult === "Accepted") {
        // Use the global existingSchedules which should be updated by refreshSchedule/sockets
        const conflict = existingSchedules.find(schedule =>
            schedule.day === preferredDay &&
            schedule.time === preferredTime &&
            schedule.schoolYear === selectedYear &&
            schedule.submissionId !== submissionId // Don't conflict with itself if it was previously scheduled
        );

        if (conflict) {
            alert(`Conflict: This time slot (${preferredDay} ${preferredTime}) is already taken by "${conflict.showDetails?.title}". Please choose another time or reject the submission.`);
            return;
        }
    }

    // Prepare Update Payload
    const updates = {
        result: newResult.toLowerCase(), // Send lowercase 'accepted' or 'rejected'
        preferredSchedule: {
            day: preferredDay,
            time: preferredTime
        }
    };
    console.log("Sending updates:", updates);

    showSpinner();
    try {
        const response = await fetch(`/submissions/${submissionId}`, {method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `Failed to update submission: ${response.statusText}`);
        }

        alert(responseData.message || 'Submission updated successfully!');

        // The socket event 'submissionAdminUpdate' should handle updating the UI row.
        // The socket event 'scheduleUpdate' should handle updating the schedule grid button.

        // Clear fields after successful update
        clearFields();

        // Refresh schedule grid to ensure consistency after update
        await refreshSchedule(document.getElementById("schoolYear")?.value);


    } catch (error) {
        console.error("Error updating submission:", error);
        alert(`Error: ${error.message}`);
    } finally {
        hideSpinner();
    }
}

// Helper function to format names consistently
function formatName(person) {
    if (!person) return "N/A";
    const lastName = person.lastName || "";
    const firstName = person.firstName || "";
    const mi = person.mi || person.middleInitial || ""; // Handle both possible field names
    const suffix = person.suffix ||"";

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


// --- Modify clearFields ---
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
                // console.warn(`clearFields: Missing element with ID '${id}'`); // Reduce noise
            }
        });

        // Clear dynamic containers (using unique IDs)
        const subHostContainer = document.getElementById("submissionHostContainer");
        if (subHostContainer) subHostContainer.innerHTML = "<p>Select a submission to view details.</p>";
        // else console.warn("clearFields: Missing 'submissionHostContainer'");

        const subTechContainer = document.getElementById("submissionTechnicalStaffContainer");
        if (subTechContainer) subTechContainer.innerHTML = "<p>Select a submission to view details.</p>";
        // else console.warn("clearFields: Missing 'submissionTechnicalStaffContainer'");

        // Hide FB Link container (using unique ID)
        const subFbLinkContainer = document.getElementById("submissionFbLinkContainer");
        if (subFbLinkContainer) subFbLinkContainer.style.display = "none";
        // else console.warn("clearFields: Missing 'submissionFbLinkContainer'");

        // Hide Signature (using unique ID)
        const subSigImg = document.getElementById("submissionProponentSignature");
        if (subSigImg) {
            subSigImg.src = "";
            subSigImg.style.display = "none";
        }
        // else { console.warn("clearFields: Missing 'submissionProponentSignature'"); }

        // Reset editable dropdowns
        const preferredDayDropdown = document.getElementById("preferredDay");
        const preferredTimeDropdown = document.getElementById("preferredTime");
        const resultDropdown = document.getElementById("result");

        if (preferredDayDropdown) preferredDayDropdown.value = "";
        if (preferredTimeDropdown) {
            preferredTimeDropdown.innerHTML = '<option value="" disabled selected>Select a day first</option>';
            preferredTimeDropdown.disabled = true;
        }
        if (resultDropdown) resultDropdown.value = "Pending"; // Default to Pending

        // Reset state variables
        currentSubmissionSchoolYear = null;
        originalSubmissionPreferredTime = null;
        originalSubmissionPreferredDay = null; // <<< ADDED RESET
        initialSubmissionResult = 'Pending';

        // Reset hidden ID input
        const idInput = document.getElementById('submissionIdHidden');
        if (idInput) idInput.value = "";

        // Disable/Reset buttons and dropdowns
        if (resultDropdown) resultDropdown.disabled = true;
        if (preferredDayDropdown) preferredDayDropdown.disabled = true;
        if (preferredTimeDropdown) preferredTimeDropdown.disabled = true;

        const subCancelBtn = document.querySelector("#submission-form .cancel-button");
        if (subCancelBtn) subCancelBtn.disabled = true;

        const subSubmitBtn = document.querySelector("#submission-form .submit-button");
        if (subSubmitBtn) {
            subSubmitBtn.disabled = true;
            // No need to delete dataset ID, using hidden input now
        }
        console.log("Submission detail fields cleared.");
    } else {
        console.warn("clearFields: Submission form not found.");
    }
}