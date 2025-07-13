# services/result_service.py

from db import get_cursor
from models.result_model import UserResult

def get_result_by_user(user_id):
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT * FROM user_results WHERE user_id = %s", (user_id,))
        row = cur.fetchone()
        return UserResult(**row) if row else None
    finally:
        cur.close()
        conn.close()
