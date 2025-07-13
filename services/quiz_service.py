# services/quiz_service.py

from db import get_cursor
from models.quiz_model import Quiz, QuizQuestion, QuizAnswer

def get_all_quizzes():
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT * FROM quizzes ORDER BY id ASC")
        return [Quiz(**row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

def get_questions_by_quiz(quiz_id):
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT * FROM quiz_questions WHERE quiz_id = %s", (quiz_id,))
        return [QuizQuestion(**row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

def get_answers_by_user(user_id):
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT * FROM quiz_answers WHERE user_id = %s", (user_id,))
        return [QuizAnswer(**row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()
