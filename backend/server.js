// --- Module Imports ---
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// --- Express App Initialization ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// --- UPDATED: Serve frontend files from the correct directory ---
app.use(express.static(path.join(__dirname, '../frontend'))); 


// --- Database Connection ---
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// --- Authentication Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication invalid: No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch (error) {
        console.error('Authentication Error:', error.message); 
        return res.status(401).json({ message: 'Authentication invalid: Token is not valid.' });
    }
};

// --- API Endpoints ---

// Public Routes
app.post('/signup', async (req, res) => {
    try {
        const { fullname, email, password } = req.body;
        if (!fullname || !email || !password) { return res.status(400).json({ message: 'Please provide all required fields.' }); }
        const [users] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
        if (users.length > 0) { return res.status(409).json({ message: 'User with this email already exists.' }); }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await db.query('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', [fullname, email, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully. Please proceed to login.' });
    } catch (error) { console.error('Signup Error:', error); res.status(500).json({ message: 'An error occurred on the server during signup.' }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) { return res.status(400).json({ message: 'Please provide both email and password.' }); }
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user) { return res.status(404).json({ message: 'User not registered.' }); }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(401).json({ message: 'Invalid credentials. Please try again.' }); }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful.', token, username: user.fullname });
    } catch (error) { console.error('Login Error:', error); res.status(500).json({ message: 'An error occurred on the server during login.' }); }
});

// Protected User Profile Routes
app.get('/profile', authMiddleware, async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, fullname, email FROM users WHERE id = ?', [req.user.userId]);
        if (!users[0]) { return res.status(404).json({ message: 'User not found.' }); }
        res.status(200).json({ user: users[0] });
    } catch (error) { console.error('Profile fetch error:', error); res.status(500).json({ message: 'Server error fetching profile.' }); }
});

app.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { fullname, password } = req.body;
        if (!fullname) { return res.status(400).json({ message: 'Full name is required.' }); }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await db.query('UPDATE users SET fullname = ?, password = ? WHERE id = ?', [fullname, hashedPassword, req.user.userId]);
        } else {
            await db.query('UPDATE users SET fullname = ? WHERE id = ?', [fullname, req.user.userId]);
        }
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) { console.error('Profile update error:', error); res.status(500).json({ message: 'Server error updating profile.' }); }
});


// --- USER DETAILS ROUTES ---

// POST/UPDATE user resume details
app.post('/api/user-details', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    const { 
        fullName, email, phone, profileImage,
        college, degree, passingYear, 
        skills, projects, experience 
    } = req.body;

    const sql = `
        INSERT INTO user_details (user_id, full_name, email, phone, profile_image, college, degree, passing_year, skills, projects, experience) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
        full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone), profile_image = VALUES(profile_image),
        college = VALUES(college), degree = VALUES(degree), passing_year = VALUES(passing_year), 
        skills = VALUES(skills), projects = VALUES(projects), experience = VALUES(experience);
    `;

    try {
        await db.query(sql, [
            userId, fullName, email, phone, profileImage,
            college, degree, passingYear, 
            JSON.stringify(skills), JSON.stringify(projects), JSON.stringify(experience)
        ]);
        res.status(200).json({ message: 'Resume details saved successfully.' });
    } catch (error) { 
        console.error('Error saving user details:', error); 
        res.status(500).json({ message: 'Failed to save resume details.' }); 
    }
});

// --- NEW: GET user resume details ---
app.get('/api/user-details', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    try {
        const sql = 'SELECT * FROM user_details WHERE user_id = ?';
        const [details] = await db.query(sql, [userId]);
        if (details.length > 0) {
            res.status(200).json({ hasDetails: true, details: details[0] });
        } else {
            res.status(200).json({ hasDetails: false });
        }
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ message: 'Failed to fetch user details.' });
    }
});


// --- RESUME ROUTES (Protected) ---

// POST - Save a new resume
app.post('/api/resumes', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    const { resumeName, resumeContent } = req.body;
    if (!resumeName || !resumeContent) {
        return res.status(400).json({ message: 'Resume name and content are required.' });
    }
    try {
        const sql = 'INSERT INTO saved_resumes (user_id, resume_name, resume_content) VALUES (?, ?, ?)';
        await db.query(sql, [userId, resumeName, resumeContent]);
        res.status(201).json({ message: 'Resume saved successfully.' });
    } catch (error) {
        console.error('Error saving resume:', error);
        res.status(500).json({ message: 'Failed to save resume.' });
    }
});

// GET - Fetch all resumes for a user
app.get('/api/resumes', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    try {
        const sql = 'SELECT id, resume_name, updated_at FROM saved_resumes WHERE user_id = ? ORDER BY updated_at DESC';
        const [resumes] = await db.query(sql, [userId]);
        res.status(200).json(resumes);
    } catch (error) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({ message: 'Failed to fetch resumes.' });
    }
});

// DELETE - Delete a specific resume
app.delete('/api/resumes/:id', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    try {
        const sql = 'DELETE FROM saved_resumes WHERE id = ? AND user_id = ?';
        const [result] = await db.query(sql, [id, userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Resume not found or you do not have permission to delete it.' });
        }
        res.status(200).json({ message: 'Resume deleted successfully.' });
    } catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({ message: 'Failed to delete resume.' });
    }
});

// GET - Get a single resume for editing
app.get('/api/resumes/:id', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    try {
        const sql = 'SELECT * FROM saved_resumes WHERE id = ? AND user_id = ?';
        const [resumes] = await db.query(sql, [id, userId]);
        const resume = resumes[0];
        if (!resume) {
            return res.status(404).json({ message: 'Resume not found or you do not have permission to view it.' });
        }
        res.status(200).json(resume);
    } catch (error) {
        console.error('Error fetching single resume:', error);
        res.status(500).json({ message: 'Failed to fetch resume.' });
    }
});

// PUT - Update an existing resume
app.put('/api/resumes/:id', authMiddleware, async (req, res) => {
    const { userId } = req.user;
    const { id } = req.params;
    const { resumeName, resumeContent } = req.body;
    if (!resumeName || !resumeContent) {
        return res.status(400).json({ message: 'Resume name and content are required.' });
    }
    try {
        const sql = 'UPDATE saved_resumes SET resume_name = ?, resume_content = ? WHERE id = ? AND user_id = ?';
        const [result] = await db.query(sql, [resumeName, resumeContent, id, userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Resume not found or you do not have permission to edit it.' });
        }
        res.status(200).json({ message: 'Resume updated successfully.' });
    } catch (error) {
        console.error('Error updating resume:', error);
        res.status(500).json({ message: 'Failed to update resume.' });
    }
});


// --- Server Startup ---
app.listen(PORT, () => {
    console.log(`Server is running and listening on http://localhost:${PORT}`);
    import('open').then(openModule => {
        const open = openModule.default;
        open('http://localhost:' + PORT + '/index.html');
    }).catch(err => console.error('Failed to open browser:', err));
});
