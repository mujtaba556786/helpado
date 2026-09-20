-- HelpHub Database Schema + Seed Data
-- MySQL 5.7+

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS device_tokens;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS user_blocks;
DROP TABLE IF EXISTS task_applications;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS direct_messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS magic_link_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ─── USERS ───────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'Customer',
    status VARCHAR(20) DEFAULT 'Active',
    avatar VARCHAR(255),
    onboarded TINYINT(1) DEFAULT 0,
    provider VARCHAR(20) DEFAULT 'Email',
    bio TEXT,
    rating FLOAT DEFAULT 5.0,
    rate FLOAT DEFAULT 0.0,
    street_name VARCHAR(100),
    street_number VARCHAR(20),
    city VARCHAR(100),
    country VARCHAR(100),
    pincode VARCHAR(20),
    languages VARCHAR(100),
    years INTEGER DEFAULT 0,
    phone VARCHAR(50),
    availability TEXT,
    service_categories TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    password VARCHAR(255),
    state VARCHAR(100),
    lat FLOAT,
    lng FLOAT,
    terms_accepted_at DATETIME NULL,
    terms_version VARCHAR(10) NULL,
    trust_level ENUM('new_user','verified_user','trusted_user') DEFAULT 'new_user',
    trust_score DECIMAL(5,2) DEFAULT 0,
    risk_score DECIMAL(5,2) DEFAULT 0,
    subscription_plan ENUM('free','pro') NOT NULL DEFAULT 'free',
    featured_until DATETIME NULL,
    featured_category VARCHAR(100) NULL,
    monthly_booking_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    monthly_booking_reset_date DATE NULL
);

-- ─── REFRESH TOKENS ───────────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash)
);

-- ─── MAGIC LINK TOKENS ────────────────────────────────────────────────────────

CREATE TABLE magic_link_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ml_token_hash (token_hash),
    INDEX idx_ml_email (email)
);

-- ─── RATINGS ──────────────────────────────────────────────────────────────────

CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    reviewer_name VARCHAR(100),
    stars INT NOT NULL,
    comment TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_provider (provider_id)
);

-- ─── SERVICES ─────────────────────────────────────────────────────────────────

CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    icon VARCHAR(50),
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active'
);

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

CREATE TABLE bookings (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    service VARCHAR(100),
    scheduled_date DATE,
    scheduled_time VARCHAR(20),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    is_seen TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_price DECIMAL(10,2) NULL,
    INDEX idx_customer (customer_id),
    INDEX idx_provider (provider_id)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    message TEXT,
    booking_id VARCHAR(50),
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_unread (user_id, is_read)
);

-- ─── CONVERSATIONS ────────────────────────────────────────────────────────────

CREATE TABLE conversations (
    id VARCHAR(50) PRIMARY KEY,
    participant_1 VARCHAR(50) NOT NULL,
    participant_2 VARCHAR(50) NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_p1 (participant_1),
    INDEX idx_p2 (participant_2)
);

-- ─── DIRECT MESSAGES ─────────────────────────────────────────────────────────

CREATE TABLE direct_messages (
    id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_unread (conversation_id, is_read)
);

-- ─── TASKS ────────────────────────────────────────────────────────────────────

CREATE TABLE tasks (
    id VARCHAR(50) PRIMARY KEY,
    poster_id VARCHAR(50) NOT NULL,
    assigned_provider_id VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    budget FLOAT,
    task_date DATE,
    location VARCHAR(200),
    status VARCHAR(20) DEFAULT 'open',
    lat FLOAT,
    lng FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_poster (poster_id),
    INDEX idx_status (status),
    INDEX idx_category (category)
);

-- ─── TASK APPLICATIONS ───────────────────────────────────────────────────────

CREATE TABLE task_applications (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task (task_id),
    INDEX idx_provider (provider_id)
);

-- ─── USER BLOCKS ──────────────────────────────────────────────────────────────

CREATE TABLE user_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_id VARCHAR(50) NOT NULL,
    blocked_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_block (blocker_id, blocked_id),
    INDEX idx_blocker (blocker_id),
    INDEX idx_blocked (blocked_id)
);

-- ─── REPORTS ──────────────────────────────────────────────────────────────────

CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id VARCHAR(50) NOT NULL,
    reported_type ENUM('user','post','message') NOT NULL,
    reported_id VARCHAR(50) NOT NULL,
    category ENUM('spam','harassment','scam_fraud','inappropriate_content','fake_profile','other') NOT NULL,
    description TEXT,
    status ENUM('pending','reviewed','actioned') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reporter (reporter_id),
    INDEX idx_reported (reported_id),
    INDEX idx_status (status)
);

-- In-app feedback (Settings → Support → "Feedback geben"); admin-only.
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    type ENUM('idea','problem','praise') NOT NULL,
    message TEXT NOT NULL,
    app_build VARCHAR(20),
    platform VARCHAR(20),
    status ENUM('new','read','done') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fb_status (status),
    INDEX idx_fb_user (user_id)
);

-- ─── DEVICE TOKENS ────────────────────────────────────────────────────────────

CREATE TABLE device_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(20) DEFAULT 'android',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id)
);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ─── SERVICES ─────────────────────────────────────────────────────────────────

