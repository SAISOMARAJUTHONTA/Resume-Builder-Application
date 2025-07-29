document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const editor = document.getElementById('resume-editor');
    const saveButton = document.getElementById('save-resume-btn');
    const downloadButton = document.getElementById('download-resume-btn');
    const resumeNameInput = document.getElementById('resume-name-input');
    const logoutButton = document.getElementById('logout-button');
    const toolbarButtons = document.querySelectorAll('[data-command]');

    // --- Check URL for edit ID or template ID ---
    const urlParams = new URLSearchParams(window.location.search);
    const resumeId = urlParams.get('id');
    const templateId = urlParams.get('template');
    const isEditMode = resumeId !== null;

    // --- Authentication Check ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- Template Generation Logic ---
    const generateResumeFromTemplate = async (templateName) => {
        try {
            // 1. Fetch user's saved details
            const detailsResponse = await fetch('http://localhost:3000/api/user-details', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!detailsResponse.ok) throw new Error('Could not fetch user details.');
            const userData = await detailsResponse.json();
            if (!userData.hasDetails) {
                alert('User details not found. Redirecting to profile.');
                window.location.href = 'profile.html';
                return;
            }
            const details = userData.details;

            // 2. Fetch the HTML for the selected template
            const templateResponse = await fetch(`http://localhost:3000/templates/${templateName}.html`);
            if (!templateResponse.ok) throw new Error(`Template '${templateName}' not found.`);
            let templateHtml = await templateResponse.text();

            // 3. Replace placeholders with user data
            templateHtml = templateHtml.replace(/{{FULL_NAME}}/g, details.full_name || '');
            templateHtml = templateHtml.replace(/{{EMAIL}}/g, details.email || '');
            templateHtml = templateHtml.replace(/{{PHONE}}/g, details.phone || '');
            templateHtml = templateHtml.replace('{{PROFILE_IMAGE}}', details.profile_image || 'https://placehold.co/300x400/fce7f3/d68c7c?text=Image');
            templateHtml = templateHtml.replace(/{{COLLEGE}}/g, details.college || '');
            templateHtml = templateHtml.replace(/{{DEGREE}}/g, details.degree || '');
            templateHtml = templateHtml.replace(/{{PASSING_YEAR}}/g, details.passing_year || '');
            
            // 4. Handle loops for skills and experience based on template
            let skillsHtml = '';
            if (templateName === 'creative') {
                skillsHtml = (details.skills || []).map(skill => `<p>${skill}</p>`).join('');
            } else if (templateName === 'professional') {
                skillsHtml = (details.skills || []).map(skill => `<li>${skill}</li>`).join('');
            } else { // For 'modern' template
                skillsHtml = (details.skills || []).map(skill => `<div>${skill}</div>`).join('');
            }
            templateHtml = templateHtml.replace('{{SKILLS_LOOP}}', skillsHtml);

            let experienceHtml = '';
            if (templateName === 'creative') {
                experienceHtml = (details.experience || []).map(exp => `
                    <div>
                        <h3 class="font-bold">${exp}</h3>
                        <p class="text-sm text-gray-600 mt-1">My responsibilities included participating in campaigns, implementing digital marketing strategies, and analyzing market trends.</p>
                    </div>
                `).join('');
            } else { // For 'modern' and 'professional'
                 experienceHtml = (details.experience || []).map(exp => `
                    <div class="work-item mb-6">
                        <h3 class="font-bold text-lg">${exp}</h3>
                        <ul class="list-disc text-gray-700 mt-2 space-y-1 pl-5">
                            <li>Placeholder description for this role. You can edit this text.</li>
                        </ul>
                    </div>
                `).join('');
            }
            templateHtml = templateHtml.replace('{{EXPERIENCE_LOOP}}', experienceHtml);

            // 5. Load the final HTML into the editor
            editor.innerHTML = templateHtml;
            resumeNameInput.value = `${details.full_name}'s ${templateName.charAt(0).toUpperCase() + templateName.slice(1)} Resume`;

        } catch (error) {
            console.error('Error generating resume from template:', error);
            alert(error.message);
        }
    };

    // --- Load existing resume for editing ---
    const loadResumeForEditing = async () => {
        if (isEditMode) {
            try {
                const response = await fetch(`http://localhost:3000/api/resumes/${resumeId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Could not load resume for editing.');
                }
                const resume = await response.json();
                resumeNameInput.value = resume.resume_name;
                editor.innerHTML = resume.resume_content;
            } catch (error) {
                console.error(error);
                alert(error.message);
                window.location.href = 'my-resumes.html';
            }
        }
    };

    // --- Toolbar Functionality ---
    toolbarButtons.forEach(button => {
        button.addEventListener('click', () => {
            const command = button.getAttribute('data-command');
            document.execCommand(command, false, null);
            editor.focus();
        });
    });

    // --- Save/Update Resume Functionality ---
    saveButton.addEventListener('click', async () => {
        const resumeContent = editor.innerHTML;
        const resumeName = resumeNameInput.value.trim();
        if (!resumeName) {
            alert("Please enter a name for your resume.");
            return;
        }
        const url = isEditMode ? `http://localhost:3000/api/resumes/${resumeId}` : 'http://localhost:3000/api/resumes';
        const method = isEditMode ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ resumeName: resumeName, resumeContent: resumeContent })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message);
            if (!isEditMode) {
                 window.location.href = 'my-resumes.html';
            }
        } catch (error) {
            console.error('Error saving resume:', error);
            alert(`Error: ${error.message}`);
        }
    });

    // --- Download Resume Functionality ---
    downloadButton.addEventListener('click', () => {
        const resumeContent = document.getElementById('resume-editor');
        const resumeName = resumeNameInput.value.trim();
        if (!resumeName) {
            alert("Please enter a name for your resume before downloading.");
            return;
        }
        const opt = {
            margin:       0.5,
            filename:     resumeName.endsWith('.pdf') ? resumeName : `${resumeName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(resumeContent).set(opt).save();
    });

    // --- Logout Functionality ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // --- Initial Page Load Logic ---
    if (isEditMode) {
        loadResumeForEditing();
    } else if (templateId) {
        generateResumeFromTemplate(templateId);
    }
});
