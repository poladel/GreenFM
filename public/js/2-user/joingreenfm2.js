document.addEventListener('DOMContentLoaded', async () => {
    console.log('Preferred Department:', preferredDepartment);
    console.log('Current Year:', currentYear);

    const dayDropdown = document.getElementById('day');
    const timeDropdown = document.getElementById('time');
    timeDropdown.disabled = true; // Disable time dropdown initially

    // Define all possible times
    const allTimes = [
        "7:00-8:00", "8:00-9:00", "9:00-10:00", "10:00-11:00",
        "11:00-12:00", "12:00-1:00", "1:00-2:00", "2:00-3:00",
        "3:00-4:00", "4:00-5:00", "5:00-6:00", "6:00-7:00",
    ];

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // --- 1. Fetch Schedules ---
    const fetchSchedules = async (year, department) => {
        try {
            // Use the correct endpoint used by admin or create a user-specific one if needed
            const response = await fetch(`/admin/schedules?year=${year}&department=${encodeURIComponent(department)}`);
            if (!response.ok) throw new Error('Failed to fetch schedules');
            const data = await response.json();
            console.log('Fetched schedules:', data);
            return data;
        } catch (error) {
            console.error('Error fetching schedules:', error);
            return []; // Return empty array on error
        }
    };

    // --- 2. Fetch Application Period ---
    const fetchApplicationPeriod = async (key) => {
        try {
            const response = await fetch(`/admin/application-period?key=${key}`); // Use the same endpoint as admin
            if (!response.ok) {
                if (response.status === 404) return null; // Not found is a valid case
                throw new Error('Failed to fetch application period data');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching application period data:', error);
            return null;
        }
    };

    // --- Helper Function to get Dates within Period ---
    // Ensure this function filters by targetYear
    const getDatesInPeriod = (startDate, endDate, targetYear) => {
        const dates = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        console.log(`Filtering dates between ${startDate} and ${endDate} for year ${targetYear}`); // Log input

        // Adjust to ensure the loop includes the endDate if it's a weekday
        lastDate.setHours(23, 59, 59, 999);

        while (currentDate <= lastDate) {
            // *** THIS IS THE CRITICAL CHECK ***
            if (currentDate.getFullYear() === targetYear) {
                const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
                if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
                    dates.push(new Date(currentDate)); // Add a copy
                }
            }
            // Optimization: If current date year exceeds target year, stop looping
            if (currentDate.getFullYear() > targetYear) {
                break;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        console.log(`Filtered dates for year ${targetYear}:`, dates); // Log output
        return dates;
    };

    // --- Populate Day Dropdown ---
    const populateDayDropdown = (dates) => {
        dayDropdown.innerHTML = '<option value="" disabled selected>Select Date</option>'; // Clear and add default
        if (dates.length === 0) {
             // This message should show if no dates match the target year
            dayDropdown.innerHTML = `<option value="" disabled selected>Applications still closed.</option>`;
            dayDropdown.disabled = true;
            return; // Exit if no dates
        }
        dayDropdown.disabled = false; // Enable if dates are found
        dates.forEach(date => {
            const option = document.createElement('option');
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const dayOfWeek = daysOfWeek[date.getDay()];
            option.value = dateString;
            option.textContent = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} - ${dayOfWeek}`;
            option.dataset.dayOfWeek = dayOfWeek; // Store day name for easier filtering
            dayDropdown.appendChild(option);
        });
    };

    // --- Populate Time Dropdown ---
    const populateTimeDropdown = (selectedDayOfWeek, departmentSchedules) => {
        timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>'; // Clear and add default
        timeDropdown.disabled = false; // Enable the dropdown

        // Find unavailable times for the selected day
        const unavailableTimes = new Set(
            departmentSchedules
                .filter(schedule => schedule.day === selectedDayOfWeek)
                .map(schedule => schedule.time)
        );
        console.log(`Unavailable times for ${selectedDayOfWeek}:`, unavailableTimes);


        allTimes.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            if (unavailableTimes.has(time)) {
                option.textContent = `${time} (Unavailable)`;
                option.disabled = true;
            } else {
                option.textContent = time;
                option.disabled = false;
            }
            timeDropdown.appendChild(option);
        });
    };

    // --- Main Logic ---
    try {
        // Fetch necessary data concurrently
        const [schedules, applicationPeriod] = await Promise.all([
            fetchSchedules(currentYear, preferredDepartment), // Uses currentYear (2026)
            fetchApplicationPeriod('JoinGFM') // Fetches actual period (2025)
        ]);

        if (!applicationPeriod) {
            console.warn('No application period found or failed to fetch.');
            dayDropdown.innerHTML = '<option value="" disabled selected>Application period not set</option>';
            dayDropdown.disabled = true;
            timeDropdown.disabled = true;
            return; // Stop execution if no application period
        }

        // --- 3. Display Dates of Application Period for the target year ---
        // *** ENSURE currentYear (2026) IS PASSED HERE ***
        const applicationDates = getDatesInPeriod(applicationPeriod.startDate, applicationPeriod.endDate, currentYear);

        // Populate dropdown (populateDayDropdown now handles the empty case)
        populateDayDropdown(applicationDates);

        // Disable time dropdown if day dropdown is disabled (e.g., no dates found)
        if (dayDropdown.disabled) {
            timeDropdown.disabled = true;
        }

        // --- 4. Handle Day Selection Change ---
        dayDropdown.addEventListener('change', () => {
             const selectedOption = dayDropdown.options[dayDropdown.selectedIndex];
             const selectedDayOfWeek = selectedOption.dataset.dayOfWeek;

             if (selectedDayOfWeek) {
                 // Pass the fetched schedules (which should be empty for 2026)
                 populateTimeDropdown(selectedDayOfWeek, schedules);
             } else {
                 timeDropdown.innerHTML = '<option value="" disabled selected>Select Time</option>';
                 timeDropdown.disabled = true; // Disable if default date option is selected
             }
        });

    } catch (error) {
        console.error('Error initializing schedule selection:', error);
        // Optionally display an error message to the user
        dayDropdown.innerHTML = '<option value="" disabled selected>Error loading schedule</option>';
        dayDropdown.disabled = true;
        timeDropdown.disabled = true;
    }

    const form2 = document.getElementById('joingreenfmForm2');

    form2.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        // Gather form data
        const formData = new FormData(form2);
        const data = Object.fromEntries(formData.entries());

        try {
            // Send POST request to the backend
            const response = await fetch('/JoinGFM-Step2', { // Replace with your actual endpoint
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
                // Redirect or perform any other action as needed
                window.location.href = '/JoinGFM-Step3'; // Replace with your success page
            } else if (result.redirect) {
                alert(`Error: ${result.error}`);
                // Redirect to Step 1 if specified in response
                window.location.href = result.redirect;
            } else {
                // Handle errors
                alert(`Error: ${result.error || 'Something went wrong'}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('There was a problem with the submission. Please try again.');
        }
    });
});
