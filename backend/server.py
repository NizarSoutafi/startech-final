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
from datetime import datetime
from deepface import DeepFace
from supabase import create_client, Client

# --- CONFIGURATION SUPABASE (BACKEND) ---
# ⚠️ REMPLACEZ PAR VOS CLÉS (Supabase > Settings > API)
# ICI IL FAUT LA CLÉ SECRÈTE "SERVICE_ROLE" POUR POUVOIR ECRIRE/SUPPRIMER
SUPABASE_URL = 'https://gwjrwejdjpctizolfkcz.supabase.co'
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3anJ3ZWpkanBjdGl6b2xma2N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA5ODEyNCwiZXhwIjoyMDg0Njc0MTI0fQ.EjU1DGTN-jrdkaC6nJWilFtYZgtu-NKjnfiMVMnHal0" 

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("☁️ Connecté à Supabase (PerseeTech)")
except Exception as e:
    print(f"❌ Erreur de connexion Supabase : {e}")

# --- CONFIGURATION SERVEUR ---
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
socket_app = socketio.ASGIApp(sio, app)

# --- API REST (Lecture pour l'Admin) ---
@app.get("/api/sessions")
def get_sessions():
    response = supabase.table('sessions').select("*").order('id', desc=True).execute()
    return response.data

@app.get("/api/sessions/{session_id}")
def get_session_details(session_id: int):
    sess = supabase.table('sessions').select("*").eq('id', session_id).execute()
    if not sess.data:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    meas = supabase.table('measurements').select("*").eq('session_id', session_id).order('session_time', desc=False).execute()
    return {"info": sess.data[0], "data": meas.data}

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: int):
    try:
        supabase.table('sessions').delete().eq('id', session_id).execute()
        return {"message": "Session supprimée avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- LOGIQUE MÉTIER (KPIs - SANS BPM) ---
def calculate_kpis(emotion):
    valence = 0.0; arousal = 0.0; noise = random.uniform(-0.05, 0.05)
    if emotion == "happy": valence = 0.8 + noise; arousal = 0.6 + noise
    elif emotion == "surprise": valence = 0.2 + noise; arousal = 0.9 + noise
    elif emotion in ["fear", "angry"]: valence = -0.7 + noise; arousal = 0.8 + noise
    elif emotion == "disgust": valence = -0.8 + noise; arousal = 0.5 + noise
    elif emotion == "sad": valence = -0.6 + noise; arousal = 0.2 + noise
    else: valence = 0.0 + noise; arousal = 0.3 + noise

    def clamp(n): return max(0, min(100, int(n)))
    val_eng = clamp((arousal * 100) + random.uniform(0, 5))
    val_sat = clamp(((valence + 1) / 2) * 100)
    val_tru = clamp(50 + (valence * 40) + random.uniform(0, 5)) if valence > 0 else clamp(50 - (abs(valence) * 40) + random.uniform(0, 5))
    val_loy = clamp((val_sat * 0.7) + (val_tru * 0.3))
    val_opi = val_sat

    # Labels
    if val_eng >= 75: lbl_eng = "Engagement Fort 🔥"
    elif val_eng >= 40: lbl_eng = "Engagement Moyen"
    else: lbl_eng = "Désengagement 💤"

    if val_sat >= 70: lbl_sat = "Très Satisfait 😃"
    elif val_sat >= 45: lbl_sat = "Neutre 😐"
    else: lbl_sat = "Insatisfait 😡"
    
    if val_tru >= 70: lbl_tru = "Confiance Totale 🤝"
    elif val_tru >= 40: lbl_tru = "Sceptique 🤔"
    else: lbl_tru = "Méfiant 🚩"

    if val_loy >= 75: lbl_loy = "Fidèle (Ambassadeur) 💎"
    elif val_loy >= 50: lbl_loy = "Client Standard"
    else: lbl_loy = "Infidèle / Volatile 💸"

    if val_opi >= 60: lbl_opi = "Avis Positif 👍"
    elif val_opi >= 40: lbl_opi = "Indécis"
    else: lbl_opi = "Avis Négatif 👎"

    return {
        "engagement": val_eng, "satisfaction": val_sat, "trust": val_tru, "loyalty": val_loy, "opinion": val_opi,
        "lbl_eng": lbl_eng, "lbl_sat": lbl_sat, "lbl_tru": lbl_tru, "lbl_loy": lbl_loy, "lbl_opi": lbl_opi
    }

# --- ETAT IA ---
camera_state = { "emotion": "neutral", "emotion_score": 0, "face_coords": None }
active_sessions = {}

# TÂCHE 1 : RECEPTION IMAGE (CLIENT -> SERVER)
@sio.event
async def process_frame(sid, data_uri):
    try:
        encoded_data = data_uri.split(',')[1]
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Analyse DeepFace
        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False, silent=True)
        data = result[0] if isinstance(result, list) else result
        
        camera_state["emotion"] = data['dominant_emotion']
        camera_state["emotion_score"] = data['emotion'][data['dominant_emotion']]
        
        region = data['region']
        if region['w'] > 0:
            camera_state["face_coords"] = {'x': region['x'], 'y': region['y'], 'w': region['w'], 'h': region['h']}
        else:
            camera_state["face_coords"] = None
    except:
        camera_state["face_coords"] = None

