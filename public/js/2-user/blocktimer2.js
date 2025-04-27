/*----------------------SCHED SELECTOR---------------------*/
document.addEventListener("DOMContentLoaded", function () {
    // <<< Initialize Socket.IO >>>
    const socket = io();

    socket.on('connect', () => {
        console.log('User Step 2 Socket Connected:', socket.id);
    });

    socket.on('disconnect', () => {
        console.log('User Step 2 Socket Disconnected');
    });

    // <<< Get DOM Elements >>>
    const scheduleBtn = document.querySelector(".see-schedule-btn");
    const modal = document.getElementById("scheduleModal");
    const closeBtn = modal.querySelector(".close-btn");
    const schoolYearDropdown = document.getElementById('schoolYear');
    const timeDropdown = document.getElementById('time');
    const radioButtons = document.querySelectorAll('input[name="preferred-days"]');
    const modalScheduleContainer = modal.querySelector('.schedule-container');
    const modalContentArea = modal.querySelector('.modal-content');

    let selectedButton = null; // For modal selection state

    // <<< Function to populate school year dropdown >>>
    function populateSchoolYearDropdown(schoolYears, currentValue) {
        console.log("Populating school year dropdown. Current value:", currentValue, "Data:", schoolYears);
        schoolYearDropdown.innerHTML = ""; // Clear existing options
        if (!Array.isArray(schoolYears) || schoolYears.length === 0) {
            schoolYearDropdown.innerHTML = '<option value="" disabled>No Configs</option>';
            schoolYearDropdown.disabled = true;
            return false; // Indicate population failed or was empty
        }
        schoolYearDropdown.disabled = false;
        let valueExists = false;
        schoolYears.forEach((year) => {
            if (!year || typeof year.startYear !== 'number' || typeof year.endYear !== 'number') {
                console.warn("Skipping invalid year object for dropdown:", year);
                return;
            }
            const option = document.createElement('option');
            const yearValue = `${year.startYear}-${year.endYear}`;
            option.value = yearValue;
            option.textContent = yearValue;
            schoolYearDropdown.appendChild(option);
            if (yearValue === currentValue) {
                valueExists = true;
            }
        });

        // Try to re-select the previous value, or determine default
        if (valueExists) {
            schoolYearDropdown.value = currentValue;
            console.log("Restored previous selection:", currentValue);
        } else {
            // Determine default (current or latest) if previous value is gone or not provided
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth() + 1;
            let currentSchoolYearValue = null;

            schoolYears.forEach((year) => {
                 if (
                    (currentMonth >= (year.startMonth || 8) && currentYear === year.startYear) ||
                    (currentMonth <= (year.endMonth || 5) && currentYear === year.endYear)
                ) {
                    currentSchoolYearValue = `${year.startYear}-${year.endYear}`;
                }
            });

            if (currentSchoolYearValue) {
                schoolYearDropdown.value = currentSchoolYearValue;
                console.log("Set default to current school year:", currentSchoolYearValue);
            } else if (schoolYears.length > 0) {
                // Default to the latest year (assuming sorted list from backend)
                const latestYear = schoolYears[schoolYears.length - 1];
                 if (latestYear && typeof latestYear.startYear === 'number' && typeof latestYear.endYear === 'number') {
                    const latestValue = `${latestYear.startYear}-${latestYear.endYear}`;
                    schoolYearDropdown.value = latestValue;
                    console.log("Set default to latest school year:", latestValue);
                 } else {
                     console.warn("Could not determine latest year value.");
                     if (schoolYearDropdown.options.length > 0) {
                         schoolYearDropdown.selectedIndex = 0; // Select first available if default fails
                         console.log("Defaulting to first option:", schoolYearDropdown.value);
                     }
                 }
            } else {
                 console.warn("No school years available to set a default value.");
            }
        }
        return true; // Indicate population succeeded
    }

    // <<< Socket listener for school year updates >>>
    socket.on('schoolYearUpdate', (updatedSchoolYears) => {
        console.log('Received schoolYearUpdate (Step 2):', updatedSchoolYears);
        const currentValue = schoolYearDropdown.value; // Store current selection before clearing
        const populated = populateSchoolYearDropdown(updatedSchoolYears, currentValue); // Repopulate
        if (populated) {
             // Trigger change event *after* repopulating and setting the value
             console.log("Dispatching change event on schoolYearDropdown after socket update.");
             schoolYearDropdown.dispatchEvent(new Event('change'));
        } else {
            console.warn("School year dropdown population failed after socket update.");
            // Optionally clear the time dropdown if school years are now empty
            populateDropdown(null); // Clear time dropdown
        }
    });

    // <<< Initial fetch logic using the new function >>>
    fetch('/schoolYear/all')
        .then((res) => {
            if (!res.ok) {
                throw new Error(`Failed to fetch initial school years: ${res.status}`);
            }
            return res.json();
        })
        .then((schoolYears) => {
            console.log("Fetched initial school years:", schoolYears);
            // Use the new function for initial population, pass null for currentValue to determine default
            const populated = populateSchoolYearDropdown(schoolYears, null);
            if (populated) {
                // Trigger change event *after* initial population to load initial time slots
                console.log("Dispatching change event on schoolYearDropdown after initial fetch.");
                schoolYearDropdown.dispatchEvent(new Event('change'));
            } else {
                 console.warn("Initial school year dropdown population failed.");
                 populateDropdown(null); // Ensure time dropdown is cleared/disabled
            }
        })
        .catch((err) => {
            console.error('Error fetching initial school years:', err);
            schoolYearDropdown.innerHTML = '<option value="" disabled>Error loading school years</option>';
            populateDropdown(null); // Ensure time dropdown is cleared/disabled on error
        });


    // <<< Listen for schedule updates (for modal/time dropdown) >>>
    socket.on('scheduleUpdate', (data) => {
        console.log('Received scheduleUpdate (Step 2):', data);
        // If the modal is open, update the button state
        if (modal.style.display === "block") {
            updateScheduleButtonInModal(data);
        }
        // Also update the main page time dropdown if necessary
        const selectedDayRadio = document.querySelector('input[name="preferred-days"]:checked');
        // Check if the update affects the currently selected school year AND day
        if (selectedDayRadio && selectedDayRadio.value === data.day && schoolYearDropdown.value === data.schoolYear) {
             console.log(`Schedule update matches current day (${data.day}) and year (${data.schoolYear}). Repopulating time dropdown.`);
             populateDropdown(selectedDayRadio.value); // Repopulate time dropdown for current day/year
        }
    });


    // --- Function to populate TIME dropdown ---
    async function populateDropdown(day) { // Renamed for clarity (populates TIME dropdown)
        console.log(`Populating time dropdown for day: ${day}`);
        timeDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>'; // Loading state
        timeDropdown.disabled = true;

        const schoolYear = schoolYearDropdown.value; // Get current value from school year dropdown

        if (!schoolYear) {
             timeDropdown.innerHTML = '<option value="" disabled selected>Select school year</option>';
             console.log("Time dropdown: No school year selected.");
             return;
        }
        if (!day) {
            timeDropdown.innerHTML = '<option value="" disabled selected>Select a day first</option>';
            console.log("Time dropdown: No day selected.");
            return;
        }

        try {
            // Fetch current schedules and pending for the selected day/year
            const scheduleResponse = await fetch(`/schedule?schoolYear=${schoolYear}&day=${day}`);
            const submissionResponse = await fetch(`/submissions?schoolYear=${schoolYear}&result=Pending&day=${day}`);

            if (!scheduleResponse.ok) console.warn(`Failed to fetch schedules for time population: ${scheduleResponse.status}`);
            if (!submissionResponse.ok) console.warn(`Failed to fetch pending submissions for time population: ${submissionResponse.status}`);

            const schedules = scheduleResponse.ok ? await scheduleResponse.json() : [];
            const submissions = submissionResponse.ok ? await submissionResponse.json() : [];

            const occupiedTimes = new Set();
            schedules.forEach(s => { if(s.day === day) occupiedTimes.add(s.time) });
            submissions.forEach(s => {
                 if(s.preferredSchedule?.day === day) occupiedTimes.add(s.preferredSchedule.time)
            });
            console.log(`Occupied times for ${day} ${schoolYear}:`, Array.from(occupiedTimes));

            // Define all possible time slots for the selected day
            const allDaySlots = [
                "9:10-9:55", "10:00-10:55", "11:00-11:55",
                "1:00-1:55", "2:00-2:55", "3:00-3:55", "4:00-4:50"
            ];
            if (day === 'Friday') {
                allDaySlots.splice(3, 0, "12:01-12:55"); // Add Friday noon slot
            }

            timeDropdown.innerHTML = '<option value="" disabled selected>Select a time slot</option>';
            let availableCount = 0;
            allDaySlots.forEach(timeSlot => {
                if (!occupiedTimes.has(timeSlot)) {
                    const option = document.createElement('option');
                    option.value = timeSlot;
                    option.textContent = timeSlot;
                    timeDropdown.appendChild(option);
                    availableCount++;
                }
            });

            if (availableCount === 0) {
                 timeDropdown.innerHTML = '<option value="" disabled selected>No times available</option>';
                 console.log(`Time dropdown: No times available for ${day} ${schoolYear}.`);
            } else {
                 timeDropdown.disabled = false;
                 console.log(`Time dropdown: ${availableCount} times available for ${day} ${schoolYear}.`);
            }

        } catch (error) {
            console.error("Error populating time dropdown:", error);
            timeDropdown.innerHTML = '<option value="" disabled selected>Error loading times</option>';
        }
    }

    // --- Event Listeners ---

    // School Year Dropdown Change
    schoolYearDropdown.addEventListener('change', async () => {
        console.log("School year dropdown changed manually or via dispatchEvent. Value:", schoolYearDropdown.value);
        const currentSelectedDay = document.querySelector('input[name="preferred-days"]:checked')?.value;
        await populateDropdown(currentSelectedDay); // Repopulate TIME dropdown
    });

    // Radio Button Change
    radioButtons.forEach(radio => {
        radio.addEventListener('change', async function () { // Make async
            selectedDay = this.value;
            console.log("Day radio changed to:", selectedDay);
            await populateDropdown(selectedDay); // Populate TIME dropdown
            timeDropdown.value = ""; // Clear time selection when day changes
        });
    });

    // Time Dropdown Change (Optional: Add logic if needed)
    timeDropdown.addEventListener('change', function () {
        console.log("Time dropdown changed to:", this.value);
    });

    // --- Modal Logic (fetchAndDisplaySchedules, updateScheduleButtonInModal, event listeners) ---
    // (Keep your existing modal functions and listeners here - they seem okay)
    // Function to fetch and display schedules within the modal
    async function fetchAndDisplaySchedules() {
        // --- MODIFY LOADING STATE ---
        let loadingElement = modalContentArea.querySelector('#modal-loading-temp');
        let errorElement = modalContentArea.querySelector('#modal-error-temp');
        if (errorElement) errorElement.remove(); // Remove previous error
        if (!loadingElement) {
            loadingElement = document.createElement('p');
            loadingElement.id = 'modal-loading-temp';
            loadingElement.textContent = 'Loading schedule...';
            if(closeBtn) closeBtn.insertAdjacentElement('afterend', loadingElement);
            else modalContentArea.prepend(loadingElement);
        }
        loadingElement.style.display = 'block';
        if (modalScheduleContainer) modalScheduleContainer.style.display = 'none'; // Hide table container
        // --- END MODIFY LOADING STATE ---

        try {
            const selectedSchoolYear = schoolYearDropdown.value; // Use the main dropdown value
            if (!selectedSchoolYear) {
                throw new Error("No school year selected");
            }
            console.log(`MODAL: Fetching schedules for year: ${selectedSchoolYear}`);

            const scheduleResponse = await fetch(`/schedule?schoolYear=${selectedSchoolYear}`);
            if (!scheduleResponse.ok) throw new Error(`Failed to fetch schedules (${scheduleResponse.status})`);
            const schedules = await scheduleResponse.json();

            const submissionResponse = await fetch(`/submissions?schoolYear=${selectedSchoolYear}&result=Pending`);
            if (!submissionResponse.ok) throw new Error(`Failed to fetch submissions (${submissionResponse.status})`);
            const submissions = await submissionResponse.json();

            console.log('MODAL Schedules:', schedules);
            console.log('MODAL Pending Submissions:', submissions);

            const scheduleButtons = modal.querySelectorAll(".availablebtn");
            scheduleButtons.forEach((button) => {
                button.textContent = "";
                button.classList.remove("schedulebtn", "pendingbtn", "confirmationbtn", "disabled");
                button.disabled = false;
            });

            schedules.forEach((schedule) => {
                updateScheduleButtonInModal({
                    action: 'update', // Use 'update' to represent existing schedule
                    day: schedule.day,
                    time: schedule.time,
                    schoolYear: schedule.schoolYear,
                    showTitle: schedule.showDetails?.title, // Use optional chaining
                    status: schedule.confirmationStatus
                });
            });

            submissions.forEach((submission) => {
                // Check if the slot is already taken by a confirmed schedule
                const button = modal.querySelector(`.availablebtn[data-day="${submission.preferredSchedule?.day}"][data-time="${submission.preferredSchedule?.time}"]`);
                if (button && !button.classList.contains('schedulebtn') && !button.classList.contains('confirmationbtn')) {
                    updateScheduleButtonInModal({
                        action: 'pending',
                        day: submission.preferredSchedule?.day,
                        time: submission.preferredSchedule?.time,
                        schoolYear: submission.schoolYear,
                        showTitle: submission.showDetails?.title
                    });
                } else {
                    console.log(`MODAL: Slot ${submission.preferredSchedule?.day} ${submission.preferredSchedule?.time} already booked/confirmed, not showing pending.`);
                }
            });

            // Highlight the currently selected time slot from the main form, if any
            const selectedDayRadio = document.querySelector('input[name="preferred-days"]:checked');
            const selectedTimeDropdownValue = timeDropdown.value;
            if (selectedDayRadio && selectedTimeDropdownValue) {
                const day = selectedDayRadio.value;
                const time = selectedTimeDropdownValue;
                const buttonInModal = modal.querySelector(`.availablebtn[data-day="${day}"][data-time="${time}"]`);
                if (buttonInModal && !buttonInModal.disabled) { // Check if it's not already booked/pending
                    buttonInModal.textContent = "Selected";
                    buttonInModal.classList.add("disabled"); // Visually indicate selection
                    buttonInModal.disabled = true; // Prevent clicking the same slot again from modal
                    selectedButton = buttonInModal; // Track the selected button in modal
                }
            }

            if (loadingElement) loadingElement.remove();
            if (modalScheduleContainer) modalScheduleContainer.style.display = 'block';

        } catch (error) {
            console.error("MODAL: Error fetching schedules or submissions:", error);
            if (loadingElement) loadingElement.remove();
            if (modalScheduleContainer) modalScheduleContainer.style.display = 'none';

            errorElement = modalContentArea.querySelector('#modal-error-temp');
            if (!errorElement) {
                 errorElement = document.createElement('p');
                 errorElement.id = 'modal-error-temp';
                 errorElement.style.color = 'red';
                 if(closeBtn) closeBtn.insertAdjacentElement('afterend', errorElement);
                 else modalContentArea.prepend(errorElement);
            }
            errorElement.textContent = `Error loading schedule: ${error.message}`;
            errorElement.style.display = 'block';
        }
    }

    // Function to update a single button within the modal
    function updateScheduleButtonInModal(data) {
         const { action, day, time, schoolYear, showTitle, status } = data;
         const currentModalYear = schoolYearDropdown.value; // Check against main dropdown

         if (schoolYear !== currentModalYear) return; // Ignore if not for current year

         const button = modal.querySelector(`.availablebtn[data-day="${day}"][data-time="${time}"]`);
         if (!button) return;

         console.log(`Updating MODAL button ${day} ${time} - Action: ${action}, Status: ${status}`);

         // Reset state carefully
         button.classList.remove("schedulebtn", "pendingbtn", "confirmationbtn", "disabled");
         button.textContent = "";
         button.disabled = false; // Assume available initially

         if (action === 'delete') {
             // Button becomes available
         } else if (action === 'pending') {
             button.textContent = `Pending: ${showTitle || 'N/A'}`;
             button.classList.add("pendingbtn");
             button.disabled = true; // Pending slots are not selectable
         } else if (action === 'create' || action === 'update' || action === 'update_status') {
             if (status === 'Accepted') {
                 button.textContent = showTitle || 'Scheduled';
                 button.classList.add("schedulebtn");
                 button.disabled = true; // Booked slots are not selectable
             } else if (status === 'Pending Confirmation') {
                 button.textContent = `Confirm: ${showTitle || 'N/A'}`;
                 button.classList.add("confirmationbtn");
                 button.disabled = true; // Pending confirmation slots are not selectable
             }
             // If status is something else (e.g., Rejected, or cleared), it remains available
         }

         // If this update disables the currently selected button in the modal, reset modal selection state
         if (button === selectedButton && button.disabled) {
              console.log("Modal selection was disabled by update, resetting.");
              selectedButton = null;
              // Also reset the main form selection if it matched the disabled slot
              const dayRadio = document.querySelector(`input[name="preferred-days"][value="${day}"]`);
              if (dayRadio && dayRadio.checked && timeDropdown.value === time) {
                  console.log("Resetting main form selection due to modal update.");
                  dayRadio.checked = false;
                  timeDropdown.value = "";
                  populateDropdown(null); // Clear time dropdown
              }
         }
    }

    // Show modal button listener
    scheduleBtn.addEventListener("click", async () => {
        selectedButton = null; // Reset modal selection state when opening
        await fetchAndDisplaySchedules();
        modal.style.display = "block";
    });

    // Modal close button listener
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    // Modal outside click listener
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Modal button click delegation
    if (modalContentArea) {
        modalContentArea.addEventListener("click", async function (event) {
            if (event.target.matches('.availablebtn')) {
                const button = event.target;
                if (button.disabled) {
                    console.log("Clicked disabled modal button.");
                    return; // Ignore clicks on disabled buttons
                }

                const day = button.getAttribute('data-day');
                const time = button.getAttribute('data-time');
                console.log(`Modal button clicked: Day=${day}, Time=${time}`);

                // Update the main form's radio button
                const dayRadio = document.querySelector(`input[name="preferred-days"][value="${day}"]`);
                if (dayRadio) {
                    dayRadio.checked = true;
                }

                // Await population of the time dropdown for the selected day
                if (dayRadio) {
                    await populateDropdown(day); // Wait for dropdown to be populated
                }

                // Set the time dropdown value, ensuring the option exists
                if (timeDropdown) {
                    const optionExists = Array.from(timeDropdown.options).some(opt => opt.value === time);
                    if (optionExists) {
                        timeDropdown.value = time;
                        console.log(`Set main form time to: ${time}`);
                    } else {
                        console.warn(`Time option ${time} not found in dropdown for day ${day} after population.`);
                        if(dayRadio) dayRadio.checked = false; // Uncheck radio if time failed
                        timeDropdown.value = "";
                    }
                }

                // Visually update the button IN THE MODAL
                if (selectedButton) { // If another button was previously selected in the modal
                    selectedButton.textContent = ""; // Clear previous selection text
                    selectedButton.classList.remove("disabled");
                    selectedButton.disabled = false; // Re-enable previous selection
                }
                selectedButton = button; // Track the new selection
                selectedButton.textContent = "Selected";
                selectedButton.classList.add("disabled");
                selectedButton.disabled = true; // Disable the newly selected button in the modal

                modal.style.display = "none"; // Close the modal
            }
        });
    }

    // --- Form Submission Logic ---
    const form2 = document.getElementById('blocktimerForm2');
    form2.addEventListener('submit', async (event) => {
        event.preventDefault();

        const selectedDayRadio = document.querySelector('input[name="preferred-days"]:checked');
        const selectedTime = timeDropdown.value;
        const selectedSchoolYear = schoolYearDropdown.value;

        // Enhanced validation for time dropdown value
        if (!selectedDayRadio || !selectedTime || timeDropdown.selectedIndex <= 0 || timeDropdown.options[timeDropdown.selectedIndex]?.disabled) {
             alert('Please select a valid preferred day and an available time slot.');
             return;
        }
         if (!selectedSchoolYear || schoolYearDropdown.selectedIndex < 0 || schoolYearDropdown.options[schoolYearDropdown.selectedIndex]?.disabled) {
             alert('Please select a valid school year.');
             return;
         }

        const data = {
            preferredSchedule: {
                day: selectedDayRadio.value,
                time: selectedTime,
            },
            schoolYear: selectedSchoolYear
        };

        console.log("Submitting Step 2 data:", data);

        const submitButton = form2.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        try {
            const response = await fetch('/JoinBlocktimer-Step2', { // Ensure this route matches your backend
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();

            if (response.ok && result.success) {
                alert('Successfully submitted your application!');
                window.location.href = result.redirectUrl || '/JoinBlocktimer-Step3'; // Ensure Step 3 route is correct
            } else {
                alert(`Error: ${result.error || 'Something went wrong during submission.'}`);
                if (result.redirect) {
                    window.location.href = result.redirect;
                } else {
                     submitButton.disabled = false;
                     submitButton.textContent = 'NEXT';
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('There was a network problem or server error during submission. Please try again.');
            submitButton.disabled = false;
            submitButton.textContent = 'NEXT';
        }
    });

}); // End DOMContentLoaded
