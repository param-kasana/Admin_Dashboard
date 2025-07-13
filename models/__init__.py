# models/__init__.py

from .user_model import User
from .quiz_model import Quiz, QuizQuestion, QuizAnswer
from .result_model import Poster, UserResult
from .prompt_model import Prompt, PromptVersion
from .llm_model import LLM
from .email_model import EmailTemplate, EmailSent
from .admin_model import AdminUser, AuditLog
from .analytics_model import GameMetric, PageView, PageResponseTime
from .output_model import OutputRepetition