INSERT INTO services (id, name, category, icon, description, status) VALUES
('S1',  'Cleaning',    'Home',      '🧹', 'Professional home and office cleaning services.',           'Active'),
('S2',  'Gardening',   'Home',      '🌱', 'Garden maintenance, planting, and landscaping.',            'Active'),
('S3',  'Handyman',    'Home',      '🔧', 'General repairs, installations, and maintenance.',          'Active'),
('S4',  'Babysitting', 'Care',      '👶', 'Trusted childcare in your home.',                           'Active'),
('S5',  'Elder Care',  'Care',      '🧓', 'Compassionate support for elderly family members.',         'Active'),
('S6',  'Pet Care',    'Care',      '🐕', 'Dog walking, pet sitting, and pet grooming.',               'Active'),
('S7',  'Transport',   'Transport', '🚗', 'Reliable rides and errand runs.',                           'Active'),
('S8',  'Groceries',   'Transport', '🛒', 'Grocery shopping and delivery to your door.',               'Active'),
('S9',  'Cooking',     'Wellness',  '👨‍🍳', 'Home-cooked meals prepared fresh in your kitchen.',         'Active'),
('S10', 'Massage',     'Wellness',  '💆', 'Relaxing therapeutic massage in the comfort of your home.', 'Active'),
('S11', 'Math Tuition','Skills',    '📐', 'One-on-one maths tutoring for all ages.',                   'Active'),
('S12', 'IT Support',  'Skills',    '💻', 'Computer help, setup, and troubleshooting.',                'Active');

-- ─── USERS — Admin ────────────────────────────────────────────────────────────

INSERT INTO users (id, name, email, role, status, onboarded, provider, bio, rating, rate, city, country, trust_level, trust_score, subscription_plan, terms_accepted_at, terms_version) VALUES
('admin1', 'HelpHub Admin', 'admin@helphub.com', 'Admin', 'Active', 1, 'Email', 'Platform administrator.', 5.0, 0, 'Berlin', 'Germany', 'trusted_user', 100, 'pro', '2025-01-01 00:00:00', '1.0');

-- ─── USERS — Customers ────────────────────────────────────────────────────────

INSERT INTO users (id, name, email, role, status, avatar, onboarded, provider, bio, rating, rate, street_name, street_number, city, country, pincode, languages, phone, trust_level, trust_score, subscription_plan, terms_accepted_at, terms_version, lat, lng) VALUES
('c1', 'Alice Weber',     'alice.weber@example.com',     'Customer', 'Active', 'https://i.pravatar.cc/150?u=c1', 1, 'Email',  'Love keeping my home tidy.',             4.8, 0, 'Unter den Linden', '12',  'Berlin', 'Germany', '10117', 'English,German',  '+49 151 1111 0001', 'verified_user', 72, 'free', '2025-03-01 09:00:00', '1.0', 52.5172, 13.3978),
('c2', 'Ben Müller',      'ben.mueller@example.com',     'Customer', 'Active', 'https://i.pravatar.cc/150?u=c2', 1, 'Google', 'Father of two, need reliable sitters.',   4.5, 0, 'Friedrichstraße',  '50',  'Berlin', 'Germany', '10117', 'German',          '+49 151 1111 0002', 'new_user',      30, 'free', '2025-03-10 10:00:00', '1.0', 52.5068, 13.3882),
('c3', 'Clara Novak',     'clara.novak@example.com',     'Customer', 'Active', 'https://i.pravatar.cc/150?u=c3', 1, 'Email',  'Need help with elderly mum.',             5.0, 0, 'Potsdamer Platz',  '1',   'Berlin', 'Germany', '10785', 'English,Czech',   '+49 151 1111 0003', 'trusted_user',  90, 'pro',  '2025-02-15 08:00:00', '1.0', 52.5096, 13.3762),
('c4', 'David Park',      'david.park@example.com',      'Customer', 'Active', 'https://i.pravatar.cc/150?u=c4', 1, 'Google', 'Tech enthusiast, always busy.',           4.2, 0, 'Alexanderplatz',   '7',   'Berlin', 'Germany', '10178', 'English,Korean',  '+49 151 1111 0004', 'new_user',      20, 'free', '2025-04-01 12:00:00', '1.0', 52.5219, 13.4132),
('c5', 'Emma Fischer',    'emma.fischer@example.com',    'Customer', 'Active', 'https://i.pravatar.cc/150?u=c5', 1, 'Email',  'Dog owner, love my garden.',              4.9, 0, 'Kurfürstendamm',   '100', 'Berlin', 'Germany', '10709', 'German,French',   '+49 151 1111 0005', 'verified_user', 65, 'free', '2025-03-20 14:00:00', '1.0', 52.5027, 13.3300),
('c6', 'Fatima Al-Hassan','fatima.hassan@example.com',   'Customer', 'Active', 'https://i.pravatar.cc/150?u=c6', 1, 'Email',  'New to Berlin, need support.',            4.7, 0, 'Torstraße',        '35',  'Berlin', 'Germany', '10119', 'English,Arabic',  '+49 151 1111 0006', 'new_user',      15, 'free', '2025-04-10 16:00:00', '1.0', 52.5289, 13.4005);

