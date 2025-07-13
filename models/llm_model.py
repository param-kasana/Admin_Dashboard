# models/llm_model.py

class LLM:
    def __init__(self, id, name, model_name, api_provider, description, created_at):
        self.id = id
        self.name = name
        self.model_name = model_name
        self.api_provider = api_provider
        self.description = description
        self.created_at = created_at
