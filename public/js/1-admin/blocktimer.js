document.addEventListener('DOMContentLoaded', async function () { // Make top-level async
    // Tab switching logic
    const tabsContainer = document.querySelector('.tabs-container');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabsContainer) { // Check if container exists
        tabsContainer.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.tab-button'); // Use closest to handle clicks inside button
            if (targetButton && targetButton.classList.contains('tab-button')) {
                const targetTab = targetButton.dataset.target; // Use data-target

                // Update button styles
                tabButtons.forEach(button => {
                    button.classList.remove('active', 'bg-green-700', 'text-white');
                    button.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-800');
                });
                targetButton.classList.add('active', 'bg-green-700', 'text-white');
                targetButton.classList.remove('bg-white', 'border', 'border-gray-300', 'text-gray-800');

                // Update pane visibility
                tabPanes.forEach(pane => {
                    if (pane.id === targetTab) {
                        pane.classList.remove('hidden'); // Tailwind show
                        pane.classList.add('block'); // Ensure it's block
                    } else {
                        pane.classList.add('hidden'); // Tailwind hide
                        pane.classList.remove('block');
                    }
                });

                // Load data for the activated tab if necessary
                if (targetTab === 'submissions-tab') {
                    // Check if submissionSchoolYearSelect has a value before loading
                    if (submissionSchoolYearSelect && submissionSchoolYearSelect.value) {
                        loadSubmissions(); // Load submissions when switching to this tab
                    } else {
                         // Optionally clear the table or show a message if no year is selected yet
                         if (submissionsTableBody) submissionsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center">Please select a school year.</td></tr>';
                         resetSubmissionForm();
                    }
                } else if (targetTab === 'schedule-tab') {
                    if (submissionForm && !submissionForm.classList.contains('hidden')) {
                        console.log("Switching to Schedule tab, hiding submission form.");
                        resetSubmissionForm(); // Reset and hide the form
                    }
                }
            }
        });
    } else {
        console.warn("Tabs container (.tabs-container) not found. Tab switching disabled.");
    }


    // Modal elements
    const modal = document.getElementById('scheduleModal');
    const closeModalButton = modal?.querySelector('.close'); // Add null check
    const scheduleForm = document.getElementById('scheduleForm');
    const saveButton = document.getElementById('saveButton');
    const deleteButton = document.getElementById('deleteButton');
    const scheduleTableBody = document.querySelector('.schedule-table tbody'); // Ensure this selector is correct
    const schoolYearSelect = document.getElementById('schoolYear');
    const modalSchoolYearSelect = document.getElementById('modalSchoolYear');

    // --- School Year Configuration ---
    const schoolYearConfigForm = document.getElementById('schoolYearConfigForm');
    const currentConfigDisplay = document.getElementById('currentSchoolYearConfigDisplay');
    const startYearInput = document.getElementById('startYear');
    const endYearInput = document.getElementById('endYear');

    if (startYearInput && endYearInput) {
        startYearInput.addEventListener('input', () => {
            const startYearValue = parseInt(startYearInput.value, 10);
            if (!isNaN(startYearValue) && startYearInput.value.length === 4) { // Check if it's a valid number and potentially a 4-digit year
                endYearInput.value = startYearValue + 1;
            } else {
                endYearInput.value = ''; // Clear end year if start year is invalid or empty
            }
        });
    } else {
        console.warn("Could not find startYear or endYear input elements for auto-population.");
    }

    async function fetchAndDisplayCurrentConfig() {
        try {
            const response = await fetch('/schoolYear');
            if (!response.ok) {
                 if (response.status === 404) {
                     currentConfigDisplay.textContent = 'No school year configured yet.';
                     console.log("No current school year config found (404 from /schoolYear).");
                     await populateSchoolYearDropdowns();
                     return;
                 }
                 throw new Error(`Failed to fetch config: ${response.statusText}`);
            }
            const config = await response.json();
            console.log("Fetched current config from /schoolYear:", config);

            // --- MODIFIED CHECK ---
            // Check if the 'schoolYear' property exists and is a non-empty string
            if (config && typeof config.schoolYear === 'string' && config.schoolYear.trim() !== '') {
                // Display the pre-formatted string directly
                currentConfigDisplay.textContent = `Current School Year: ${config.schoolYear}`;

                // Extract the YYYY-YYYY part for the dropdown selection
                let currentYearValue = null;
                const yearMatch = config.schoolYear.match(/(\d{4}).*(\d{4})/); // Find first and last 4-digit year
                if (yearMatch && yearMatch[1] && yearMatch[2]) {
                    currentYearValue = `${yearMatch[1]}-${yearMatch[2]}`;
                } else {
                    console.warn("Could not extract YYYY-YYYY from config.schoolYear string:", config.schoolYear);
                }

                await populateSchoolYearDropdowns(currentYearValue); // Pass extracted YYYY-YYYY value

            } else {
                // Handle cases where config is empty or schoolYear property is missing/invalid
                currentConfigDisplay.textContent = 'No school year configured yet.';
                await populateSchoolYearDropdowns(); // Populate dropdowns even if no config
            }
        } catch (error) {
            console.error('Error fetching school year config:', error);
            currentConfigDisplay.textContent = 'Error loading configuration.';
            await populateSchoolYearDropdowns(); // Attempt to populate even on error
        }
    }

    if (schoolYearConfigForm) {
        schoolYearConfigForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(schoolYearConfigForm);
            const data = Object.fromEntries(formData.entries());

            // Basic validation
            if (parseInt(data.startYear) > parseInt(data.endYear) ||
                (parseInt(data.startYear) === parseInt(data.endYear) && parseInt(data.startMonth) >= parseInt(data.endMonth))) {
                alert('End date must be chronologically after the start date.');
                return;
            }

            showSpinner();
            try {
                // Endpoint: POST /schoolYear/config (Corrected)
                const response = await fetch('/schoolYear/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!response.ok) {
                    let errorMsg = 'Failed to save config';
                    try {
                        const errorData = await response.json();
                        errorMsg = errorData.error || errorMsg; // Use server error message if available
                    } catch (e) {
                        // Ignore JSON parsing error if response body is empty or not JSON
                        console.warn("Could not parse error response as JSON.");
                    }
                    // Throw specific error message
                    throw new Error(errorMsg);
                }
                alert('School year configuration saved successfully!');
                await fetchAndDisplayCurrentConfig(); // Refresh display and dropdowns
            } catch (error) {
                console.error('Error saving school year config:', error);
                alert(error.message);
            } finally {
                 hideSpinner();
            }
        });
    } else {
        console.warn("School year config form (#schoolYearConfigForm) not found.");
    }

    async function populateSchoolYearDropdowns(currentYearValue = null) {
        try {
            // Endpoint: GET /schoolYear/all (Correct)
            const response = await fetch('/schoolYear/all'); // API to get all defined years
            if (!response.ok) throw new Error('Failed to fetch school years');
            const schoolYears = await response.json();
            console.log("Data received from /schoolYear/all:", JSON.stringify(schoolYears, null, 2));

            // Clear existing options for all relevant dropdowns
            [schoolYearSelect, modalSchoolYearSelect, submissionSchoolYearSelect].forEach(select => {
                 if (select) select.innerHTML = '';
            });


             if (!Array.isArray(schoolYears) || schoolYears.length === 0) {
                const defaultOption = '<option value="" disabled selected>No School Years Configured</option>';
                 [schoolYearSelect, modalSchoolYearSelect, submissionSchoolYearSelect].forEach(select => {
                     if (select) {
                         select.innerHTML = defaultOption;
                         select.disabled = true; // Disable dropdown if no options
                     }
                 });
                return; // Exit if no years are configured
            }

            // Enable dropdowns
             [schoolYearSelect, modalSchoolYearSelect, submissionSchoolYearSelect].forEach(select => {
                 if (select) select.disabled = false;
             });

            schoolYears.forEach(year => {
                const yearValue = `${year.startYear}-${year.endYear}`;
                const option = document.createElement('option');
                option.value = yearValue; // Use the generated value
                // Use label if provided, otherwise generate a default label
                option.textContent = year.label || `SY ${yearValue}`;
                 // Append to all relevant dropdowns
                 if (schoolYearSelect) schoolYearSelect.appendChild(option.cloneNode(true));
                 if (modalSchoolYearSelect) modalSchoolYearSelect.appendChild(option.cloneNode(true));
                 if (submissionSchoolYearSelect) submissionSchoolYearSelect.appendChild(option.cloneNode(true));
            });

             // Select the current year if provided and exists, otherwise select the first year
             let yearToSelect = null;
             if (currentYearValue && schoolYears.some(y => `${y.startYear}-${y.endYear}` === currentYearValue)) {
                 yearToSelect = currentYearValue;
             } else if (schoolYears.length > 0) {
                 yearToSelect = `${schoolYears[0].startYear}-${schoolYears[0].endYear}`; // Default to the generated value of the first year
             }
             console.log("Year to select in dropdowns:", yearToSelect);

             if (yearToSelect) {
                 if (schoolYearSelect) schoolYearSelect.value = yearToSelect;
                 if (modalSchoolYearSelect) modalSchoolYearSelect.value = yearToSelect;
                 if (submissionSchoolYearSelect) submissionSchoolYearSelect.value = yearToSelect;
                 console.log("Set dropdown values to:", yearToSelect);
             }

             // Trigger change events AFTER setting the value
             if (schoolYearSelect && yearToSelect) {
                 console.log("Dispatching change event on schoolYearSelect");
                 schoolYearSelect.dispatchEvent(new Event('change', { bubbles: true }));
             }
             if (submissionSchoolYearSelect && yearToSelect) {
                  console.log("Dispatching change event on submissionSchoolYearSelect");
                  submissionSchoolYearSelect.dispatchEvent(new Event('change', { bubbles: true }));
             }

        } catch (error) {
            console.error('Error populating school year dropdowns:', error);
             const errorOption = '<option value="" disabled selected>Error Loading Years</option>';
              [schoolYearSelect, modalSchoolYearSelect, submissionSchoolYearSelect].forEach(select => {
                  if (select) {
                      select.innerHTML = errorOption;
                      select.disabled = true;
                  }
              });
        }
    }

    // --- Submissions Tab Logic ---
    const submissionSchoolYearSelect = document.getElementById('submissionSchoolYear');
    const resultFilterSelect = document.getElementById('resultFilter'); // Ensure this ID is correct in HTML
    const submissionsTableBody = document.getElementById('submissions-table-body'); // Ensure this ID is correct
    const submissionForm = document.getElementById('submission-form');
    const submissionIdInput = document.getElementById('submissionId'); // Hidden input for submission ID
    const submissionResultSelect = document.getElementById('result'); // The result dropdown in the form
    const submitSubmissionButton = document.getElementById('submit-submission-button');
    const cancelSubmissionButton = document.getElementById('cancel-submission-button');
    const resultErrorDiv = submissionForm?.querySelector('.result-error'); // Add null check
    const submissionPreferredDaySelect = document.getElementById('submissionPreferredDay'); // New
    const submissionPreferredTimeSelect = document.getElementById('submissionPreferredTime'); // New

    // --- Pagination Elements ---
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfoSpan = document.getElementById('page-info');

    // --- Pagination State ---
    let allSubmissions = []; // Store all fetched submissions for current filter
    let currentPage = 1;
    const itemsPerPage = 5;

    // --- GLOBAL STATE VARIABLES (Add/Ensure these exist) ---
    let currentSubmissionId = null; // Store ID of submission being viewed in the form
    let originalSubmissionPreferredDay = null; // Store original day for availability check
    let originalSubmissionPreferredTime = null; // Store original time for availability check
    let permanentSchedules = []; // Store fetched permanent schedules for the current year
    let pendingSubmissions = []; // Store fetched pending submissions for the current year
    let currentScheduleViewYear = null; // Store the year viewed in the main schedule grid
    let currentSubmissionViewYear = null; // Store the year viewed in the submissions tab filter
    const ALL_TIME_SLOTS = [
        "9:10-9:55", "10:00-10:55", "11:00-11:55", "12:01-12:55",
        "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"
    ];
    let socket = null; // Ensure socket is initialized

    // --- Initialize Socket.IO ---
    socket = io(); // Connect to the server

    socket.on('connect', () => console.log('Admin Socket Connected:', socket.id));
    socket.on('disconnect', () => console.log('Admin Socket Disconnected'));

    // --- Socket Event Listener for Schedule Updates ---
    socket.on('scheduleUpdate', async (data) => {
        console.log('Received scheduleUpdate:', data);
        // 1. Refresh the underlying data (permanentSchedules and pendingSubmissions)
        //    We need the year context. Let's use the year from the main schedule dropdown.
        const scheduleYear = schoolYearSelect ? schoolYearSelect.value : null;
        if (scheduleYear && data.schoolYear === scheduleYear) {
            await fetchScheduleAndPendingData(scheduleYear); // Fetch updated data

            // 2. Update the visual schedule grid button
            updateScheduleButtonUI(data); // Separate UI update function

            // 3. If the submission form is open and for the same year, refresh time options
            const submissionFormYear = submissionSchoolYearSelect ? submissionSchoolYearSelect.value : null;
            if (scheduleYear === submissionFormYear && submissionForm && !submissionForm.classList.contains('hidden') && submissionPreferredDaySelect) {
                const selectedDay = submissionPreferredDaySelect.value;
                const currentlySelectedTime = submissionPreferredTimeSelect.value;
                if (selectedDay) {
                    console.log("Schedule updated, refreshing time options for submission form.");
                    await populateAvailableTimes(selectedDay, currentlySelectedTime); // Refresh with current selection
                }
            }
        } else {
            console.log(`Schedule update ignored (wrong year: ${data.schoolYear}, current schedule view: ${scheduleYear})`);
        }
    });

    // --- Socket Event Listener for Submission Updates (Accept/Reject) ---
    socket.on('submissionAdminUpdate', async (data) => {
        console.log('Received submissionAdminUpdate:', data);
        const scheduleYear = schoolYearSelect ? schoolYearSelect.value : null;
        const submissionFilterYear = submissionSchoolYearSelect ? submissionSchoolYearSelect.value : null;

        // 1. Refresh the underlying data if the update affects the currently viewed year
        if (data.schoolYear === scheduleYear || data.schoolYear === submissionFilterYear) {
             await fetchScheduleAndPendingData(data.schoolYear); // Fetch updated data for the affected year
        }

        // 2. Update the row in the submissions table if visible
        if (data.schoolYear === submissionFilterYear) {
            updateSubmissionRowUI(data); // Separate UI update function
        }

        // 3. If the submission form is open for THIS submission, update its fields
        if (submissionForm && !submissionForm.classList.contains('hidden') && currentSubmissionId === data.submissionId) {
            console.log("Submission form is open for the updated submission. Refreshing fields.");
            if (submissionResultSelect) submissionResultSelect.value = data.result.charAt(0).toUpperCase() + data.result.slice(1);
            if (submissionPreferredDaySelect) submissionPreferredDaySelect.value = data.preferredDay;

            // Refresh time options based on the potentially new day/status
            await populateAvailableTimes(data.preferredDay, data.preferredTime);

            // Update enable/disable state
            enableSubmissionForm(); // Re-evaluate based on new status
        }
    });
    // --- End Socket Listeners ---


    // --- Helper to fetch and store schedule/pending data ---
    async function fetchScheduleAndPendingData(schoolYear) {
        if (!schoolYear) {
            permanentSchedules = [];
            pendingSubmissions = [];
            return;
        }
        try {
            const [permRes, pendRes] = await Promise.all([
                fetch(`/schedule?schoolYear=${encodeURIComponent(schoolYear)}`),
                fetch(`/submissions?result=Pending&schoolYear=${encodeURIComponent(schoolYear)}`)
            ]);

            // Handle potential 404 for schedule gracefully
            if (permRes.status === 404) {
                console.warn(`Schedule endpoint (/schedule) not found (404) for ${schoolYear}. Assuming no permanent schedules.`);
                permanentSchedules = [];
            } else if (!permRes.ok) {
                console.error(`Failed to fetch permanent schedule for ${schoolYear}: ${permRes.statusText}`);
                permanentSchedules = []; // Set empty on error
            } else {
                permanentSchedules = await permRes.json();
            }

            // Handle pending submissions fetch failure gracefully
            if (!pendRes.ok) {
                console.warn(`Failed to fetch pending submissions for ${schoolYear}: ${pendRes.statusText}.`);
                pendingSubmissions = [];
            } else {
                pendingSubmissions = await pendRes.json();
            }

            console.log(`Fetched data for ${schoolYear}: Permanent=${permanentSchedules.length}, Pending=${pendingSubmissions.length}`);

        } catch (error) {
            console.error(`Error fetching schedule/pending data for ${schoolYear}:`, error);
            permanentSchedules = [];
            pendingSubmissions = [];
        }
    }

    // --- New function to update schedule table UI from global data ---
    function updateScheduleTableUI() {
        console.log("Updating schedule table UI from global data");
        if (!scheduleTableBody || !currentScheduleViewYear) return; // Ensure body and year exist

        const buttons = scheduleTableBody.querySelectorAll('.schedule-slot-btn');

        buttons.forEach(button => {
            const day = button.dataset.day;
            const time = button.dataset.time;

            // Find matching permanent or pending schedule for this button's slot and year
            const permMatch = permanentSchedules.find(s => s.schoolYear === currentScheduleViewYear && s.day === day && s.time === time);
            const pendMatch = pendingSubmissions.find(p => p.schoolYear === currentScheduleViewYear && p.preferredSchedule?.day === day && p.preferredSchedule?.time === time);

            // Reset button state first (inline the reset logic from updateScheduleButtonUI)
            button.disabled = false;
            button.classList.remove('booked', 'pending', 'bg-red-500', 'bg-yellow-400', 'text-white', 'text-black', 'border-red-500', 'border-yellow-400', 'cursor-not-allowed', 'hover:bg-red-600', 'hover:bg-yellow-500');
            button.classList.add('bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white');
            button.textContent = ''; // Clear text
            delete button.dataset.scheduleId;
            delete button.dataset.pendingSubmissionId;

            // Apply new state if there's a match
            if (permMatch) {
                button.textContent = permMatch.showDetails?.title || 'Booked';
                button.classList.add('booked');
                button.dataset.scheduleId = permMatch._id;
                button.classList.remove('bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white');
                button.classList.add('bg-red-500', 'text-white', 'border-red-500', 'hover:bg-red-600');
            } else if (pendMatch) {
                button.textContent = `PENDING: ${pendMatch.showDetails?.title || 'N/A'}`;
                button.classList.add('pending');
                button.dataset.pendingSubmissionId = pendMatch._id;
                button.classList.remove('bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white');
                button.classList.add('bg-yellow-400', 'text-black', 'border-yellow-400', 'hover:bg-yellow-500');
            }
            // Else: Button remains in the 'available' state (set during reset)
        });
    }

    // --- Schedule Loading & Interaction ---
    async function loadSchedule(schoolYear) {
        currentScheduleViewYear = schoolYear; // Store the currently viewed year
        if (!schoolYear || schoolYear === 'undefined') {
            console.warn("loadSchedule: No valid school year provided, clearing schedule.");
            // Clear data and update UI to empty state
            permanentSchedules = [];
            pendingSubmissions = [];
            updateScheduleTableUI(); // Call update UI even when clearing
            return;
        }
        showSpinner();
        console.log(`Loading schedule for ${schoolYear}`);
        try {
            // Fetch data and store globally
            await fetchScheduleAndPendingData(schoolYear);
            // Update UI based on fetched data
            updateScheduleTableUI(); // Update UI from global data (no separate clear needed)
        } catch (error) {
            console.error('Error loading schedule:', error);
            // Clear data and update UI to empty state on error
            permanentSchedules = [];
            pendingSubmissions = [];
            updateScheduleTableUI(); // Call update UI even on error
            alert(`Error loading schedule for ${schoolYear}. Check console for details.`);
        } finally {
            hideSpinner();
        }
    }

    // --- Helper to update a single schedule button UI (Used by Socket Events) ---
    function updateScheduleButtonUI(data) {
        const { action, day, time, schoolYear, showTitle, status, scheduleId, submissionId } = data;
        const currentYear = schoolYearSelect ? schoolYearSelect.value : null;

        if (schoolYear !== currentYear) return; // Ignore if not for current view

        const button = scheduleTableBody?.querySelector(`.schedule-slot-btn[data-day="${day}"][data-time="${time}"]`);
        if (!button) return;

        // Reset state (same reset logic as in the main update function)
        button.disabled = false;
        button.classList.remove('booked', 'pending', 'bg-red-500', 'bg-yellow-400', 'text-white', 'text-black', 'border-red-500', 'border-yellow-400', 'cursor-not-allowed', 'hover:bg-red-600', 'hover:bg-yellow-500');
        button.classList.add('bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white');
        button.textContent = '';
        delete button.dataset.scheduleId;
        delete button.dataset.pendingSubmissionId;

        // Apply new state based on latest data (check permanentSchedules and pendingSubmissions)
        // Re-fetch might be needed here if socket event doesn't guarantee global vars are up-to-date
        // For now, assume global vars ARE updated before this is called by socket handler
        const permMatch = permanentSchedules.find(s => s.schoolYear === currentYear && s.day === day && s.time === time);
        const pendMatch = pendingSubmissions.find(p => p.schoolYear === currentYear && p.preferredSchedule?.day === day && p.preferredSchedule?.time === time);

        if (permMatch) {
            button.textContent = permMatch.showDetails?.title || 'Booked';
            button.classList.add('booked');
            button.dataset.scheduleId = permMatch._id;
            button.classList.remove('bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white');
            button.classList.add('bg-red-500', 'text-white', 'border-red-500', 'hover:bg-red-600');
        } else if (pendMatch) {
            button.textContent = `PENDING: ${pendMatch.showDetails?.title || 'N/A'}`;
            button.classList.add('pending');
            button.dataset.pendingSubmissionId = pendMatch._id;
            button.classList.remove('bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white');
            button.classList.add('bg-yellow-400', 'text-black', 'border-yellow-400', 'hover:bg-yellow-500');
        }
        // Else: remains available (default state)
    }

    // --- Helper to update submission row UI ---
    function updateSubmissionRowUI(submission) {
        // Find the row using data-id attribute on the button or tr
        const row = submissionsTableBody?.querySelector(`tr button[data-id="${submission.submissionId}"]`)?.closest('tr');
        if (!row) return;

        const currentFilter = resultFilterSelect ? resultFilterSelect.value : '';
        const submissionResult = submission.result; // Lowercase 'pending', 'accepted', 'rejected'

        const matchesFilter = (currentFilter === '' || currentFilter.toLowerCase() === submissionResult);

        if (matchesFilter) {
            // Update content if it still matches filter
            const scheduleCell = row.cells[2]; // Assuming Preferred Schedule is 3rd column
            // const statusCell = row.cells[3]; // Assuming Status is 4th column (adjust if needed)

            if (scheduleCell) {
                scheduleCell.textContent = `${submission.preferredDay || 'N/A'}, ${submission.preferredTime || 'N/A'}`;
            }
            // You might not have a status column, but if you did:
            // if (statusCell) {
            //     const capitalizedResult = submissionResult.charAt(0).toUpperCase() + submissionResult.slice(1);
            //     statusCell.innerHTML = `<span class="status-${submissionResult}">${capitalizedResult}</span>`; // Add appropriate classes
            // }
        } else {
            // Remove row if it no longer matches filter
            row.remove();
        }
    }


    // --- Function to populate available time slots ---
    async function populateAvailableTimes(selectedDay, timeToSelect = null) { // Can likely remove 'async' now
        if (!submissionPreferredTimeSelect || !selectedDay) {
            if (submissionPreferredTimeSelect) {
                submissionPreferredTimeSelect.innerHTML = '<option value="" disabled selected>Select Day First</option>';
                submissionPreferredTimeSelect.disabled = true;
            }
            return;
        }

        const schoolYear = submissionSchoolYearSelect ? submissionSchoolYearSelect.value : null;
        if (!schoolYear || schoolYear !== currentSubmissionViewYear) { // Also check if the correct year's data is loaded
             submissionPreferredTimeSelect.innerHTML = '<option value="" disabled selected>Year Mismatch or Not Loaded</option>';
             submissionPreferredTimeSelect.disabled = true;
             console.warn("populateAvailableTimes: School year mismatch or data not loaded for", schoolYear);
             return;
        }

        submissionPreferredTimeSelect.innerHTML = '<option value="" disabled selected>Calculating...</option>'; // Changed from Loading...
        submissionPreferredTimeSelect.disabled = true;

        // --- REMOVE THIS LINE ---
        // await fetchScheduleAndPendingData(schoolYear); // Data should already be in global vars

        // Filter occupied slots using existing global data
        const occupiedTimes = new Set();
        // Use the globally stored permanentSchedules and pendingSubmissions
        permanentSchedules.forEach(sched => {
            // Ensure we only consider schedules for the *correct* school year
            if (sched.schoolYear === schoolYear && sched.day === selectedDay) {
                occupiedTimes.add(sched.time);
            }
        });
        pendingSubmissions.forEach(sub => {
            // Ensure we only consider pending subs for the *correct* school year
            // Add pending slot *unless* it's the original slot of the submission currently being viewed
            if (sub.schoolYear === schoolYear && sub.preferredSchedule?.day === selectedDay && sub._id !== currentSubmissionId) {
                occupiedTimes.add(sub.preferredSchedule.time);
            }
        });

        console.log(`Occupied times for ${selectedDay} (${schoolYear}) using cached data:`, Array.from(occupiedTimes));
        console.log(`Original slot for current submission (${currentSubmissionId}): ${originalSubmissionPreferredDay} ${originalSubmissionPreferredTime}`);

        submissionPreferredTimeSelect.innerHTML = '<option value="" disabled>Select Time</option>'; // Default placeholder

        let availableSlotsExist = false;
        ALL_TIME_SLOTS.forEach(time => {
            // Skip FM MIX slot if not Friday
            if (time === '12:01-12:55' && selectedDay !== 'Friday') {
                return;
            }

            const isOccupied = occupiedTimes.has(time);
            const isOriginalSlot = (selectedDay === originalSubmissionPreferredDay && time === originalSubmissionPreferredTime);

            // Slot is available if it's not occupied OR if it IS the original slot for the current submission
            if (!isOccupied || isOriginalSlot) {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time + (isOriginalSlot && isOccupied ? ' (Current)' : ''); // Indicate if it's the original slot
                submissionPreferredTimeSelect.appendChild(option);
                availableSlotsExist = true;

                // Pre-select if it matches timeToSelect
                if (time === timeToSelect) {
                    option.selected = true;
                }
            }
        });

        if (!availableSlotsExist) {
            submissionPreferredTimeSelect.innerHTML = '<option value="" disabled selected>No Times Available</option>';
            submissionPreferredTimeSelect.disabled = true;
        } else {
            // Enable if slots exist, unless the form is already decided (handled by enableSubmissionForm)
            const isDecided = submissionResultSelect && submissionResultSelect.value !== 'Pending';
            submissionPreferredTimeSelect.disabled = isDecided; // Enable/disable based on result status
             submissionPreferredTimeSelect.classList.toggle('bg-gray-100', isDecided);
             submissionPreferredTimeSelect.classList.toggle('cursor-not-allowed', isDecided);
            if (!submissionPreferredTimeSelect.value && submissionPreferredTimeSelect.options.length > 1 && !timeToSelect) {
                 submissionPreferredTimeSelect.value = ""; // Ensure "Select Time" is chosen if no specific time was pre-selected
            }
        }
    }


    // --- Event Listener for Preferred Day Dropdown Change ---
    if (submissionPreferredDaySelect) {
        submissionPreferredDaySelect.addEventListener('change', async (event) => {
            const selectedDay = event.target.value;
            await populateAvailableTimes(selectedDay, null); // Populate times for the new day, don't pre-select anything specific
        });
    }


    // --- Modal Logic ---
    if (scheduleTableBody) {
        scheduleTableBody.addEventListener('click', async (event) => {
            const button = event.target.closest('.schedule-slot-btn');
            if (!button || button.disabled) return; // Exit if not a button or disabled

            const day = button.dataset.day;
            const time = button.dataset.time;
            const scheduleId = button.dataset.scheduleId;
            const pendingId = button.dataset.pendingSubmissionId;
            const currentSchoolYear = schoolYearSelect.value;

            console.log(`Button clicked: Day=${day}, Time=${time}, ScheduleID=${scheduleId}, PendingID=${pendingId}, SchoolYear=${currentSchoolYear}`);

            if (scheduleId) {
                // --- Edit existing permanent schedule ---
                console.log(`Editing schedule ID: ${scheduleId}`);
                await loadScheduleDetailsIntoModal(scheduleId); // Pass only ID
            } else if (pendingId) {
                // --- View pending submission details ---
                console.log(`Viewing pending submission ID: ${pendingId}`);
                // Fetch submission details and populate the submission form (read-only)
                showSpinner();
                try {
                    // Endpoint: GET /submissions/:id (Corrected)
                    const response = await fetch(`/submissions/${pendingId}`);
                    if (!response.ok) throw new Error(`Failed to fetch pending submission: ${response.statusText}`);
                    const submission = await response.json();

                    // Switch to the Submissions tab
                    const submissionTabButton = document.querySelector('.tab-button[data-target="submissions-tab"]');
                    if (submissionTabButton) submissionTabButton.click(); // Simulate click to switch tab

                    // --- Store original details BEFORE populating form ---
                    currentSubmissionId = submission._id; // Store the ID of the submission being viewed
                    originalSubmissionPreferredDay = submission.preferredSchedule?.day;
                    originalSubmissionPreferredTime = submission.preferredSchedule?.time;
                    // --- End Store ---

                    // Populate and show the form
                    await populateSubmissionForm(submission); // Await population
                    enableSubmissionForm(); // Ensure only result/buttons are enabled
                    if (submissionForm) {
                        submissionForm.classList.remove('hidden');
                        submissionForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Scroll to form
                    }

                } catch (error) {
                    console.error('Error loading pending submission details:', error);
                    alert(`Could not load pending submission details: ${error.message}`); // Use alert or Swal
                    resetSubmissionForm(); // Reset form on error
                } finally {
                    hideSpinner();
                }

            } else {
                // --- Create new schedule ---
                console.log(`Creating new schedule for: Day=${day}, Time=${time}, SchoolYear=${currentSchoolYear}`);
                resetModalForm(); // Reset form for new entry

                // Pre-fill Day, Time, and School Year
                const dayInput = scheduleForm.querySelector('#selectedDay'); // Assuming hidden inputs
                const timeInput = scheduleForm.querySelector('#selectedTime'); // Assuming hidden inputs
                if (dayInput) dayInput.value = day;
                if (timeInput) timeInput.value = time;
                if (modalSchoolYearSelect) {
                    modalSchoolYearSelect.value = currentSchoolYear;
                    modalSchoolYearSelect.disabled = true; // Disable school year for new entry too
                    modalSchoolYearSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
                }

                if (deleteButton) deleteButton.classList.add('hidden'); // Hide delete button for new entry
                if (modal) modal.style.display = 'block'; // Show modal
            }
        });
    } else {
        console.warn("Schedule table body (.schedule-table tbody) not found.");
    }


    async function loadScheduleDetailsIntoModal(scheduleId) { // Removed schoolYear param
        showSpinner();
        try {
            // Endpoint: GET /schedule/:id
            const response = await fetch(`/schedule/${scheduleId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Schedule endpoint (/schedule/${scheduleId}) not found (404). Cannot load details.`);
                } else {
                    throw new Error(`Failed to fetch schedule details: ${response.statusText}`);
                }
            }
            const schedule = await response.json();
            console.log("Fetched schedule details:", schedule);

            resetModalForm(); // Clear previous data

            // Get the modal form element
            const modalFormElement = document.getElementById('scheduleForm');
            if (!modalFormElement) {
                  console.error("DEBUG: Modal form element (#scheduleForm) not found!");
                  hideSpinner();
                  return; // Exit if form not found
            }

            // Populate form fields
            const scheduleIdInput = modalFormElement.querySelector('#scheduleId');
            if (scheduleIdInput) scheduleIdInput.value = schedule._id;

            const dayInput = modalFormElement.querySelector('#selectedDay'); // Assuming hidden input
            if (dayInput) dayInput.value = schedule.day;
            const timeInput = modalFormElement.querySelector('#selectedTime'); // Assuming hidden input
            if (timeInput) timeInput.value = schedule.time;

            // Set and disable the school year dropdown using the value from the fetched schedule
            if (modalSchoolYearSelect) {
                modalSchoolYearSelect.value = schedule.schoolYear; // Use fetched year
                modalSchoolYearSelect.disabled = true;
                modalSchoolYearSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
            }

            const showTitleInput = modalFormElement.querySelector('#showTitle');
            if (showTitleInput) showTitleInput.value = schedule.showDetails?.title || '';
            const showDescInput = modalFormElement.querySelector('#showDescription');
            if (showDescInput) showDescInput.value = schedule.showDetails?.description || '';
            const showObjInput = modalFormElement.querySelector('#showObjectives');
            if (showObjInput) showObjInput.value = schedule.showDetails?.objectives || '';

            // Handle checkboxes
            const typeCheckboxes = modalFormElement.querySelectorAll('input[name="showDetails.type[]"]');
            const otherCheckbox = modalFormElement.querySelector('input[value="Other"]'); // Find by value
            const otherInput = modalFormElement.querySelector('#other-input');
            let otherValueFound = false;

            typeCheckboxes.forEach(checkbox => checkbox.checked = false); // Uncheck all first
            if (otherInput) {
                otherInput.value = ''; // Clear other input
                otherInput.disabled = true;
                otherInput.classList.add('bg-gray-200');
            }


            if (schedule.showDetails?.type && Array.isArray(schedule.showDetails.type)) {
                schedule.showDetails.type.forEach(typeValue => {
                    const matchingCheckbox = Array.from(typeCheckboxes).find(cb => cb.value === typeValue);
                    if (matchingCheckbox) {
                        matchingCheckbox.checked = true;
                    } else if (typeValue.startsWith('Other: ')) {
                        // Handle 'Other: specific value' case
                        if (otherCheckbox) otherCheckbox.checked = true;
                        if (otherInput) {
                            otherInput.value = typeValue.substring(7); // Get value after 'Other: '
                            otherInput.disabled = false;
                            otherInput.classList.remove('bg-gray-200');
                            otherValueFound = true;
                        }
                    } else if (typeValue === 'Other' && !otherValueFound) {
                        // Handle just "Other" being checked with no specific value stored separately
                        if (otherCheckbox) otherCheckbox.checked = true;
                        if (otherInput) {
                            otherInput.disabled = false;
                            otherInput.classList.remove('bg-gray-200');
                        }
                    }
                });
            }

            // Populate Executive Producer fields directly
            const ep = schedule.executiveProducer || {}; // Use empty object if null/undefined
            const epLastNameInput = modalFormElement.querySelector('#execProducerLastName');
            const epFirstNameInput = modalFormElement.querySelector('#execProducerFirstName');
            const epMIInput = modalFormElement.querySelector('#execProducerMI');
            const epSuffixInput = modalFormElement.querySelector('#execProducerSuffix');
            const epCYSInput = modalFormElement.querySelector('#execProducerCYS');

            if (epLastNameInput) epLastNameInput.value = ep.lastName || '';
            if (epFirstNameInput) epFirstNameInput.value = ep.firstName || '';
            if (epMIInput) epMIInput.value = ep.mi || '';
            if (epSuffixInput) epSuffixInput.value = ep.suffix || '';
            if (epCYSInput) epCYSInput.value = ep.cys || '';

            // Populate Creative Staff fields directly
            const cs = schedule.creativeStaff || {}; // Use empty object if null/undefined
            const csLastNameInput = modalFormElement.querySelector('#creativeStaffLastName');
            const csFirstNameInput = modalFormElement.querySelector('#creativeStaffFirstName');
            const csMIInput = modalFormElement.querySelector('#creativeStaffMI');
            const csSuffixInput = modalFormElement.querySelector('#creativeStaffSuffix');
            const csCYSInput = modalFormElement.querySelector('#creativeStaffCYS');

            if (csLastNameInput) csLastNameInput.value = cs.lastName || '';
            if (csFirstNameInput) csFirstNameInput.value = cs.firstName || '';
            if (csMIInput) csMIInput.value = cs.mi || '';
            if (csSuffixInput) csSuffixInput.value = cs.suffix || '';
            if (csCYSInput) csCYSInput.value = cs.cys || '';


            // Populate hosts and technical staff
            const hostsContainer = document.getElementById('hosts-container');
            if (hostsContainer) {
                hostsContainer.innerHTML = ''; // Clear existing
                if (schedule.hosts && schedule.hosts.length > 0) {
                    schedule.hosts.forEach((host, index) => addHostInput(host, index === 0));
                } else {
                    addHostInput({}, true); // Add one empty host row if none exist
                }
                updateAddButtonState('Host');
            }

            const techContainer = document.getElementById('technical-container');
            if (techContainer) {
                techContainer.innerHTML = ''; // Clear existing
                if (schedule.technicalStaff && schedule.technicalStaff.length > 0) {
                    schedule.technicalStaff.forEach((staff, index) => addTechnicalInput(staff, index === 0));
                } else {
                    addTechnicalInput({}, true); // Add one empty tech staff row if none exist
                }
                updateAddButtonState('Technical');
            }

            if (deleteButton) deleteButton.classList.remove('hidden'); // Show delete button when editing
            if (modal) modal.style.display = 'block';

        } catch (error) {
            console.error('Error loading schedule details:', error);
            alert(`Failed to load schedule details: ${error.message}`); // Use alert or Swal
            resetModalForm(); // Reset form on error
        } finally {
            hideSpinner();
        }
    }


    if (closeModalButton) {
        closeModalButton.onclick = function () {
            if (modal) modal.style.display = 'none';
             resetModalForm(); // Also reset when manually closing
        }
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            if (modal) modal.style.display = 'none';
             resetModalForm(); // Also reset when clicking outside
        }
    }

     // Reset modal form fields and state
     function resetModalForm() {
         if (!scheduleForm) return;
         scheduleForm.reset();
         const scheduleIdInput = document.getElementById('scheduleId');
         if (scheduleIdInput) scheduleIdInput.value = ''; // Clear hidden ID
         const dayInput = document.getElementById('selectedDay'); // Assuming hidden input
         if (dayInput) dayInput.value = '';
         const timeInput = document.getElementById('selectedTime'); // Assuming hidden input
         if (timeInput) timeInput.value = '';

         // ADD these lines to clear EP and CS fields:
         const epLastNameInput = scheduleForm.querySelector('#execProducerLastName');
         const epFirstNameInput = scheduleForm.querySelector('#execProducerFirstName');
         const epMIInput = scheduleForm.querySelector('#execProducerMI');
         const epSuffixInput = scheduleForm.querySelector('#execProducerSuffix');
         const epCYSInput = scheduleForm.querySelector('#execProducerCYS');
         if (epLastNameInput) epLastNameInput.value = '';
         if (epFirstNameInput) epFirstNameInput.value = '';
         if (epMIInput) epMIInput.value = '';
         if (epSuffixInput) epSuffixInput.value = '';
         if (epCYSInput) epCYSInput.value = '';

         const csLastNameInput = scheduleForm.querySelector('#creativeStaffLastName');
         const csFirstNameInput = scheduleForm.querySelector('#creativeStaffFirstName');
         const csMIInput = scheduleForm.querySelector('#creativeStaffMI');
         const csSuffixInput = scheduleForm.querySelector('#creativeStaffSuffix');
         const csCYSInput = scheduleForm.querySelector('#creativeStaffCYS');
         if (csLastNameInput) csLastNameInput.value = '';
         if (csFirstNameInput) csFirstNameInput.value = '';
         if (csMIInput) csMIInput.value = '';
         if (csSuffixInput) csSuffixInput.value = '';
         if (csCYSInput) csCYSInput.value = '';

         // Clear dynamically added hosts and technical staff, leaving one initial row
         const hostsContainer = document.getElementById('hosts-container');
         if (hostsContainer) {
             hostsContainer.innerHTML = '';
             addHostInput({}, true); // Add the initial empty host row, mark as first
         }

         const technicalContainer = document.getElementById('technical-container');
         if (technicalContainer) {
             technicalContainer.innerHTML = '';
             addTechnicalInput({}, true); // Add the initial empty technical staff row, mark as first
         }

         // Reset 'Other' checkbox and input
         const otherCheckbox = scheduleForm.querySelector('input[value="Other"]');
         const otherInput = document.getElementById('other-input');
         if (otherCheckbox) otherCheckbox.checked = false;
         if (otherInput) {
             otherInput.value = '';
             otherInput.disabled = true;
             otherInput.classList.add('bg-gray-200'); // Tailwind disabled style
         }

          // Re-enable and style school year dropdown
          if (modalSchoolYearSelect) {
              modalSchoolYearSelect.disabled = false;
              modalSchoolYearSelect.classList.remove('bg-gray-100', 'cursor-not-allowed');
              // Optionally set to the main dropdown's value
              // modalSchoolYearSelect.value = schoolYearSelect.value;
          }


         if (deleteButton) deleteButton.classList.add('hidden'); // Hide delete button
          updateAddButtonState('Host'); // Reset add button states
          updateAddButtonState('Technical');
     }


    // Handle 'Other' checkbox
    if (scheduleForm) {
        const otherCheckbox = scheduleForm.querySelector('input[value="Other"]');
        const otherInput = document.getElementById('other-input');
        if (otherCheckbox && otherInput) {
            otherCheckbox.addEventListener('change', function () {
                otherInput.disabled = !this.checked;
                if (!this.checked) {
                    otherInput.value = ''; // Clear input if unchecked
                     otherInput.classList.add('bg-gray-200'); // Tailwind disabled style
                } else {
                    otherInput.classList.remove('bg-gray-200'); // Tailwind enabled style
                    otherInput.focus();
                }
            });
        }
    }


     // --- Dynamic Host/Technical Staff Inputs ---
      const MAX_HOSTS = 4;
      const MAX_TECHNICAL = 2;

      const addHostBtn = document.getElementById('addHostButton'); // Corrected ID
      const addTechBtn = document.getElementById('addTechnicalButton'); // Corrected ID

      if (addHostBtn) {
          addHostBtn.addEventListener('click', () => addHostInput());
      } else { console.warn("Add Host button (#addHostButton) not found."); }

      if (addTechBtn) {
          addTechBtn.addEventListener('click', () => addTechnicalInput());
      } else { console.warn("Add Technical button (#addTechnicalButton) not found."); }


      function addHostInput(hostData = {}, isFirst = false) {
          const container = document.getElementById('hosts-container');
          if (!container) return;
          if (container.querySelectorAll('.host-input-group').length >= MAX_HOSTS) {
              // Optionally disable the add button here or show a message
              return;
          }

          const index = container.querySelectorAll('.host-input-group').length; // Get index for naming
          const div = document.createElement('div');
          div.classList.add('host-input-group', 'flex', 'flex-wrap', 'gap-[1vw]', 'mb-[2vh]', 'p-2', 'border', 'border-gray-200', 'rounded-lg', 'relative');
          div.innerHTML = `
              <input type="hidden" name="hosts[${index}][_id]" value="${hostData._id || ''}">
              <input type="text" name="hosts[${index}].lastName" placeholder="Last Name" value="${hostData.lastName || ''}" required class="flex-1 min-w-[160px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="hosts[${index}].firstName" placeholder="First Name" value="${hostData.firstName || ''}" required class="flex-1 min-w-[160px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="hosts[${index}].mi" placeholder="M.I." value="${hostData.mi || ''}" class="flex-none w-[50px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="hosts[${index}].suffix" placeholder="Suffix" value="${hostData.suffix || ''}" class="flex-none w-[50px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="hosts[${index}].cys" placeholder="CYS" value="${hostData.cys || ''}" class="flex-1 min-w-[80px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              ${!isFirst ? '<button type="button" class="remove-host-btn absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600">&times;</button>' : ''}
          `;
          container.appendChild(div);

          const removeBtn = div.querySelector('.remove-host-btn');
          if (removeBtn) {
              removeBtn.addEventListener('click', () => {
                  div.remove();
                  updateAddButtonState('Host'); // Update button state after removal
                  // Re-index remaining inputs if necessary (more complex)
              });
          }
          updateAddButtonState('Host'); // Update button state after adding
      }

      function addTechnicalInput(staffData = {}, isFirst = false) {
          const container = document.getElementById('technical-container');
          if (!container) return;
          if (container.querySelectorAll('.technical-input-group').length >= MAX_TECHNICAL) {
              return;
          }

          const index = container.querySelectorAll('.technical-input-group').length; // Get index for naming
          const div = document.createElement('div');
          div.classList.add('technical-input-group', 'flex', 'flex-wrap', 'gap-[1vw]', 'mb-[2vh]', 'p-2', 'border', 'border-gray-200', 'rounded-lg', 'relative');
          div.innerHTML = `
              <input type="hidden" name="technicalStaff[${index}][_id]" value="${staffData._id || ''}">
              <input type="text" name="technicalStaff[${index}].lastName" placeholder="Last Name" value="${staffData.lastName || ''}" required class="flex-1 min-w-[160px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="technicalStaff[${index}].firstName" placeholder="First Name" value="${staffData.firstName || ''}" required class="flex-1 min-w-[160px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="technicalStaff[${index}].mi" placeholder="M.I." value="${staffData.mi || ''}" class="flex-none w-[50px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="technicalStaff[${index}].suffix" placeholder="Suffix" value="${staffData.suffix || ''}" class="flex-none w-[50px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              <input type="text" name="technicalStaff[${index}].cys" placeholder="CYS" value="${staffData.cys || ''}" class="flex-1 min-w-[80px] p-2 rounded-lg border border-gray-300 text-sm box-border">
              ${!isFirst ? '<button type="button" class="remove-technical-btn absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600">&times;</button>' : ''}
          `;
          container.appendChild(div);

          const removeBtn = div.querySelector('.remove-technical-btn');
          if (removeBtn) {
              removeBtn.addEventListener('click', () => {
                  div.remove();
                  updateAddButtonState('Technical'); // Update button state after removal
              });
          }
          updateAddButtonState('Technical'); // Update button state after adding
      }

       // Enable/disable the "Add Host/Technical" buttons based on count
       function updateAddButtonState(type) {
          const containerId = type === 'Host' ? 'hosts-container' : 'technical-container';
          const inputGroupClass = type === 'Host' ? 'host-input-group' : 'technical-input-group';
          const addButtonId = type === 'Host' ? 'addHostButton' : 'addTechnicalButton'; // Corrected IDs
          const maxCount = type === 'Host' ? MAX_HOSTS : MAX_TECHNICAL;

          const container = document.getElementById(containerId);
          const addButton = document.getElementById(addButtonId);
          if (!container || !addButton) return;

          const currentCount = container.querySelectorAll(`.${inputGroupClass}`).length;

          addButton.disabled = currentCount >= maxCount;
            // Update Tailwind classes for disabled state
            if (addButton.disabled) {
                addButton.classList.add('bg-gray-400', 'cursor-not-allowed');
                addButton.classList.remove('bg-green-700', 'hover:enabled:bg-green-800', 'hover:enabled:scale-103');
            } else {
                addButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
                addButton.classList.add('bg-green-700', 'hover:enabled:bg-green-800', 'hover:enabled:scale-103');
            }
       }

     // --- Form Submission (Save/Update) ---
     if (saveButton) {
         saveButton.addEventListener('click', async () => {
             const scheduleId = document.getElementById('scheduleId').value;
             const method = scheduleId ? 'PATCH' : 'POST'; // Use PATCH for updates
             const url = scheduleId ? `/schedule/${scheduleId}` : '/schedule';

             const formData = new FormData(scheduleForm); // Get data from the modal form

             // Manually construct data object
             const data = {
                 showDetails: {},
                 executiveProducer: {},
                 creativeStaff: {},
                 hosts: [],
                 technicalStaff: []
             };

             // Populate static fields
             data.day = formData.get('selectedDay');
             data.time = formData.get('selectedTime');
             const modalSchoolYearSelect = document.getElementById('modalSchoolYear');
             data.schoolYear = modalSchoolYearSelect ? modalSchoolYearSelect.value : null;

             data.showDetails.title = formData.get('showDetails.title');
             data.showDetails.description = formData.get('showDetails.description');
             data.showDetails.objectives = formData.get('showDetails.objectives');

             // Populate Producer
             data.executiveProducer.lastName = formData.get('executiveProducer.lastName');
             data.executiveProducer.firstName = formData.get('executiveProducer.firstName');
             data.executiveProducer.mi = formData.get('executiveProducer.mi');
             data.executiveProducer.suffix = formData.get('executiveProducer.suffix');
             data.executiveProducer.cys = formData.get('executiveProducer.cys');

             // Populate Creative Staff
             data.creativeStaff.lastName = formData.get('creativeStaff.lastName');
             data.creativeStaff.firstName = formData.get('creativeStaff.firstName');
             data.creativeStaff.mi = formData.get('creativeStaff.mi');
             data.creativeStaff.suffix = formData.get('creativeStaff.suffix');
             data.creativeStaff.cys = formData.get('creativeStaff.cys');

             // Populate Hosts
             const hostGroups = document.querySelectorAll('#hosts-container .host-input-group');
             hostGroups.forEach((group, index) => {
                 const host = {
                     _id: group.querySelector(`input[name="hosts[${index}][_id]"]`)?.value || undefined,
                     lastName: group.querySelector(`input[name="hosts[${index}].lastName"]`)?.value.trim(),
                     firstName: group.querySelector(`input[name="hosts[${index}].firstName"]`)?.value.trim(),
                     mi: group.querySelector(`input[name="hosts[${index}].mi"]`)?.value.trim(),
                     suffix: group.querySelector(`input[name="hosts[${index}].suffix"]`)?.value.trim(),
                     cys: group.querySelector(`input[name="hosts[${index}].cys"]`)?.value.trim(),
                 };
                 if (host.lastName && host.firstName) { // Only add if required fields are present
                     if (!host._id) delete host._id; // Don't send empty _id for new entries
                     data.hosts.push(host);
                 }
             });

             // Populate Technical Staff
             const techGroups = document.querySelectorAll('#technical-container .technical-input-group');
             techGroups.forEach((group, index) => {
                 const staff = {
                     _id: group.querySelector(`input[name="technicalStaff[${index}][_id]"]`)?.value || undefined,
                     lastName: group.querySelector(`input[name="technicalStaff[${index}].lastName"]`)?.value.trim(),
                     firstName: group.querySelector(`input[name="technicalStaff[${index}].firstName"]`)?.value.trim(),
                     mi: group.querySelector(`input[name="technicalStaff[${index}].mi"]`)?.value.trim(),
                     suffix: group.querySelector(`input[name="technicalStaff[${index}].suffix"]`)?.value.trim(),
                     cys: group.querySelector(`input[name="technicalStaff[${index}].cys"]`)?.value.trim(),
                 };
                 if (staff.lastName && staff.firstName) { // Only add if required fields are present
                     if (!staff._id) delete staff._id; // Don't send empty _id for new entries
                     data.technicalStaff.push(staff);
                 }
             });

             // Handle Show Type checkboxes
             const selectedTypes = [];
             const typeCheckboxes = scheduleForm.querySelectorAll('input[name="showDetails.type[]"]:checked');
             const otherTypeInput = document.getElementById('other-input');
             let otherChecked = false;

             typeCheckboxes.forEach(checkbox => {
                 if (checkbox.value === 'Other') {
                     otherChecked = true;
                 } else {
                     selectedTypes.push(checkbox.value);
                 }
             });

             // --- VALIDATION FOR 'OTHER' INPUT ---
             if (otherChecked) {
                 const otherValue = otherTypeInput.value.trim();
                 if (!otherValue) {
                     alert("Please specify the 'Other' show type.");
                     otherTypeInput.focus();
                     return; // Stop submission
                 }
                 selectedTypes.push(`Other: ${otherValue}`);
             }
             // --- END 'OTHER' VALIDATION ---

             data.showDetails.type = selectedTypes;

             // --- ADD VALIDATION FOR REQUIRED FIELDS ---
             let missingFields = [];

             // Basic Show Details
             if (!data.schoolYear) missingFields.push("School Year");
             if (!data.day) missingFields.push("Day"); // Added Day validation
             if (!data.time) missingFields.push("Time"); // Added Time validation
             if (!data.showDetails.title?.trim()) missingFields.push("Title of Show");
             if (!data.showDetails.description?.trim()) missingFields.push("Brief Description");
             if (!data.showDetails.objectives?.trim()) missingFields.push("Objective of Show");

             // Executive Producer
             if (!data.executiveProducer.lastName?.trim()) missingFields.push("Executive Producer Last Name");
             if (!data.executiveProducer.firstName?.trim()) missingFields.push("Executive Producer First Name");

             // Creative Staff
             if (!data.creativeStaff.lastName?.trim()) missingFields.push("Creative Staff Last Name");
             if (!data.creativeStaff.firstName?.trim()) missingFields.push("Creative Staff First Name");

             // Hosts (at least one with required fields)
             if (data.hosts.length === 0 || !data.hosts[0].lastName?.trim() || !data.hosts[0].firstName?.trim()) {
                 missingFields.push("At least one Host (Last Name & First Name)");
             }

             // Technical Staff (at least one with required fields)
             if (data.technicalStaff.length === 0 || !data.technicalStaff[0].lastName?.trim() || !data.technicalStaff[0].firstName?.trim()) {
                 missingFields.push("At least one Technical Staff (Last Name & First Name)");
             }

             // Show Type
             if (selectedTypes.length === 0) {
                  missingFields.push("Type of Show");
             }


             if (missingFields.length > 0) {
                 console.error("Frontend Validation Failed: Missing required fields.", missingFields);
                 alert(`Please fill in all required fields:\n- ${missingFields.join('\n- ')}`);
                 return; // Stop before sending
             }
             // --- END VALIDATION FOR REQUIRED FIELDS ---


             console.log("Data to send:", JSON.stringify(data, null, 2)); // Log the structured data

             showSpinner();
             try {
                 const response = await fetch(url, {
                     method: method,
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(data)
                 });

                 if (!response.ok) {
                     if (response.status === 404) {
                         throw new Error(`Schedule endpoint (${url}) not found (404). Cannot save.`);
                     }
                     const errorData = await response.json();
                     console.error("Server error data:", errorData); // Log error details
                     throw new Error(errorData.message || `Failed to ${scheduleId ? 'update' : 'save'} schedule`);
                 }

                 alert(`Schedule ${scheduleId ? 'updated' : 'saved'} successfully!`);
                 if (modal) modal.style.display = 'none';
                 resetModalForm();
                 loadSchedule(schoolYearSelect.value); // Reload the schedule grid

             } catch (error) {
                 console.error(`Error ${scheduleId ? 'updating' : 'saving'} schedule:`, error);
                 alert(`Error: ${error.message}`); // Use alert or Swal
             } finally {
                 hideSpinner();
             }
         });
     } else {
         console.warn("Save button (#saveButton) not found.");
     }


     // --- Delete Logic ---
     if (deleteButton) {
         deleteButton.addEventListener('click', async () => {
             const scheduleId = document.getElementById('scheduleId').value;
             if (!scheduleId) {
                 alert('No schedule selected to delete.');
                 return;
             }

             // Use SweetAlert for confirmation if available, otherwise use confirm()
             const confirmDelete = typeof Swal !== 'undefined'
                 ? await Swal.fire({
                       title: 'Are you sure?',
                       text: "You won't be able to revert this!",
                       icon: 'warning',
                       showCancelButton: true,
                       confirmButtonColor: '#d33', // Red for delete
                       cancelButtonColor: '#3085d6',
                       confirmButtonText: 'Yes, delete it!'
                   })
                 : { isConfirmed: confirm('Are you sure you want to delete this schedule slot?') };


             if (confirmDelete.isConfirmed) {
                 showSpinner();
                 try {
                     // Endpoint: DELETE /schedule/:id
                     const response = await fetch(`/schedule/${scheduleId}`, {
                         method: 'DELETE'
                     });
                     if (!response.ok) {
                         if (response.status === 404) {
                             throw new Error(`Schedule endpoint (/schedule/${scheduleId}) not found (404). Cannot delete.`);
                         }
                         const errorData = await response.json();
                         throw new Error(errorData.message || 'Failed to delete schedule');
                     }
                     alert('Schedule deleted successfully!'); // Use alert or Swal
                     if (modal) modal.style.display = 'none';
                     resetModalForm();
                     loadSchedule(schoolYearSelect.value); // Reload schedule
                 } catch (error) {
                     console.error('Error deleting schedule:', error);
                     alert(`Error deleting schedule: ${error.message}`); // Use alert or Swal
                 } finally {
                     hideSpinner();
                 }
             }
         });
     } else {
         console.warn("Delete button (#deleteButton) not found.");
     }

    // Function to load submissions
    async function loadSubmissions() {
        currentSubmissionViewYear = submissionSchoolYearSelect ? submissionSchoolYearSelect.value : null; // Store current filter year
        const selectedSchoolYear = currentSubmissionViewYear;
        const selectedResult = resultFilterSelect ? resultFilterSelect.value : ''; // Default to empty string if filter exists

        if (!selectedSchoolYear || selectedSchoolYear === 'undefined') {
             if (submissionsTableBody) submissionsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center">Please select a school year.</td></tr>';
             resetSubmissionForm(); // Reset form if no year selected
             allSubmissions = []; // Clear stored data
             currentPage = 1;
             updatePaginationControls();
             return;
         }

         showSpinner();
         if (submissionsTableBody) submissionsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center">Loading submissions...</td></tr>'; // Loading indicator
         if (pageInfoSpan) pageInfoSpan.textContent = 'Loading...'; // Update page info
         if (prevPageBtn) prevPageBtn.disabled = true;
         if (nextPageBtn) nextPageBtn.disabled = true;

         try {
             // Construct query parameters
             const params = new URLSearchParams();
             params.append('schoolYear', selectedSchoolYear);
             if (selectedResult && selectedResult !== '') { // Only add result if not empty
                 params.append('result', selectedResult);
             }

             // Endpoint: GET /submissions?schoolYear=...&result=... (Corrected)
             const response = await fetch(`/submissions?${params.toString()}`);
             if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
             }
             allSubmissions = await response.json(); // Store ALL fetched submissions
             currentPage = 1; // Reset to first page on new filter/load
             displayCurrentPage(); // Display the first page

             // If the form is currently showing details for a submission NOT in the new list, reset it.
             const currentFormId = submissionIdInput ? submissionIdInput.value : null;
             if (currentFormId && !allSubmissions.some(sub => sub._id === currentFormId)) {
                 console.log("Currently displayed submission is not in the new filtered list. Resetting form.");
                 resetSubmissionForm();
             } else if (!currentFormId && submissionForm && !submissionForm.classList.contains('hidden')) {
                  resetSubmissionForm();
             }

         } catch (error) {
             console.error('Error fetching submissions:', error);
             if (submissionsTableBody) submissionsTableBody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-red-500">Error loading submissions: ${error.message}</td></tr>`;
             allSubmissions = []; // Clear data on error
             currentPage = 1;
             updatePaginationControls(); // Update controls
             resetSubmissionForm(); // Reset form on error
         } finally {
              hideSpinner();
         }
    }

    // --- New function to display the current page ---
    function displayCurrentPage() {
        if (!submissionsTableBody) return;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedItems = allSubmissions.slice(startIndex, endIndex);

        populateSubmissionsTable(paginatedItems); // Populate table with only the items for this page
        updatePaginationControls(); // Update buttons and page info
    }

    // --- New function to update pagination controls ---
    function updatePaginationControls() {
        if (!pageInfoSpan || !prevPageBtn || !nextPageBtn) return;

        const totalPages = Math.ceil(allSubmissions.length / itemsPerPage);
        const totalPagesDisplay = totalPages === 0 ? 1 : totalPages; // Show "Page 1 of 1" even if 0 results

        pageInfoSpan.textContent = `Page ${currentPage} of ${totalPagesDisplay}`;

        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

        // Add/Remove Tailwind classes for disabled state visually
        prevPageBtn.classList.toggle('opacity-50', prevPageBtn.disabled);
        prevPageBtn.classList.toggle('cursor-not-allowed', prevPageBtn.disabled);
        nextPageBtn.classList.toggle('opacity-50', nextPageBtn.disabled);
        nextPageBtn.classList.toggle('cursor-not-allowed', nextPageBtn.disabled);
    }

    // Function to populate the submissions table
    function populateSubmissionsTable(submissions) {
        if (!submissionsTableBody) return;
        submissionsTableBody.innerHTML = ''; // Clear existing rows

        const emptyColspan = 'colspan="3" class="md:colspan-4 lg:colspan-4 p-4 text-center text-gray-500"'; // Default sm, md, lg

        if (!submissions || submissions.length === 0) { // Check the passed array
            // Display message based on whether *any* submissions exist for the filter
            if (allSubmissions.length === 0) {
                submissionsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center">No submissions found for the selected criteria.</td></tr>';
            } else {
                // This case shouldn't typically happen with correct pagination, but as a fallback:
                submissionsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center">No submissions on this page.</td></tr>';
            }
            return;
        }
        submissions.forEach(submission => {
            const row = document.createElement('tr');
            row.classList.add('border-b', 'hover:bg-gray-50'); // Add Tailwind classes

             // Format preferred schedule
              const preferredScheduleText = (submission.preferredSchedule && submission.preferredSchedule.day && submission.preferredSchedule.time)
                 ? `${submission.preferredSchedule.day}, ${submission.preferredSchedule.time}`
                 : 'N/A';


            row.innerHTML = `
                <td class="p-3 border border-gray-300 text-sm text-gray-700">${submission.showDetails?.title || 'N/A'}</td>
                <td class="hidden lg:table-cell p-3 border border-gray-300 text-sm text-gray-700">${submission.organizationName || 'N/A'}</td> <!-- Hidden until lg -->
                <td class="hidden md:table-cell p-3 border border-gray-300 text-sm text-gray-700">${preferredScheduleText}</td> <!-- Show on md and up -->
                <!-- Removed Submitted Data Cell -->
                <td class="p-3 border border-gray-300 text-sm text-gray-700 text-center">
                    <button class="select-submission-btn bg-green-700 text-white py-2 px-4 border-none rounded-[10px] font-semibold text-sm cursor-pointer transition duration-300 hover:bg-green-800 hover:scale-105" data-id="${submission._id}">Select</button>
                </td>
            `;
            submissionsTableBody.appendChild(row);
        });
    }

    // Use event delegation for submission select buttons
    if (submissionsTableBody) {
        submissionsTableBody.addEventListener('click', (event) => {
            if (event.target.classList.contains('select-submission-btn')) {
                handleSubmissionSelect(event);
            }
        });
    } else {
        console.warn("Submissions table body (#submissions-table-body) not found.");
    }

    // --- Update handleSubmissionSelect ---
     async function handleSubmissionSelect(event) {
         const submissionId = event.target.dataset.id;
         if (!submissionId) return;

         showSpinner();

         // Highlight selected row (optional)
         if (submissionsTableBody) {
             const currentlySelected = submissionsTableBody.querySelector('tr.bg-green-100');
             if (currentlySelected) currentlySelected.classList.remove('bg-green-100');
             event.target.closest('tr').classList.add('bg-green-100');
         }

         // --- Show and Scroll Immediately ---
         if (submissionForm) {
             submissionForm.classList.remove('hidden'); // Show the form container first
             submissionForm.scrollIntoView({ behavior: 'auto', block: 'start' }); // Scroll instantly
         }
         // --- End Immediate Scroll ---

         try {
             // Endpoint: GET /submissions/:id (Corrected)
             const response = await fetch(`/submissions/${submissionId}`);
             if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.message || 'Failed to fetch submission details');
             }
             const submission = await response.json();
              console.log("Selected Submission Details:", submission); // Log fetched details

             // --- Store original details BEFORE populating form ---
             currentSubmissionId = submission._id; // Store the ID of the submission being viewed
             originalSubmissionPreferredDay = submission.preferredSchedule?.day;
             originalSubmissionPreferredTime = submission.preferredSchedule?.time;
             // --- End Store ---

             await populateSubmissionForm(submission); // Await population (form is already visible and scrolled to)
              enableSubmissionForm(); // Enable form fields and buttons
             // Removed scroll from here as it's done earlier
             // if (submissionForm) {
             //   submissionForm.classList.remove('hidden'); // Show the form
             //   submissionForm.scrollIntoView({ behavior: 'auto', block: 'start' }); // Scroll to the form
             // }
         } catch (error) {
             console.error('Error fetching submission details:', error);
             alert(`Error: ${error.message}`); // Use alert or Swal
              resetSubmissionForm(); // Reset form on error
         } finally {
              hideSpinner(); // Hide spinner after data is loaded/populated or on error
         }
     }


     // --- Update populateSubmissionForm ---
     async function populateSubmissionForm(submission) { // Keep async for now, might remove later if populateAvailableTimes becomes sync
         // Don't reset form here, reset happens before calling this or in handleSubmissionSelect error
         // resetSubmissionForm(); // <<< REMOVE THIS LINE

         if (submissionIdInput) submissionIdInput.value = submission._id;

         // --- Populate Read-Only Fields ---
         const orgNameInput = submissionForm.querySelector('#submissionOrgName');
         if (orgNameInput) orgNameInput.value = submission.organizationName || '';
         const orgTypeInput = submissionForm.querySelector('#submissionOrgType');
         if (orgTypeInput) orgTypeInput.value = submission.organizationType || '';

         populateDisplayGroup(submissionForm, 'submissionProponent', submission.proponent);
         populateDisplayGroup(submissionForm, 'submissionExecProducer', submission.executiveProducer);
         populateDisplayGroup(submissionForm, 'submissionCreativeStaff', submission.creativeStaff);
         populateDisplayGroup(submissionForm, 'submissionFacultyStaff', submission.facultyStaff, true); // isFaculty = true

         const showTitleInput = submissionForm.querySelector('#submissionShowTitle');
         if (showTitleInput) showTitleInput.value = submission.showDetails?.title || '';
         const showTypeDisplay = submissionForm.querySelector('#submissionShowType'); // Assuming a <p> or <div>
         if (showTypeDisplay) showTypeDisplay.textContent = Array.isArray(submission.showDetails?.type) ? submission.showDetails.type.join(', ') : (submission.showDetails?.type || 'N/A');
         const showDescInput = submissionForm.querySelector('#submissionShowDescription');
         if (showDescInput) showDescInput.value = submission.showDetails?.description || '';
         const showObjInput = submissionForm.querySelector('#submissionShowObjectives');
         if (showObjInput) showObjInput.value = submission.showDetails?.objectives || '';

         const dlsudEmailInput = submissionForm.querySelector('#submissionDlsudEmail');
         if (dlsudEmailInput) dlsudEmailInput.value = submission.contactInfo?.dlsudEmail || '';
         const contactEmailInput = submissionForm.querySelector('#submissionContactEmail');
         if (contactEmailInput) contactEmailInput.value = submission.contactInfo?.contactEmail || '';
         const contactFbInput = submissionForm.querySelector('#submissionContactFbLink');
         if (contactFbInput) contactFbInput.value = submission.contactInfo?.contactFbLink || '';
         const crosspostingInput = submissionForm.querySelector('#submissionCrossposting');
         if (crosspostingInput) crosspostingInput.value = submission.contactInfo?.crossposting || 'No';

         const fbLinkContainer = document.getElementById('submissionFbLinkContainer'); // May be outside form
         const fbLinkInput = submissionForm.querySelector('#submissionFbLink');
         if (fbLinkContainer && fbLinkInput) {
             if (submission.contactInfo?.crossposting === 'Yes' && submission.contactInfo?.fbLink) {
                 fbLinkInput.value = submission.contactInfo.fbLink;
                 fbLinkContainer.style.display = 'block'; // Show container
             } else {
                 fbLinkInput.value = 'N/A'; // Or leave empty if preferred
                 fbLinkContainer.style.display = 'none'; // Hide container if No or link missing
             }
         }

         populateListDisplay(document.getElementById('submissionHostContainer'), submission.hosts, 'Hosts');
         populateListDisplay(document.getElementById('submissionTechnicalStaffContainer'), submission.technicalStaff, 'Technical Staff');

         const signatureImg = document.getElementById('submissionProponentSignature'); // May be outside form
         if (signatureImg) {
             if (submission.proponentSignature) {
                 signatureImg.src = submission.proponentSignature; // Assuming this is the URL/path
                 signatureImg.style.display = 'block'; // Show the image
                 signatureImg.classList.remove('hidden');
             } else {
                 signatureImg.style.display = 'none'; // Hide if no signature
                 signatureImg.classList.add('hidden');
                 signatureImg.src = ''; // Clear src
             }
         }

         // --- Populate Editable Dropdowns ---
         const selectedDay = submission.preferredSchedule?.day || "";
         const selectedTime = submission.preferredSchedule?.time || "";

         if (submissionPreferredDaySelect) {
             submissionPreferredDaySelect.value = selectedDay; // Set the day dropdown
         }

         // Populate Time dropdown based on the selected day and pre-select the time
         // This should now be much faster as it uses cached data
         populateAvailableTimes(selectedDay, selectedTime); // <<< CALL HERE (No longer needs await)

         // --- Set Result Dropdown ---
         if (submissionResultSelect) {
            let resultValue = submission.result || 'Pending';
            // --- ADDED: Normalize case to match option values ---
            if (typeof resultValue === 'string') {
                if (resultValue.toLowerCase() === 'pending') {
                    resultValue = 'Pending';
                } else if (resultValue.toLowerCase() === 'accepted') {
                    resultValue = 'Accepted';
                } else if (resultValue.toLowerCase() === 'rejected') {
                    resultValue = 'Rejected';
                }
            }
            // --- END ADDED ---
            submissionResultSelect.value = resultValue;
            console.log(`Set Result dropdown to: ${resultValue}`);
        }

         // Show the form (already handled in handleSubmissionSelect success)
         // if (submissionForm) submissionForm.classList.remove('hidden');
     }


     // --- Update resetSubmissionForm ---
     function resetSubmissionForm() {
         if (submissionForm) {
             submissionForm.reset();
             submissionForm.classList.add('hidden');
         }
         if (submissionIdInput) submissionIdInput.value = '';

         // --- Reset Global State ---
         currentSubmissionId = null;
         originalSubmissionPreferredDay = null;
         originalSubmissionPreferredTime = null;
         // --- End Reset Global State ---

         // Clear dynamic content (hosts, tech, signature, fb link)
         populateListDisplay(document.getElementById('submissionHostContainer'), [], 'Hosts');
         populateListDisplay(document.getElementById('submissionTechnicalStaffContainer'), [], 'Technical Staff');
         const signatureImg = document.getElementById('submissionProponentSignature');
         if (signatureImg) {
             signatureImg.style.display = 'none';
             signatureImg.classList.add('hidden');
             signatureImg.src = '';
         }
         const fbLinkContainer = document.getElementById('submissionFbLinkContainer');
         if (fbLinkContainer) fbLinkContainer.style.display = 'none'; // Hide FB link container by default

         // Reset and disable dropdowns
         if (submissionPreferredDaySelect) {
             submissionPreferredDaySelect.value = "";
             submissionPreferredDaySelect.disabled = true;
             submissionPreferredDaySelect.classList.add('bg-gray-100', 'cursor-not-allowed');
         }
         if (submissionPreferredTimeSelect) {
             submissionPreferredTimeSelect.innerHTML = '<option value="" disabled selected>Select Day First</option>';
             submissionPreferredTimeSelect.disabled = true;
             submissionPreferredTimeSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
         }
         if (submissionResultSelect) {
             submissionResultSelect.value = ""; // Reset to placeholder
             submissionResultSelect.disabled = true;
             submissionResultSelect.classList.add('bg-gray-100', 'cursor-not-allowed');
         }

         // Disable buttons
         if (submitSubmissionButton) {
             submitSubmissionButton.disabled = true;
             submitSubmissionButton.classList.add('bg-gray-500', 'cursor-not-allowed');
             submitSubmissionButton.classList.remove('bg-green-700', 'hover:bg-green-800', 'text-white');
         }
         if (cancelSubmissionButton) {
             cancelSubmissionButton.disabled = true;
             cancelSubmissionButton.classList.add('bg-gray-500', 'cursor-not-allowed');
             cancelSubmissionButton.classList.remove('bg-red-600', 'hover:bg-red-700', 'text-white');
         }

         // Remove row highlighting
         if (submissionsTableBody) {
             const currentlySelected = submissionsTableBody.querySelector('tr.bg-green-100');
             if (currentlySelected) currentlySelected.classList.remove('bg-green-100');
         }
     }


      // --- Update enableSubmissionForm ---
      function enableSubmissionForm() {
          const isDecided = submissionResultSelect && submissionResultSelect.value !== 'Pending';

          if (submissionResultSelect) {
              submissionResultSelect.disabled = isDecided;
              submissionResultSelect.classList.toggle('bg-gray-100', isDecided);
              submissionResultSelect.classList.toggle('cursor-not-allowed', isDecided);
          }
          if (submissionPreferredDaySelect) {
              submissionPreferredDaySelect.disabled = isDecided;
              submissionPreferredDaySelect.classList.toggle('bg-gray-100', isDecided);
              submissionPreferredDaySelect.classList.toggle('cursor-not-allowed', isDecided);
          }
          if (submissionPreferredTimeSelect) {
              // Also disable if no options available (length <= 1 means only placeholder)
              const noOptions = submissionPreferredTimeSelect.options.length <= 1;
              submissionPreferredTimeSelect.disabled = isDecided || noOptions;
              submissionPreferredTimeSelect.classList.toggle('bg-gray-100', isDecided || noOptions);
              submissionPreferredTimeSelect.classList.toggle('cursor-not-allowed', isDecided || noOptions);
          }

          if (submitSubmissionButton) {
              submitSubmissionButton.disabled = isDecided;
              submitSubmissionButton.classList.toggle('bg-gray-500', isDecided);
              submitSubmissionButton.classList.toggle('cursor-not-allowed', isDecided);
              submitSubmissionButton.classList.toggle('bg-green-700', !isDecided);
              submitSubmissionButton.classList.toggle('hover:bg-green-800', !isDecided);
              submitSubmissionButton.classList.toggle('text-white', !isDecided);
          }
          if (cancelSubmissionButton) {
              cancelSubmissionButton.disabled = false; // Cancel should always be enabled when form is shown
              cancelSubmissionButton.classList.remove('bg-gray-500', 'cursor-not-allowed');
              cancelSubmissionButton.classList.add('bg-red-600', 'hover:bg-red-700', 'text-white');
          }
      }


     // Handle submission form cancel button
     if (cancelSubmissionButton) {
         cancelSubmissionButton.addEventListener('click', () => {
             resetSubmissionForm(); // Just reset and hide the form
         });
     } else { console.warn("Cancel Submission button (#cancel-submission-button) not found."); }


     // --- Update submission form submit button logic ---
     if (submitSubmissionButton) {
         submitSubmissionButton.addEventListener('click', async () => {
             const submissionId = submissionIdInput ? submissionIdInput.value : null;
             const newResult = submissionResultSelect ? submissionResultSelect.value : null;
             const selectedDay = submissionPreferredDaySelect ? submissionPreferredDaySelect.value : null; // Read from day dropdown
             const selectedTime = submissionPreferredTimeSelect ? submissionPreferredTimeSelect.value : null; // Read from time dropdown
             const selectedSchoolYear = submissionSchoolYearSelect ? submissionSchoolYearSelect.value : null;

             if (!submissionId || !newResult || !selectedDay || !selectedTime) { // Check day and time too
                 alert("Submission ID, Result, Preferred Day, or Preferred Time is missing.");
                 return;
             }
             if (newResult === 'Pending') {
                 alert("Please select 'Accepted' or 'Rejected'.");
                 return;
             }
             // Check if time dropdown has a valid selection (not the placeholder)
             if (submissionPreferredTimeSelect.selectedIndex <= 0) {
                 alert("Please select a valid Preferred Time slot.");
                 return;
             }

             // --- Conflict Check (only if Accepting) ---
             if (newResult === 'Accepted') {
                 // Ensure latest data is fetched for the check
                 await fetchScheduleAndPendingData(selectedSchoolYear);

                 const permConflict = permanentSchedules.find(s =>
                     s.day === selectedDay && s.time === selectedTime && s.schoolYear === selectedSchoolYear
                 );
                 const pendConflict = pendingSubmissions.find(p =>
                     p.preferredSchedule?.day === selectedDay &&
                     p.preferredSchedule?.time === selectedTime &&
                     p.schoolYear === selectedSchoolYear &&
                     p._id !== submissionId // Exclude self
                 );

                 if (permConflict) {
                     alert(`Conflict: Slot ${selectedDay} ${selectedTime} is already booked by "${permConflict.showDetails?.title}".`);
                     return;
                 }
                 if (pendConflict) {
                     alert(`Conflict: Slot ${selectedDay} ${selectedTime} has a pending submission by "${pendConflict.showDetails?.title}".`);
                     return;
                 }
             }
             // --- End Conflict Check ---


             // Confirmation prompt (optional but good)
             if (!confirm(`Are you sure you want to set this submission to ${newResult} for ${selectedDay} at ${selectedTime}?`)) {
                 return;
             }


             showSpinner();
             try {
                 const response = await fetch(`/submissions/${submissionId}`, {
                     method: 'PATCH',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         result: newResult.toLowerCase(), // Send lowercase
                         preferredSchedule: { // Send selected day/time
                             day: selectedDay,
                             time: selectedTime
                         },
                         schoolYear: selectedSchoolYear // Include school year for context
                     })
                 });

                 if (!response.ok) {
                     let errorData;
                     try {
                         errorData = await response.json();
                     } catch (e) {
                         throw new Error(response.statusText || `HTTP error! status: ${response.status}`);
                     }
                     console.error("Update Error:", errorData);
                     // Check for specific conflict error from backend
                     if (response.status === 409 && errorData.conflict) {
                          throw new Error(`Cannot accept: ${errorData.message}. Slot is already booked by "${errorData.conflict.showTitle}" for ${errorData.conflict.day} ${errorData.conflict.time}.`);
                     }
                     throw new Error(errorData.message || `Failed to update submission result.`);
                 }

                 alert('Submission result updated successfully!');
                 // Socket events should handle UI updates, but force refresh just in case
                 await loadSubmissions();
                 await loadSchedule(schoolYearSelect.value);

             } catch (error) {
                 console.error('Error updating submission result:', error);
                 alert(`Error: ${error.message}`);
             } finally {
                 hideSpinner();
                 resetSubmissionForm(); // Reset form after attempt
             }
         });
     } else { console.warn("Submit Submission button (#submit-submission-button) not found."); }


    // --- Event listeners for main filters ---
    if (schoolYearSelect) {
        schoolYearSelect.addEventListener('change', (e) => loadSchedule(e.target.value));
    } else { console.warn("Main School Year select (#schoolYear) not found."); }

    if (submissionSchoolYearSelect) {
        submissionSchoolYearSelect.addEventListener('change', loadSubmissions);
    } else { console.warn("Submission School Year select (#submissionSchoolYear) not found."); }

    if (resultFilterSelect) {
        resultFilterSelect.addEventListener('change', loadSubmissions);
    } else { console.warn("Result Filter select (#resultFilter) not found."); }

    // --- Event Listeners for Pagination Buttons ---
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayCurrentPage();
            }
        });
    } else { console.warn("Previous page button (#prev-page-btn) not found."); }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(allSubmissions.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                displayCurrentPage();
            }
        });
    } else { console.warn("Next page button (#next-page-btn) not found."); }


    // --- Initial Setup ---
    // fetchAndDisplayCurrentConfig calls populateSchoolYearDropdowns which triggers change events
    // Those change events call loadSchedule and loadSubmissions
    await fetchAndDisplayCurrentConfig(); // Ensure this runs and awaits completion
    resetSubmissionForm(); // Ensure form starts hidden
    updatePaginationControls(); // Initialize pagination controls state

     // Make sure the first tab is active visually on load
     if (tabButtons.length > 0 && tabPanes.length > 0) {
         tabButtons.forEach((btn, index) => {
             if (index === 0) {
                btn.classList.add('active', 'bg-green-700', 'text-white');
                btn.classList.remove('bg-white', 'border', 'border-gray-300', 'text-gray-800'); // Remove inactive styles
             } else {
                btn.classList.remove('active', 'bg-green-700', 'text-white'); // Remove active styles
                btn.classList.add('bg-white', 'border', 'border-gray-300', 'text-gray-800'); // Add inactive styles
             }
         });
         tabPanes.forEach((pane, index) => {
             if (index === 0) {
                 pane.classList.add('block');
                 pane.classList.remove('hidden');
             } else {
                 pane.classList.remove('block');
                 pane.classList.add('hidden');
             }
         });
     }

}); // End DOMContentLoaded

 // --- Spinner ---
 const spinner = document.getElementById('loading-spinner');

 function showSpinner() {
     if (spinner) spinner.style.display = 'block';
 }

 function hideSpinner() {
     if (spinner) spinner.style.display = 'none';
 }

 // --- Helper Functions ---
 // Helper function to populate name fields within a specific form/container
 function populateNameGroup(containerElement, prefix, data) {
    if (!containerElement || !data) return;
    const fields = ['LastName', 'FirstName', 'MI', 'Suffix', 'CYS'];
    fields.forEach(field => {
        const inputElement = containerElement.querySelector(`#${prefix}${field}`);
        if (inputElement) {
            const dataKey = field.charAt(0).toLowerCase() + field.slice(1);
            inputElement.value = data[dataKey] || '';
        } else {
            // console.warn(`Element not found: #${prefix}${field}`);
        }
    });
}

