# config.py

import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "vision_verse_db"),
    "user": os.getenv("DB_USER", "vision_verse_db_user"),
    "password": os.getenv("DB_PASSWORD", "your_password"),
    "host": os.getenv("DB_HOST", "your_host"),
    "port": os.getenv("DB_PORT", "5432")
}