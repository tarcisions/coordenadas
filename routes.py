import os
import uuid
import fitz  # PyMuPDF
from PIL import Image
from flask import render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from app import app, db
from models import PDFDocument, PDFCoordinate

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    documents = PDFDocument.query.order_by(PDFDocument.upload_date.desc()).all()
    return render_template('index.html', documents=documents)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('Nenhum arquivo foi selecionado', 'error')
        return redirect(request.url)
    
    file = request.files['file']
    
    if file.filename == '':
        flash('Nenhum arquivo foi selecionado', 'error')
        return redirect(request.url)
    
    if file and allowed_file(file.filename):
        try:
            # Generate unique filename
            original_filename = secure_filename(file.filename or 'documento.pdf')
            filename = str(uuid.uuid4()) + '.pdf'
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Save file
            file.save(file_path)
            
            # Process PDF to get dimensions and page count
            pdf_doc = fitz.open(file_path)
            page_count = len(pdf_doc)
            
            # Get dimensions from first page (assuming all pages have same size)
            first_page = pdf_doc[0]
            rect = first_page.rect
            original_width = rect.width
            original_height = rect.height
            
            pdf_doc.close()
            
            # Save to database
            document = PDFDocument()
            document.filename = filename
            document.original_filename = original_filename
            document.file_path = file_path
            document.page_count = page_count
            document.original_width = original_width
            document.original_height = original_height
            
            db.session.add(document)
            db.session.commit()
            
            flash(f'PDF "{original_filename}" carregado com sucesso! ({page_count} páginas)', 'success')
            return redirect(url_for('view_pdf', doc_id=document.id))
            
        except Exception as e:
            app.logger.error(f"Erro ao processar PDF: {str(e)}")
            flash('Erro ao processar o arquivo PDF', 'error')
            return redirect(request.url)
    
    else:
        flash('Formato de arquivo não permitido. Apenas arquivos PDF são aceitos.', 'error')
        return redirect(request.url)

@app.route('/view/<int:doc_id>')
def view_pdf(doc_id):
    document = PDFDocument.query.get_or_404(doc_id)
    return render_template('viewer.html', document=document)

@app.route('/api/pdf/<int:doc_id>/page/<int:page_num>')
def get_pdf_page(doc_id, page_num):
    """Convert PDF page to image for display"""
    document = PDFDocument.query.get_or_404(doc_id)
    
    if page_num < 1 or page_num > document.page_count:
        return jsonify({'error': 'Número de página inválido'}), 400
    
    try:
        # Open PDF
        pdf_doc = fitz.open(document.file_path)
        page = pdf_doc[page_num - 1]  # 0-indexed
        
        # Convert to image with high DPI for precision
        dpi = 150  # High DPI for precise coordinate mapping
        mat = fitz.Matrix(dpi/72, dpi/72)  # Scale matrix
        pix = page.get_pixmap(matrix=mat)
        
        # Save as temporary image
        temp_filename = f"page_{doc_id}_{page_num}_{dpi}.png"
        temp_path = os.path.join(app.config['TEMP_FOLDER'], temp_filename)
        pix.save(temp_path)
        
        pdf_doc.close()
        
        # Get image dimensions
        img = Image.open(temp_path)
        img_width, img_height = img.size
        
        return jsonify({
            'success': True,
            'image_url': url_for('serve_temp_file', filename=temp_filename),
            'image_width': img_width,
            'image_height': img_height,
            'original_width': document.original_width,
            'original_height': document.original_height,
            'dpi': dpi,
            'scale_factor': dpi/72
        })
        
    except Exception as e:
        app.logger.error(f"Erro ao converter página do PDF: {str(e)}")
        return jsonify({'error': 'Erro ao processar página do PDF'}), 500

@app.route('/temp/<filename>')
def serve_temp_file(filename):
    return send_from_directory(app.config['TEMP_FOLDER'], filename)

@app.route('/api/coordinates', methods=['POST'])
def save_coordinates():
    """Save clicked coordinates or selected areas"""
    data = request.get_json()
    
    required_fields = ['document_id', 'page_number', 'x', 'y', 'screen_x', 'screen_y', 'scale_factor']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Dados incompletos'}), 400
    
    try:
        coordinate = PDFCoordinate()
        coordinate.document_id = data['document_id']
        coordinate.page_number = data['page_number']
        coordinate.x = data['x']
        coordinate.y = data['y']
        coordinate.screen_x = data['screen_x']
        coordinate.screen_y = data['screen_y']
        coordinate.scale_factor = data['scale_factor']
        coordinate.description = data.get('description', '')
        coordinate.coordinate_type = data.get('type', 'point')
        
        # Se for uma área, salvar dimensões
        if coordinate.coordinate_type == 'area':
            coordinate.width = data.get('width', 0)
            coordinate.height = data.get('height', 0)
        
        db.session.add(coordinate)
        db.session.commit()
        
        coord_type_text = 'área' if coordinate.coordinate_type == 'area' else 'coordenada'
        
        return jsonify({
            'success': True,
            'coordinate_id': coordinate.id,
            'message': f'{coord_type_text.capitalize()} salva com sucesso'
        })
        
    except Exception as e:
        app.logger.error(f"Erro ao salvar coordenadas: {str(e)}")
        return jsonify({'error': 'Erro ao salvar coordenadas'}), 500

@app.route('/api/coordinates/<int:doc_id>/<int:page_num>')
def get_coordinates(doc_id, page_num):
    """Get saved coordinates for a specific page"""
    coordinates = PDFCoordinate.query.filter_by(
        document_id=doc_id,
        page_number=page_num
    ).order_by(PDFCoordinate.timestamp.desc()).all()
    
    result = []
    for coord in coordinates:
        coord_data = {
            'id': coord.id,
            'x': coord.x,
            'y': coord.y,
            'screen_x': coord.screen_x,
            'screen_y': coord.screen_y,
            'scale_factor': coord.scale_factor,
            'description': coord.description,
            'timestamp': coord.timestamp.isoformat(),
            'coordinate_type': coord.coordinate_type or 'point'
        }
        
        # Se for área, incluir dimensões
        if coord.coordinate_type == 'area':
            coord_data['width'] = coord.width or 0
            coord_data['height'] = coord.height or 0
            
        result.append(coord_data)
    
    return jsonify(result)

@app.route('/api/coordinates/<int:coord_id>', methods=['DELETE'])
def delete_coordinate(coord_id):
    """Delete a coordinate"""
    coordinate = PDFCoordinate.query.get_or_404(coord_id)
    
    try:
        db.session.delete(coordinate)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Coordenada excluída com sucesso'})
    except Exception as e:
        app.logger.error(f"Erro ao excluir coordenada: {str(e)}")
        return jsonify({'error': 'Erro ao excluir coordenada'}), 500

@app.route('/delete/<int:doc_id>', methods=['POST'])
def delete_document(doc_id):
    """Delete a PDF document and its coordinates"""
    document = PDFDocument.query.get_or_404(doc_id)
    
    try:
        # Delete file from filesystem
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        # Delete from database (coordinates will be deleted due to CASCADE)
        db.session.delete(document)
        db.session.commit()
        
        flash(f'Documento "{document.original_filename}" excluído com sucesso', 'success')
        
    except Exception as e:
        app.logger.error(f"Erro ao excluir documento: {str(e)}")
        flash('Erro ao excluir documento', 'error')
    
    return redirect(url_for('index'))