-- ─── USERS — Providers ────────────────────────────────────────────────────────

INSERT INTO users (id, name, email, role, status, avatar, onboarded, provider, bio, rating, rate, street_name, street_number, city, country, pincode, languages, years, phone, availability, service_categories, trust_level, trust_score, subscription_plan, terms_accepted_at, terms_version, lat, lng) VALUES
('p1',  'Maria Schmidt',   'maria.schmidt@example.com',   'Provider', 'Active', 'https://i.pravatar.cc/150?u=p1',  1, 'Email',  'Passionate gardener with 8 years experience. I treat every garden like my own.',                       4.9, 35, 'Prenzlauer Allee', '42',  'Berlin', 'Germany', '10405', 'German,English',        8,  '+49 151 2222 0001', 'Mon-Fri 08:00-18:00',   'Gardening',            'trusted_user',  95, 'pro',  '2025-01-10 09:00:00', '1.0', 52.5250, 13.4100),
('p2',  'Lena Bauer',      'lena.bauer@example.com',      'Provider', 'Active', 'https://i.pravatar.cc/150?u=p2',  1, 'Google', 'Certified childcare worker. Safe, fun, and reliable babysitting.',                                    4.8, 25, 'Kastanienallee',   '17',  'Berlin', 'Germany', '10435', 'German,English',        5,  '+49 151 2222 0002', 'Evenings & Weekends',   'Babysitting',          'verified_user', 80, 'free', '2025-01-15 10:00:00', '1.0', 52.5100, 13.3900),
('p3',  'Ahmed Hassan',    'ahmed.hassan@example.com',    'Provider', 'Active', 'https://i.pravatar.cc/150?u=p3',  1, 'Email',  'Professional chef offering home-cooked meals. Middle Eastern & Mediterranean cuisine.',               4.7, 45, 'Skalitzer Str',    '88',  'Berlin', 'Germany', '10997', 'Arabic,English,German', 10, '+49 151 2222 0003', 'Flexible',              'Cooking',              'trusted_user',  88, 'pro',  '2025-01-20 11:00:00', '1.0', 52.5155, 13.4020),
('p4',  'Jan Kowalski',    'jan.kowalski@example.com',    'Provider', 'Active', 'https://i.pravatar.cc/150?u=p4',  1, 'Email',  'IT specialist — PCs, Macs, networking. No problem too small.',                                        4.6, 50, 'Müllerstraße',     '110', 'Berlin', 'Germany', '13349', 'Polish,German,English', 12, '+49 151 2222 0004', 'Mon-Sat 09:00-20:00',   'IT Support',           'trusted_user',  91, 'pro',  '2025-01-25 12:00:00', '1.0', 52.5300, 13.3800),
('p5',  'Klaus Richter',   'klaus.richter@example.com',   'Provider', 'Active', 'https://i.pravatar.cc/150?u=p5',  1, 'Email',  'Experienced mover. I handle your belongings with care.',                                              4.5, 40, 'Sonnenallee',      '66',  'Berlin', 'Germany', '12045', 'German',                7,  '+49 151 2222 0005', 'Weekends',              'Transport',            'verified_user', 70, 'free', '2025-02-01 09:00:00', '1.0', 52.5000, 13.4200),
('p6',  'Sophie Lefebvre', 'sophie.lefebvre@example.com', 'Provider', 'Active', 'https://i.pravatar.cc/150?u=p6',  1, 'Google', 'Thorough and trustworthy cleaner. I bring my own eco-friendly supplies.',                             4.9, 30, 'Bergmannstraße',   '22',  'Berlin', 'Germany', '10961', 'French,German,English', 6,  '+49 151 2222 0006', 'Mon-Fri 07:00-15:00',   'Cleaning',             'trusted_user',  93, 'pro',  '2025-02-05 10:00:00', '1.0', 52.5180, 13.4250),
('p7',  'Tomas Novotny',   'tomas.novotny@example.com',   'Provider', 'Active', 'https://i.pravatar.cc/150?u=p7',  1, 'Email',  'Skilled handyman: plumbing, electrics, painting. 15 years on the tools.',                             4.7, 55, 'Weserstraße',      '5',   'Berlin', 'Germany', '12047', 'Czech,German,English',  15, '+49 151 2222 0007', 'Mon-Fri 08:00-17:00',   'Handyman',             'trusted_user',  87, 'pro',  '2025-02-10 08:00:00', '1.0', 52.5070, 13.4150),
('p8',  'Yusuf Demir',     'yusuf.demir@example.com',     'Provider', 'Active', 'https://i.pravatar.cc/150?u=p8',  1, 'Email',  'Driver with clean record and large van. Airport runs, moving, errands.',                              4.6, 30, 'Hermannstraße',    '200', 'Berlin', 'Germany', '12049', 'Turkish,German,English',9,  '+49 151 2222 0008', 'Daily 06:00-22:00',     'Transport,Groceries',  'verified_user', 75, 'free', '2025-02-15 09:00:00', '1.0', 52.5220, 13.3950),
('p9',  'Nina Wolf',       'nina.wolf@example.com',       'Provider', 'Active', 'https://i.pravatar.cc/150?u=p9',  1, 'Google', 'Animal lover — dog walking, pet sitting, basic grooming. Insured.',                                  4.8, 20, 'Rosenthaler Str',  '40',  'Berlin', 'Germany', '10178', 'German,English',        4,  '+49 151 2222 0009', 'Daily 07:00-19:00',     'Pet Care',             'verified_user', 78, 'free', '2025-03-01 10:00:00', '1.0', 52.5130, 13.4300),
('p10', 'Dr. Paul Becker', 'paul.becker@example.com',     'Provider', 'Active', 'https://i.pravatar.cc/150?u=p10', 1, 'Email',  'PhD mathematician. Patient tutor for school, university, and adult learners.',                         4.9, 60, 'Grunewaldstraße',  '15',  'Berlin', 'Germany', '10823', 'German,English',        20, '+49 151 2222 0010', 'Afternoons & Weekends', 'Math Tuition',         'trusted_user',  96, 'pro',  '2025-03-05 11:00:00', '1.0', 52.5080, 13.3850),
('p11', 'Rosa Garcia',     'rosa.garcia@example.com',     'Provider', 'Active', 'https://i.pravatar.cc/150?u=p11', 1, 'Google', 'Fast and friendly grocery runner. I know all the best local shops.',                                 4.7, 15, 'Boxhagener Str',   '78',  'Berlin', 'Germany', '10245', 'Spanish,German,English',3,  '+49 151 2222 0011', 'Mon-Sat 09:00-18:00',   'Groceries',            'new_user',      45, 'free', '2025-03-10 12:00:00', '1.0', 52.5190, 13.4050),
('p12', 'Oliver Braun',    'oliver.braun@example.com',    'Provider', 'Active', 'https://i.pravatar.cc/150?u=p12', 1, 'Email',  'Certified massage therapist — sports, deep tissue, relaxation.',                                     4.8, 70, 'Nollendorfstraße', '9',   'Berlin', 'Germany', '10777', 'German,English',        9,  '+49 151 2222 0012', 'Tue-Sat 10:00-19:00',   'Massage',              'verified_user', 82, 'pro',  '2025-03-15 14:00:00', '1.0', 52.4988, 13.3539),
('p13', 'Amira Khalil',    'amira.khalil@example.com',    'Provider', 'Active', 'https://i.pravatar.cc/150?u=p13', 1, 'Email',  'Elder care specialist. Compassionate, patient, and experienced.',                                    4.9, 28, 'Invalidenstraße',  '55',  'Berlin', 'Germany', '10115', 'Arabic,German,English', 11, '+49 151 2222 0013', 'Mon-Fri 08:00-18:00',   'Elder Care',           'trusted_user',  92, 'pro',  '2025-03-20 09:00:00', '1.0', 52.5320, 13.3820);

