# 1. Image Python stable
FROM python:3.10

# 2. Dossier de travail
WORKDIR /code

# --- CORRECTION ICI ---
# "libgl1-mesa-glx" n'existe plus, on utilise le nouveau nom "libgl1"
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0

# 3. Copie des requirements
COPY ./backend/requirements.txt /code/requirements.txt

# 4. Installation des dépendances Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /code/requirements.txt

# 5. Création du dossier pour les poids DeepFace
RUN mkdir -p /root/.deepface/weights

# 6. Copie du code backend
COPY ./backend /code

# 7. Ouverture du port
EXPOSE 7860

# 8. Lancement
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]