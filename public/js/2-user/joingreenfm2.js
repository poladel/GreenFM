document.addEventListener('DOMContentLoaded', async () => {
    const preferredDepartment = applicationData.preferredDepartment;
    const currentYear = new Date().getFullYear();

    console.log('Preferred Department:', preferredDepartment);
    console.log('Current Year:', currentYear);

    const dayDropdown = document.getElementById('day');
    const timeDropdown = document.getElementById('time');

    // Define all possible times
    const allTimes = [
        "7:00-8:00",
        "8:00-9:00",
        "9:00-10:00",
        "10:00-11:00",
        "11:00-12:00",
        "12:00-1:00",
        "1:00-2:00",
        "2:00-3:00",
        "3:00-4:00",
        "4:00-5:00",
        "5:00-6:00",
        "6:00-7:00",
    ];

    // Function to calculate all school days (Monday to Friday) for the rest of the month
    const getRemainingSchoolDays = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const remainingDays = [];

        // Start from today and iterate until the end of the month
        for (let date = new Date(today); date.getMonth() === currentMonth; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Only include Monday to Friday
                remainingDays.push(new Date(date)); // Add a copy of the date
            }
        }

        return remainingDays;
    };

    // Update the day dropdown with remaining school days
    const updateDayDropdown = () => {
        const remainingSchoolDays = getRemainingSchoolDays();

        dayDropdown.innerHTML = '<option value="">Select a day</option>'; // Reset dropdown

        remainingSchoolDays.forEach(date => {
            const option = document.createElement('option');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
            option.value = dayName; // Use the day name as the value
            option.textContent = `${dayName} (${formattedDate})`;
            dayDropdown.appendChild(option);
        });
    };

    // Call the function to update the dropdown
    updateDayDropdown();

    // Fetch admin schedule for the preferred department and year
    const fetchAdminSchedule = async (department, year) => {
        try {
            console.log(`Fetching schedules for department: ${department}, year: ${year}`);
            const response = await fetch(`/admin/schedules?department=${encodeURIComponent(department)}&year=${year}`);
            if (!response.ok) throw new Error('Failed to fetch admin schedule');
            return await response.json();
        } catch (error) {
            console.error('Error fetching admin schedule:', error);
            return [];
        }
    };

    const adminSchedule = await fetchAdminSchedule(preferredDepartment, currentYear);
    console.log('Fetched admin schedule:', adminSchedule);

    // Populate available times based on the selected day
    dayDropdown.addEventListener('change', () => {
        const selectedDay = dayDropdown.value;
        console.log('Selected day:', selectedDay);

        timeDropdown.innerHTML = '<option value="">Select a time</option>'; // Reset time dropdown

        if (selectedDay) {
            // Get unavailable times for the selected day
            const unavailableTimes = adminSchedule
                .filter(schedule => schedule.day === selectedDay)
                .map(schedule => schedule.time);

            console.log('Unavailable times:', unavailableTimes);

            // Get available times by excluding unavailable times
            const availableTimes = allTimes.filter(time => !unavailableTimes.includes(time));

            console.log('Available times:', availableTimes);

            // Populate the dropdown with available times
            if (availableTimes.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No available times';
                timeDropdown.appendChild(option);
            } else {
                availableTimes.forEach(time => {
                    const option = document.createElement('option');
                    option.value = time;
                    option.textContent = time;
                    timeDropdown.appendChild(option);
                });
            }
        }
    });

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
