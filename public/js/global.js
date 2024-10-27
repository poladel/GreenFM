document.addEventListener("DOMContentLoaded", function() {
    const userDropdown = document.getElementById("userDropdown");
    const dropdownContent = document.getElementById("dropdown-menu");

    // Toggle dropdown on click
    userDropdown.addEventListener("click", function(event) {
        event.stopPropagation(); // Prevent click from closing the dropdown
        dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
    });

    // Close dropdown if clicking outside of it
    document.addEventListener("click", function(event) {
        if (!userDropdown.contains(event.target)) {
            dropdownContent.style.display = "none";
        }
    });
});
