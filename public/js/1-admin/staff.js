document.addEventListener('DOMContentLoaded', async () => {
    // --- State Variables ---
    let currentApplicationPeriod = null;
    let currentAssessmentPeriod = null;
    let currentYear = new Date().getFullYear().toString(); // Use string for consistency
    let currentSelectedSubmissionId = null;
    let currentSlotsForWeek = []; // Cache slots for schedule tab updates
    let initialSubmissionStatus = 'Pending'; // <<< ADD: Store the status when details are loaded

    // <<< Initialize Socket.IO >>>
    const socket = io();

    // --- Element References ---
    const existingApplicationPeriodElement = document.getElementById('existingApplicationPeriod');
    const existingAssessmentPeriodElement = document.getElementById('existingAssessmentPeriod');
    const weekFilterDropdown = document.getElementById('weekFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const submissionYearFilter = document.getElementById('submissionYearFilter');
    const submissionStatusFilter = document.getElementById('submissionStatusFilter');
    const submissionDepartmentFilter = document.getElementById('submissionDepartmentFilter');
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const submissionDetailContentInline = document.getElementById('submissionDetailContentInline');
    const scheduleModal = document.getElementById('scheduleModal'); // Assuming this exists
    const applicationDetailsView = document.getElementById('applicationDetailsView'); // Assuming this exists
    const scheduleModalCloseButton = document.getElementById('scheduleModalCloseBtn'); // <<< ADD THIS LINE (Adjust ID if needed)
    const periodSettingsForm = document.getElementById('periodSettingsForm'); // Assuming this exists
    const submissionResultUpdate = document.getElementById('submissionResultUpdate'); // Assuming this exists
    const saveSubmissionResultBtn = document.getElementById('saveSubmissionResultBtn'); // Assuming this exists
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const scheduleTableBody = document.getElementById('schedule-body'); // Moved declaration up
    const scheduleButtons = document.querySelectorAll('#scheduleGrid .schedule-button'); // Use #scheduleGrid (capital G)
    const selectedSubmissionIdInput = document.getElementById('selectedSubmissionId'); // Added for storing selected ID

    // --- Helper Functions ---
    const parseDateStringToLocalMidnight = (dateStr) => {
        // Helper to parse YYYY-MM-DD to local midnight Date object
        if (!dateStr) return new Date(NaN);
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date(NaN);
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(NaN);
        return new Date(year, month, day);
    };

    // --- Period Fetching and Display ---
    const fetchApplicationPeriod = async (key = 'JoinGFM', year = null) => {
        try {
            let url = `/admin/application-period?key=${key}`; // Use correct endpoint
            if (year) url += `&year=${year}`;
            console.log("Fetching application period from:", url);
            const response = await fetch(url);
            console.log(`[fetchApplicationPeriod] Response Status: ${response.status}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fetchApplicationPeriod] Application period not found for key=${key}, year=${year}`);
                    return null;
                }
                let errorText = `Status: ${response.statusText}`;
                try { errorText = await response.text(); } catch (textError) { console.error("[fetchApplicationPeriod] Could not read error response text:", textError); }
                console.error(`[fetchApplicationPeriod] Failed (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch application period: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("[fetchApplicationPeriod] Data received:", data);
            if (typeof data === 'undefined') {
                console.warn("[fetchApplicationPeriod] response.json() resulted in undefined. Returning null.");
                return null;
            }
            return data;

        } catch (error) {
            console.error('[fetchApplicationPeriod] Error caught:', error);
            return null;
        }
    };

    const fetchAssessmentPeriod = async (year = null) => {
         try {
            let url = `/admin/assessment-period`; // Use correct endpoint
            if (year) url += `?year=${year}`;
            console.log("Fetching assessment period from URL:", url);
            const response = await fetch(url);
            console.log(`[fetchAssessmentPeriod] Response Status: ${response.status}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fetchAssessmentPeriod] Assessment period not found for year ${year}`);
                    return null;
                }
                let errorText = `Status: ${response.statusText}`;
                try { errorText = await response.text(); } catch (textError) { console.error("[fetchAssessmentPeriod] Could not read error response text:", textError); }
                console.error(`[fetchAssessmentPeriod] Failed (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch assessment period: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("[fetchAssessmentPeriod] Data received:", data);
            if (typeof data === 'undefined') {
                console.warn("[fetchAssessmentPeriod] response.json() resulted in undefined. Returning null.");
                return null;
            }
            return data;

        } catch (error) {
            console.error('[fetchAssessmentPeriod] Error caught:', error);
            return null;
        }
    };

    // --- Function to update displayed periods ---
    const updateDisplayedPeriods = () => {
        const appStartDateInput = document.getElementById('applicationStartDate');
        const appEndDateInput = document.getElementById('applicationEndDate');
        const assessStartDateInput = document.getElementById('assessmentStartDate');
        const assessEndDateInput = document.getElementById('assessmentEndDate');
        const saveButton = periodSettingsForm?.querySelector('button[type="submit"]'); // Get the save button

        // Update text display
        if (existingApplicationPeriodElement) {
            if (currentApplicationPeriod) {
                const appStart = currentApplicationPeriod.startDate ? new Date(currentApplicationPeriod.startDate).toLocaleDateString() : 'N/A';
                const appEnd = currentApplicationPeriod.endDate ? new Date(currentApplicationPeriod.endDate).toLocaleDateString() : 'N/A';
                existingApplicationPeriodElement.textContent = `Current Application Period (${currentApplicationPeriod.year}): ${appStart} - ${appEnd}`;
            } else {
                existingApplicationPeriodElement.textContent = 'Current Application Period: Not Set';
            }
        }
        if (existingAssessmentPeriodElement) {
             if (currentAssessmentPeriod) {
                const assessStart = currentAssessmentPeriod.startDate ? new Date(currentAssessmentPeriod.startDate).toLocaleDateString() : 'N/A';
                const assessEnd = currentAssessmentPeriod.endDate ? new Date(currentAssessmentPeriod.endDate).toLocaleDateString() : 'N/A';
                existingAssessmentPeriodElement.textContent = `Current Assessment Period (${currentAssessmentPeriod.year}): ${assessStart} - ${assessEnd}`;
            } else {
                existingAssessmentPeriodElement.textContent = 'Current Assessment Period: Not Set';
            }
        }

        // Update form input values
        if (appStartDateInput) appStartDateInput.value = currentApplicationPeriod?.startDate ? currentApplicationPeriod.startDate.split('T')[0] : '';
        if (appEndDateInput) appEndDateInput.value = currentApplicationPeriod?.endDate ? currentApplicationPeriod.endDate.split('T')[0] : '';
        if (assessStartDateInput) assessStartDateInput.value = currentAssessmentPeriod?.startDate ? currentAssessmentPeriod.startDate.split('T')[0] : '';
        if (assessEndDateInput) assessEndDateInput.value = currentAssessmentPeriod?.endDate ? currentAssessmentPeriod.endDate.split('T')[0] : '';

        // --- Disable fields based on application period status ---
        let disableAppFields = false; // For Application Start/End Dates
        let disableAssessFields = false; // For Assessment Start/End Dates
        let disableSaveButton = false; // For the Save button

        if (currentApplicationPeriod?.startDate && currentApplicationPeriod?.endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to midnight for comparison
            const appStart = parseDateStringToLocalMidnight(currentApplicationPeriod.startDate);
            const appEnd = parseDateStringToLocalMidnight(currentApplicationPeriod.endDate);

            if (!isNaN(appStart.getTime()) && !isNaN(appEnd.getTime())) {
                console.log(`[Disable Check] Today: ${today.toISOString()}, App Start: ${appStart.toISOString()}, App End: ${appEnd.toISOString()}`);

                // Condition 1: Application period is currently active
                if (today >= appStart && today <= appEnd) {
                    disableAppFields = true;
                    disableAssessFields = true; // Also disable assessment fields during active application
                    disableSaveButton = true;
                    console.log("[Disable Check] Application period is ACTIVE. Disabling all period fields and save button.");
                }
                // Condition 2: Application period has already ended (for the currently viewed year)
                else if (today > appEnd) {
                    // Don't disable fields, just inform the user via console (alert moved to save action)
                    console.log("[Disable Check] Application period has ENDED for this year. Alert will show on save attempt if applicable.");
                }
                // Condition 3: Application period is in the future (or dates invalid/missing)
                else {
                    console.log("[Disable Check] Application period is in the FUTURE or not set. Fields remain enabled.");
                }
            } else {
                 console.warn("[Disable Check] Parsed application start or end date is invalid.");
            }
        } else {
             console.log("[Disable Check] Application period start or end date is missing. Fields remain enabled.");
        }

        // Apply disabled state and styling (only applies if Condition 1 was met)
        const toggleField = (field, isDisabled) => {
            if (field) {
                field.disabled = isDisabled;
                if (isDisabled) {
                    field.classList.add('disabled:bg-gray-200', 'disabled:cursor-not-allowed', 'opacity-70');
                } else {
                    field.classList.remove('disabled:bg-gray-200', 'disabled:cursor-not-allowed', 'opacity-70');
                }
            }
        };

        toggleField(appStartDateInput, disableAppFields);
        toggleField(appEndDateInput, disableAppFields);
        toggleField(assessStartDateInput, disableAssessFields);
        toggleField(assessEndDateInput, disableAssessFields);
        toggleField(saveButton, disableSaveButton);
        // --- End disable fields logic ---
    };
    // --- End function ---

    // --- Function to populate week dropdown ---
    const populateWeekDropdown = () => {
        if (!weekFilterDropdown) return false;

        weekFilterDropdown.disabled = true;
        weekFilterDropdown.innerHTML = '<option value="">Assessment Period Not Set</option>';

        if (!currentAssessmentPeriod?.startDate || !currentAssessmentPeriod?.endDate) {
            console.warn("Cannot populate week dropdown: Assessment period start/end date missing.");
            clearScheduleGrid(); // Clear grid if no assessment period
            return false;
        }

        const periodStartDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        const periodEndDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);

        if (isNaN(periodStartDate.getTime()) || isNaN(periodEndDate.getTime())) {
             console.warn("Cannot populate week dropdown: Invalid assessment period dates.");
             clearScheduleGrid(); // Clear grid on error
             return false;
        }

        weekFilterDropdown.innerHTML = '<option value="" disabled>Select Week</option>';

        let currentIterationDate = new Date(periodStartDate);
        // Adjust to the start of the week (Sunday) containing the period start date
        currentIterationDate.setDate(currentIterationDate.getDate() - currentIterationDate.getDay());

        let addedOptions = 0;
        const addedWeekValues = new Set(); // Prevent duplicate week values if period spans multiple weeks partially

        // Iterate through weeks that overlap with the period
        while (currentIterationDate <= periodEndDate) {
            const y = currentIterationDate.getFullYear();
            const m = (currentIterationDate.getMonth() + 1).toString().padStart(2, '0');
            const d = currentIterationDate.getDate().toString().padStart(2, '0');
            const weekStartDateValue = `${y}-${m}-${d}`; // Sunday YYYY-MM-DD in local time

            if (!addedWeekValues.has(weekStartDateValue)) {
                let firstSchoolDayInPeriod = null;
                let lastSchoolDayInPeriod = null;

                // Check Monday (1) to Friday (5) of this week
                for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
                    const checkDate = new Date(currentIterationDate);
                    checkDate.setDate(checkDate.getDate() + dayOffset);

                    if (checkDate >= periodStartDate && checkDate <= periodEndDate) {
                        if (!firstSchoolDayInPeriod) firstSchoolDayInPeriod = new Date(checkDate);
                        lastSchoolDayInPeriod = new Date(checkDate);
                    }
                }

                if (firstSchoolDayInPeriod) {
                    const displayFormat = { month: 'short', day: 'numeric' };
                    const optionText = `${firstSchoolDayInPeriod.toLocaleDateString('en-US', displayFormat)} - ${lastSchoolDayInPeriod.toLocaleDateString('en-US', displayFormat)}`;
                    const option = new Option(optionText, weekStartDateValue);
                    weekFilterDropdown.add(option);
                    addedOptions++;
                    addedWeekValues.add(weekStartDateValue);
                }
            }
            currentIterationDate.setDate(currentIterationDate.getDate() + 7);
        }

        if (addedOptions > 0) {
            weekFilterDropdown.disabled = false;
            return true;
        } else {
            weekFilterDropdown.innerHTML = '<option value="">No School Weeks Available</option>';
            clearScheduleGrid(); // Clear grid if no weeks
            return false;
        }
    };
    // --- End populateWeekDropdown ---

    // --- Schedule Display and Interaction ---
    // Fetch and display slots for the selected week/department
    const handleWeekChange = async () => {
        const selectedWeekStartDate = weekFilterDropdown.value;
        const currentDepartment = departmentFilter.value;
        const yearToFetch = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

        if (!selectedWeekStartDate || !currentDepartment) {
            currentSlotsForWeek = [];
            clearScheduleGrid();
            return;
        }

        console.log(`Fetching slots for week: ${selectedWeekStartDate}, Dept: ${currentDepartment}, Year: ${yearToFetch}`);
        showSpinner();
        try {
            // Fetch slots marked as available (including booked ones with populated data)
            const response = await fetch(`/admin/assessment-slots/for-week?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(currentDepartment)}&year=${yearToFetch}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`No assessment slots found marked available for week ${selectedWeekStartDate}, Dept: ${currentDepartment}`);
                    currentSlotsForWeek = []; // Clear cache
                    displaySchedules([], selectedWeekStartDate); // Render empty grid for the week
                    return;
                }
                 const errorText = await response.text();
                 console.error("Error response text:", errorText);
                throw new Error(`Failed to fetch available assessment slots for week (Status: ${response.status})`);
            }
            currentSlotsForWeek = await response.json(); // Update cache
            console.log("Fetched slots for week:", currentSlotsForWeek);
            displaySchedules(currentSlotsForWeek, selectedWeekStartDate);

        } catch (error) {
            console.error('Error fetching slots for week:', error);
            currentSlotsForWeek = [];
            clearScheduleGrid();
            alert(`Error loading schedule: ${error.message}`);
        } finally {
            hideSpinner();
        }
    };

     function clearScheduleGrid() {
         const buttons = scheduleTableBody.querySelectorAll('.schedule-button');
         buttons.forEach(button => {
             button.textContent = '';
             button.disabled = true; // Start as disabled, enable based on logic
             // Reset to base style from 2-blocktimer.ejs
             button.className = 'schedule-button w-full p-1 border border-green-700 rounded-lg bg-white cursor-pointer transition duration-200 hover:bg-green-700 hover:text-white hover:scale-103 text-xs whitespace-normal overflow-hidden text-ellipsis leading-tight min-h-[40px] break-words';
             // Add disabled appearance
             button.classList.add('opacity-50', 'cursor-not-allowed');
             button.dataset.slotId = '';
             button.dataset.applicationId = '';
             button.dataset.date = ''; // Clear calculated date
         });
     }

    // Update the grid based on fetched slots
    const displaySchedules = (slotsForWeek = [], weekStartDateString = null) => {
        const slotMap = new Map();
        slotsForWeek.forEach(slot => {
            const slotYear = typeof slot.year === 'number' ? slot.year.toString() : slot.year;
            const slotDateKey = slot.date.includes('T') ? slot.date.split('T')[0] : slot.date; // Ensure YYYY-MM-DD
            const key = `${slotDateKey}_${slot.time}`;
            slotMap.set(key, { ...slot, year: slotYear }); // Store the slot data
        });

        const isWeeklyView = !!weekStartDateString;
        let periodStartDate = null;
        let periodEndDate = null;
        let weekStart = null; // Sunday of the selected week

        if (currentAssessmentPeriod?.startDate) periodStartDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        if (currentAssessmentPeriod?.endDate) periodEndDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);
        if (isWeeklyView) weekStart = parseDateStringToLocalMidnight(weekStartDateString);

        if (!isWeeklyView || !weekStart || isNaN(weekStart.getTime())) {
             console.warn("displaySchedules: Invalid or missing weekStartDateString", weekStartDateString);
             clearScheduleGrid(); // Clear grid if week start is invalid
             return;
        }

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const allScheduleButtons = scheduleTableBody.querySelectorAll('.schedule-button');

        if (!allScheduleButtons || allScheduleButtons.length === 0) {
            console.error("displaySchedules: Could not find schedule buttons in the DOM.");
            return;
        }

        allScheduleButtons.forEach(button => {
            const dayName = button.dataset.day;
            const time = button.dataset.time;

            let dateString = '';
            let buttonDate = new Date(NaN);
            const dayIndices = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 0 };
            const targetDayIndex = dayIndices[dayName];

            // Calculate date for this button
            if (typeof targetDayIndex === 'number') {
                buttonDate = new Date(weekStart);
                buttonDate.setDate(buttonDate.getDate() + targetDayIndex);
                const y = buttonDate.getFullYear();
                const m = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                const d = buttonDate.getDate().toString().padStart(2, '0');
                dateString = `${y}-${m}-${d}`;
                button.dataset.date = dateString; // Store calculated date
            } else {
                button.dataset.date = '';
            }

            const key = `${dateString}_${time}`;
            const slotData = slotMap.get(key); // Get the AssessmentSlot data

            // Reset button state to base style + disabled appearance initially
            button.className = 'schedule-button w-full p-1 border border-green-700 rounded-lg bg-white cursor-pointer transition duration-200 hover:bg-green-700 hover:text-white hover:scale-103 text-xs whitespace-normal overflow-hidden text-ellipsis leading-tight min-h-[40px] break-words';
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed'); // Default to disabled appearance
            button.innerHTML = '';
            button.textContent = '';
            button.dataset.slotId = '';
            button.dataset.applicationId = '';
            delete button.dataset.state; // <<< ADD THIS LINE TO RESET THE STATE

            // --- More Efficient State Management ---
            let newState = 'disabled-outside'; // Default state (outside period or weekend)
            let newText = '';
            let newSlotId = '';
            let newApplicationId = '';
            let isDisabled = true;

            const isValidButtonDate = !isNaN(buttonDate.getTime());
            const isSchoolDay = targetDayIndex >= 1 && targetDayIndex <= 5; // Monday to Friday
            const isInPeriod = isValidButtonDate && (!periodStartDate || buttonDate >= periodStartDate) && (!periodEndDate || buttonDate <= periodEndDate);
            const isPastDate = isValidButtonDate && buttonDate < startOfToday;

            if (isValidButtonDate && isSchoolDay) {
                if (isInPeriod) {
                    if (isPastDate) {
                        newState = 'past';
                        newText = 'Past';
                        isDisabled = true;
                    } else { // Future or current school day within the period
                        if (slotData) { // Slot exists in DB for this date/time/dept
                            if (slotData.application) { // --- BOOKED ---
                                newState = 'booked';
                                const applicantName = slotData.applicantName || 'Booked';
                                const applicantSection = slotData.applicantSection || 'N/A';
                                newText = `${applicantName} (${applicantSection})`;
                                isDisabled = false; // Clickable to view details
                                newSlotId = slotData._id;
                                newApplicationId = slotData.application ? slotData.application._id : (slotData.application || '');
                            } else { // --- AVAILABLE (Explicitly in DB) ---
                                newState = 'available';
                                newText = 'Available';
                                isDisabled = false; // Clickable to delete/unmark
                                newSlotId = slotData._id;
                                // newApplicationId remains empty
                            }
                        } else { // --- IMPLICITLY AVAILABLE (Not in DB) ---
                            newState = 'implicitly-available';
                            newText = ''; // No text needed
                            isDisabled = false; // Clickable to create/mark
                            // newSlotId remains empty
                            // newApplicationId remains empty
                        }
                    }
                } else { // School day, but outside assessment period
                    newState = 'disabled-outside';
                    newText = 'N/A';
                    isDisabled = true;
                }
            } else { // Weekend or invalid date calculation
                newState = 'disabled-weekend';
                newText = '';
                isDisabled = true;
            }

            // --- Apply Changes Efficiently ---
            const currentState = button.dataset.state || 'none'; // Get current state (will now be 'none' after reset)

            if (newState !== currentState) { // This condition should now evaluate correctly
                // Remove classes of the previous state (ensure all possibilities are covered)
                button.classList.remove(
                    'booked', 'available', 'implicitly-available', 'past', 'disabled-outside', 'disabled-weekend', // State markers
                    'bg-red-500', 'text-white', 'border-red-500', 'hover:bg-red-600', // Booked styles
                    'bg-green-600', 'text-white', 'border-green-600', 'hover:bg-green-700', // Available styles
                    'bg-gray-200', 'text-gray-500', 'border-gray-300', // Past/Disabled styles
                    'bg-white', 'border-green-700', 'hover:bg-green-700', 'hover:text-white' // Implicitly available styles (base)
                );

                // Add classes for the new state
                button.dataset.state = newState; // Store the new state
                switch (newState) {
                    case 'booked':
                        button.classList.add('booked', 'bg-red-500', 'text-white', 'border-red-500', 'hover:bg-red-600');
                        break;
                    case 'available': // Explicitly available
                        button.classList.add('available', 'bg-green-600', 'text-white', 'border-green-600', 'hover:bg-green-700');
                        break;
                    case 'implicitly-available': // Not in DB, potential slot
                        // Base styles are already applied by className reset, just add the state marker
                        button.classList.add('implicitly-available'); // Add marker class
                        // Ensure hover effects still work if needed, base className might cover it
                        break;
                    case 'past':
                        button.classList.add('past', 'bg-gray-200', 'text-gray-500', 'border-gray-300');
                        break;
                    case 'disabled-outside':
                    case 'disabled-weekend':
                    default:
                         button.classList.add(newState, 'bg-gray-200', 'text-gray-500', 'border-gray-300');
                         break;
                }
            }

            // Update text content and data attributes (less costly than class changes)
            if (button.textContent !== newText) { // Only update if changed
                 button.textContent = newText;
            }
            button.disabled = isDisabled;
            button.classList.toggle('cursor-not-allowed', isDisabled);
            button.classList.toggle('opacity-50', isDisabled && newState !== 'past');
            button.dataset.slotId = newSlotId; // Correctly set based on newState logic
            button.dataset.applicationId = newApplicationId; // Correctly set based on newState logic
            // dataset.date is already set earlier

            // --- End Apply Changes ---
        });
    };
    // --- End displaySchedules ---

    // --- Submission Tab Functions ---
    const fetchDistinctSubmissionYears = async () => {
        try {
            const response = await fetch('/admin/submission-years'); // Use correct endpoint
            if (!response.ok) throw new Error(`Failed to fetch submission years: ${response.statusText}`);
            return await response.json(); // Expecting array of strings like ["2023", "2024"]
        } catch (error) {
            console.error('Error fetching submission years:', error);
            return [currentYear]; // Fallback
        }
    };

    const populateSubmissionYearFilter = async () => { // Make async
        if (!submissionYearFilter) return;
        submissionYearFilter.innerHTML = '<option value="">Loading...</option>';
        submissionYearFilter.disabled = true;

        try {
            const years = await fetchDistinctSubmissionYears();
            submissionYearFilter.innerHTML = ''; // Clear loading

            if (!years || years.length === 0) {
                 submissionYearFilter.innerHTML = '<option value="">No Years Found</option>';
                 return;
            }

            let currentYearExists = false;
            years.forEach(year => {
                // Assuming years are just strings like "2024"
                const option = new Option(year, year); // Use year for both value and text
                submissionYearFilter.add(option);
                if (year === currentYear) {
                    currentYearExists = true;
                }
            });

            if (currentYearExists) {
                submissionYearFilter.value = currentYear;
            } else if (years.length > 0) {
                submissionYearFilter.value = years[0]; // Default to first year if current not found
            }
            submissionYearFilter.disabled = false;
            // loadSubmissions(); // Load submissions for the default/selected year // <<< ERROR: loadSubmissions is not defined
            // await handleSubmissionFilterChange(); // <<< FIX: REMOVE THIS CALL - Don't automatically load submissions here

        } catch (error) {
             console.error('Error populating submission year filter:', error);
             submissionYearFilter.innerHTML = '<option value="">Error Loading</option>';
        }
    };

    const fetchSubmissions = async () => {
        if (!submissionYearFilter || !submissionStatusFilter || !submissionDepartmentFilter) {
            console.error("Submission filter elements not found.");
            return [];
        }
        const year = submissionYearFilter.value;
        const status = submissionStatusFilter.value;
        const department = submissionDepartmentFilter.value;

        if (!year) {
            console.log("Submission year not selected.");
            if (submissionsTableBody) submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px;">Please select a year.</td></tr>`;
            return [];
        }

        try {
            const url = `/admin/submissions?year=${year}&status=${status}&department=${encodeURIComponent(department)}`; // Use correct endpoint
            console.log("Fetching submissions from:", url);
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch submissions: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching submissions:', error);
            if (submissionsTableBody) {
                submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 15px;">Error loading submissions.</td></tr>`;
            }
            return [];
        }
    };

    const renderSubmissionsTable = (submissions) => {
        if (!submissionsTableBody) {
            console.error("Submissions table body element not found.");
            return;
        }
        submissionsTableBody.innerHTML = ''; // Clear existing rows

        if (!submissions || submissions.length === 0) {
            // Use the same colspan as the number of headers (5)
            submissionsTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">No submissions found matching the criteria.</td></tr>`;
            return;
        }

        submissions.forEach(sub => {
            const row = document.createElement('tr');
            // Add hover effect and selected row styling capability
            row.className = 'hover:bg-gray-50 transition duration-150 ease-in-out';

            const name = `${sub.lastName}, ${sub.firstName}${sub.middleInitial ? ' ' + sub.middleInitial + '.' : ''}${sub.suffix ? ' ' + sub.suffix : ''}`;
            const studentNumber = sub.studentNumber || 'N/A';
            const department = sub.preferredDepartment || 'N/A';
            const status = sub.result || 'Pending'; // Default to 'Pending' if null/undefined

            // Apply Tailwind classes directly in the innerHTML, matching the header structure and blocktimer style
            row.innerHTML = `
                <td class="p-3 border-b border-gray-200 text-sm text-gray-800">${name}</td>
                <td class="hidden lg:table-cell p-3 border-b border-gray-200 text-sm text-gray-700">${studentNumber}</td> <!-- Hidden until lg -->
                <td class="hidden md:table-cell p-3 border-b border-gray-200 text-sm text-gray-700">${department}</td> <!-- Hidden until md -->
                <td class="p-3 border-b border-gray-200 text-sm text-gray-700">${status}</td>
                <td class="p-3 border-b border-gray-200 text-sm text-gray-700 text-center">
                    <button class="select-submission-btn bg-green-700 text-white py-2 px-4 border-none rounded-[10px] font-semibold text-sm cursor-pointer transition duration-300 hover:bg-green-800 hover:scale-105" data-id="${sub._id}">Select</button>
                </td>
            `;
            submissionsTableBody.appendChild(row);
        });
    };

    // --- NEW: Function to clear/reset the detail view ---
    const clearSubmissionDetailView = () => {
        const detailViewContainer = document.getElementById('submissionDetailView'); // Get the main container
        if (detailViewContainer) {
            detailViewContainer.classList.add('hidden'); // <<< ADD: Hide the main container
        }

        if (submissionDetailContentInline) {
            // Clear display elements (spans, divs, etc.) - Adjusted to handle INPUT/TEXTAREA correctly
            const displayFields = submissionDetailContentInline.querySelectorAll('[data-field]');
            displayFields.forEach(field => {
                if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
                    field.value = ''; // Clear value for inputs/textareas
                } else {
                    field.textContent = ''; // Clear text content for others (if any)
                }
            });
        }
        if (submissionResultUpdate) {
            submissionResultUpdate.value = 'Pending'; // Reset dropdown
        }
        if (selectedSubmissionIdInput) selectedSubmissionIdInput.value = ''; // Clear hidden ID
        currentSelectedSubmissionId = null;
        initialSubmissionStatus = 'Pending'; // <<< ADD: Reset initial status
        if (submissionsTableBody) {
            submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row', 'bg-green-100')); // Use specific class
        }
        disableSubmissionDetailEditing(); // Ensure controls are disabled
    };

    // --- MODIFIED: Clear detail view when filters change ---
    const handleSubmissionFilterChange = async () => {
        clearSubmissionDetailView(); // This now also hides the detail view container
        const submissions = await fetchSubmissions();
        renderSubmissionsTable(submissions);
    };

    // --- NEW: Reusable function to fetch and display submission details by ID ---
    const displaySubmissionDetailsById = async (submissionId) => {
        if (!submissionId) {
            console.error("No submission ID provided to displaySubmissionDetailsById");
            clearSubmissionDetailView();
            return false;
        }

        // Ensure the target container exists before proceeding
        const detailViewContainer = document.getElementById('submissionDetailView'); // Get the main container
        if (!submissionDetailContentInline || !detailViewContainer) {
             console.error("Cannot display details: submissionDetailContentInline or submissionDetailView element not found in DOM.");
             alert("Error: Detail view container is missing.");
             return false;
        }
        // Ensure the result dropdown exists
        if (!submissionResultUpdate) {
             console.error("Cannot display details: submissionResultUpdate element not found in DOM.");
             // Don't alert for this, might just be a missing feature
        }
        // Ensure the save button exists
        if (!saveSubmissionResultBtn) {
             console.error("Cannot display details: saveSubmissionResultBtn element not found in DOM.");
             // Don't alert for this
        }


        console.log("Fetching and displaying details for submission:", submissionId);
        showSpinner();
        clearSubmissionDetailView(); // Clear previous details AND hide container

        try {
            // Fetch full submission details using the ID
            const response = await fetch(`/admin/submissions?id=${submissionId}`); // Use correct endpoint
            if (!response.ok) {
                 let errorMsg = `Failed to fetch submission details: ${response.statusText}`;
                 try {
                     const errData = await response.json();
                     errorMsg = errData.message || errorMsg;
                 } catch (e) { /* Ignore if response is not JSON */ }
                 throw new Error(errorMsg);
            }

            const submissions = await response.json(); // Expecting an array
            if (!submissions || submissions.length === 0) {
                 console.warn('Submission details not found for ID:', submissionId);
                 throw new Error('Submission details not found.');
            }
            const details = submissions[0];
            console.log("Fetched Details:", details); // Log fetched data

            // --- Populate Fields ---
            const setFieldValue = (fieldName, value) => {
                const field = submissionDetailContentInline.querySelector(`[data-field="${fieldName}"]`);
                if (field) {
                    // Use textContent for display elements (like spans, divs), value for inputs/textareas
                    if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA' || field.tagName === 'SELECT') {
                        field.value = value !== null && typeof value !== 'undefined' ? value : ''; // Handle null/undefined for inputs
                    } else {
                        field.textContent = value || 'N/A'; // Handle null/undefined for display elements
                    }
                    // console.log(`Set field "${fieldName}" to:`, value); // Optional: Verbose logging
                } else {
                    console.warn(`Field with data-field="${fieldName}" not found.`);
                }
            };

            setFieldValue('fullName', `${details.lastName}, ${details.firstName}${details.middleInitial ? ' ' + details.middleInitial + '.' : ''}${details.suffix ? ' ' + details.suffix : ''}`);
            setFieldValue('studentNumber', details.studentNumber);
            setFieldValue('dlsudEmail', details.dlsudEmail);
            setFieldValue('college', details.college);
            setFieldValue('program', details.program);
            setFieldValue('collegeYearSection', details.collegeYear && details.section ? `${details.collegeYear} / ${details.section}` : 'N/A');
            setFieldValue('facebookUrl', details.facebookUrl);
            setFieldValue('affiliatedOrgsList', details.affiliatedOrgsList?.notApplicable ? 'N/A' : details.affiliatedOrgsList?.listInput);
            setFieldValue('preferredDepartment', details.preferredDepartment);

            let scheduleText = 'N/A';
            if (details.preferredSchedule && details.preferredSchedule.date && details.preferredSchedule.time) {
                 try {
                     // Assuming date is stored like 'YYYY-MM-DD' or includes time/timezone
                     const scheduleDate = new Date(details.preferredSchedule.date);
                     // Check if date is valid before formatting
                     if (!isNaN(scheduleDate.getTime())) {
                        scheduleText = `${scheduleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${details.preferredSchedule.time})`;
                     } else {
                         scheduleText = `${details.preferredSchedule.date} (${details.preferredSchedule.time})`; // Fallback if date parsing fails
                     }
                 } catch (e) {
                     console.error("Error parsing preferredSchedule date:", e);
                     scheduleText = `${details.preferredSchedule.date} (${details.preferredSchedule.time})`; // Fallback
                 }
            }
            setFieldValue('preferredSchedule', scheduleText);
            setFieldValue('schoolYear', details.schoolYear);
            setFieldValue('staffApplicationReasons', details.staffApplicationReasons);
            setFieldValue('departmentApplicationReasons', details.departmentApplicationReasons);
            setFieldValue('greenFmContribution', details.greenFmContribution);
            // --- End Populate Fields ---

            initialSubmissionStatus = details.result || 'Pending'; // <<< ADD: Store initial status

            if (submissionResultUpdate) {
                submissionResultUpdate.value = initialSubmissionStatus; // Set dropdown to current status
            }
             if (selectedSubmissionIdInput) selectedSubmissionIdInput.value = submissionId; // Store ID
            currentSelectedSubmissionId = submissionId;

            // <<< ADD: Make the detail view visible >>>
            detailViewContainer.classList.remove('hidden');
            // <<< END ADD >>>

            // Only enable editing if the status is still Pending
            if (initialSubmissionStatus === 'Pending') {
                enableSubmissionDetailEditing();
            } else {
                disableSubmissionDetailEditing(); // Keep disabled if already Accepted/Rejected
            }
            return true; // Indicate success


        } catch (error) {
            console.error("Error fetching/displaying submission details:", error);
            alert(`Error loading submission details: ${error.message}`);
            // clearSubmissionDetailView(); // Already called at the start
            return false; // Indicate failure
        } finally {
            hideSpinner();
        }
    };
    // --- End reusable function ---

    // --- Modify handleSelectSubmission to use the new function ---
    const handleSelectSubmission = async (event) => {
        const button = event.target.closest('.select-submission-btn'); // Ensure we get the button
        if (!button) return;
        const submissionId = button.dataset.id;
        if (!submissionId) return;

        // Fetch and display details FIRST
        const success = await displaySubmissionDetailsById(submissionId);

        // Only update highlight and scroll if details were loaded successfully
        if (success) {
            if (submissionsTableBody) {
                // Remove highlight from previously selected row
                submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row', 'bg-green-100')); // Use green
                // Highlight the newly selected row
                button.closest('tr')?.classList.add('selected-row', 'bg-green-100'); // Use green
            }

            // Scroll to the detail view
            const detailViewContainer = document.getElementById('submissionDetailView');
            if (detailViewContainer) {
                detailViewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    };
    // --- End modification ---

    // --- Function to Save Submission Result ---
    const handleSaveSubmissionResult = async () => {
        const submissionId = selectedSubmissionIdInput.value; // Use stored ID
        if (!submissionId) {
            alert("Please select a submission first.");
            return;
        }
        if (!submissionResultUpdate) {
            console.error("Result update dropdown not found.");
            alert("Error: Result dropdown element is missing.");
            return;
        }

        const newResult = submissionResultUpdate.value;

        // Prevent saving if 'Pending' is selected
        if (newResult === 'Pending') {
            alert("Please select either 'Accepted' or 'Rejected' to save the result.");
            return;
        }

        // <<< ADD: Confirmation Check >>>
        // Only ask for confirmation if the status was initially 'Pending' and is changing
        if (initialSubmissionStatus === 'Pending' && (newResult === 'Accepted' || newResult === 'Rejected')) {
            const confirmationMessage = `Are you sure you want to mark this submission as "${newResult}"? This action cannot be undone.`;
            if (!confirm(confirmationMessage)) {
                console.log("User cancelled saving submission result.");
                // Optionally reset the dropdown back to 'Pending' if they cancel
                // submissionResultUpdate.value = 'Pending';
                return; // Stop the function if user cancels
            }
            console.log("User confirmed saving submission result.");
        }
        // <<< END: Confirmation Check >>>

        console.log(`Attempting to save result "${newResult}" for submission ID: ${submissionId}`);
        showSpinner();

        try {
            const response = await fetch(`/admin/submissions/${submissionId}/result`, { // Use correct endpoint
                method: 'PATCH', // Use PATCH
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result: newResult }) // Use 'result' key
            });

             if (!response.ok) {
                let errorData;
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    errorData = await response.json();
                } else {
                    const errorText = await response.text();
                    console.error("Non-JSON error response:", errorText);
                    // *** Pass the status code in the error message ***
                    errorData = { message: `Server returned non-JSON response (Status: ${response.status})` };
                }
                 // *** Pass the status code in the error message ***
                throw new Error(errorData.message || `Failed to update result (${response.status})`);
            }

            const updatedSubmission = await response.json();
            console.log("Submission result updated successfully:", updatedSubmission);
            alert(`Submission result updated to "${newResult}".`);

            // Refresh table to show updated status
            await handleSubmissionFilterChange(); // Re-fetch and re-render table
            // Detail view is cleared AND controls disabled by handleSubmissionFilterChange -> clearSubmissionDetailView

        } catch (error) {
            console.error("Error saving submission result:", error);
            // *** ADDED: Toastify notification for permission errors ***
            let toastMessage = `Error saving result: ${error.message}`;
            if (error.message && (error.message.includes("Forbidden") || error.message.includes("Status: 403"))) {
                 toastMessage = "Only Admins can update submission results.";
            }

            Toastify({
                text: toastMessage,
                duration: 5000, // Longer duration for errors
                gravity: "top",
                position: "right",
                backgroundColor: "#dc3545", // Red for errors
                style: { color: "white" },
                stopOnFocus: true,
            }).showToast();
            // *** END ADDED ***
            // alert(`Error saving result: ${error.message}`); // Replaced alert with Toastify
        } finally {
            hideSpinner();
        }
    };
    // --- End Function to Save Submission Result ---

    // --- Function to Handle Tab Switching ---
    const handleTabSwitch = async (event) => {
        const clickedButton = event.currentTarget;
        const targetTabId = clickedButton.dataset.tab;

        if (!targetTabId) {
            console.error("Clicked tab button is missing data-tab attribute.");
            return;
        }

        // --- Update Tab Buttons ---
        tabButtons.forEach(btn => {
            const isClicked = btn === clickedButton;
            btn.classList.toggle('active', isClicked);

            // Active State Classes
            btn.classList.toggle('bg-green-700', isClicked);
            btn.classList.toggle('text-white', isClicked);

            // Inactive State Classes (Add if not clicked, remove if clicked)
            btn.classList.toggle('bg-white', !isClicked);
            btn.classList.toggle('border', !isClicked); // Assuming inactive has border
            btn.classList.toggle('border-gray-300', !isClicked); // Assuming inactive has border
            btn.classList.toggle('text-gray-800', !isClicked);
            // Toggle hover classes if needed, or manage them purely with CSS :not(.active):hover
            // btn.classList.toggle('hover:bg-green-700', !isClicked);
            // btn.classList.toggle('hover:text-white', !isClicked);
        });

        // --- Update Tab Panes ---
        tabPanes.forEach(pane => {
            const isTarget = pane.id === targetTabId;
            pane.classList.toggle('active', isTarget);
            pane.classList.toggle('block', isTarget);
            pane.classList.toggle('hidden', !isTarget);
        });


        console.log(`Switched to tab: ${targetTabId}`);

        // Load data for the newly activated tab
        if (targetTabId === 'schedule-tab') {
            if (weekFilterDropdown && weekFilterDropdown.value) {
                await handleWeekChange();
            } else {
                displaySchedules([], null); // Clear grid if no week selected
            }
        } else if (targetTabId === 'submissions-tab') {
            // Check if we need to load details or just the list
            // If currentSelectedSubmissionId is set AND the click wasn't programmatic (direct user click)
            // maybe we clear the selection? Or just load the list. Let's just load the list for now.
            if (event.isTrusted) { // Check if it's a real user click, not programmatic
                 clearSubmissionDetailView(); // Clear details on direct tab click
            }
            await handleSubmissionFilterChange(); // Fetch and render submissions list
        } else if (targetTabId === 'settings-tab') {
            // Fetch periods again to ensure settings view is up-to-date
            // await fetchAndDisplayPeriods(); // Assuming this function exists if you have a settings tab
        }
    };
    // --- End Function to Handle Tab Switching ---

     // Enable/Disable detail view editing controls
     function enableSubmissionDetailEditing() {
         if (submissionResultUpdate) submissionResultUpdate.disabled = false;
         if (saveSubmissionResultBtn) saveSubmissionResultBtn.disabled = false;
         // Add styling for enabled state if needed
     }

     function disableSubmissionDetailEditing() {
         if (submissionResultUpdate) submissionResultUpdate.disabled = true;
         if (saveSubmissionResultBtn) saveSubmissionResultBtn.disabled = true;
         // Add styling for disabled state if needed
     }

    // --- Event Listeners ---

    // Schedule Tab Listeners
    if (weekFilterDropdown) weekFilterDropdown.addEventListener('change', handleWeekChange);
    if (departmentFilter) departmentFilter.addEventListener('change', handleWeekChange);

    // Use event delegation for schedule buttons
    if (scheduleTableBody) {
        scheduleTableBody.addEventListener('click', async (event) => {
            const btn = event.target.closest('.schedule-button'); // Find the button
            if (!btn) return; // Exit if click wasn't on or inside a button

            event.preventDefault();
            if (btn.disabled) {
                console.log("Clicked a disabled slot.");
                return;
            }

            const slotId = btn.dataset.slotId; // AssessmentSlot _id (if available/booked)
            const applicationId = btn.dataset.applicationId; // ApplyStaff _id (if booked)
            const buttonDateString = btn.dataset.date; // Calculated date YYYY-MM-DD
            const time = btn.dataset.time;
            const currentDept = departmentFilter.value;
            const year = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

            if (applicationId) { // Case 1: Booked slot - Switch to submissions tab and show details
                console.log("Clicked booked slot, switching to submissions tab for application:", applicationId);
                const submissionsTabButton = document.querySelector('.tab-button[data-tab="submissions-tab"]');
                if (submissionsTabButton) {
                    submissionsTabButton.click(); // Simulate click to switch tab and trigger data load
                    // Wait a moment for the tab switch and potential data load to occur
                    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
                    const success = await displaySubmissionDetailsById(applicationId);
                    if (success && submissionDetailContentInline) {
                        submissionDetailContentInline.scrollIntoView({ behavior: 'auto', block: 'nearest' });
                        // Highlight row in submissions table
                        if (submissionsTableBody) {
                             submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row', 'bg-green-100'));
                             const rowButton = submissionsTableBody.querySelector(`button.select-submission-btn[data-id="${applicationId}"]`);
                             rowButton?.closest('tr')?.classList.add('selected-row', 'bg-green-100');
                        }
                    }
                } else { console.error("Submissions tab button not found."); }

            } else if (btn.classList.contains('available') && slotId) { // Case 2: Available slot (in DB) - Confirm deletion
                 console.log("Clicked available slot, confirming deletion for slot:", slotId);
                 const confirmationMessage = `${buttonDateString} - ${time} is marked as available. Do you want to make it unavailable again?`;
                 if (confirm(confirmationMessage)) {
                     await deleteAvailableSlot(slotId); // Call API function
                 } else { console.log("User cancelled deleting available slot."); }

            } else if (btn.classList.contains('implicitly-available')) { // Case 3: Implicitly available - Confirm creation
                 console.log("Clicked implicitly available slot.");
                 if (!buttonDateString) {
                      console.error("Button is missing pre-calculated data-date attribute.", btn);
                      alert("Could not determine the date for this slot. Please refresh.");
                      return;
                 }
                 let actualDayName = 'Unknown Day';
                 try {
                     const buttonDateObject = parseDateStringToLocalMidnight(buttonDateString);
                     if (!isNaN(buttonDateObject.getTime())) actualDayName = buttonDateObject.toLocaleDateString('en-US', { weekday: 'long' });
                 } catch (e) { console.error("Error parsing button date string to get day name:", e); }

                 if (confirm(`Mark ${actualDayName}, ${time} (${buttonDateString}) as available for assessment in ${currentDept}?`)) {
                     await makeSlotAvailableForAssessment(buttonDateString, time, currentDept, year); // Call API function
                 } else { console.log("User cancelled marking slot available."); }
            }
        });
    } else {
        console.error("Schedule table body (#schedule-body) not found.");
    }


    if (scheduleModalCloseButton) scheduleModalCloseButton.addEventListener('click', () => { if (scheduleModal) scheduleModal.style.display = 'none'; if (applicationDetailsView) applicationDetailsView.style.display = 'none'; });

    // --- Update savePeriods function ---
    const savePeriods = async () => {
        if (!periodSettingsForm) return false;
        const appStartDateInput = document.getElementById('applicationStartDate');
        const appEndDateInput = document.getElementById('applicationEndDate');
        const assessStartDateInput = document.getElementById('assessmentStartDate');
        const assessEndDateInput = document.getElementById('assessmentEndDate');

        if (!appStartDateInput || !appEndDateInput || !assessStartDateInput || !assessEndDateInput) {
            alert("Error: One or more period setting input fields are missing in the HTML.");
            return false;
        }

        const appStartDate = appStartDateInput.value;
        const appEndDate = appEndDateInput.value;
        const assessStartDate = assessStartDateInput.value;
        const assessEndDate = assessEndDateInput.value;

        let year = null;
        // Determine the target year from input fields or fallback
        if (appStartDate) year = new Date(appStartDate).getFullYear().toString();
        else if (assessStartDate) year = new Date(assessStartDate).getFullYear().toString();
        else {
             year = currentApplicationPeriod?.year?.toString() || currentAssessmentPeriod?.year?.toString() || new Date().getFullYear().toString();
             console.log("No start dates provided, using year:", year);
        }

        // --- Validation Checks ---
        if (!year && (appStartDate || assessStartDate)) { alert("Could not determine the year from the provided start dates."); return false; }
        if ((appStartDate && !appEndDate) || (!appStartDate && appEndDate)) { alert("Please provide both start and end dates for the Application Period, or leave both blank."); return false; }
        if ((assessStartDate && !assessEndDate) || (!assessStartDate && assessEndDate)) { alert("Please provide both start and end dates for the Assessment Period, or leave both blank."); return false; }
        if (appStartDate && appEndDate && new Date(appEndDate) < new Date(appStartDate)) { alert("Application Period end date cannot be before the start date."); return false; }
        if (assessStartDate && assessEndDate && new Date(assessEndDate) < new Date(assessStartDate)) { alert("Assessment Period end date cannot be before the start date."); return false; }
        // Allow assessment start to be same day as app start, but not before
        if (appStartDate && assessStartDate && new Date(assessStartDate) < new Date(appStartDate)) { alert("Assessment Period start date cannot be before the Application Period start date."); return false; }
        // Ensure assessment starts after application ends if both are provided
        if (appEndDate && assessStartDate && new Date(assessStartDate) <= new Date(appEndDate)) { alert("Assessment Period start date must be after the Application Period end date."); return false; }
        // <<< CHECK IF SAVING FOR CURRENT YEAR WHEN APP PERIOD HAS ENDED >>>
        const actualCurrentYear = new Date().getFullYear().toString();
        // Only perform this check if the user is trying to save an application period
        if (appStartDate && appEndDate && year === actualCurrentYear) {
            // Check the *currently stored* application period for this year
            if (currentApplicationPeriod?.startDate && currentApplicationPeriod?.endDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                // Use the END date of the currently stored application period for comparison
                const storedAppEnd = parseDateStringToLocalMidnight(currentApplicationPeriod.endDate);

                if (!isNaN(storedAppEnd.getTime()) && today > storedAppEnd) {
                    alert(`The application period for ${year} has already ended. You cannot change the application period dates for this year anymore. You can still update the assessment period or save settings for future years.`);
                    return false; // Prevent saving (because they tried to save the ended application period)
                }
            }
        }
        // <<< END CHECK >>>


        showSpinner();
        let success = true;
        let appSaved = false;
        let assessSaved = false;

        try {
            // Save Application Period
            if (appStartDate && appEndDate && year) {
                console.log(`Saving Application Period for ${year}: ${appStartDate} - ${appEndDate}`);
                const appPayload = { key: 'JoinGFM', year: year, startDate: appStartDate, endDate: appEndDate };
                const appResponse = await fetch(`/admin/application-period`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(appPayload)
                });
                if (!appResponse.ok) {
                    const errorData = await appResponse.json();
                    throw new Error(`Failed to save Application Period: ${errorData.error || errorData.message || appResponse.statusText}`);
                }
                console.log("Application Period saved successfully.");
                appSaved = true;
            } else { console.log("Skipping Application Period save."); }

            // Save Assessment Period
            if (assessStartDate && assessEndDate && year) {
                console.log(`Saving Assessment Period for ${year}: ${assessStartDate} - ${assessEndDate}`);
                const assessPayload = { year: year, startDate: assessStartDate, endDate: assessEndDate };
                const assessResponse = await fetch(`/admin/assessment-period`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(assessPayload)
                });
                if (!assessResponse.ok) {
                    const errorData = await assessResponse.json();
                    throw new Error(`Failed to save Assessment Period: ${errorData.error || errorData.message || assessResponse.statusText}`);
                }
                console.log("Assessment Period saved successfully.");
                assessSaved = true;
            } else { console.log("Skipping Assessment Period save."); }

            if (appSaved || assessSaved) alert("Period settings saved successfully!");
            else { alert("No period dates were provided to save."); success = false; }

        } catch (error) {
            console.error("Error saving period settings:", error);
            alert(`Error saving settings: ${error.message}`);
            success = false;
        } finally {
            hideSpinner();
        }
        return success;
    };
    // --- End savePeriods function ---

    // Period Settings Form Listener
    if (periodSettingsForm) {
        periodSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Period settings form submitted.");
            const savedSuccessfully = await savePeriods();
            if (savedSuccessfully) {
                console.log("Refreshing page data after saving periods.");
                // Data refresh will be handled by socket listeners ('applicationPeriodUpdated', 'assessmentPeriodUpdated')
                // await initializeAdminPage(); // No need to call this directly
            }
        });
     }

    // Submission Tab Listeners
    if (submissionYearFilter) submissionYearFilter.addEventListener('change', handleSubmissionFilterChange);
    if (submissionStatusFilter) submissionStatusFilter.addEventListener('change', handleSubmissionFilterChange);
    if (submissionDepartmentFilter) submissionDepartmentFilter.addEventListener('change', handleSubmissionFilterChange);
    if (saveSubmissionResultBtn) saveSubmissionResultBtn.addEventListener('click', handleSaveSubmissionResult);

    // Use event delegation for submission select buttons
    if (submissionsTableBody) {
        submissionsTableBody.addEventListener('click', (event) => {
            // Check if the clicked element or its parent is the select button
            if (event.target.closest('.select-submission-btn')) {
                handleSelectSubmission(event);
            }
        });
    }

    // Tab Button Listeners
    tabButtons.forEach(button => button.addEventListener('click', handleTabSwitch));

    // --- Socket Event Listeners ---
    socket.on('connect', () => console.log('Admin Staff Page Socket Connected:', socket.id));
    socket.on('disconnect', () => console.log('Admin Staff Page Socket Disconnected'));

    socket.on('assessmentSlotUpdate', (data) => {
        console.log('Admin received assessmentSlotUpdate:', data);
        const { action, slot } = data;
        const currentWeek = weekFilterDropdown.value;
        const currentDept = departmentFilter.value;
        const currentTab = document.querySelector('.tab-button.active')?.dataset.tab;

        // Only update schedule grid if relevant and schedule tab is active
        if (currentTab === 'schedule-tab' && slot.department === currentDept && slot.year.toString() === currentAssessmentPeriod?.year.toString()) {
            // Check if the slot's date falls within the selected week
            if (currentWeek) {
                 const weekStartDate = parseDateStringToLocalMidnight(currentWeek);
                 const weekEndDate = new Date(weekStartDate);
                 weekEndDate.setDate(weekStartDate.getDate() + 6); // Sunday to Saturday
                 const slotDate = parseDateStringToLocalMidnight(slot.date);

                 if (!isNaN(weekStartDate) && !isNaN(slotDate) && slotDate >= weekStartDate && slotDate <= weekEndDate) {
                    console.log("Relevant slot update received for schedule tab. Refreshing week view.");
                    handleWeekChange(); // Re-fetch and re-render the week's schedule
                 } else {
                     console.log("Slot update received, but not for the currently selected week.");
                 }
            }
        }
    });

    socket.on('newStaffSubmission', (submissionData) => {
        console.log('Admin received newStaffSubmission:', submissionData);
        const currentYearFilterVal = submissionYearFilter.value;
        const currentStatus = submissionStatusFilter.value;
        const currentDept = submissionDepartmentFilter.value;
        const currentTab = document.querySelector('.tab-button.active')?.dataset.tab;

        if (currentTab === 'submissions-tab' &&
            submissionData.schoolYear === currentYearFilterVal &&
            (currentStatus === 'All' || submissionData.result === currentStatus) && // Check 'result' field
            (currentDept === 'All' || submissionData.preferredDepartment === currentDept))
        {
            console.log("New submission matches filters. Refreshing submissions table.");
            handleSubmissionFilterChange(); // Re-fetch and re-render
        }
    });

    socket.on('applicationPeriodUpdated', (updatedPeriod) => {
        console.log('Received applicationPeriodUpdated:', updatedPeriod);
        if (updatedPeriod && updatedPeriod.year.toString() === currentYear) {
            currentApplicationPeriod = updatedPeriod;
            console.log('Updated currentApplicationPeriod:', currentApplicationPeriod);
            updateDisplayedPeriods();
            // No direct impact on schedule grid or submission list, just display update
        }
    });

    socket.on('assessmentPeriodUpdated', (updatedPeriod) => {
        console.log('Received assessmentPeriodUpdated:', updatedPeriod);
        if (updatedPeriod && updatedPeriod.year.toString() === currentYear) {
            currentAssessmentPeriod = updatedPeriod;
            console.log('Updated currentAssessmentPeriod:', currentAssessmentPeriod);
            updateDisplayedPeriods();

            console.log("Repopulating week dropdown due to assessment period update.");
            const populated = populateWeekDropdown();

            if (populated && weekFilterDropdown.options.length > 1) {
                weekFilterDropdown.selectedIndex = 1; // Select the first actual week
                console.log("Defaulting to first week:", weekFilterDropdown.value);
                const activeTab = document.querySelector('.tab-button.active')?.dataset.tab;
                if (activeTab === 'schedule-tab') {
                    console.log("Schedule tab active, loading schedule for the first week.");
                    handleWeekChange();
                }
            } else {
                 // If no weeks populated, clear the schedule grid
                 clearScheduleGrid();
            }
        }
    });
    // --- End Socket Event Listeners ---

    // --- Initialization ---
    const initializeAdminPage = async () => {
        showSpinner();
        try {
            // Fetch initial periods for the current year
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM', currentYear);
            currentAssessmentPeriod = await fetchAssessmentPeriod(currentYear);
            console.log(`Assigned application period for ${currentYear}:`, currentApplicationPeriod);
            console.log(`Assigned assessment period for ${currentYear}:`, currentAssessmentPeriod);

            updateDisplayedPeriods(); // Update display and form inputs

            // Populate week dropdown based on fetched assessment period
            const populated = populateWeekDropdown();

            // Fetch initial submission years and populate filter
            await populateSubmissionYearFilter(); // This now triggers loadSubmissions

            // Set initial department filter based on admin's department (if available)
            if (departmentFilter) {
                const adminDepartment = document.body.dataset.adminDepartment;
                if (adminDepartment) {
                    const optionExists = Array.from(departmentFilter.options).some(opt => opt.value === adminDepartment);
                    if (optionExists) {
                        departmentFilter.value = adminDepartment;
                        console.log(`Set initial department filter to admin's department: ${adminDepartment}`);
                    } else { console.warn(`Admin's department "${adminDepartment}" not found in dropdown options.`); }
                } else { console.log("Admin department not found in page data."); }
            } else { console.warn("Department filter dropdown not found."); }

            // Select first week if populated
            let initialWeekLoaded = false;
            if (populated && weekFilterDropdown.options.length > 1) {
                weekFilterDropdown.selectedIndex = 1;
                console.log("Defaulting to first week on initial load:", weekFilterDropdown.value);
                initialWeekLoaded = true;
            }

            // Load initial data based on active tab
            const activeTab = document.querySelector('.tab-button.active')?.dataset.tab || 'schedule-tab'; // Default to schedule tab
            if (activeTab === 'schedule-tab' && initialWeekLoaded) {
                 console.log("Initial load: Schedule tab active. Calling handleWeekChange.");
                 await handleWeekChange();
            } else if (activeTab === 'submissions-tab') {
                 console.log("Initial load: Submissions tab active. Calling handleSubmissionFilterChange.");
                 await handleSubmissionFilterChange(); // <<< ADD EXPLICIT CALL HERE for submissions tab
            } else {
                 // Handle settings tab or default state if needed
                 if (activeTab === 'schedule-tab' && !initialWeekLoaded) {
                     clearScheduleGrid(); // Ensure grid is clear if no week selected
                 }
            }

            // Ensure detail view starts disabled
            disableSubmissionDetailEditing();

        } catch (error) {
            console.error("Initialization failed:", error);
            alert("Failed to initialize admin page data.");
        } finally {
            hideSpinner();
        }
    };
    // --- End Initialization ---

    // Initial call
    await initializeAdminPage();

}); // End DOMContentLoaded

