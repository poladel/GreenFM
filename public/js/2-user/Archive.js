document.addEventListener('DOMContentLoaded', function() {
    const yearSelect = document.getElementById('year');
    const monthSelect = document.getElementById('month');
    const dateSelect = document.getElementById('date');
    const videoListContainer = document.getElementById('video-list');

    // Parse the videos data passed from EJS
    const videos = JSON.parse('<%= JSON.stringify(posts) %>');

    // Populate the year, month, and date options dynamically
    function populateFilters(videos) {
        const currentYear = new Date().getFullYear();

        // Get unique years, months, and dates
        const years = [...new Set(videos.map(video => video.year))].sort((a, b) => a - b);
        const months = [...new Set(videos.map(video => video.month))].sort((a, b) => a - b);
        const dates = [...new Set(videos.map(video => video.day))].sort((a, b) => a - b);

        // Populate year select (from 2019 to current year)
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });

        // Populate month select (from 1 to 12)
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
            monthSelect.appendChild(option);
        });

        // Populate date select (for each available day in the video data)
        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateSelect.appendChild(option);
        });

        // Set default to the most recent year, month, and date if data exists
        if (years.length > 0) {
            yearSelect.value = years[years.length - 1]; // Set to the most recent year
            populateMonthsAndDates(yearSelect.value);
        }
    }

    // Function to populate months and dates based on the selected year
    function populateMonthsAndDates(year) {
        const filteredVideos = videos.filter(video => video.year === parseInt(year));
        const months = [...new Set(filteredVideos.map(video => video.month))].sort((a, b) => a - b);
        const dates = [...new Set(filteredVideos.map(video => video.day))].sort((a, b) => a - b);

        // Clear and repopulate the month and date dropdowns
        monthSelect.innerHTML = '<option value="">Select Month</option>';
        dateSelect.innerHTML = '<option value="">Select Date</option>';

        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
            monthSelect.appendChild(option);
        });

        dates.forEach(date => {
            const option = document.createElement('option');
            option.value = date;
            option.textContent = date;
            dateSelect.appendChild(option);
        });
    }

    // Function to update the displayed videos based on the selected filters
    function filterVideos() {
        const year = yearSelect.value;
        const month = monthSelect.value;
        const date = dateSelect.value;

        // Filter the videos based on the selected values
        let filteredVideos = videos.filter(video => {
            let match = true;
            if (year && video.year !== parseInt(year)) match = false;
            if (month && video.month !== parseInt(month)) match = false;
            if (date && video.day !== parseInt(date)) match = false;
            return match;
        });

        // Display the filtered videos
        displayVideos(filteredVideos);
    }

    // Function to display the videos
    function displayVideos(filteredVideos) {
        videoListContainer.innerHTML = ''; // Clear the video list

        if (filteredVideos.length > 0) {
            filteredVideos.forEach(video => {
                const videoElement = document.createElement('div');
                videoElement.classList.add('video-item', 'p-4', 'border-b');
                videoElement.innerHTML = `
                    <h3 class="text-xl font-bold">${video.title}</h3>
                    <p>${new Date(video.date).toDateString()}</p>
                    <a href="${video.videoUrl}" class="text-blue-500" target="_blank">Watch Video</a>
                `;
                videoListContainer.appendChild(videoElement);
            });
        } else {
            videoListContainer.innerHTML = '<p>No videos available for the selected filters.</p>';
        }
    }

    // Event listeners for filter changes
    yearSelect.addEventListener('change', function() {
        populateMonthsAndDates(yearSelect.value);
        filterVideos();
    });
    monthSelect.addEventListener('change', filterVideos);
    dateSelect.addEventListener('change', filterVideos);

    // Initially populate filters and videos on page load
    populateFilters(videos);
    displayVideos(videos); // Initially display all videos
});
