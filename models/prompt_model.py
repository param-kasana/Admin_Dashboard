# models/prompt_model.py

class Prompt:
    def __init__(self, id, prompt_text, prompt_type, quiz_name, personality_type, llm_id, created_at, updated_at, language=None):
        self.id = id
        self.prompt_text = prompt_text
        self.prompt_type = prompt_type
        self.quiz_name = quiz_name
        self.personality_type = personality_type
        self.llm_id = llm_id
        self.created_at = created_at
        self.updated_at = updated_at
        self.language = language
        self.llm_name = None  # Optional, added from JOIN

class PromptVersion:
    def __init__(self, id, version_number, prompt_text, prompt_type, quiz_name, personality_type, llm_id, created_at, language=None):
        self.id = id
        self.version_number = version_number
        self.prompt_text = prompt_text
        self.prompt_type = prompt_type
        self.quiz_name = quiz_name
        self.personality_type = personality_type
        self.llm_id = llm_id
        self.created_at = created_at
        self.language = language
        self.llm_name = None  # Optional, added from JOIN
