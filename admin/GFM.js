document.addEventListener('DOMContentLoaded', () => {
    const applicationsMenu = document.querySelector('.applications');
    const submenu = applicationsMenu.querySelector('.submenu');

    // Toggle submenu on click
    applicationsMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        submenu.style.display = (submenu.style.display === 'block') ? 'none' : 'block';
        applicationsMenu.classList.toggle('active');
    });

    // Close submenu when clicking outside
    document.addEventListener('click', () => {
        submenu.style.display = 'none';
        applicationsMenu.classList.remove('active');
    });
});