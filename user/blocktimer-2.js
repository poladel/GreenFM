document.querySelectorAll('.editable').forEach(button => {
    button.addEventListener('click', function() {
        const currentText = this.innerText;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        this.innerText = ''; // Clear button text
        this.appendChild(input);
        input.focus();

        input.addEventListener('blur', () => {
            this.innerText = input.value || currentText; // Restore original text if empty
            this.appendChild(input); // Re-append the input so it doesn't get removed
        });

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.innerText = input.value || currentText;