-- ─── RATINGS ──────────────────────────────────────────────────────────────────

INSERT INTO ratings (provider_id, user_id, reviewer_name, stars, comment, status, created_at) VALUES
('p1',  'c1', 'Alice Weber',     5, 'Maria completely transformed our backyard. Punctual and thorough!',           'approved', '2025-04-01 10:00:00'),
('p1',  'c5', 'Emma Fischer',    5, 'The garden looks stunning. Will definitely book again.',                      'approved', '2025-04-10 14:00:00'),
('p1',  'c3', 'Clara Novak',     4, 'Great work overall, arrived a bit late but the quality was excellent.',       'approved', '2025-04-15 09:00:00'),
('p2',  'c2', 'Ben Müller',      5, 'Lena is absolutely brilliant with the kids. They love her!',                  'approved', '2025-03-25 18:00:00'),
('p2',  'c6', 'Fatima Al-Hassan',5, 'Very professional and caring. Highly recommend.',                             'approved', '2025-04-05 20:00:00'),
('p3',  'c1', 'Alice Weber',     5, 'Ahmed cooked an amazing dinner for our guests. Outstanding flavours!',        'approved', '2025-03-20 21:00:00'),
('p3',  'c4', 'David Park',      4, 'Delicious food, good portions. One dish was a bit spicy for my taste.',       'approved', '2025-04-02 20:30:00'),
('p4',  'c4', 'David Park',      5, 'Fixed my laptop and set up my home network in under 2 hours. Genius!',        'approved', '2025-03-15 16:00:00'),
('p4',  'c2', 'Ben Müller',      4, 'Jan sorted out my router issue remotely — very efficient.',                   'approved', '2025-04-01 15:00:00'),
('p5',  'c6', 'Fatima Al-Hassan',4, 'Klaus was careful with all my furniture. Only minor issue with timing.',      'approved', '2025-04-08 11:00:00'),
('p6',  'c1', 'Alice Weber',     5, 'My apartment has never been this clean. Sophie is a magician!',               'approved', '2025-03-10 12:00:00'),
('p6',  'c3', 'Clara Novak',     5, 'Extremely professional and uses great eco products. Love it.',                'approved', '2025-04-12 10:00:00'),
('p6',  'c5', 'Emma Fischer',    5, 'Consistently excellent. Sophie is my go-to cleaner.',                         'approved', '2025-04-18 11:00:00'),
('p7',  'c2', 'Ben Müller',      5, 'Tomas fixed a leaking pipe and repainted the kitchen. Perfect job.',          'approved', '2025-03-28 17:00:00'),
('p7',  'c4', 'David Park',      4, 'Good work on the shelves. Took a little longer than expected.',               'approved', '2025-04-09 16:00:00'),
('p8',  'c3', 'Clara Novak',     5, 'Yusuf drove us to the airport at 5am without complaint. Great service!',      'approved', '2025-03-05 06:00:00'),
('p9',  'c5', 'Emma Fischer',    5, 'Nina takes such wonderful care of our dog. He comes home happy every time!',  'approved', '2025-04-03 18:30:00'),
('p9',  'c1', 'Alice Weber',     5, 'Reliable and so gentle with our anxious rescue cat.',                         'approved', '2025-04-14 19:00:00'),
('p10', 'c2', 'Ben Müller',      5, 'Paul helped my son go from failing to passing his maths exam. Hero!',         'approved', '2025-03-18 17:00:00'),
('p10', 'c4', 'David Park',      5, 'Clear explanations, patient, and genuinely expert. Cannot recommend enough.', 'approved', '2025-04-07 16:30:00'),
('p11', 'c6', 'Fatima Al-Hassan',5, 'Rosa picked up exactly what I asked for and was super fast.',                 'approved', '2025-04-11 13:00:00'),
('p12', 'c1', 'Alice Weber',     5, 'Oliver is an incredible massage therapist. I feel brand new!',                'approved', '2025-04-16 15:00:00'),
('p13', 'c3', 'Clara Novak',     5, 'Amira is a gift. My mother adores her. Kind, patient, and professional.',     'approved', '2025-04-20 10:00:00'),
('p1',  'c4', 'David Park',      4, 'Nice garden work, plan to book again next month.',                            'pending',  '2025-05-01 08:00:00'),
('p6',  'c6', 'Fatima Al-Hassan',3, 'Decent cleaning but missed behind the sofa.',                                 'pending',  '2025-05-02 09:00:00');

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

