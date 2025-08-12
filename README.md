🐟PhishEye Detector - Prototype
Prototype browser extension + server that detects lookalike login pages using perceptual hashing + OCR.

# Run extension (Chrome)
Build folder extension/ from files above and include tesseract assets.
Open chrome://extensions -> Developer mode -> Load unpacked -> select extension/.

# Run server
cd server
python -m pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Note
This is a prototype. Do NOT send raw screenshots to the server in production. Use redaction or feature-only payloads.
Improve robustness by replacing basic phash with VisualPhishNet embeddings or FAISS-based search.
References: Tesseract.js examples, phash-js, imagehash (Python), and FastAPI guides.

Credit: Neeraj Patil
