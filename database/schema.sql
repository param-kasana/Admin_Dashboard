-- Step 1: DROP TABLES (in reverse order of dependencies)
-- DROP TABLE IF EXISTS output_repetitions CASCADE;
-- DROP TABLE IF EXISTS page_response_times CASCADE;
-- DROP TABLE IF EXISTS page_views CASCADE;
-- DROP TABLE IF EXISTS game_metrics CASCADE;
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS admin_users CASCADE;
-- DROP TABLE IF EXISTS emails_sent CASCADE;
-- DROP TABLE IF EXISTS email_templates CASCADE;
-- DROP TABLE IF EXISTS user_results CASCADE;
-- DROP TABLE IF EXISTS prompt_versions CASCADE;
-- DROP TABLE IF EXISTS prompts CASCADE;
-- DROP TABLE IF EXISTS llms CASCADE;
-- DROP TABLE IF EXISTS posters CASCADE;
-- DROP TABLE IF EXISTS quiz_answers CASCADE;
-- DROP TABLE IF EXISTS quiz_questions CASCADE;
-- DROP TABLE IF EXISTS quizzes CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- Step 2: RECREATE TABLES

-- 1. Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Quizzes
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    personality_type VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, personality_type)  -- Enforce quiz uniqueness
);


-- 3. Quiz Questions
CREATE TABLE quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INT REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    "order" INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Quiz Answers
CREATE TABLE quiz_answers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INT REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id INT REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Posters
CREATE TABLE posters (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    poster_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. LLMs (updated with model_name)
CREATE TABLE llms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- e.g. "OpenAI GPT-4"
    model_name VARCHAR(100) NOT NULL,     -- e.g. "gpt-4"
    api_provider VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Prompts
CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    prompt_text TEXT NOT NULL,
    prompt_type VARCHAR(50),
    quiz_name VARCHAR(255) NOT NULL,         -- direct from UI
    personality_type VARCHAR(100),
    llm_id INT REFERENCES llms(id) ON DELETE SET NULL,
    language VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 8. Prompt Versions
CREATE TABLE prompt_versions (
    id SERIAL PRIMARY KEY,
    version_number INT NOT NULL,
    prompt_text TEXT NOT NULL,
    prompt_type VARCHAR(50),
    quiz_name VARCHAR(255) NOT NULL,         -- direct from UI
    personality_type VARCHAR(100),
    llm_id INT REFERENCES llms(id) ON DELETE SET NULL,
    language VARCHAR(50) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. User Results
CREATE TABLE user_results (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INT REFERENCES quizzes(id) ON DELETE CASCADE,
    personality_type VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, quiz_id)
);

-- 10. Email Templates
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255),
    html_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Emails Sent
CREATE TABLE emails_sent (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    email_template_id INT REFERENCES email_templates(id),
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Admin Users
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    admin_user_id INT REFERENCES admin_users(id) ON DELETE SET NULL,
    action_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Game Metrics
CREATE TABLE game_metrics (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    time_spent FLOAT,
    device_type VARCHAR(50),
    channel VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Page Views
CREATE TABLE page_views (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    page VARCHAR(255),
    views INT DEFAULT 0,
    device_type VARCHAR(50),
    channel VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (page, user_id, device_type, channel)
);

-- 16. Page Response Times
CREATE TABLE page_response_times (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    page VARCHAR(255),
    response_time FLOAT,
    device_type VARCHAR(50),
    channel VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Output Repetitions
CREATE TABLE output_repetitions (
    id SERIAL PRIMARY KEY,
    output_id INT UNIQUE NOT NULL,
    output_name VARCHAR(255) DEFAULT '',
    count INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. AI Settings
CREATE TABLE ai_settings (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
