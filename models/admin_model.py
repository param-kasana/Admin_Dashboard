# models/admin_model.py

class AdminUser:
    def __init__(self, id, email, password_hash, role, created_at):
        self.id = id
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.created_at = created_at

class AuditLog:
    def __init__(self, id, admin_user_id, action_type, description, created_at):
        self.id = id
        self.admin_user_id = admin_user_id
        self.action_type = action_type
        self.description = description
        self.created_at = created_at
