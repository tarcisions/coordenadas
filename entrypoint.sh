#!/bin/bash

# Inicia VNC com usuário padrão
su - user -c "vncserver :1 -geometry 1280x800 -depth 24"

# Inicia o Flask App
gunicorn --bind 0.0.0.0:5000 app:app
