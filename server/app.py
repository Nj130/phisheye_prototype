# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import json, os
from PIL import Image
import imagehash

app = FastAPI(title="PhishEye Match API")

DB_FILE = os.path.join(os.path.dirname(__file__), 'db', 'known_hashes.json')

class MatchRequest(BaseModel):
    phash: str = None
    ocr_text: str = None
    domain: str = None

def load_db():
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, 'r') as f:
        return json.load(f)

@app.post("/match")
async def match(req: MatchRequest):
    if not req.phash:
        raise HTTPException(status_code=400, detail="phash required")
    db = load_db()
    # simple hamming-based scoring
    best_score = 0.0
    best_entry = None
    try:
        our_hash = imagehash.hex_to_hash(req.phash)
    except Exception:
        our_hash = None
    for e in db:
        try:
            db_hash = imagehash.hex_to_hash(e['hash'])
        except Exception:
            continue
        ham = (our_hash - db_hash) if our_hash is not None else 999
        norm = 1.0 - (ham / (our_hash.hash.size if our_hash is not None else 64))
        if norm > best_score:
            best_score = norm
            best_entry = e
    return {"similarity_score": best_score, "best_match": best_entry}
