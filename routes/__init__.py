    # routes/__init__.py

from .core import core_bp

def register_routes(app):
    app.register_blueprint(core_bp)