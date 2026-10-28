import os
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
from services.audio_service import AudioService
from services.storage_service import StorageService

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ALLOWED_EXTENSIONS = {"wav", "mp3", "m4a", "ogg", "flac", "aac", "webm"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_UPLOAD_MB", "25")) * 1024 * 1024
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-only-change-me")

storage = StorageService(os.path.join(BASE_DIR, "instance", "voiceproof.db"))
audio_service = AudioService()

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "VoiceProof", "version": "0.2.0"})

@app.post("/api/analyze")
def analyze_audio():
    if "audio" not in request.files:
        return jsonify({"error": "Audio file is required."}), 400
    audio = request.files["audio"]
    if not audio.filename:
        return jsonify({"error": "Choose a file before submitting."}), 400

    safe_name = secure_filename(audio.filename)
    if not safe_name or not allowed_file(safe_name):
        return jsonify({"error": "Unsupported audio format."}), 415

    try:
        analysis = audio_service.analyze(audio)
        record_id = storage.save_analysis(
            filename=safe_name,
            sha256=analysis["sha256"],
            size_bytes=analysis["size_bytes"],
            result=analysis["result"],
            confidence=analysis["confidence"],
        )
        analysis["record_id"] = record_id
        analysis["filename"] = safe_name
        analysis["integrity_note"] = (
            "SHA-256 identifies exact file bytes. It does not prove speaker identity "
            "or independently establish that audio is authentic."
        )
        return jsonify(analysis)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        app.logger.exception("Audio analysis failed")
        return jsonify({"error": "The audio could not be processed."}), 500

@app.get("/api/history")
def history():
    try:
        return jsonify({"records": storage.list_analyses(limit=50)})
    except Exception:
        app.logger.exception("History lookup failed")
        return jsonify({"error": "Could not retrieve history."}), 500

@app.get("/api/history/<int:record_id>")
def get_history_record(record_id):
    record = storage.get_analysis(record_id)
    if not record:
        return jsonify({"error": "Record not found."}), 404
    return jsonify(record)

@app.errorhandler(413)
def upload_too_large(_error):
    return jsonify({"error": "File exceeds the upload size limit."}), 413

if __name__ == "__main__":
    # Local development only. Configure a production WSGI server for deployment.
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=True)
