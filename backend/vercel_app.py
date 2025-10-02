# Vercel adapter for FastAPI
from app.main import app

# Vercel requires a handler function
def handler(request, response):
    return app(request, response)