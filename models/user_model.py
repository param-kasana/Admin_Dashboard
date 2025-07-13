# models/user_model.py

class User:
    def __init__(self, id, email, name, created_at, updated_at):
        self.id = id  # int
        self.email = email  # str
        self.name = name  # str
        self.created_at = created_at  # datetime
        self.updated_at = updated_at  # datetime