INSERT INTO bookings (id, customer_id, provider_id, service, scheduled_date, scheduled_time, message, status, is_seen, total_price, created_at) VALUES
('bk001', 'c1', 'p6',  'Cleaning',     '2025-04-10', '09:00', 'Please bring your own cleaning supplies.',                            'completed', 1, 90.00,  '2025-04-05 10:00:00'),
('bk002', 'c2', 'p2',  'Babysitting',  '2025-04-12', '18:00', 'Two kids, ages 4 and 7. Need someone till 22:00.',                   'completed', 1, 100.00, '2025-04-07 11:00:00'),
('bk003', 'c1', 'p3',  'Cooking',      '2025-04-15', '17:00', 'Dinner for 6 guests. Please prepare a 3-course meal.',               'completed', 1, 180.00, '2025-04-09 14:00:00'),
('bk004', 'c4', 'p4',  'IT Support',   '2025-04-18', '14:00', 'Laptop very slow, need OS reinstall and data backup.',               'completed', 1, 100.00, '2025-04-12 09:00:00'),
('bk005', 'c5', 'p1',  'Gardening',    '2025-04-20', '08:00', 'Full garden tidy — mowing, pruning, and weeding.',                   'completed', 1, 140.00, '2025-04-14 08:30:00'),
('bk006', 'c3', 'p13', 'Elder Care',   '2025-04-22', '08:00', 'Morning care visit for my mother, Mon-Fri.',                         'confirmed', 1, 112.00, '2025-04-16 10:00:00'),
('bk007', 'c2', 'p10', 'Math Tuition', '2025-04-25', '16:00', 'My son needs help with algebra and geometry.',                       'confirmed', 1, 60.00,  '2025-04-18 13:00:00'),
('bk008', 'c6', 'p5',  'Transport',    '2025-04-28', '10:00', 'Moving boxes from Mitte to Neukoelln. About 20 boxes.',              'confirmed', 1, 120.00, '2025-04-20 09:00:00'),
('bk009', 'c5', 'p9',  'Pet Care',     '2025-05-02', '07:30', 'Daily dog walk, 45 minutes, Mon-Fri.',                               'confirmed', 1, 20.00,  '2025-04-25 10:00:00'),
('bk010', 'c1', 'p12', 'Massage',      '2025-05-05', '11:00', 'Deep tissue, 60 minutes. Focus on shoulders and back.',              'confirmed', 1, 70.00,  '2025-04-28 12:00:00'),
('bk011', 'c4', 'p7',  'Handyman',     '2025-05-06', '09:00', 'Mount TV on wall and install 3 shelves.',                            'pending',   0, 110.00, '2025-05-01 14:00:00'),
('bk012', 'c6', 'p11', 'Groceries',    '2025-05-07', '10:00', 'Weekly grocery run — list attached in message.',                     'pending',   0, 30.00,  '2025-05-03 09:00:00'),
('bk013', 'c3', 'p6',  'Cleaning',     '2025-05-08', '08:00', 'Deep clean of 3-bedroom apartment.',                                 'pending',   0, 150.00, '2025-05-04 11:00:00'),
('bk014', 'c2', 'p3',  'Cooking',      '2025-05-09', '18:00', 'Birthday dinner for my wife, surprise menu please!',                 'pending',   0, 160.00, '2025-05-05 10:00:00'),
('bk015', 'c1', 'p1',  'Gardening',    '2025-05-10', '09:00', 'Plant spring bulbs and lay new turf in the back garden.',            'pending',   0, 175.00, '2025-05-06 08:00:00'),
('bk016', 'c4', 'p8',  'Transport',    '2025-03-10', '05:00', 'Airport drop-off for 06:30 flight to London.',                       'completed', 1, 45.00,  '2025-03-05 20:00:00'),
('bk017', 'c3', 'p7',  'Handyman',     '2025-03-20', '10:00', 'Fix leaking tap in bathroom.',                                       'completed', 1, 55.00,  '2025-03-15 09:00:00'),
('bk018', 'c5', 'p6',  'Cleaning',     '2025-03-28', '09:00', 'End-of-tenancy clean, needs to be spotless.',                        'completed', 1, 200.00, '2025-03-22 11:00:00'),
('bk019', 'c6', 'p2',  'Babysitting',  '2025-04-05', '19:00', 'Just for the evening, 19:00-23:00.',                                 'completed', 1, 80.00,  '2025-04-01 16:00:00'),
('bk020', 'c2', 'p4',  'IT Support',   '2025-04-01', '15:00', 'Home network keeps dropping — please diagnose and fix.',             'declined',  1, 50.00,  '2025-03-28 10:00:00');

