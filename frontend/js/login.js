document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageContainer = document.getElementById('message-container');

    const showMessage = (message, isError = true) => {
        messageContainer.textContent = message;
        messageContainer.className = isError ? 'text-red-500' : 'text-green-500';
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email-address').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessage('Email and password are required.');
            return;
        }

        console.log('Attempting to log in...'); // <-- DEBUG

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            console.log('Server response received:', data); // <-- DEBUG

            if (!response.ok) {
                console.error('Login failed. Server responded with an error.'); // <-- DEBUG
                if (response.status === 404) {
                    showMessage('User not registered. Redirecting to sign up...');
                    setTimeout(() => {
                        window.location.href = 'signup.html';
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Login failed');
                }
                return;
            }

            // --- Handle Successful Login ---
            console.log('Login successful. Storing token and username...'); // <-- DEBUG
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', data.username);
            console.log('Token stored:', localStorage.getItem('token')); // <-- DEBUG
            
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('An error occurred during the login process:', error); // <-- DEBUG
            showMessage(error.message);
        }
    });
});
