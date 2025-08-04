FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    xfce4 \
    tightvncserver \
    dbus-x11 \
    x11-xserver-utils \
    supervisor \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libpoppler-cpp-dev \
    libgl1 \
    tesseract-ocr \
    ghostscript \
    curl \
    build-essential \
    && apt-get clean

# Cria usuário padrão
RUN useradd -m user
RUN echo "user:password" | chpasswd

# Define diretório de trabalho
WORKDIR /app

# Copia dependências
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do app
COPY . .

# Expondo Flask (5000) e VNC (5901)
EXPOSE 5000 5901

# Script de inicialização do VNC
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Comando de inicialização
CMD ["/entrypoint.sh"]
