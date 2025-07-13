# models/quiz_model.py


class Quiz:
    def __init__(self, id, name, personality_type, description, created_at):
        self.id = id
        self.name = name
        self.personality_type = personality_type
        self.description = description
        self.created_at = created_at

class QuizQuestion:
    def __init__(self, id, quiz_id, question_text, order, created_at):
        self.id = id
        self.quiz_id = quiz_id
        self.question_text = question_text
        self.order = order
        self.created_at = created_at

class QuizAnswer:
    def __init__(self, id, user_id, quiz_id, question_id, selected_answer, created_at):
        self.id = id
        self.user_id = user_id
        self.quiz_id = quiz_id
        self.question_id = question_id
        self.selected_answer = selected_answer
        self.created_at = created_at
