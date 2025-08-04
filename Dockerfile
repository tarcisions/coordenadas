FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    xfce4 \
    xfce4-terminal \
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
    firefox-esr \
    wget \
    unzip \
    && apt-get clean

# Instalar geckodriver
RUN GECKO_VERSION=v0.33.0 && \
    wget -q "https://github.com/mozilla/geckodriver/releases/download/$GECKO_VERSION/geckodriver-$GECKO_VERSION-linux64.tar.gz" && \
    tar -xzf geckodriver-$GECKO_VERSION-linux64.tar.gz -C /usr/local/bin/ && \
    rm geckodriver-$GECKO_VERSION-linux64.tar.gz

# Criar usuário não root para rodar o ambiente gráfico
RUN useradd -m user && echo "user:password" | chpasswd

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000 5901

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
