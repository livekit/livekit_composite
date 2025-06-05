from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_livekit import LiveKit
import os
from dotenv import load_dotenv
import logging
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / '.env')

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="frontend/dist")
CORS(app)

# Configure and initialize LiveKit
app.config.update(
    LIVEKIT_API_KEY=os.getenv("LIVEKIT_API_KEY"),
    LIVEKIT_API_SECRET=os.getenv("LIVEKIT_API_SECRET"),
    LIVEKIT_HOST=os.getenv("LIVEKIT_HOST"),
    SIP_TRUNK_ID=os.getenv("SIP_TRUNK_ID")
)
livekit = LiveKit(app)

# Error handler for 500 errors
@app.errorhandler(500)
def handle_500_error(error):
    logger.error(f"Internal Server Error: {error}", exc_info=True)
    return jsonify({"error": "Internal Server Error", "message": str(error)}), 500

# Serve React static files
# NOTE: Before running the app, you need to build the React app:
# ~ cd frontend && npm install && npm run build
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path.startswith("assets/"):
        return send_from_directory(app.static_folder, path)
    elif path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True, port=5001)