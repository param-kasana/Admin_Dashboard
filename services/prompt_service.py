# services/prompt_service.py

from db import get_cursor
from  models.prompt_model import Prompt, PromptVersion
import psycopg2
from psycopg2 import sql
from datetime import datetime

def get_all_prompts():
    cur, conn = get_cursor()
    try:
        cur.execute("""
            SELECT p.*, l.name AS llm_name
            FROM prompts p
            LEFT JOIN llms l ON p.llm_id = l.id
        """)
        rows = cur.fetchall()
        prompts = []
        for row in rows:
            llm_name = row.pop("llm_name", None)
            prompt = Prompt(**row)
            prompt.llm_name = llm_name
            prompts.append(prompt)
        return prompts
    finally:
        cur.close()
        conn.close()

def get_recent_prompts(limit=100):
    cur, conn = get_cursor()
    try:
        cur.execute("""
            SELECT pv.*, l.name AS llm_name
            FROM prompt_versions pv
            LEFT JOIN llms l ON pv.llm_id = l.id
            ORDER BY pv.created_at DESC, pv.version_number DESC
            LIMIT %s;
        """, (limit,))
        
        rows = cur.fetchall()
        prompts = []
        for row in rows:
            llm_name = row.pop("llm_name", None)
            version = PromptVersion(
                id=row["id"],
                version_number=row["version_number"],
                prompt_text=row["prompt_text"],
                prompt_type=row["prompt_type"],
                quiz_name=row["quiz_name"],
                personality_type=row["personality_type"],
                llm_id=row["llm_id"],
                language=row["language"],
                created_at=row["created_at"]
            )
            version.llm_name = llm_name
            prompts.append(version)
        return prompts
    finally:
        cur.close()
        conn.close()

def delete_prompt_version(quiz_name, personality_type, version_number, language):
    cur, conn = get_cursor()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM prompt_versions
                    WHERE quiz_name = %s AND personality_type = %s AND version_number = %s AND language = %s;
                """, (quiz_name, personality_type, version_number, language))
    finally:
        cur.close()
        conn.close()


def save_prompt(prompt_text, prompt_type, quiz_name, personality_type, llm_id, language="English"):
    cur, conn = get_cursor()
    try:
        with conn:
            with conn.cursor() as cur:
                # Step 1: Get max version number for the same quiz, personality, type, and language
                cur.execute("""
                    SELECT MAX(version_number) FROM prompt_versions
                    WHERE quiz_name = %s AND personality_type = %s 
                          AND prompt_type = %s AND language = %s;
                """, (quiz_name, personality_type, prompt_type, language))
                
                result = cur.fetchone()
                next_version = (result[0] or 0) + 1

                # Step 1.5: Backup current prompt (if any) into prompt_versions
                cur.execute("""
                    SELECT prompt_text, prompt_type, quiz_name, 
                    personality_type, llm_id, created_at, language FROM prompts
                    WHERE quiz_name = %s AND personality_type = %s 
                          AND prompt_type = %s AND language = %s;
                """, (quiz_name, personality_type, prompt_type, language))
                
                existing_prompt = cur.fetchone()

                if existing_prompt:
                    cur.execute("""
                        INSERT INTO prompt_versions (
                            version_number, prompt_text, prompt_type,
                            quiz_name, personality_type, llm_id, created_at, language
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                    """, (
                        next_version,
                        existing_prompt[0],  # prompt_text
                        existing_prompt[1],  # prompt_type
                        existing_prompt[2],  # quiz_name
                        existing_prompt[3],  # personality_type
                        existing_prompt[4],  # llm_id
                        existing_prompt[5],  # created_at
                        existing_prompt[6],  # language
                    ))

                # Step 2: Delete old prompt from prompts
                cur.execute("""
                    DELETE FROM prompts
                    WHERE quiz_name = %s AND personality_type = %s 
                          AND prompt_type = %s AND language = %s;
                """, (quiz_name, personality_type, prompt_type, language))

                # Step 3: Insert new prompt
                cur.execute("""
                    INSERT INTO prompts (
                        prompt_text, prompt_type, quiz_name,
                        personality_type, llm_id, created_at, updated_at, language
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    prompt_text, prompt_type, quiz_name,
                    personality_type, llm_id, datetime.now(), datetime.now(), language
                ))

                print("✅ Prompt saved and versioned successfully.")

    except Exception as e:
        print("❌ Error during prompt saving:", e)
        conn.rollback()

def fetch_latest_ai_setting():
    cur, conn = get_cursor()
    try:
        cur.execute("SELECT is_enabled FROM ai_settings LIMIT 1")
        result = cur.fetchone()
        return result["is_enabled"] if result else False
    finally:
        cur.close()
        conn.close()


def update_ai_setting(enabled: bool):
    cur, conn = get_cursor()
    try:
        with conn:
            with conn.cursor() as cur:
                # Check if any row exists
                cur.execute("SELECT COUNT(*) FROM ai_settings")
                count = cur.fetchone()[0]

                if count == 0:
                    # Insert only if no row exists
                    cur.execute("""
                        INSERT INTO ai_settings (is_enabled, updated_at)
                        VALUES (%s, NOW())
                    """, (enabled,))
                else:
                    # Otherwise update the existing row (singleton row pattern)
                    cur.execute("""
                        UPDATE ai_settings
                        SET is_enabled = %s, updated_at = NOW()
                        WHERE id = (SELECT id FROM ai_settings LIMIT 1)
                    """, (enabled,))
    finally:
        cur.close()
        conn.close()

