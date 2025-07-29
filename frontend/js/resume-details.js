document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const resumeDetailsForm = document.getElementById('resume-details-form');
    let base64Image = null; // Variable to store the converted image

    // --- Image Upload Handling ---
    const imageUpload = document.getElementById('profile-image-upload');
    const imagePreview = document.getElementById('profile-image-preview');

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                base64Image = e.target.result; // Store the Base64 string
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Helper function to add simple input fields (for Skills, Experience) ---
    const addField = (containerId, name, placeholder, value = '') => {
        const container = document.getElementById(containerId);
        const input = document.createElement('input');
        input.type = 'text';
        input.name = name;
        input.placeholder = placeholder;
        input.value = value;
        input.className = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
        container.appendChild(input);
    };
    
    // --- Helper function to add new project fields ---
    const addProjectField = (project = {}) => {
        const container = document.getElementById('projects-container');
        const projectGroup = document.createElement('div');
        projectGroup.className = 'project-group space-y-2 p-4 border rounded-md';
        
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.name = 'project_title';
        titleInput.placeholder = 'Project Title';
        titleInput.value = project.title || '';
        titleInput.className = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';

        const linkInput = document.createElement('input');
        linkInput.type = 'url';
        linkInput.name = 'project_link';
        linkInput.placeholder = 'Project Link (e.g., https://github.com/user/repo)';
        // --- FIX: Check if link is 'none' before displaying ---
        linkInput.value = (project.link && project.link !== 'none') ? project.link : '';
        linkInput.className = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';
        
        const descTextarea = document.createElement('textarea');
        descTextarea.name = 'project_description';
        descTextarea.placeholder = 'Project Description';
        descTextarea.rows = 3;
        descTextarea.value = project.description || '';
        descTextarea.className = 'block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';

        projectGroup.appendChild(titleInput);
        projectGroup.appendChild(linkInput);
        projectGroup.appendChild(descTextarea);
        container.appendChild(projectGroup);
    };

    // --- Add event listeners to "Add" buttons ---
    document.getElementById('add-skill-btn').addEventListener('click', () => addField('skills-container', 'skills', 'e.g., JavaScript'));
    document.getElementById('add-project-btn').addEventListener('click', () => addProjectField());
    document.getElementById('add-experience-btn').addEventListener('click', () => addField('experience-container', 'experience', 'Company Name - Role - Duration'));

    // --- Fetch and Populate Existing Details ---
    const populateFormWithDetails = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/user-details', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.hasDetails) {
                const details = data.details;
                document.querySelector('input[name="resume_full_name"]').value = details.full_name || '';
                document.querySelector('input[name="resume_email"]').value = details.email || '';
                document.querySelector('input[name="resume_phone"]').value = details.phone || '';
                document.querySelector('input[name="education_college"]').value = details.college || '';
                document.querySelector('input[name="education_degree"]').value = details.degree || '';
                document.querySelector('input[name="education_year"]').value = details.passing_year || '';

                if (details.profile_image) {
                    imagePreview.src = details.profile_image;
                    base64Image = details.profile_image;
                }

                // Populate skills
                (details.skills || []).forEach((skill, index) => {
                    if (index === 0) document.querySelector('input[name="skills"]').value = skill;
                    else addField('skills-container', 'skills', 'e.g., JavaScript', skill);
                });

                // Populate projects
                const projectsContainer = document.getElementById('projects-container');
                projectsContainer.innerHTML = ''; // Clear the initial template field
                (details.projects && details.projects.length > 0 ? details.projects : [{}]).forEach(project => {
                    addProjectField(project);
                });

                // Populate experience
                (details.experience || []).forEach((exp, index) => {
                    if (index === 0) document.querySelector('input[name="experience"]').value = exp;
                    else addField('experience-container', 'experience', 'Company Name - Role - Duration', exp);
                });
            }
        } catch (error) {
            console.error('Could not load existing details:', error);
        }
    };

    // --- Handle form submission ---
    resumeDetailsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const getFieldValues = (name) => Array.from(document.querySelectorAll(`input[name="${name}"]`)).map(input => input.value.trim()).filter(value => value);

        // Collect project details as an array of objects
        const projects = [];
        document.querySelectorAll('.project-group').forEach(group => {
            const title = group.querySelector('input[name="project_title"]').value.trim();
            let link = group.querySelector('input[name="project_link"]').value.trim();
            const description = group.querySelector('textarea[name="project_description"]').value.trim();
            
            // --- FIX: If link is empty, set it to 'none' ---
            if (!link) {
                link = 'none';
            }

            if (title) { // Only add project if it has a title
                projects.push({ title, link, description });
            }
        });

        const resumeData = {
            fullName: document.querySelector('input[name="resume_full_name"]').value,
            email: document.querySelector('input[name="resume_email"]').value,
            phone: document.querySelector('input[name="resume_phone"]').value,
            profileImage: base64Image,
            college: document.querySelector('input[name="education_college"]').value,
            degree: document.querySelector('input[name="education_degree"]').value,
            passingYear: document.querySelector('input[name="education_year"]').value,
            skills: getFieldValues('skills'),
            projects: projects, // Use the new array of objects
            experience: getFieldValues('experience')
        };
        
        try {
            const response = await fetch('http://localhost:3000/api/user-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(resumeData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert('Resume details saved successfully!');
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Initial call to populate the form
    populateFormWithDetails();
});
