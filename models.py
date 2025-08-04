from app import db
from datetime import datetime

class PDFDocument(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    page_count = db.Column(db.Integer, nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # PDF dimensions for coordinate mapping
    original_width = db.Column(db.Float, nullable=False)
    original_height = db.Column(db.Float, nullable=False)
    
    coordinates = db.relationship('PDFCoordinate', backref='document', lazy=True, cascade='all, delete-orphan')

class PDFCoordinate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('pdf_document.id'), nullable=False)
    page_number = db.Column(db.Integer, nullable=False)
    x = db.Column(db.Float, nullable=False)  # Coordenada X exata no PDF original
    y = db.Column(db.Float, nullable=False)  # Coordenada Y exata no PDF original
    screen_x = db.Column(db.Float, nullable=False)  # Coordenada X na tela
    screen_y = db.Column(db.Float, nullable=False)  # Coordenada Y na tela
    scale_factor = db.Column(db.Float, nullable=False)  # Fator de escala usado
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(500))  # Descrição opcional do ponto
    
    # Campos para captura de área
    coordinate_type = db.Column(db.String(10), default='point')  # 'point' ou 'area'
    width = db.Column(db.Float)  # Largura da área (apenas para type='area')
    height = db.Column(db.Float)  # Altura da área (apenas para type='area')
