import hashlib
import os

class AudioService:
    """Audio fingerprinting and clearly-labelled demo assessment.

    This service does NOT contain a trained deepfake detector. The demo assessment
    is marked as unavailable instead of inventing a prediction.
    """

    CHUNK_SIZE = 1024 * 1024

    def analyze(self, file_storage):
        digest = hashlib.sha256()
        size_bytes = 0
        file_storage.stream.seek(0)

        while True:
            chunk = file_storage.stream.read(self.CHUNK_SIZE)
            if not chunk:
                break
            digest.update(chunk)
            size_bytes += len(chunk)

        file_storage.stream.seek(0)
        if size_bytes == 0:
            raise ValueError("The uploaded file is empty.")

        return {
            "sha256": digest.hexdigest(),
            "size_bytes": size_bytes,
            "result": "NOT_ANALYZED",
            "confidence": None,
            "assessment_message": (
                "Cryptographic fingerprint created. AI authenticity assessment "
                "is not available until a trained detection model is integrated."
            ),
        }
