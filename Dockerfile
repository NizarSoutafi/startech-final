# 1. Image Python stable
FROM python:3.10

# 2. Dossier de travail dans le conteneur
WORKDIR /code

# 3. Copie des requirements (On va chercher dans le dossier backend)
COPY ./backend/requirements.txt /code/requirements.txt

# 4. Installation des dépendances (Mise à jour de pip + installation)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /code/requirements.txt

# 5. Création du dossier pour les poids DeepFace (évite les erreurs de permission)
RUN mkdir -p /root/.deepface/weights

# 6. Copie du code backend
COPY ./backend /code

# 7. Ouverture du port standard Hugging Face
EXPOSE 7860

# 8. Lancement du serveur (Host 0.0.0.0 est vital pour le cloud)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]