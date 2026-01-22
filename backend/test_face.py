import cv2
from deepface import DeepFace
import time

# Essaie d'ouvrir la caméra (0 par défaut)
cap = cv2.VideoCapture(0)

print("📸 Caméra active. Regarde l'objectif...")
print("Appuie sur la touche 'q' pour quitter.")

last_analysis_time = 0
current_text = "Recherche..."
x, y, w, h = 0, 0, 0, 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("Erreur: Impossible de lire la caméra")
        break

    # Analyse toutes les 0.5 secondes
    if time.time() - last_analysis_time > 0.5:
        try:
            # enforce_detection=False évite le crash si pas de visage
            result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
            
            # DeepFace renvoie une liste
            if isinstance(result, list):
                data = result[0]
            else:
                data = result

            emotion = data['dominant_emotion']
            score = data['emotion'][emotion]
            
            current_text = f"{emotion.upper()} ({int(score)}%)"
            
            region = data['region']
            x, y, w, h = region['x'], region['y'], region['w'], region['h']
            
            last_analysis_time = time.time()
            
        except Exception as e:
            pass

    # Dessine le carré et le texte si un visage est trouvé
    if w > 0:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, current_text, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

    cv2.imshow('NeuroLink Face Test', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
# Force la fermeture des fenêtres sur Mac
for i in range(5):
    cv2.waitKey(1)
