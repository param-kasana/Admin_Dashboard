# models/analytics_model.py

class GameMetric:
    def __init__(self, id, user_id, start_time, end_time, time_spent, device_type, channel, created_at):
        self.id = id
        self.user_id = user_id
        self.start_time = start_time
        self.end_time = end_time
        self.time_spent = time_spent
        self.device_type = device_type
        self.channel = channel
        self.created_at = created_at

class PageView:
    def __init__(self, id, user_id, page, views, device_type, channel, created_at):
        self.id = id
        self.user_id = user_id
        self.page = page
        self.views = views
        self.device_type = device_type
        self.channel = channel
        self.created_at = created_at

class PageResponseTime:
    def __init__(self, id, user_id, page, response_time, device_type, channel, created_at):
        self.id = id
        self.user_id = user_id
        self.page = page
        self.response_time = response_time
        self.device_type = device_type
        self.channel = channel
        self.created_at = created_at
