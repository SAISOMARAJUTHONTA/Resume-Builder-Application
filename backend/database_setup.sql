-- Create a new database for the application if it doesn't exist
CREATE DATABASE IF NOT EXISTS resume_builder;

-- Switch to the new database
USE resume_builder;

-- Create the users table to store user information
-- It includes an auto-incrementing primary key, user's full name, a unique email,
-- a hashed password, and a timestamp for when the account was created.
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
