/*----------------------SCHED SELECTOR---------------------*/
document.addEventListener("DOMContentLoaded", function () {
    const scheduleBtn = document.querySelector(".see-schedule-btn");
    const modal = document.getElementById("scheduleModal");
    const closeBtn = document.querySelector(".close-btn");
    const currentYear = new Date().getFullYear();

    let selectedButton = null; // Keep track of the currently selected button

    // Function to fetch and display schedules
    async function fetchAndDisplaySchedules() {
        try {
            // Fetch schedules for the current year
            const scheduleResponse = await fetch(`/schedule?schoolYear=${currentYear}`);
            if (!scheduleResponse.ok) throw new Error("Failed to fetch schedules");
            const schedules = await scheduleResponse.json();
    
            // Fetch "Pending" submissions for the current year
            const submissionResponse = await fetch(`/submissions?schoolYear=${currentYear}&result=Pending`);
            console.log('Submission Response:', submissionResponse);

            if (!submissionResponse.ok) throw new Error("Failed to fetch submissions");
            const submissions = await submissionResponse.json();
            console.log('Submissions Data:', submissions);
    
            // Reset all buttons to their default state
            const scheduleButtons = document.querySelectorAll(".availablebtn");
            scheduleButtons.forEach((button) => {
                if (button !== selectedButton) {
                    button.textContent = "Select Time Slot";
                    button.classList.remove("schedulebtn", "disabled");
                    button.disabled = false;
                }
            });
    
            // Populate buttons with schedule data
            schedules.forEach((schedule) => {
                const button = document.querySelector(
                    `.availablebtn[data-day="${schedule.day}"][data-time="${schedule.time}"]`
                );
                if (button) {
                    button.textContent = schedule.showDetails.title; // Set the title of the show
                    button.classList.add("schedulebtn"); // Add a class to indicate it's scheduled
                    button.disabled = true; // Disable the button
                }
            });
    
            // Handle "Pending" submissions (if needed)
            submissions.forEach((submission) => {
                const timeRange = submission.preferredSchedule?.time || null; // Get the full time range
            
                if (!timeRange) {
                    console.warn(`Missing or invalid time for submission:`, submission);
                    return; // Skip this submission if time is missing or invalid
                }
            
                const buttonQuery = `.availablebtn[data-day="${submission.preferredSchedule?.day}"][data-time="${timeRange}"]`;
                console.log('Button Query:', buttonQuery);
            
                const button = document.querySelector(buttonQuery);
            
                if (button) {
                    button.textContent = `Pending: ${submission.showDetails?.title || "No Title"}`;
                    button.classList.add("pendingbtn");
                    button.disabled = true;
                } else {
                    console.warn(`No button found for day="${submission.preferredSchedule?.day}" and time="${timeRange}"`);
                }
            });
    
            // Restore the "Selected" state for the previously selected button
            if (selectedButton) {
                selectedButton.textContent = "Selected";
                selectedButton.classList.add("disabled");
                selectedButton.disabled = true;
            }
        } catch (error) {
            console.error("Error fetching schedules or submissions:", error);
        }
    }

    // Show modal and fetch schedules when button is clicked
    scheduleBtn.addEventListener("click", async () => {
        await fetchAndDisplaySchedules(); // Fetch and display schedules
        modal.style.display = "block";
    });

    // Hide modal when close button is clicked
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Hide modal when clicking outside the modal content
    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Add event listeners to all "Select Time Slot" buttons
    document.querySelectorAll(".availablebtn").forEach((button) => {
        button.addEventListener("click", function () {
            // Update the selected button
            if (selectedButton) {
                selectedButton.textContent = "Select Time Slot";
                selectedButton.classList.remove("disabled");
                selectedButton.disabled = false;
            }

            selectedButton = this; // Set the new selected button
            selectedButton.textContent = "Selected";
            selectedButton.classList.add("disabled");
            selectedButton.disabled = true;

            // Close the modal (optional)
            modal.style.display = "none";
        });
    });
});

// Add event listeners to all "Select Time Slot" buttons
document.querySelectorAll('.schedule-table button').forEach(button => {
    button.addEventListener('click', function () {
        const day = this.getAttribute('data-day'); // Get the day from the button's data attribute
        const time = this.getAttribute('data-time'); // Get the time from the button's data attribute

        // Set the preferred day radio button
        const dayRadio = document.querySelector(`input[name="preferred-days"][value="${day}"]`);
        if (dayRadio) {
            dayRadio.checked = true;
        }

        // Set the preferred time dropdown
        const timeSelect = document.getElementById('time');
        if (timeSelect) {
            timeSelect.value = time;
        }

        // Disable only the clicked button
        toggleScheduleButton(this);

        // Close the modal (optional)
        const modal = document.getElementById('scheduleModal');
        if (modal) {
            modal.style.display = 'none';
        }
    });
});

// Function to disable only the last clicked button
function toggleScheduleButton(clickedButton) {
    // Enable all buttons first
    const scheduleButtons = document.querySelectorAll('.availablebtn');
    scheduleButtons.forEach(button => {
        button.disabled = false; // Enable all buttons
        button.classList.remove('disabled');
        button.textContent = 'Select Time Slot'; // Remove the disabled class
    });

    // Disable the clicked button
    clickedButton.disabled = true;
    clickedButton.classList.add('disabled'); // Add a disabled class for styling (optional)
    clickedButton.textContent = 'Selected'; // Change button text to "Selected"
}

