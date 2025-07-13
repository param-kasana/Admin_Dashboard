# services/llm_service.py

from db import get_cursor
from models.llm_model import LLM

def get_all_llms():
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT * FROM llms")
        return [LLM(**row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()
