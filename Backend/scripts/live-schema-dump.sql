-- Live schema dump, generated via db-query.js against smarttask_db (XAMPP MySQL).
-- Not hand-edited — regenerate with:
--   node scripts/db-query.js "SHOW CREATE TABLE <table>"

-- Table: leaves
CREATE TABLE `leaves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `staff_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text NOT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `rejection_reason` varchar(500) DEFAULT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `staff_id` (`staff_id`),
  CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: orders
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `client_name` varchar(100) NOT NULL,
  `item_type` varchar(100) NOT NULL,
  `order_type` enum('Design Only','Product Only','Design & Product') NOT NULL DEFAULT 'Design & Product',
  `quantity` int(11) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `due_date` date NOT NULL,
  `delivery_location` varchar(255) DEFAULT NULL,
  `delivery_type` enum('Internal','External') NOT NULL,
  `specifications` text DEFAULT NULL,
  `design_file_path` varchar(255) DEFAULT NULL,
  `status` enum('Pending','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: staff
CREATE TABLE `staff` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `staff_id_code` varchar(20) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `job_title` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `profile_picture_url` varchar(255) DEFAULT NULL,
  `status` enum('Aktif','Cuti') DEFAULT 'Aktif',
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_id_code` (`staff_id_code`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `staff_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: tasks
CREATE TABLE `tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `assigned_staff_id` int(11) DEFAULT NULL,
  `task_type` enum('Design','Printing','Packing','Delivery') NOT NULL,
  `description` text DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('Pending','In Progress','Submitted','Completed') NOT NULL DEFAULT 'Pending',
  `attachment_path` varchar(255) DEFAULT NULL,
  `staff_notes` text DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `approval_status` enum('Draft','Confirmed') NOT NULL DEFAULT 'Confirmed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `assigned_staff_id` (`assigned_staff_id`),
  CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`assigned_staff_id`) REFERENCES `staff` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table: users
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Manager','Staff') NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
