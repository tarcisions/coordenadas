# Imagem base oficial com Python
FROM python:3.11-slim

# Evita prompt durante instalação de pacotes
ENV DEBIAN_FRONTEND=noninteractive

# Instala dependências de sistema (necessárias para Pillow, PyMuPDF etc.)
RUN apt-get update && apt-get install -y \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libpoppler-cpp-dev \
    libgl1 \
    tesseract-ocr \
    ghostscript \
    curl \
    && apt-get clean

# Cria diretório de trabalho
WORKDIR /app

# Copia dependências
COPY requirements.txt .

# Instala dependências Python
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do app
COPY . .

# Define porta
EXPOSE 5000

# Comando de inicialização (ajuste conforme seu app)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
