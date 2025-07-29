document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const resumesListContainer = document.getElementById('resumes-list-container');
    const noResumesMessage = document.getElementById('no-resumes-message');
    const logoutButton = document.getElementById('logout-button');

    // --- Authentication Check ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Fetch and Display Resumes ---
    const fetchMyResumes = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/resumes', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }

            const resumes = await response.json();

            if (resumes.length === 0) {
                noResumesMessage.classList.remove('hidden');
            } else {
                displayResumes(resumes);
            }
        } catch (error) {
            console.error('Failed to fetch resumes:', error);
            resumesListContainer.innerHTML = '<p class="text-red-500">Could not load your resumes.</p>';
        }
    };

    // --- Function to create HTML for each resume ---
    const displayResumes = (resumes) => {
        resumesListContainer.innerHTML = '';
        resumes.forEach(resume => {
            const resumeCard = document.createElement('div');
            resumeCard.className = 'bg-white p-6 rounded-lg shadow-md flex items-center justify-between';
            resumeCard.id = `resume-card-${resume.id}`;

            const resumeName = document.createElement('h2');
            resumeName.className = 'text-xl font-semibold text-gray-800';
            resumeName.textContent = resume.resume_name;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'space-x-4';

            const editButton = document.createElement('button');
            editButton.className = 'text-indigo-600 hover:text-indigo-800 font-medium';
            editButton.textContent = 'Edit';
            editButton.onclick = () => {
                window.location.href = `editor.html?id=${resume.id}`;
            };

            const deleteButton = document.createElement('button');
            deleteButton.className = 'text-red-500 hover:text-red-700 font-medium';
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = () => deleteResume(resume.id);

            buttonGroup.appendChild(editButton);
            buttonGroup.appendChild(deleteButton);
            resumeCard.appendChild(resumeName);
            resumeCard.appendChild(buttonGroup);
            resumesListContainer.appendChild(resumeCard);
        });
    };

    // --- Function to delete a resume ---
    const deleteResume = async (resumeId) => {
        if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/api/resumes/${resumeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete.');
            }
            const cardToRemove = document.getElementById(`resume-card-${resumeId}`);
            if (cardToRemove) {
                cardToRemove.remove();
            }
            if (resumesListContainer.children.length === 0) {
                noResumesMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error deleting resume:', error);
            alert(`Error: ${error.message}`);
        }
    };

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // --- Initial Fetch ---
    fetchMyResumes();
});