// --- SPINNER FUNCTIONS ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}
// --- END SPINNER FUNCTIONS ---

// --- Slot Interaction Functions ---
async function deleteAvailableSlot(slotId) {
    console.log(`Attempting to delete available slot: ${slotId}`);
    showSpinner();
    try {
        const response = await fetch(`/admin/assessment-slots/${slotId}`, { method: 'DELETE' }); // Use correct endpoint
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete slot (${response.status})`);
        }
        console.log(`Slot ${slotId} deleted successfully.`);
        // UI update will be handled by 'assessmentSlotUpdate' socket event listener calling handleWeekChange
    } catch (error) {
        console.error('Error deleting available slot:', error);
        alert(`Error deleting slot: ${error.message}`);
    } finally {
        hideSpinner();
    }
}

async function makeSlotAvailableForAssessment(date, time, department, year) {
    console.log(`Attempting to mark slot as available: ${date}, ${time}, ${department}, ${year}`);
    if (!date || !time || !department || !year) {
        alert("Missing data to mark slot as available.");
        console.error("Missing data:", { date, time, department, year });
        return;
    }

    showSpinner();
    try {
        const response = await fetch('/admin/assessment-slots', { // Use correct endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, department, year }) // Body matches controller
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to mark slot available (${response.status})`);
        }
        console.log(`Slot ${date}, ${time} marked available successfully.`);
        // UI update will be handled by 'assessmentSlotUpdate' socket event listener calling handleWeekChange
    } catch (error) {
        console.error('Error marking slot available:', error);
        alert(`Error marking slot available: ${error.message}`);
    } finally {
        hideSpinner();
    }
}
// --- End Slot Interaction Functions ---