# TÂCHE 2 : GESTION SESSION (Boucle infinie)
async def session_manager_loop():
    while True:
        for sid, user_data in list(active_sessions.items()):
            kpis = calculate_kpis(camera_state["emotion"])
            
            if user_data["is_recording"]:
                user_data["session_time"] += 1
                t = user_data["session_time"]
                
                # ENREGISTREMENT DB SUPABASE
                if user_data["db_id"]:
                    try:
                        data_to_insert = {
                            "session_id": user_data["db_id"],
                            "session_time": t,
                            "emotion": camera_state["emotion"],
                            "emotion_score": camera_state["emotion_score"],
                            "engagement_val": kpis["engagement"], "engagement_lbl": kpis["lbl_eng"],
                            "satisfaction_val": kpis["satisfaction"], "satisfaction_lbl": kpis["lbl_sat"],
                            "trust_val": kpis["trust"], "trust_lbl": kpis["lbl_tru"],
                            "loyalty_val": kpis["loyalty"], "loyalty_lbl": kpis["lbl_loy"],
                            "opinion_val": kpis["opinion"], "opinion_lbl": kpis["lbl_opi"]
                        }
                        supabase.table('measurements').insert(data_to_insert).execute()
                    except Exception as e: print(f"Supabase Insert Error: {e}")

            await sio.emit('metrics_update', {
                "emotion": camera_state["emotion"], "metrics": kpis, 
                "face_coords": camera_state["face_coords"], 
                "session_time": user_data["session_time"], 
                "is_recording": user_data["is_recording"]
            }, room=sid)
        await asyncio.sleep(1)

@sio.event
async def connect(sid, environ): active_sessions[sid] = { "is_recording": False, "session_time": 0, "db_id": None }
@sio.event
async def disconnect(sid): 
    if sid in active_sessions: del active_sessions[sid]
@sio.event
async def start_session(sid, data):
    user_session = active_sessions.get(sid)
    if user_session:
        user_session["is_recording"] = True
        user_session["session_time"] = 0
        
        new_session = {
            "first_name": data.get('firstName'),
            "last_name": data.get('lastName'),
            "client_id": data.get('clientId')
        }
        res = supabase.table('sessions').insert(new_session).execute()
        user_session["db_id"] = res.data[0]['id']

@sio.event
async def stop_session(sid):
    user_session = active_sessions.get(sid)
    if user_session: user_session["is_recording"] = False

if __name__ == "__main__":
    @app.on_event("startup")
    async def startup_event():
        asyncio.create_task(session_manager_loop())
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)