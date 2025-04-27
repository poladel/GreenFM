document.addEventListener('DOMContentLoaded', async () => {
    // --- Element References ---
    const scheduleGrid = document.getElementById('scheduleGrid');
    const scheduleButtons = scheduleGrid ? Array.from(scheduleGrid.querySelectorAll('.schedule-button')) : [];
    const weekFilterDropdown = document.getElementById('weekFilter');
    const departmentFilter = document.getElementById('departmentFilter'); // Used by both tabs
    const scheduleModal = document.getElementById('scheduleModal'); // Existing modal for schedule details
    const scheduleModalCloseButton = scheduleModal?.querySelector('.close'); // Close button for schedule modal
    const applicationDetailsView = document.getElementById('applicationDetailsView'); // Content within schedule modal
    const existingApplicationPeriodElement = document.getElementById('existingApplicationPeriod');
    const existingAssessmentPeriodElement = document.getElementById('existingAssessmentPeriod');
    const periodSettingsForm = document.getElementById('periodSettingsForm'); // Form for setting periods

    // --- Submission Tab Element References ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const submissionYearFilter = document.getElementById('submissionYearFilter');
    const submissionStatusFilter = document.getElementById('submissionStatusFilter');
    const submissionDepartmentFilter = document.getElementById('submissionDepartmentFilter'); // Filter for submissions tab
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    // --- MODIFIED/NEW References ---
    const submissionDetailView = document.getElementById('submissionDetailView'); // The container div (always visible)
    const submissionDetailContentInline = document.getElementById('submissionDetailContentInline'); // Content within the div
    // --- REMOVED closeSubmissionDetailBtn ---
    const submissionResultUpdate = document.getElementById('submissionResultUpdate'); // Dropdown (keep)
    const saveSubmissionResultBtn = document.getElementById('saveSubmissionResultBtn'); // Save button (keep)

    // --- State Variables ---
    let currentApplicationPeriod = null;
    let currentAssessmentPeriod = null;
    let currentYear = new Date().getFullYear().toString(); // Use string for consistency
    let currentSelectedSubmissionId = null; // To store ID for saving result

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
            let url = `/admin/application-period?key=${key}`; // FIX: Use singular 'application-period'
            if (year) url += `&year=${year}`;
            console.log("Fetching application period from:", url);
            const response = await fetch(url);
            console.log(`[fetchApplicationPeriod] Response Status: ${response.status}`); // More specific log

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fetchApplicationPeriod] Application period not found for key=${key}, year=${year}`);
                    return null; // Explicitly return null on 404
                }
                let errorText = `Status: ${response.statusText}`;
                try {
                    errorText = await response.text();
                } catch (textError) {
                    console.error("[fetchApplicationPeriod] Could not read error response text:", textError);
                }
                console.error(`[fetchApplicationPeriod] Failed (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch application period: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("[fetchApplicationPeriod] Data received:", data); // Log the parsed data
            if (typeof data === 'undefined') {
                console.warn("[fetchApplicationPeriod] response.json() resulted in undefined. Returning null.");
                return null;
            }
            return data;

        } catch (error) {
            console.error('[fetchApplicationPeriod] Error caught:', error);
            return null; // Explicitly return null on any error
        }
    };

    const fetchAssessmentPeriod = async (year = null) => {
         try {
            let url = `/admin/assessment-period`; // FIX: Use singular 'assessment-period'
            if (year) url += `?year=${year}`;
            console.log("Fetching assessment period from URL:", url);
            const response = await fetch(url);
            console.log(`[fetchAssessmentPeriod] Response Status: ${response.status}`); // More specific log

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`[fetchAssessmentPeriod] Assessment period not found for year ${year}`);
                    return null; // Explicitly return null on 404
                }
                let errorText = `Status: ${response.statusText}`;
                try {
                    errorText = await response.text();
                } catch (textError) {
                     console.error("[fetchAssessmentPeriod] Could not read error response text:", textError);
                }
                console.error(`[fetchAssessmentPeriod] Failed (${response.status}): ${errorText}`);
                throw new Error(`Failed to fetch assessment period: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("[fetchAssessmentPeriod] Data received:", data); // Log the parsed data
            if (typeof data === 'undefined') {
                console.warn("[fetchAssessmentPeriod] response.json() resulted in undefined. Returning null.");
                return null;
            }
            return data;

        } catch (error) {
            console.error('[fetchAssessmentPeriod] Error caught:', error);
            return null; // Explicitly return null on any error
        }
    };

    const displayExistingApplicationPeriod = () => {
        if (!existingApplicationPeriodElement) return;
        if (currentApplicationPeriod && currentApplicationPeriod.startDate) {
            const start = new Date(currentApplicationPeriod.startDate).toLocaleDateString();
            const end = currentApplicationPeriod.endDate ? new Date(currentApplicationPeriod.endDate).toLocaleDateString() : 'N/A';
            existingApplicationPeriodElement.textContent = `Current Application Period (${currentApplicationPeriod.year}): ${start} - ${end}`;
        } else {
            existingApplicationPeriodElement.textContent = `No application period set for ${currentYear}.`;
        }
    };

    const displayExistingAssessmentPeriod = () => {
        if (!existingAssessmentPeriodElement) return;
        if (currentAssessmentPeriod && currentAssessmentPeriod.startDate) {
            const start = new Date(currentAssessmentPeriod.startDate).toLocaleDateString();
            const end = currentAssessmentPeriod.endDate ? new Date(currentAssessmentPeriod.endDate).toLocaleDateString() : 'N/A';
            existingAssessmentPeriodElement.textContent = `Current Assessment Period (${currentAssessmentPeriod.year}): ${start} - ${end}`;
        } else {
            existingAssessmentPeriodElement.textContent = `No assessment period set for ${currentYear}.`;
        }
    };

    const populateWeekDropdown = () => {
        if (!weekFilterDropdown) {
             console.error("Week filter dropdown not found.");
             return false;
        }
        weekFilterDropdown.innerHTML = '<option value="" disabled selected>Select Week</option>';
        weekFilterDropdown.disabled = true;

        if (!currentAssessmentPeriod || !currentAssessmentPeriod.startDate || !currentAssessmentPeriod.endDate) {
            weekFilterDropdown.innerHTML = '<option value="" disabled selected>Set Assessment Period</option>';
            return false;
        }

        const startDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.startDate);
        const endDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error("Invalid assessment period dates.");
            weekFilterDropdown.innerHTML = '<option value="" disabled selected>Invalid Period Dates</option>';
            return false;
        }

        let currentWeekStart = new Date(startDate);
        // Adjust currentWeekStart to the beginning of its week (Sunday)
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());

        let weekCount = 0;
        while (currentWeekStart <= endDate) {
            // --- Calculate Monday and Friday for display ---
            const monday = new Date(currentWeekStart);
            monday.setDate(monday.getDate() + 1); // Monday is Sunday + 1 day

            const friday = new Date(currentWeekStart);
            friday.setDate(friday.getDate() + 5); // Friday is Sunday + 5 days
            // ---

            // Format the value as YYYY-MM-DD for the start of the week (Sunday)
            const startYear = currentWeekStart.getFullYear();
            const startMonth = (currentWeekStart.getMonth() + 1).toString().padStart(2, '0');
            const startDay = currentWeekStart.getDate().toString().padStart(2, '0');
            const weekStartDateString = `${startYear}-${startMonth}-${startDay}`; // Value remains Sunday start

            // --- Format the display text using Monday - Friday ---
            // Ensure the displayed dates are within the actual assessment period
            const displayStart = monday < startDate ? startDate : monday;
            const displayEnd = friday > endDate ? endDate : friday;

            // Only add the week if Monday is before or the same day as Friday AND Monday is within the period end date
            if (displayStart <= displayEnd && displayStart <= endDate) {
                const optionText = `${displayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${displayEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                const option = new Option(optionText, weekStartDateString);
                weekFilterDropdown.add(option);
                weekCount++;
            }
            // ---

            // Move to the next week's start (Sunday)
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        if (weekCount > 0) {
            weekFilterDropdown.disabled = false; // Enable if weeks were added
            weekFilterDropdown.selectedIndex = 1; // Select the first actual week option
            return true; // Indicate population succeeded
        } else {
             weekFilterDropdown.innerHTML = '<option value="" disabled selected>No Weekdays in Period</option>'; // Update message slightly
             return false;
        }
    };

    // --- Schedule Display and Interaction ---

    // Fetch and display slots for the selected week/department
    const handleWeekChange = async () => {
        const selectedWeekStartDate = weekFilterDropdown.value;
        const currentDepartment = departmentFilter.value;
        // Ensure currentYear is correctly set (e.g., from assessment period or default)
        const yearToFetch = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

        if (!selectedWeekStartDate || !currentDepartment) {
            console.log("Week or department not selected.");
            displaySchedules([]); // Clear grid
            return;
        }

        console.log(`Fetching available assessment slots for week starting: ${selectedWeekStartDate}, Department: ${currentDepartment}, Year: ${yearToFetch}`);
        try {
            // Fetch slots marked as available (including booked ones with populated data)
            const response = await fetch(`/admin/assessment-slots/for-week?weekStart=${selectedWeekStartDate}&department=${encodeURIComponent(currentDepartment)}&year=${yearToFetch}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`No assessment slots found marked available for week ${selectedWeekStartDate}, Dept: ${currentDepartment}`);
                    // Still call displaySchedules to render the grid correctly for the week, just with no slots marked/booked
                    displaySchedules([], selectedWeekStartDate);
                    return;
                }
                 // Log error response for debugging other issues
                 const errorText = await response.text();
                 console.error("Error response text:", errorText);
                throw new Error(`Failed to fetch available assessment slots for week (Status: ${response.status})`);
            }
            const slotsForWeek = await response.json(); // Array of AssessmentSlot documents (some with populated 'application')
            console.log(`Fetched ${slotsForWeek.length} slots for the week.`);

            // Pass the fetched slots to displaySchedules
            displaySchedules(slotsForWeek, selectedWeekStartDate);

        } catch (error) {
            console.error('Error fetching/displaying available assessment slots for week:', error);
            alert(`Error loading schedule view: ${error.message}`);
            displaySchedules([]); // Display empty grid on error
        }
    };

    // Update the grid based on fetched slots
    const displaySchedules = (slotsForWeek = [], weekStartDateString = null) => {
        const slotMap = new Map();
        slotsForWeek.forEach(slot => {
            const key = `${slot.date}_${slot.time}`;
            slotMap.set(key, slot);
        });

        const isWeeklyView = weekStartDateString;
        console.log("Is Weekly View:", isWeeklyView);

        // --- Get Assessment Period End Date ---
        let assessmentEndDate = null;
        if (currentAssessmentPeriod && currentAssessmentPeriod.endDate) {
            assessmentEndDate = parseDateStringToLocalMidnight(currentAssessmentPeriod.endDate);
            if (isNaN(assessmentEndDate.getTime())) {
                console.error("Invalid assessment end date found:", currentAssessmentPeriod.endDate);
                assessmentEndDate = null; // Reset if invalid
            }
        }
        // ---

        scheduleButtons.forEach(button => {
            const dayName = button.getAttribute('data-day');
            const time = button.getAttribute('data-time');

            // --- Reset button state ---
            button.textContent = ''; // Clear previous text
            button.disabled = false;
            button.className = 'schedule-button availablebtn'; // Default to available
            button.dataset.applicationDetails = ''; // Clear previous data
            delete button.dataset.slotId; // Clear slotId initially

            if (isWeeklyView) {
                let buttonDate; // Keep the Date object
                let buttonDateString = '';
                try {
                    // ... (date calculation logic - keep as is) ...
                    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName);
                    if (dayIndex === -1) throw new Error(`Invalid day name: ${dayName}`);
                    buttonDate = parseDateStringToLocalMidnight(weekStartDateString); // Assign to buttonDate
                    if (isNaN(buttonDate.getTime())) throw new Error(`Invalid week start date: ${weekStartDateString}`);
                    const weekStartDayIndex = buttonDate.getDay();
                    let daysToAdd = dayIndex - weekStartDayIndex;
                    buttonDate.setDate(buttonDate.getDate() + daysToAdd);
                    const year = buttonDate.getFullYear();
                    const month = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                    const day = buttonDate.getDate().toString().padStart(2, '0');
                    buttonDateString = `${year}-${month}-${day}`;
                } catch (e) {
                    console.error("Error calculating date for button in displaySchedules", e);
                    button.disabled = true;
                    button.className = 'schedule-button';
                    return; // Skip further processing for this button
                }

                // --- NEW: Check if button date is outside assessment period end date ---
                if (assessmentEndDate && buttonDate > assessmentEndDate) {
                    button.disabled = true;
                    button.className = 'schedule-button disabled-outside-period'; // Add a specific class for styling
                    button.textContent = 'Not Applicable'; // Indicate not applicable
                    // console.log(`Disabling button for ${buttonDateString} as it's after assessment end date ${assessmentEndDate.toISOString().split('T')[0]}`);
                    return; // Skip further processing for this button
                }
                // --- END NEW CHECK ---


                const slotKey = `${buttonDateString}_${time}`;
                const slotData = slotMap.get(slotKey);

                if (slotData) {
                    // --- DEBUG: Log the found slotData and its application field ---
                    // console.log(`      MATCH FOUND for key: ${slotKey}`);
                    // console.log(`      slotData.application:`, slotData.application); // Log the value
                    // console.log(`      typeof slotData.application:`, typeof slotData.application); // Log the type
                    // --- END DEBUG ---

                    // Check if the slot is BOOKED (has populated application data)
                    if (slotData.application && typeof slotData.application === 'object') {
                        // ... (existing booked slot logic - keep as is) ...
                        console.log(`      >>> Condition TRUE: Treating as BOOKED.`);
                        button.classList.remove('availablebtn', 'marked-available');
                        button.classList.add('bookedbtn');
                        const applicantName = `${slotData.application.lastName}, ${slotData.application.firstName}${slotData.application.middleInitial ? ' ' + slotData.application.middleInitial + '.' : ''}${slotData.application.suffix ? ' ' + slotData.application.suffix : ''}`;
                        const applicantSection = slotData.application.section;
                        button.textContent = `${applicantName}\n${applicantSection}`;
                        button.style.whiteSpace = 'pre-line';
                        button.style.fontSize = '0.7em';
                        button.style.lineHeight = '1.2';
                        const detailsForModal = {
                            lastName: slotData.application.lastName,
                            firstName: slotData.application.firstName,
                            middleInitial: slotData.application.middleInitial,
                            suffix: slotData.application.suffix,
                            section: slotData.application.section,
                            dlsudEmail: slotData.application.dlsudEmail,
                            studentNumber: slotData.application.studentNumber,
                            preferredDepartment: slotData.application.preferredDepartment,
                            preferredSchedule: `${slotData.date} (${slotData.time})`
                        };
                        button.dataset.applicationDetails = JSON.stringify(detailsForModal);

                    } else {
                        // Slot is marked available by admin OR population failed
                        // ... (existing marked-available slot logic - keep as is) ...
                         console.log(`      >>> Condition FALSE: Treating as MARKED AVAILABLE.`);
                         button.classList.remove('availablebtn');
                         button.classList.add('marked-available');
                         button.textContent = 'Available';
                         button.dataset.slotId = slotData._id;
                    }
                } else {
                    // Slot is implicitly available (not in DB)
                    // Button remains in its default 'availablebtn' state from the reset above
                    // console.log(`      No match for key: ${slotKey}`);
                }
            } else {
                // Not in weekly view
                button.className = 'schedule-button';
                button.disabled = true;
            }
        }); // End scheduleButtons.forEach
    };

    // Function to mark a slot as available via API call
    const makeSlotAvailableForAssessment = async (date, time, department, year) => {
        console.log(`Attempting to mark available: ${date}, ${time}, ${department}, ${year}`);
        try {
            const response = await fetch('/admin/assessment-slots', { // POST to the admin endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, department, year }),
            });

            const result = await response.json();

            if (!response.ok) {
                // Throw error including message from backend
                throw new Error(result.message || `Failed to save slot (Status: ${response.status})`);
            }

            alert(result.message || 'Slot marked as available successfully!');

            // Refresh the schedule view to show the change immediately
            await handleWeekChange();

        } catch (error) {
            console.error('Error marking slot available:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // Function to delete an available slot via API call
    const deleteAvailableSlot = async (slotId) => {
        console.log(`Attempting to delete available slot: ${slotId}`);
        try {
            // --- NEW: Send DELETE request to backend ---
            const response = await fetch(`/admin/assessment-slots/${slotId}`, {
                method: 'DELETE',
                headers: {
                    // Add authentication headers if needed (e.g., JWT token)
                    'Content-Type': 'application/json' // Optional for DELETE, but good practice
                },
            });
            // --- END NEW ---

            const result = await response.json(); // Expect JSON response { message: "..." }

            if (!response.ok) {
                // Throw error including message from backend
                throw new Error(result.message || `Failed to delete slot (Status: ${response.status})`);
            }

            alert(result.message || 'Slot deleted successfully!');

            // Refresh the schedule view to show the change immediately
            await handleWeekChange();

        } catch (error) {
            console.error('Error deleting available slot:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Submission Tab Functions ---
    const fetchDistinctSubmissionYears = async () => {
        try {
            const response = await fetch('/admin/submission-years'); // Ensure this route exists and is mounted correctly
            if (!response.ok) {
                throw new Error(`Failed to fetch submission years: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching submission years:', error);
            return [currentYear]; // Fallback
        }
    };

    const populateSubmissionYearFilter = (years) => {
        if (!submissionYearFilter) return;
        submissionYearFilter.innerHTML = '';
        let currentYearExists = false;
        years.forEach(year => {
            const option = new Option(year, year);
            submissionYearFilter.add(option);
            if (year === currentYear) {
                currentYearExists = true;
            }
        });
        if (currentYearExists) {
            submissionYearFilter.value = currentYear;
        } else if (years.length > 0) {
            submissionYearFilter.value = years[0];
            // currentYear = years[0]; // Don't change the global currentYear based on submissions only
        } else {
             submissionYearFilter.innerHTML = '<option value="">No Data</option>';
             submissionYearFilter.disabled = true;
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
            const url = `/admin/submissions?year=${year}&status=${status}&department=${encodeURIComponent(department)}`;
            console.log("Fetching submissions from:", url);
            const response = await fetch(url); // Ensure this route exists and is mounted correctly
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
        if (!submissionsTableBody) return;
        submissionsTableBody.innerHTML = '';

        if (!submissions || submissions.length === 0) {
            submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px;">No submissions found matching the criteria.</td></tr>`;
            return;
        }

        submissions.forEach(sub => {
            const row = submissionsTableBody.insertRow();
            const name = `${sub.lastName}, ${sub.firstName}${sub.middleInitial ? ' ' + sub.middleInitial + '.' : ''}${sub.suffix ? ' ' + sub.suffix : ''}`;
            row.insertCell().textContent = name;
            row.insertCell().textContent = sub.studentNumber;
            row.insertCell().textContent = sub.preferredDepartment;
            row.insertCell().textContent = sub.result;
            const actionCell = row.insertCell();
            actionCell.style.textAlign = 'center';
            const selectButton = document.createElement('button');
            selectButton.textContent = 'Select';
            selectButton.classList.add('select-submission-btn');
            selectButton.dataset.id = sub._id;
            selectButton.addEventListener('click', handleSelectSubmission);
            actionCell.appendChild(selectButton);
        });
    };

    // --- NEW: Function to clear/reset the detail view ---
    const clearSubmissionDetailView = () => {
        if (submissionDetailContentInline) {
            // Find elements by data-field attribute
            const fullNameField = submissionDetailContentInline.querySelector('[data-field="fullName"]');
            const otherFields = submissionDetailContentInline.querySelectorAll('[data-field]:not([data-field="fullName"])');

            if (fullNameField) {
                fullNameField.value = '--- Select a submission ---'; // Set value for input/textarea
            }
            otherFields.forEach(field => {
                field.value = '---'; // Set value for input/textarea
            });
        }
        if (submissionResultUpdate) {
            submissionResultUpdate.value = 'Pending'; // Reset dropdown
            submissionResultUpdate.disabled = true; // Disable dropdown
        }
        if (saveSubmissionResultBtn) {
            saveSubmissionResultBtn.disabled = true; // Disable save button
        }
        currentSelectedSubmissionId = null; // Clear selection ID
        // De-highlight selected row (optional)
        if (submissionsTableBody) {
            submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row'));
        }
    };

    // --- MODIFIED: Clear detail view when filters change ---
    const handleSubmissionFilterChange = async () => {
        clearSubmissionDetailView(); // Clear details first
        const submissions = await fetchSubmissions();
        renderSubmissionsTable(submissions);
    };

    // --- MODIFIED: Populate the always-visible view ---
    const handleSelectSubmission = async (event) => {
        const button = event.target;
        const submissionId = button.dataset.id;
        if (!submissionId) return;

        // Highlight selected row (optional)
        if (submissionsTableBody) {
            submissionsTableBody.querySelectorAll('tr.selected-row').forEach(row => row.classList.remove('selected-row'));
            button.closest('tr')?.classList.add('selected-row');
        }

        currentSelectedSubmissionId = submissionId;

        console.log("Fetching details for submission:", submissionId);
        try {
            const response = await fetch(`/admin/submissions?id=${submissionId}`);
            if (!response.ok) throw new Error(`Failed to fetch submission details: ${response.statusText}`);
            const submissions = await response.json();
            if (!submissions || submissions.length === 0) throw new Error('Submission details not found.');
            const details = submissions[0];

            // Populate the inline view using input/textarea values
            if (submissionDetailContentInline) {
                // Helper function to set value safely
                const setFieldValue = (fieldName, value) => {
                    const field = submissionDetailContentInline.querySelector(`[data-field="${fieldName}"]`);
                    if (field) {
                        field.value = value || 'N/A'; // Set value, fallback to 'N/A'
                    } else {
                        console.warn(`Field with data-field="${fieldName}" not found.`);
                    }
                };

                // Populate fields using data-field attributes
                setFieldValue('fullName', `${details.lastName}, ${details.firstName}${details.middleInitial ? ' ' + details.middleInitial + '.' : ''}${details.suffix ? ' ' + details.suffix : ''}`);
                setFieldValue('studentNumber', details.studentNumber);
                setFieldValue('dlsudEmail', details.dlsudEmail);
                setFieldValue('college', details.college);
                setFieldValue('program', details.program);
                setFieldValue('collegeYearSection', details.collegeYear && details.section ? `${details.collegeYear} / ${details.section}` : 'N/A');
                setFieldValue('facebookUrl', details.facebookUrl);
                setFieldValue('affiliatedOrgsList', details.affiliatedOrgsList?.notApplicable ? 'N/A' : details.affiliatedOrgsList?.listInput);
                setFieldValue('preferredDepartment', details.preferredDepartment);
                setFieldValue('preferredSchedule', details.preferredSchedule ? `${details.preferredSchedule.date} (${details.preferredSchedule.time})` : 'N/A');
                setFieldValue('schoolYear', details.schoolYear);
                setFieldValue('staffApplicationReasons', details.staffApplicationReasons);
                setFieldValue('departmentApplicationReasons', details.departmentApplicationReasons);
                setFieldValue('greenFmContribution', details.greenFmContribution);

                // Set and enable the result dropdown and save button
                if (submissionResultUpdate) {
                    submissionResultUpdate.value = details.result;
                    submissionResultUpdate.disabled = false; // Enable
                }
                 if (saveSubmissionResultBtn) {
                    saveSubmissionResultBtn.disabled = false; // Enable
                }
            }

        } catch (error) {
            console.error("Error handling submission selection:", error);
            alert(`Error loading submission details: ${error.message}`);
            clearSubmissionDetailView(); // Clear view on error
        }
    };

    // --- MODIFIED: Clear view after saving ---
    const handleSaveSubmissionResult = async () => {
        if (!currentSelectedSubmissionId || !submissionResultUpdate) {
            alert("Please select a submission and a result.");
            return;
        }
        const newResult = submissionResultUpdate.value;

        // --- ADDED: Check if result is 'Pending' ---
        if (newResult === 'Pending') {
            alert("Please choose either 'Accepted' or 'Rejected' to save the status.");
            return; // Stop execution if 'Pending' is selected
        }
        // --- END ADDED CHECK ---

        console.log(`Saving result for ${currentSelectedSubmissionId}: ${newResult}`);

        showSpinner(); // <<< Show spinner

        try {
            const response = await fetch(`/admin/submissions/${currentSelectedSubmissionId}/result`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result: newResult })
            });

            const responseData = await response.json(); // Read response body once

            if (!response.ok) {
                throw new Error(responseData.message || `Failed to update status (${response.status})`);
            }

            alert(responseData.message || 'Submission status updated successfully!');

            // Refresh the table and clear the detail view
            await handleSubmissionFilterChange(); // This fetches and renders, also clears detail view

        } catch (error) {
            console.error('Error saving submission result:', error);
            alert(`Error: ${error.message}`);
        } finally {
            hideSpinner(); // <<< Hide spinner
        }
    };

    // --- Tab Switching Logic ---
    // --- MODIFIED: Clear detail view when switching tabs ---
    const handleTabSwitch = (event) => {
        const clickedTab = event.target;
        const targetTabId = clickedTab.dataset.tab;
        if (!targetTabId) return;

        // Clear submission details when switching tabs
        clearSubmissionDetailView();

        tabButtons.forEach(button => button.classList.toggle('active', button === clickedTab));
        tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === targetTabId));

        if (targetTabId === 'submissions-tab' && submissionsTableBody && submissionsTableBody.innerHTML.includes('Loading')) {
             handleSubmissionFilterChange();
        } else if (targetTabId === 'schedule-tab') {
            // handleWeekChange(); // Optionally refresh schedule
        }
    };

    // --- Event Listeners ---

    // Schedule Tab Listeners
    if (weekFilterDropdown) weekFilterDropdown.addEventListener('change', handleWeekChange);
    if (departmentFilter) departmentFilter.addEventListener('change', handleWeekChange);
    scheduleButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const btn = event.target;
            const detailsJson = btn.dataset.applicationDetails;
            const slotId = btn.dataset.slotId;

            if (detailsJson) {
                // Booked Slot - Show Modal with Details
                try {
                    const details = JSON.parse(detailsJson);
                    if (applicationDetailsView && scheduleModal) {
                        // Clear previous details
                        applicationDetailsView.innerHTML = ''; // Clear previous content

                        // Populate modal with details using input fields
                        applicationDetailsView.innerHTML = `
                            <h3>Applicant Details</h3>
                            <div style="margin-bottom: 8px;"><label>Name:</label> <input type="text" value="${details.lastName}, ${details.firstName}${details.middleInitial ? ' ' + details.middleInitial + '.' : ''}${details.suffix ? ' ' + details.suffix : ''}" readonly style="width: 90%; padding: 4px; border: 1px solid #ddd; background-color: #eee;"></div>
                            <div style="margin-bottom: 8px;"><label>Student Number:</label> <input type="text" value="${details.studentNumber || 'N/A'}" readonly style="width: 90%; padding: 4px; border: 1px solid #ddd; background-color: #eee;"></div>
                            <div style="margin-bottom: 8px;"><label>Section:</label> <input type="text" value="${details.section || 'N/A'}" readonly style="width: 90%; padding: 4px; border: 1px solid #ddd; background-color: #eee;"></div>
                            <div style="margin-bottom: 8px;"><label>DLSU-D Email:</label> <input type="email" value="${details.dlsudEmail || 'N/A'}" readonly style="width: 90%; padding: 4px; border: 1px solid #ddd; background-color: #eee;"></div>
                            <div style="margin-bottom: 8px;"><label>Preferred Department:</label> <input type="text" value="${details.preferredDepartment || 'N/A'}" readonly style="width: 90%; padding: 4px; border: 1px solid #ddd; background-color: #eee;"></div>
                            <div style="margin-bottom: 8px;"><label>Booked Schedule:</label> <input type="text" value="${details.preferredSchedule || 'N/A'}" readonly style="width: 90%; padding: 4px; border: 1px solid #ddd; background-color: #eee;"></div>
                        `;
                        applicationDetailsView.style.display = 'block';
                        scheduleModal.style.display = 'block';
                    }
                } catch (e) {
                    console.error("Error parsing application details JSON:", e);
                    alert("Could not load applicant details.");
                }
            } else if (slotId) {
                // Marked Available Slot - Confirm Deletion
                if (confirm('This slot is marked as available. Do you want to make it unavailable again?')) {
                    await deleteAvailableSlot(slotId);
                }
            } else {
                // Implicitly Available Slot - Confirm Marking Available
                const day = btn.getAttribute('data-day');
                const time = btn.getAttribute('data-time');
                const selectedWeekStartDate = weekFilterDropdown.value;
                const currentDept = departmentFilter.value;
                const year = currentAssessmentPeriod ? currentAssessmentPeriod.year.toString() : new Date().getFullYear().toString();

                if (!selectedWeekStartDate) {
                    alert("Please select a week first.");
                    return;
                }

                let buttonDate;
                let buttonDateString = '';
                try {
                    const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day);
                    buttonDate = parseDateStringToLocalMidnight(selectedWeekStartDate);
                    const weekStartDayIndex = buttonDate.getDay();
                    let daysToAdd = dayIndex - weekStartDayIndex;
                    buttonDate.setDate(buttonDate.getDate() + daysToAdd);
                    const y = buttonDate.getFullYear();
                    const m = (buttonDate.getMonth() + 1).toString().padStart(2, '0');
                    const d = buttonDate.getDate().toString().padStart(2, '0');
                    buttonDateString = `${y}-${m}-${d}`;
                } catch (e) {
                    console.error("Error calculating date for marking available:", e);
                    alert("Could not determine the date for this slot.");
                    return;
                }

                if (confirm(`Mark ${day}, ${time} (${buttonDateString}) as available for assessment in ${currentDept}?`)) {
                    await makeSlotAvailableForAssessment(buttonDateString, time, currentDept, year);
                }
            }
        });
    });
    if (scheduleModalCloseButton) scheduleModalCloseButton.addEventListener('click', () => { if (scheduleModal) scheduleModal.style.display = 'none'; if (applicationDetailsView) applicationDetailsView.style.display = 'none'; });

    // Period Settings Form Listener
    if (periodSettingsForm) {
        periodSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Period settings form submitted - SAVE LOGIC NEEDED");
            alert("Saving period settings - Backend logic required.");
            // Example: await savePeriods(); await initializeAdminPage(); // Refresh after save
        });
     }

    // Submission Tab Listeners
    if (submissionYearFilter) submissionYearFilter.addEventListener('change', handleSubmissionFilterChange);
    if (submissionStatusFilter) submissionStatusFilter.addEventListener('change', handleSubmissionFilterChange);
    if (submissionDepartmentFilter) submissionDepartmentFilter.addEventListener('change', handleSubmissionFilterChange);
    if (saveSubmissionResultBtn) saveSubmissionResultBtn.addEventListener('click', handleSaveSubmissionResult);

    // Tab Button Listeners
    tabButtons.forEach(button => button.addEventListener('click', handleTabSwitch));

    // Modal Close Logic (Only for schedule modal now)
    window.addEventListener('click', (event) => {
        if (event.target == scheduleModal) {
            if (scheduleModal) scheduleModal.style.display = 'none';
            if (applicationDetailsView) applicationDetailsView.style.display = 'none';
        }
    });

    // --- Initial Setup Function ---
    const initializeAdminPage = async () => {
        currentYear = new Date().getFullYear().toString();
        try {
            // Assign results and then log
            currentApplicationPeriod = await fetchApplicationPeriod('JoinGFM', currentYear);
            currentAssessmentPeriod = await fetchAssessmentPeriod(currentYear);

            // Log the values *after* assignment to see what was actually stored
            console.log(`Assigned application period for ${currentYear}:`, currentApplicationPeriod);
            console.log(`Assigned assessment period for ${currentYear}:`, currentAssessmentPeriod);

            const populated = populateWeekDropdown(); // Depends on currentAssessmentPeriod
            displayExistingApplicationPeriod(); // Depends on currentApplicationPeriod
            displayExistingAssessmentPeriod(); // Depends on currentAssessmentPeriod

            const submissionYears = await fetchDistinctSubmissionYears();
            populateSubmissionYearFilter(submissionYears);

            // Clear details view on initial load
            clearSubmissionDetailView();

            if (document.querySelector('#schedule-tab.active')) {
                if (populated && departmentFilter.value) {
                    console.log("Initial load: Schedule tab active. Calling handleWeekChange.");
                    await handleWeekChange();
                } else {
                    console.log("Initial load: Schedule tab active but not ready. Clearing grid.");
                    displaySchedules([]);
                }
            } else if (document.querySelector('#submissions-tab.active')) {
                 console.log("Initial load: Submissions tab active. Calling handleSubmissionFilterChange.");
                 if (submissionYearFilter.value) { // Check if year filter has a value
                    await handleSubmissionFilterChange(); // This will also clear details
                 } else {
                    console.log("Initial load: Submissions tab active but year filter not ready.");
                    if(submissionsTableBody) submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px;">Loading...</td></tr>`;
                 }
            }

        } catch (error) {
            console.error("Error during initial page setup:", error);
            clearSubmissionDetailView(); // Also clear on error
            // Ensure variables are null on error
            currentApplicationPeriod = null;
            currentAssessmentPeriod = null;
            if (weekFilterDropdown) {
                weekFilterDropdown.innerHTML = '<option value="" disabled selected>Error loading periods</option>';
                weekFilterDropdown.disabled = true;
            }
             displaySchedules([]); // Clear grid on error
             if(submissionsTableBody) submissionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 15px;">Error during page setup.</td></tr>`; // Show error in submissions table too
        }
    };

    // --- Initial Load ---
    initializeAdminPage(); // Run the setup

}); // End DOMContentLoaded

// --- ADD SPINNER FUNCTIONS (if not already present) ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}
// --- END SPINNER FUNCTIONS ---