-- ─── TASKS ────────────────────────────────────────────────────────────────────

INSERT INTO tasks (id, poster_id, assigned_provider_id, title, description, category, budget, task_date, location, status, lat, lng, created_at) VALUES
('tk001', 'c1', NULL,  'Help needed moving furniture to new flat',       'Moving a sofa, 2 beds, and dining table from 3rd floor (no lift). Short distance, 2km.',    'Transport',    80,  '2025-05-15', 'Mitte, Berlin',           'open',     52.5200, 13.4050, '2025-05-03 09:00:00'),
('tk002', 'c2', 'p1',  'Garden clearance after winter',                  'Need someone to clear dead plants, rake leaves and prep raised beds for spring planting.', 'Gardening',    60,  '2025-05-12', 'Prenzlauer Berg, Berlin', 'assigned', 52.5370, 13.4140, '2025-05-01 10:00:00'),
('tk003', 'c4', NULL,  'Set up home office network',                     'Need router configured, 2 PCs connected via ethernet and a printer on the network.',       'IT Support',   100, '2025-05-14', 'Charlottenburg, Berlin',  'open',     52.5165, 13.3043, '2025-05-04 11:00:00'),
('tk004', 'c5', 'p9',  'Dog walker needed weekday mornings for May',     '45-minute morning walks, Mon-Fri. Border collie, very friendly.',                          'Pet Care',     200, '2025-05-01', 'Kreuzberg, Berlin',       'assigned', 52.4975, 13.4008, '2025-04-28 08:00:00'),
('tk005', 'c3', NULL,  'Weekly grocery shop for elderly mum',            'Shop at Rewe and deliver to Mitte apartment. Usually 60-80 EUR of goods per visit.',       'Groceries',    20,  '2025-05-08', 'Mitte, Berlin',           'open',     52.5200, 13.4050, '2025-05-05 09:00:00'),
('tk006', 'c6', NULL,  'Looking for maths tutor for A-level revision',   'My daughter needs help with calculus and statistics. 2 sessions per week.',               'Math Tuition', 50,  '2025-05-13', 'Neukoelln, Berlin',       'open',     52.4750, 13.4250, '2025-05-04 14:00:00'),
('tk007', 'c1', 'p6',  'Deep clean after building renovation',           'Dust and debris everywhere. 4-room apartment needs thorough cleaning.',                    'Cleaning',     180, '2025-05-09', 'Mitte, Berlin',           'assigned', 52.5172, 13.3978, '2025-05-02 12:00:00'),
('tk008', 'c2', NULL,  'Fix squeaky floorboards in living room',         'About 6 boards that squeak loudly. Old parquet floor.',                                    'Handyman',     70,  '2025-05-16', 'Pankow, Berlin',          'open',     52.5690, 13.4020, '2025-05-06 10:00:00'),
('tk009', 'c4', NULL,  'Cook authentic Thai dinner for 8 people',        'Need a professional cook for a dinner party. Thai cuisine preferred.',                     'Cooking',      150, '2025-05-17', 'Charlottenburg, Berlin',  'open',     52.5165, 13.3043, '2025-05-05 16:00:00'),
('tk010', 'c3', 'p13', 'Companion care for my mother, twice a week',     'Companionship and light housekeeping for 82-year-old woman in good health.',              'Elder Care',   80,  '2025-05-06', 'Mitte, Berlin',           'assigned', 52.5096, 13.3762, '2025-04-30 09:00:00');

-- ─── TASK APPLICATIONS ────────────────────────────────────────────────────────

