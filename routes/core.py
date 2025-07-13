# routes/core.py

from flask import Blueprint, jsonify, request, session
from flask import current_app 
from services import (
    user_service, quiz_service, result_service,
    prompt_service, llm_service, ai_service
)
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

core_bp = Blueprint("core", __name__)

@core_bp.route("/api/users", methods=["GET"])
def get_users():
    users = user_service.get_all_users()
    return jsonify([u.__dict__ for u in users])

@core_bp.route("/api/users/filter", methods=["GET"])
def get_users_filtered():
    quiz = request.args.get("quiz")
    personality = request.args.get("personality")
    if not quiz or not personality:
        return jsonify([]) 
    users = user_service.get_users_by_quiz_and_personality(quiz, personality)
    return jsonify(users)

@core_bp.route("/quizzes", methods=["GET"])
def get_quizzes():
    quizzes = quiz_service.get_all_quizzes()
    return jsonify([q.__dict__ for q in quizzes])

@core_bp.route("/questions/<int:quiz_id>", methods=["GET"])
def get_quiz_questions(quiz_id):
    questions = quiz_service.get_questions_by_quiz(quiz_id)
    return jsonify([q.__dict__ for q in questions])

@core_bp.route("/answers/<int:user_id>", methods=["GET"])
def get_answers(user_id):
    answers = quiz_service.get_answers_by_user(user_id)
    return jsonify([a.__dict__ for a in answers])

@core_bp.route("/results/<int:user_id>", methods=["GET"])
def get_user_result(user_id):
    result = result_service.get_result_by_user(user_id)
    return jsonify(result.__dict__ if result else {})

@core_bp.route("/prompts", methods=["GET"])
def get_prompts():
    prompts = prompt_service.get_all_prompts()
    return jsonify([p.__dict__ for p in prompts])

@core_bp.route("/prompts/recent", methods=["GET"])
def get_recent_prompts():
    recent = prompt_service.get_recent_prompts(limit=100)
    return jsonify([r.__dict__ for r in recent])

@core_bp.route("/llms", methods=["GET"])
def get_llms():
    llms = llm_service.get_all_llms()
    return jsonify([l.__dict__ for l in llms])

