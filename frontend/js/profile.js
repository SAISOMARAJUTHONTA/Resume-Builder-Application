document.addEventListener('DOMContentLoaded', () => {
    // Get user data and elements
    const token = localStorage.getItem('token');
    const profileForm = document.getElementById('profile-form');
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email-address');
    const newPasswordInput = document.getElementById('new-password');
    const messageContainer = document.getElementById('message-container');
    const logoutButton = document.getElementById('logout-button');

    // --- Authentication Check ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    /**
     * Displays a feedback message to the user.
     * @param {string} message The message to display.
     * @param {boolean} isError Styles the message as an error if true.
     */
    const showMessage = (message, isError = true) => {
        messageContainer.textContent = message;
        messageContainer.className = isError 
            ? 'text-red-500' 
            : 'text-green-500';
    };

    // --- Fetch and Populate User Data ---
    const fetchUserProfile = async () => {
        try {
            const response = await fetch('http://localhost:3000/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                // If token is invalid or expired, log out the user
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }

            const data = await response.json();
            fullNameInput.value = data.user.fullname;
            emailInput.value = data.user.email;

        } catch (error) {
            showMessage('Failed to load profile data.');
        }
    };

    // --- Handle Profile Update ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullname = fullNameInput.value.trim();
        const password = newPasswordInput.value;

        if (!fullname) {
            showMessage('Full Name cannot be empty.');
            return;
        }

        const updateData = { fullname };
        if (password) {
            // Include password only if user entered a new one
            updateData.password = password;
        }

        try {
            const response = await fetch('http://localhost:3000/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update profile.');
            }
            
            showMessage(data.message, false);
            // Update the username in localStorage if it was changed
            localStorage.setItem('username', fullname);
            // Clear the password field
            newPasswordInput.value = '';

        } catch (error) {
            showMessage(error.message);
        }
    });

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // Initial call to load the profile data when the page loads
    fetchUserProfile();
});
