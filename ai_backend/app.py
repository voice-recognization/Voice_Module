from flask import Flask, request, jsonify
from flask_cors import CORS
from pathlib import Path

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".m4a", ".ogg"}


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "project": "VoiceProof AI",
        "status": "Backend is running",
        "message": "AI Voice Analysis API is ready"
    })


@app.route("/api/analyze", methods=["POST"])
def analyze_audio():
    if "audio" not in request.files:
        return jsonify({
            "error": "No audio file received. Use the field name 'audio'."
        }), 400

    audio = request.files["audio"]

    if not audio.filename:
        return jsonify({"error": "Please select an audio file."}), 400

    extension = Path(audio.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "error": "Unsupported file type."
        }), 400

    return jsonify({
        "filename": Path(audio.filename).name,
        "status": "uploaded",
        "analysis": "pending",
        "message": "Audio received successfully. AI detection is not implemented yet."
    }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)