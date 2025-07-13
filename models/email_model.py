# models/email_model.py

class EmailTemplate:
    def __init__(self, id, template_name, html_content, created_at, updated_at):
        self.id = id
        self.template_name = template_name
        self.html_content = html_content
        self.created_at = created_at
        self.updated_at = updated_at

class EmailSent:
    def __init__(self, id, user_id, email_template_id, opened_at, clicked_at, sent_at):
        self.id = id
        self.user_id = user_id
        self.email_template_id = email_template_id
        self.opened_at = opened_at
        self.clicked_at = clicked_at
        self.sent_at = sent_at
