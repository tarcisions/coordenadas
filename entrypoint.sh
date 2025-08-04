#!/bin/bash

# Iniciar VNC server na display :1
su - user -c "vncserver :1 -geometry 1280x800 -depth 24"

# Exportar display para usar com Selenium e PyAutoGUI
export DISPLAY=:1

# Rodar seu app Flask (se tiver)
gunicorn --bind 0.0.0.0:5000 app:app
