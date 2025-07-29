document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const createResumeBtn = document.getElementById('create-resume-btn');
    const createResumeModal = document.getElementById('create-resume-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const selectTemplateBtn = document.getElementById('select-template-btn');
    const createOwnBtn = document.getElementById('create-own-btn');
    const useTemplateButtons = document.querySelectorAll('.use-template-btn');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (username) {
        const sanitizedUsername = username.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        welcomeMessage.innerHTML = `Welcome, <span class="gradient-text">${sanitizedUsername}</span>!`;
    }

    if (createResumeBtn) {
        createResumeBtn.addEventListener('click', () => {
            createResumeModal.classList.remove('hidden');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            createResumeModal.classList.add('hidden');
        });
    }
    
    if (selectTemplateBtn) {
        selectTemplateBtn.addEventListener('click', () => {
            createResumeModal.classList.add('hidden');
            document.getElementById('templates').scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    if (createOwnBtn) {
        createOwnBtn.addEventListener('click', () => {
            window.location.href = 'editor.html';
        });
    }

    useTemplateButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const templateId = button.dataset.templateId;
            
            try {
                const response = await fetch('http://localhost:3000/api/user-details', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (data.hasDetails) {
                    window.location.href = `editor.html?template=${templateId}`;
                } else {
                    alert("Please fill out your resume details before selecting a template.");
                    window.location.href = 'profile.html';
                }

            } catch (error) {
                console.error("Error checking user details:", error);
                alert("Could not verify your details. Please try again.");
            }
        });
    });
});
