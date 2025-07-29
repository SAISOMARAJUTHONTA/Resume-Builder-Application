document.addEventListener('DOMContentLoaded', () => {
    // Get references to the form and the message container element
    const signupForm = document.getElementById('signup-form');
    const messageContainer = document.getElementById('message-container');

    // --- Helper Functions ---
    
    /**
     * Displays a message to the user in the message container.
     * @param {string} message The message to be displayed.
     * @param {boolean} isError - If true, the message is styled as an error (red). Otherwise, it's styled as a success message (green).
     */
    const showMessage = (message, isError = true) => {
        messageContainer.textContent = message;
        messageContainer.className = isError 
            ? 'text-red-500'
            : 'text-green-500';
    };

    /**
     * Validates the password against a strong password policy.
     * Policy: At least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.
     * @param {string} password The password string to validate.
     * @returns {boolean} True if the password is valid according to the policy, otherwise false.
     */
    const validatePassword = (password) => {
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    };

    // --- Form Submission Event Listener ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default browser form submission
        
        // Get user input from the form fields and trim whitespace
        const fullname = document.getElementById('full-name').value.trim();
        const email = document.getElementById('email-address').value.trim();
        const password = document.getElementById('password').value;

        // --- Frontend Input Validation ---
        if (!fullname || !email || !password) {
            showMessage('All fields are required.');
            return;
        }

        if (!validatePassword(password)) {
            showMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character.');
            return;
        }

        // --- API Call to Backend for Signup ---
        try {
            const response = await fetch('http://localhost:3000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fullname, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // If the server response is not successful, throw an error with the server's message
                throw new Error(data.message || 'An unknown error occurred during signup.');
            }
            
            // On successful signup, display the success message from the server
            showMessage(data.message, false);

            // Redirect the user to the login page after a 2-second delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (error) {
            // Display any caught errors (from network issues or server response) to the user
            showMessage(error.message);
        }
    });
});