// Helper function to populate display-only name/cys/dept fields within a specific container
function populateDisplayGroup(containerElement, prefix, data, isFaculty = false) {
    if (!containerElement) return;

    const nameElement = containerElement.querySelector(`#${prefix}Name`);
    const detailElement = containerElement.querySelector(isFaculty ? `#${prefix}Dept` : `#${prefix}CYS`);

    if (nameElement) {
        const fullName = data ? `${data.lastName || ''}, ${data.firstName || ''} ${data.mi || ''} ${data.suffix || ''}`.trim() : '';
        nameElement.value = (fullName === ',' || !fullName) ? 'N/A' : fullName;
    } else {
        // console.warn(`Element not found: #${prefix}Name`);
    }

    if (detailElement) {
        let detailValue = 'N/A';
        if (data) {
            detailValue = isFaculty ? (data.department || 'N/A') : (data.cys || 'N/A');
        }
        // If the name was N/A, make the detail N/A too
        if (nameElement && nameElement.value === 'N/A') {
            detailValue = 'N/A';
        }
        detailElement.value = detailValue;
    } else {
        // console.warn(`Element not found: #${prefix}${isFaculty ? 'Dept' : 'CYS'}`);
    }
}

   function populateListDisplay(containerElement, itemsArray, label) {
       if (!containerElement) return;

       // Clear previous content and add label
       containerElement.innerHTML = `<label class="block font-semibold mb-1 text-sm text-gray-600">${label}:</label>`;

       if (itemsArray && itemsArray.length > 0) {
           const list = document.createElement('ul');
           list.className = 'list-disc list-inside text-sm space-y-1'; // Added spacing
           itemsArray.forEach(item => {
               // Construct name carefully, handling potentially missing fields
               const lastName = item.lastName || '';
               const firstName = item.firstName || '';
               const mi = item.mi || '';
               const suffix = item.suffix || '';
               let nameParts = [lastName, firstName];
               if (mi) nameParts.push(mi);
               if (suffix) nameParts.push(suffix);
               let formattedName = nameParts.filter(part => part.trim() !== '').join(' ').trim();
               if (!formattedName || formattedName === ',') formattedName = 'N/A'; // Handle empty/comma-only names

               const cys = item.cys || 'N/A';
               const listItem = document.createElement('li');
               listItem.textContent = `${formattedName} (CYS: ${cys})`;
               list.appendChild(listItem);
           });
           containerElement.appendChild(list);
       } else {
           // Add placeholder text if no items
           const placeholder = document.createElement('p');
           placeholder.className = 'text-sm text-gray-500';
           placeholder.textContent = `No ${label.toLowerCase()} listed.`;
           containerElement.appendChild(placeholder);
       }
}