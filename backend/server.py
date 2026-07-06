import os
import socketio
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import base64
import cv2
import numpy as np
import random
import time
from deepface import DeepFace
from supabase import create_client, Client

# --- 1. SETUP SUPABASE ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://gwjrwejdjpctizolfkcz.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3anJ3ZWpkanBjdGl6b2xma2N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5ODEyNCwiZXhwIjoyMDg0Njc0MTI0fQ.EjU1DGTN-jrdkaC6nJWilFtYZgtu-NKjnfiMVMnHal0")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("☁️ SUPABASE CONNECTÉ")
except Exception as e:
    print(f"❌ ERREUR SUPABASE: {e}")

# --- 2. CONFIG SOCKET ---
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=60,
    max_http_buffer_size=10000000
)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
socket_app = socketio.ASGIApp(sio, app)

# --- 3. API ADMIN ---
@app.get("/api/sessions")
def get_sessions():
    try:
        response = supabase.table('sessions').select("*").order('id', desc=True).execute()
        return response.data
    except: return []

@app.get("/api/sessions/{session_id}")
def get_session_details(session_id: int):
    try:
        sess = supabase.table('sessions').select("*").eq('id', session_id).execute()
        if not sess.data: raise HTTPException(status_code=404, detail="Session introuvable")
        meas = supabase.table('measurements').select("*").eq('session_id', session_id).order('session_time', desc=False).execute()
        return {"info": sess.data[0], "data": meas.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: int):
    try:
        supabase.table('sessions').delete().eq('id', session_id).execute()
        return {"message": "Supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 4. GESTION DES SESSIONS & STATE ---
sessions = {}

# --- FONCTION DE STABILISATION (SMOOTHING) ---
SMOOTHING_FACTOR = 0.5 
camera_state = { "prev_coords": None }

def smooth_coordinates(new_coords, prev_coords):
    if prev_coords is None: return new_coords
    try:
        return {
            'x': int(SMOOTHING_FACTOR * new_coords['x'] + (1 - SMOOTHING_FACTOR) * prev_coords['x']),
            'y': int(SMOOTHING_FACTOR * new_coords['y'] + (1 - SMOOTHING_FACTOR) * prev_coords['y']),
            'w': int(SMOOTHING_FACTOR * new_coords['w'] + (1 - SMOOTHING_FACTOR) * prev_coords['w']),
            'h': int(SMOOTHING_FACTOR * new_coords['h'] + (1 - SMOOTHING_FACTOR) * prev_coords['h'])
        }
    except: return new_coords

@sio.event
async def connect(sid, environ):
    print(f"✅ Client: {sid}")
    sessions[sid] = {
        "active": False,
        "start_time": 0,
        "db_id": None,
        "last_save_time": 0
    }

@sio.event
async def disconnect(sid):
    if sid in sessions: del sessions[sid]

@sio.event
async def start_session(sid, data):
    print(f"▶️ START: {sid}")
    if sid in sessions:
        sessions[sid]["active"] = True
        sessions[sid]["start_time"] = time.time()
        sessions[sid]["last_save_time"] = 0
        
        try:
            new_session = {
                "first_name": data.get('firstName', 'Inconnu'),
                "last_name": data.get('lastName', ''),
                "client_id": data.get('clientId', '')
            }
            res = supabase.table('sessions').insert(new_session).execute()
            sessions[sid]["db_id"] = res.data[0]['id']
            print(f"💾 Session ID {sessions[sid]['db_id']} créée.")
        except Exception as e:
            print(f"⚠️ Erreur Création Session: {e}")

@sio.event
async def stop_session(sid):
    print(f"⏹️ STOP: {sid}")
    if sid in sessions: sessions[sid]["active"] = False

@sio.event
async def process_frame(sid, payload):
    if sid not in sessions: return

    try:
        # A. Décodage
        if isinstance(payload, dict):
            data_uri = payload.get("image", "")
            media_time = payload.get("mediaTime", None)
        else:
            data_uri = payload
            media_time = None

        encoded_data = data_uri.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # B. Analyse IA
        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False, silent=True)
        data = result[0] if isinstance(result, list) else result

        # --- ALGORITHME BIOMÉTRIQUE SCIENTIFIQUE (Modèle Circomplexe de Russell) ---
        raw_scores = data['emotion'] # Dictionnaire des probabilités
        
        # L'émotion dominante réelle
        emotion = data['dominant_emotion']
        emotion_score = data['emotion'][emotion]

        # 1. Poids de Valence (Positivité vs Négativité)
        v_weights = {
            'happy': 1.0, 'surprise': 0.1, 'neutral': 0.0,
            'sad': -0.8, 'angry': -0.8, 'fear': -0.8, 'disgust': -0.9
        }
        
        # 2. Poids d'Arousal (Intensité / Activation)
        a_weights = {
            'happy': 0.6, 'surprise': 0.9, 'neutral': 0.1,
            'sad': 0.2, 'angry': 0.8, 'fear': 0.9, 'disgust': 0.5
        }

        # Calcul continu de Valence et Arousal basé sur toutes les émotions détectées
        valence = sum((raw_scores.get(em, 0) / 100.0) * v_weights.get(em, 0.0) for em in v_weights)
        arousal = sum((raw_scores.get(em, 0) / 100.0) * a_weights.get(em, 0.0) for em in a_weights)

        # C. Coordonnées & Lissage (Fix Jitter)
        region = data['region']
        img_h, img_w, _ = frame.shape
        face_coords = None

        if region['w'] > 0 and not (region['w'] == img_w and region['h'] == img_h):
            raw_coords = {'x': region['x'], 'y': region['y'], 'w': region['w'], 'h': region['h']}
            face_coords = smooth_coordinates(raw_coords, camera_state["prev_coords"])
            camera_state["prev_coords"] = face_coords
        else:
             face_coords = camera_state["prev_coords"]

        # D. Time Update
        current_time = 0
        if sessions[sid]["active"]:
            if media_time is not None:
                current_time = int(media_time)
            else:
                current_time = int(time.time() - sessions[sid]["start_time"])

        noise = random.uniform(-0.02, 0.02)
        def clamp(n): return max(0, min(100, int(n)))

        # CALCUL DES INDICATEURS (Objectifs)
        
        # Engagement : Lié directement à l'Arousal (intensité émotionnelle)
        val_eng = clamp((arousal * 100) + (noise * 100))

        # Satisfaction : Liée directement à la Valence (Positivité) mappée de [-1, 1] vers [0, 100]
        val_sat = clamp(((valence + 1.0) / 2.0) * 100 + (noise * 50)) 

        # Crédibilité (Trust) : Augmente avec une valence positive, baisse drastiquement avec colère/dégoût
        trust_score = 50 + (valence * 30) - (arousal * 10 if valence < 0 else 0)
        val_tru = clamp(trust_score + (noise * 20))

        # Conviction : Requiert un fort engagement ET une bonne satisfaction
        if valence > 0:
            conviction_score = (val_eng * 0.4) + (val_sat * 0.6)
        else:
            conviction_score = val_eng * 0.1 # Pénalité lourde si émotions négatives
        val_conv = clamp(conviction_score)

        # Labels stricts
        lbl_eng = "Fort 🔥" if val_eng > 60 else ("Moyen 😐" if val_eng > 30 else "Faible 💤")
        lbl_sat = "Positif 😃" if val_sat > 55 else ("Négatif 😡" if val_sat < 30 else "Neutre 😐")
        lbl_conv = "CONVAINCU 🚀" if val_conv > 70 else ("Intéressé 👍" if val_conv > 45 else "Hésitant ✋")

        metrics = {
            "engagement": val_eng, "satisfaction": val_sat, 
            "trust": val_tru, "loyalty": val_tru, "opinion": val_sat,
            "conversion": val_conv, "lbl_conv": lbl_conv,
            "lbl_eng": lbl_eng, "lbl_sat": lbl_sat
        }

        # E. Envoi au Frontend
        payload = {
            "emotion": emotion,
            "face_coords": face_coords,
            "metrics": metrics,
            "session_time": current_time,
            "is_recording": sessions[sid]["active"]
        }
        await sio.emit('metrics_update', payload, room=sid)

        # F. Sauvegarde DB
        now = time.time()
        if sessions[sid]["active"] and sessions[sid]["db_id"]:
            if now - sessions[sid]["last_save_time"] >= 1.0:
                sessions[sid]["last_save_time"] = now
                row_data = {
                    "session_id": sessions[sid]["db_id"],
                    "session_time": current_time,
                    "emotion": emotion,
                    "emotion_score": float(emotion_score),
                    "engagement_val": val_eng, "engagement_lbl": lbl_eng,
                    "satisfaction_val": val_sat, "satisfaction_lbl": lbl_sat,
                    "trust_val": val_tru, "loyalty_val": val_tru, "opinion_val": val_sat
                }
                try:
                    supabase.table('measurements').insert(row_data).execute()
                except Exception as db_err:
                    print(f"⚠️ Erreur Insert: {db_err}")

    except Exception:
        pass 

if __name__ == "__main__":
    try:
        DeepFace.build_model("Emotion")
        print("✅ Modèle chargé !")
    except: pass
    uvicorn.run(socket_app, host="0.0.0.0", port=7860)