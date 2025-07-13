# models/result_model.py

class Poster:
    def __init__(self, id, user_id, poster_url, created_at):
        self.id = id
        self.user_id = user_id
        self.poster_url = poster_url
        self.created_at = created_at

class UserResult:
    def __init__(self, id, user_id, quiz_id, personality_type, created_at):
        self.id = id
        self.user_id = user_id
        self.quiz_id = quiz_id
        self.personality_type = personality_type
        self.created_at = created_at
