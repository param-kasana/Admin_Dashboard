from flask import Blueprint

# Initialize and expose blueprint
prompt_lab_bp = Blueprint("prompt_lab", __name__, template_folder="../templates")

# Import routes to register them with the blueprint
from . import routes
