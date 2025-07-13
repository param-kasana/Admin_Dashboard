# db.py

import psycopg2
from psycopg2.extras import RealDictCursor
from config import DB_CONFIG

def get_connection():
    return psycopg2.connect(
        dbname=DB_CONFIG['dbname'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port']
    )

def get_cursor():
    conn = get_connection()
    return conn.cursor(cursor_factory=RealDictCursor), conn