// Close modal functionality
document.querySelector('.close-btn').addEventListener('click', function () {
    const modal = document.getElementById('scheduleModal');
    modal.style.display = 'none';
});

/*----------------------ON START---------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const availableButtons = document.querySelectorAll('.availablebtn');
    const scheduleButtons = document.querySelectorAll('.schedulebtn');
    availableButtons.forEach(button => {
        button.disabled = false; // Enable all buttons initially
        button.classList.remove('disabled'); // Remove the disabled class if it exists
        button.textContent = 'Select Time Slot';
    });
    scheduleButtons.forEach(button => {
        button.disabled = true; // Enable all buttons initially
    });

    const radioButtons = document.querySelectorAll('input[name="preferred-days"]');
    const timeDropdown = document.getElementById('time');
    const buttons = document.querySelectorAll('.schedule-table button.availablebtn');

    let selectedDay = null;

    // Add event listeners to all radio buttons
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            selectedDay = this.value; // Get the selected day (e.g., "Monday")
            populateDropdown(selectedDay);
        });
    });

    // Add event listener to the time dropdown
    timeDropdown.addEventListener('change', function () {
        const selectedTime = this.value; // Get the selected time slot
        if (selectedDay && selectedTime) {
            toggleButtonState(selectedDay, selectedTime);
        }
    });

    function populateDropdown(day) {
        // Clear existing options
        timeDropdown.innerHTML = '<option value="" disabled selected>Select a time slot</option>';

        // Find available buttons for the selected day
        buttons.forEach(button => {
            const buttonDay = button.getAttribute('data-day');
            const buttonTime = button.getAttribute('data-time');
            const isDisabled = button.disabled;

            // Add options to the dropdown if the button matches the selected day and is not disabled
            if (buttonDay === day && !isDisabled) {
                const option = document.createElement('option');
                option.value = buttonTime;
                option.textContent = buttonTime;
                timeDropdown.appendChild(option);
            }
        });
    }

    function toggleButtonState(day, time) {
        // Re-enable all buttons first
        const allButtons = document.querySelectorAll('.schedule-table button.availablebtn');
        allButtons.forEach(button => {
            button.disabled = false; // Enable all buttons
            button.textContent = 'Select Time Slot'; // Reset text to default
            button.classList.remove('disabled'); // Remove the disabled class
        });
    
        // Find the button in the table that matches the selected day and time
        const button = document.querySelector(`.schedule-table button.availablebtn[data-day="${day}"][data-time="${time}"]`);
        if (button) {
            // Disable the selected button
            button.disabled = true;
            button.textContent = 'Selected'; // Update text to "Selected"
            button.classList.add('disabled'); // Add a disabled class for styling
        }
    }
});

/*----------------------FORM 2 SUBMISSION---------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const form2 = document.getElementById('blocktimerForm2');
    const timeDropdown = document.getElementById('time');
    const radioButtons = document.querySelectorAll('input[name="preferred-days"]');
    const buttons = document.querySelectorAll('.schedule-table button.availablebtn');

    let selectedDay = null;
    let selectedTime = null;

    // Add event listeners to all "Select Time Slot" buttons
    buttons.forEach(button => {
        button.addEventListener('click', function () {
            selectedDay = this.getAttribute('data-day'); // Get the day from the button's data attribute
            selectedTime = this.getAttribute('data-time'); // Get the time from the button's data attribute

            // Set the preferred day radio button
            const dayRadio = document.querySelector(`input[name="preferred-days"][value="${selectedDay}"]`);
            if (dayRadio) {
                dayRadio.checked = true;
            }

            // Set the preferred time dropdown
            if (timeDropdown) {
                timeDropdown.value = selectedTime;
            }

            // Disable only the clicked button
            toggleScheduleButton(this);

            // Close the modal (optional)
            const modal = document.getElementById('scheduleModal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Add event listeners to all radio buttons
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            selectedDay = this.value; // Update the selected day when a radio button is clicked
        });
    });

    // Add event listener to the time dropdown
    timeDropdown.addEventListener('change', function () {
        selectedTime = this.value; // Update the selected time when the dropdown changes
    });

    // Handle form submission
    form2.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const formData = new FormData(form2); // Gather form data
        const data = Object.fromEntries(formData.entries()); // Convert to a plain object

        // Add the selected day and time to the form data
        data.preferredSchedule = {
            day: selectedDay,
            time: selectedTime,
        };

        try {
            // Send POST request to the backend
            const response = await fetch('/JoinBlocktimer-Step2', { // Replace with your actual endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Handle success
                alert('Successfully submitted your application!');
                window.location.href = '/JoinBlocktimer-Step3'; // Redirect to the next step
            } else if (result.redirect) {
                alert(`Error: ${result.error}`);
                window.location.href = result.redirect; // Redirect to Step 1 if specified in response
            } else {
                // Handle errors
                alert(`Error: ${result.error || 'Something went wrong'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('There was a problem with the submission. Please try again.');
        }
    });

    function toggleScheduleButton(clickedButton) {
        // Enable all buttons first
        const scheduleButtons = document.querySelectorAll('.availablebtn');
        scheduleButtons.forEach(button => {
            button.disabled = false; // Enable all buttons
            button.classList.remove('disabled');
            button.textContent = 'Select Time Slot'; // Reset text to default
        });

        // Disable the clicked button
        clickedButton.disabled = true;
        clickedButton.classList.add('disabled'); // Add a disabled class for styling
        clickedButton.textContent = 'Selected'; // Change button text to "Selected"
    }
});
