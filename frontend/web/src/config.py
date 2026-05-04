import os
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

TARGET_REPOS = [
    repo.strip()
    for repo in os.getenv("TARGET_REPOS", "").split(",")
    if repo.strip()
]

MAX_FILES_PER_REPO = int(os.getenv("MAX_FILES_PER_REPO", "8"))
MAX_CHARS_PER_FILE = int(os.getenv("MAX_CHARS_PER_FILE", "5000"))