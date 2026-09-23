"""
Vercel Serverless Function entrypoint.
Imports the Flask app from server.py so Vercel can serve it.
"""
import sys
import os

# Add the project root to the path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from server import app
