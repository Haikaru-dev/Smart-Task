CREATE DATABASE IF NOT EXISTS smarttask_db;
USE smarttask_db;

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert mock data
INSERT INTO orders (title, description, status, price) VALUES
('Website Design', 'Design landing page for new client', 'completed', 500.00),
('Backend API', 'Develop REST API using PHP', 'in_progress', 800.00),
('Server Maintenance', 'Monthly server update and maintenance', 'pending', 150.00);
