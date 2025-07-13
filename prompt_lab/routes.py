from flask import request, render_template, jsonify, session
from . import prompt_lab_bp
import aisuite as ai
import re
# Initialize AISuite client
client = ai.Client()

def clean_response(text, format_type):
    if format_type == "poetry":
        lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
        return "\n".join(lines[:2])
    elif format_type == "keywords":
        text = re.sub(r"(?i)^(here (are|is)|the keywords (are|include))[:\-\s]*", "", text)
        parts = [kw.strip() for kw in text.split(",")]
        return ", ".join(parts[:3])
    else:
        return text.strip()


@prompt_lab_bp.route('/prompt-lab', methods=['GET'])
def prompt_lab_page():
    if not session.get('logged_in'):
        return render_template('login.html')
    return render_template('prompt_lab.html')

@prompt_lab_bp.route('/run-prompt', methods=['POST'])
def run_prompt():
    if not session.get('logged_in'):
        return jsonify({ "success": False, "error": "Unauthorized" }), 401

    try:
        data = request.get_json()
        prompt_text = data.get("prompt")
        selected_models = data.get("models", [])
        format_type = data.get("format", "none")  # get format from frontend

        if not prompt_text or not selected_models:
            return jsonify({ "success": False, "error": "Prompt text and at least one model are required" }), 400

        messages = [{"role": "user", "content": prompt_text}]
        results = {}

        for model in selected_models:
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=messages,
                )
                full_text = response.choices[0].message.content
                cleaned_text = clean_response(full_text, format_type)

                results[model] = {
                    "response": cleaned_text
                }
            except Exception as model_err:
                results[model] = {
                    "error": str(model_err)
                }

        return jsonify({ "success": True, "results": results })

    except Exception as e:
        return jsonify({ "success": False, "error": str(e) }), 500