INSERT INTO task_applications (id, task_id, provider_id, message, status, created_at) VALUES
('ta001', 'tk001', 'p5',  'I have a large van and can bring a helper. Available all day on the 15th.',               'pending',  '2025-05-03 14:00:00'),
('ta002', 'tk001', 'p8',  'Happy to help with the move. I have a 7-seater van with plenty of room.',                'pending',  '2025-05-03 15:00:00'),
('ta003', 'tk002', 'p1',  'I can do a full garden clearance and have all the tools needed.',                        'accepted', '2025-05-01 12:00:00'),
('ta004', 'tk003', 'p4',  'Network setup is my speciality. I can have everything running within 2 hours.',          'pending',  '2025-05-04 16:00:00'),
('ta005', 'tk005', 'p11', 'I know the Rewe in Mitte well and can deliver same day. Reliable and punctual.',         'pending',  '2025-05-05 10:00:00'),
('ta006', 'tk005', 'p8',  'Happy to do grocery runs. I pass through Mitte daily.',                                  'pending',  '2025-05-05 11:00:00'),
('ta007', 'tk006', 'p10', 'I specialise in A-level maths. Calculus and statistics are areas I teach most.',         'pending',  '2025-05-04 18:00:00'),
('ta008', 'tk007', 'p6',  'Post-renovation clean is exactly what I do. I will bring my full kit.',                  'accepted', '2025-05-02 14:00:00'),
('ta009', 'tk008', 'p7',  'I have fixed parquet floors before. I can assess on the spot and repair same day.',      'pending',  '2025-05-06 12:00:00'),
('ta010', 'tk009', 'p3',  'Thai cuisine is one of my specialities. I can prepare a full authentic menu for 8.',     'pending',  '2025-05-05 17:00:00');

-- ─── CONVERSATIONS ────────────────────────────────────────────────────────────

INSERT INTO conversations (id, participant_1, participant_2, last_message, last_message_at, created_at) VALUES
('cv001', 'c1', 'p6',  'See you at 9am on Thursday then!',              '2025-05-04 11:30:00', '2025-05-03 10:00:00'),
('cv002', 'c2', 'p2',  'Great, the kids are excited to meet you.',      '2025-05-03 19:00:00', '2025-05-02 18:00:00'),
('cv003', 'c4', 'p4',  'I will bring my diagnostic tools too.',         '2025-05-04 16:30:00', '2025-05-04 14:00:00'),
('cv004', 'c5', 'p9',  'Buddy loves morning walks, he will be ready!',  '2025-05-05 08:00:00', '2025-05-04 09:00:00'),
('cv005', 'c3', 'p13', 'Mum really liked you at the assessment visit.', '2025-05-05 10:00:00', '2025-05-03 11:00:00');

-- ─── DIRECT MESSAGES ─────────────────────────────────────────────────────────

INSERT INTO direct_messages (id, conversation_id, sender_id, content, is_read, created_at) VALUES
('dm001', 'cv001', 'c1',  'Hi Sophie, just confirming our booking for Thursday morning.',       1, '2025-05-03 10:00:00'),
('dm002', 'cv001', 'p6',  'Hello Alice! Yes, confirmed. I will be there at 9am sharp.',         1, '2025-05-03 10:15:00'),
('dm003', 'cv001', 'c1',  'Perfect! Do you need a parking spot?',                               1, '2025-05-03 10:20:00'),
('dm004', 'cv001', 'p6',  'That would be great, thank you!',                                    1, '2025-05-03 10:25:00'),
('dm005', 'cv001', 'c1',  'See you at 9am on Thursday then!',                                   1, '2025-05-04 11:30:00'),
('dm006', 'cv002', 'c2',  'Hi Lena, the boys are looking forward to meeting you on Saturday.',  1, '2025-05-02 18:00:00'),
('dm007', 'cv002', 'p2',  'How lovely! What are their favourite games so I can prepare?',       1, '2025-05-02 18:10:00'),
('dm008', 'cv002', 'c2',  'Lego and anything outdoors! We have a garden.',                      1, '2025-05-02 18:15:00'),
('dm009', 'cv002', 'p2',  'Perfect. I will bring some craft activities too.',                   1, '2025-05-03 09:00:00'),
('dm010', 'cv002', 'c2',  'Great, the kids are excited to meet you.',                           0, '2025-05-03 19:00:00'),
('dm011', 'cv003', 'c4',  'Hi Jan, I need my whole home network set up plus a printer.',        1, '2025-05-04 14:00:00'),
('dm012', 'cv003', 'p4',  'No problem at all, I can handle that. What router do you have?',     1, '2025-05-04 14:20:00'),
('dm013', 'cv003', 'c4',  'It is a Fritz!Box 7590.',                                            1, '2025-05-04 14:25:00'),
('dm014', 'cv003', 'p4',  'Great router. I will bring my diagnostic tools too.',                0, '2025-05-04 16:30:00'),
('dm015', 'cv004', 'c5',  'Hi Nina, Buddy will be ready at 7:30am each morning.',               1, '2025-05-04 09:00:00'),
('dm016', 'cv004', 'p9',  'Wonderful! I will send a photo update after each walk.',              1, '2025-05-04 09:15:00'),
('dm017', 'cv004', 'c5',  'That would be lovely, thank you!',                                   1, '2025-05-04 09:20:00'),
('dm018', 'cv004', 'c5',  'Buddy loves morning walks, he will be ready!',                       0, '2025-05-05 08:00:00'),
('dm019', 'cv005', 'c3',  'Hello Amira, thank you so much for your patience with mum.',         1, '2025-05-03 11:00:00'),
('dm020', 'cv005', 'p13', 'It is my pleasure. She is a wonderful lady.',                        1, '2025-05-03 11:10:00'),
('dm021', 'cv005', 'c3',  'She keeps talking about you between visits!',                        1, '2025-05-04 09:00:00'),
('dm022', 'cv005', 'p13', 'That makes me so happy to hear.',                                    1, '2025-05-04 09:05:00'),
('dm023', 'cv005', 'c3',  'Mum really liked you at the assessment visit.',                      0, '2025-05-05 10:00:00');

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

