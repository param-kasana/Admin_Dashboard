# services/user_service.py

from db import get_cursor
from models.user_model import User

def get_all_users():
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT * FROM users")
        return [User(**row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


def get_users_by_quiz_and_personality(quiz_name, personality_type):
    print("quiz_name param:", quiz_name)
    print("personality_type param:", personality_type)
    cur, conn = get_cursor()
    try:
        sql = """
            SELECT 
                users.email
            FROM user_results
            JOIN users ON users.id = user_results.user_id
            JOIN quizzes ON quizzes.id = user_results.quiz_id
            WHERE quizzes.name = %s AND user_results.personality_type = %s
        """
        cur.execute(sql, (quiz_name, personality_type))
        rows = cur.fetchall()
        return [{"email": row["email"]} for row in rows]
    finally:
        cur.close()
        conn.close()