@core_bp.route("/save-prompt", methods=["POST"])
def save_prompts_with_versions():
    data = request.get_json()
    try:
        prompt_service.save_prompt(
            prompt_text=data["prompt_text"],
            prompt_type=data["prompt_type"],
            quiz_name=data["quiz_name"],
            personality_type=data["personality_type"],
            llm_id=data["llm_id"],
            language=data.get("language")  
        )
        return jsonify({"message": "Prompt saved"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@core_bp.route("/prompts/all", methods=["GET"])
def get_all_prompts_with_versions():
    current = prompt_service.get_all_prompts()
    previous = prompt_service.get_recent_prompts(limit=100)
    return jsonify({
        "current": [p.__dict__ for p in current],
        "previous": [p.__dict__ for p in previous]
    })

@core_bp.route("/prompt-version", methods=["DELETE"])
def delete_prompt_version():
    data = request.get_json()
    try:
        quiz_name = data["quiz_name"]
        personality_type = data["personality_type"]
        version_number = data["version_number"]
        language = data.get("language") 

        prompt_service.delete_prompt_version(quiz_name, personality_type, version_number, language)
        return jsonify({"message": "Prompt version deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@core_bp.route("/api/generate-email-content", methods=["POST"])
def api_generate_email_content():
    if not session.get("logged_in"):
        return jsonify({"error": "Unauthorized access. Please log in."}), 401

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request. No JSON data received."}), 400

    custom_prompt = data.get("prompt")
    temperature = data.get("temperature", 0.7) # Default if not sent
    mbti_type = data.get("mbti_type")

    if not custom_prompt:
        return jsonify({"error": "Prompt is required to generate content."}), 400
    
    try:
        temperature = float(temperature)
        if not (0.0 <= temperature <= 2.0):
            return jsonify({"error": "Temperature must be between 0.0 and 2.0."}), 400
    except ValueError:
        return jsonify({"error": "Invalid temperature value."}), 400

    try:
        generated_text = ai_service.generate_content_with_groq(
            user_prompt=custom_prompt, 
            temperature_val=temperature, 
            mbti_type_val=mbti_type
        )
        return jsonify({"generated_text": generated_text})
    except ValueError as ve: # Specifically for API key or config errors
        current_app.logger.error(f"Configuration error in email generation: {str(ve)}")
        return jsonify({"error": str(ve)}), 500
    except Exception as e:
        current_app.logger.error(f"Failed to generate email content via Groq: {str(e)}")
        return jsonify({"error": f"An error occurred while generating content: {str(e)}"}), 500


@core_bp.route("/send-composed-email", methods=["POST"])
def send_composed_email():
    recipient_emails = request.form.getlist("recipients[]")
    subject = request.form.get("subject")
    html_body = request.form.get("html_body")
    attachment = request.files.get("attachment")

    quiz = request.form.get("quiz")
    personality = request.form.get("personality")

    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_username = "visionversetest@gmail.com"
    smtp_password = "mjvqutjfqggkxukj"
    sender_email = "visionversetest@gmail.com"
    # password = "visionversetest@123!"

    if not all([smtp_server, smtp_port, smtp_username, smtp_password, sender_email]):
        return jsonify({"error": "SMTP configuration incomplete"}), 500

    if not recipient_emails:
        return jsonify({"error": "No recipients selected."}), 400

    try:
        # Fetch users and create a map: email → user object
        user_list = user_service.get_all_users()
        email_user_map = {user.email: user for user in user_list}

        # Find the prompt for this quiz/personality
        prompt_obj = None
        prompts = prompt_service.get_all_prompts()
        for p in prompts:
            if p.prompt_type == "email" and p.quiz_name == quiz and p.personality_type == personality:
                prompt_obj = p
                break

        if not prompt_obj:
            return jsonify({"error": "No matching prompt found for selected quiz/personality."}), 400

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)

            llms = llm_service.get_all_llms()
            llm_id_to_model = {}
            for llm in llms:
                llm_id_to_model[llm.id] = f"{llm.api_provider}:{llm.model_name}"

            for recipient in recipient_emails:
                user = email_user_map.get(recipient)
                first_name = user.name.split()[0] if user and user.name else recipient

                # Generate AI content for this recipient
                llm_id = getattr(prompt_obj, "llm_id", None)
                model_name = llm_id_to_model.get(llm_id, "groq:llama3-8b-8192") 

                ai_content = ai_service.generate_content_with_groq(
                    user_prompt=prompt_obj.prompt_text,
                    temperature_val=0.7,
                    mbti_type_val=prompt_obj.personality_type,
                    model_name=model_name,
                    quiz_type_val=prompt_obj.quiz_name
                )

                personalized_body = html_body.replace("[Name]", first_name)
                personalized_body = personalized_body.replace("[AI-Generated Content Will Be Inserted Here]", ai_content)

                msg = MIMEMultipart()
                msg["From"] = sender_email
                msg["To"] = recipient
                msg["Subject"] = subject
                msg.attach(MIMEText(personalized_body, "html"))

                if attachment:
                    part = MIMEApplication(attachment.read(), Name=attachment.filename)
                    part["Content-Disposition"] = f'attachment; filename="{attachment.filename}"'
                    msg.attach(part)
                    attachment.stream.seek(0)

                server.sendmail(sender_email, recipient, msg.as_string())

        return jsonify({"message": "Personalized emails sent successfully."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@core_bp.route("/api/ai-setting", methods=["GET"])
def get_ai_setting():
    try:
        is_enabled = prompt_service.fetch_latest_ai_setting()
        return jsonify({"is_enabled": is_enabled})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@core_bp.route("/api/ai-setting", methods=["POST"])
def update_ai_setting():
    try:
        data = request.get_json()
        enabled = data.get("is_enabled", False)
        prompt_service.update_ai_setting(enabled)
        return jsonify({"message": "AI setting updated", "is_enabled": enabled})
    except Exception as e:
        return jsonify({"error": str(e)}), 500