INSERT INTO notifications (user_id, type, title, message, booking_id, is_read, created_at) VALUES
('p6',  'booking_request',   'New Booking Request', 'Alice Weber has requested a Cleaning session on 10 Apr.',        'bk001', 1, '2025-04-05 10:00:00'),
('c1',  'booking_accepted',  'Booking Confirmed',   'Sophie Lefebvre confirmed your Cleaning booking on 10 Apr.',     'bk001', 1, '2025-04-05 11:00:00'),
('c1',  'booking_completed', 'Booking Completed',   'Your Cleaning session with Sophie Lefebvre is complete.',        'bk001', 1, '2025-04-10 14:00:00'),
('p2',  'booking_request',   'New Booking Request', 'Ben Müller has requested Babysitting on 12 Apr.',                'bk002', 1, '2025-04-07 11:00:00'),
('c2',  'booking_accepted',  'Booking Confirmed',   'Lena Bauer confirmed your Babysitting booking on 12 Apr.',       'bk002', 1, '2025-04-07 12:00:00'),
('p3',  'booking_request',   'New Booking Request', 'Alice Weber has requested a Cooking session on 15 Apr.',         'bk003', 1, '2025-04-09 14:00:00'),
('c1',  'booking_accepted',  'Booking Confirmed',   'Ahmed Hassan confirmed your Cooking booking on 15 Apr.',         'bk003', 1, '2025-04-09 15:00:00'),
('p4',  'booking_request',   'New Booking Request', 'David Park has requested IT Support on 18 Apr.',                 'bk004', 1, '2025-04-12 09:00:00'),
('c4',  'booking_accepted',  'Booking Confirmed',   'Jan Kowalski confirmed your IT Support booking on 18 Apr.',      'bk004', 1, '2025-04-12 10:00:00'),
('p7',  'booking_request',   'New Booking Request', 'David Park has requested Handyman services on 6 May.',           'bk011', 0, '2025-05-01 14:00:00'),
('p11', 'booking_request',   'New Booking Request', 'Fatima Al-Hassan has requested Groceries delivery on 7 May.',   'bk012', 0, '2025-05-03 09:00:00'),
('p6',  'booking_request',   'New Booking Request', 'Clara Novak has requested Cleaning on 8 May.',                  'bk013', 0, '2025-05-04 11:00:00'),
('p3',  'booking_request',   'New Booking Request', 'Ben Müller has requested Cooking on 9 May.',                    'bk014', 0, '2025-05-05 10:00:00'),
('p1',  'booking_request',   'New Booking Request', 'Alice Weber has requested Gardening on 10 May.',                'bk015', 0, '2025-05-06 08:00:00'),
('c4',  'booking_declined',  'Booking Declined',    'Jan Kowalski could not take your IT Support booking on 1 Apr.', 'bk020', 1, '2025-03-29 10:00:00'),
('p1',  'task_application',  'Task Assigned',       'You have been assigned to: Garden clearance after winter.',     'tk002', 1, '2025-05-01 12:00:00'),
('p6',  'task_application',  'Task Assigned',       'You have been assigned to: Deep clean after renovation.',       'tk007', 1, '2025-05-02 14:00:00'),
('c2',  'task_assigned',     'Task Assigned',       'Maria Schmidt will handle your garden clearance.',              'tk002', 1, '2025-05-01 12:30:00'),
('c1',  'task_assigned',     'Task Assigned',       'Sophie Lefebvre will handle your post-reno clean.',             'tk007', 1, '2025-05-02 15:00:00'),
('c1',  'direct_message',    'New Message',         'Sophie Lefebvre sent you a message.',                           NULL,    1, '2025-05-03 10:15:00'),
('p6',  'direct_message',    'New Message',         'Alice Weber sent you a message.',                               NULL,    1, '2025-05-03 10:00:00'),
('c2',  'direct_message',    'New Message',         'Lena Bauer sent you a message.',                                NULL,    0, '2025-05-03 19:00:00'),
('c4',  'direct_message',    'New Message',         'Jan Kowalski sent you a message.',                              NULL,    0, '2025-05-04 16:30:00');
