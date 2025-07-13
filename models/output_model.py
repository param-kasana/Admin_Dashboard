# models/output_model.py

class OutputRepetition:
    def __init__(self, id, output_id, output_name, count, updated_at):
        self.id = id
        self.output_id = output_id
        self.output_name = output_name
        self.count = count
        self.updated_at = updated_at
