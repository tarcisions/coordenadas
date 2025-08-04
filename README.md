# Sistema de Captura de Coordenadas PDF

Um sistema Flask para upload de arquivos PDF com visualização e captura precisa de coordenadas. Permite capturar tanto pontos individuais quanto áreas retangulares com precisão matemática.

## Funcionalidades

- ✅ Upload de arquivos PDF (até 50MB)
- ✅ Visualização de PDFs com zoom e navegação por páginas
- ✅ Captura de coordenadas precisas por clique simples (pontos)
- ✅ Seleção de áreas retangulares com arrastar do mouse
- ✅ Conversão matemática de coordenadas tela → PDF original
- ✅ Armazenamento de coordenadas com descrições
- ✅ Interface completamente em português
- ✅ Tema escuro responsivo
- ✅ Banco de dados SQLite (desenvolvimento) / PostgreSQL (produção)

## Instalação Local

### Pré-requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

### Instalação Rápida (Recomendada)

1. **Extrair e configurar automaticamente**
   ```bash
   # Extrair o arquivo ZIP
   unzip pdf-coordinate-system.zip
   cd pdf-coordinate-system
   
   # Executar configuração automática
   python setup.py
   ```

2. **Ativar ambiente e executar**
   ```bash
   # Windows:
   .venv\Scripts\activate
   python main.py
   
   # Linux/Mac:
   source .venv/bin/activate
   python main.py
   ```

3. **Acessar no navegador**
   ```
   http://localhost:5000
   ```

### Instalação Manual

1. **Extrair o projeto**
   ```bash
   unzip pdf-coordinate-system.zip
   cd pdf-coordinate-system
   ```

2. **Criar ambiente virtual**
   ```bash
   python -m venv .venv
   
   # Ativar o ambiente virtual
   # Windows: .venv\Scripts\activate
   # Linux/Mac: source .venv/bin/activate
   ```

3. **Instalar dependências**
   ```bash
   pip install -r requirements_local.txt
   ```

4. **Configurar ambiente**
   ```bash
   # Copiar arquivo de exemplo
   cp .env.example .env
   
   # Editar .env com suas configurações
   # Gerar chave secreta em: https://generate-secret.vercel.app/32
   ```

5. **Criar pastas necessárias**
   ```bash
   mkdir -p uploads temp instance
   ```

6. **Executar o sistema**
   ```bash
   python main.py
   ```

## Como Usar

### Upload de PDF
1. Acesse a página inicial
2. Clique em "Escolher arquivo" e selecione um PDF
3. Clique em "Fazer Upload"

### Captura de Coordenadas

#### Pontos Individuais
- Clique uma vez em qualquer local do PDF
- Aparecerá um modal para adicionar descrição
- As coordenadas exatas serão calculadas automaticamente

#### Áreas Retangulares
- Clique e arraste o mouse para selecionar uma área
- Solte o mouse para confirmar a seleção
- Adicione uma descrição para a área selecionada

### Visualização de Coordenadas
- Pontos aparecem como círculos vermelhos
- Áreas aparecem como retângulos verdes transparentes
- Lista lateral mostra todas as coordenadas capturadas
- Coordenadas incluem posição exata no PDF original

## Estrutura do Projeto

```
pdf-coordinate-system/
├── app.py                 # Configuração principal do Flask
├── main.py               # Ponto de entrada da aplicação
├── models.py             # Modelos do banco de dados
├── routes.py             # Rotas e lógica de negócio
├── requirements.txt      # Dependências Python
├── static/               # Arquivos estáticos
│   ├── css/
│   │   └── style.css    # Estilos personalizados
│   └── js/
│       └── pdf-viewer.js # JavaScript para visualização PDF
├── templates/            # Templates HTML
│   ├── base.html        # Template base
│   ├── index.html       # Página inicial
│   └── viewer.html      # Visualizador PDF
├── uploads/              # PDFs enviados (criado automaticamente)
└── temp/                # Arquivos temporários (criado automaticamente)
```

## Tecnologias Utilizadas

- **Backend**: Flask, SQLAlchemy, PyMuPDF (fitz), Pillow
- **Frontend**: Bootstrap (tema escuro), JavaScript vanilla, HTML5 Canvas
- **Banco de Dados**: SQLite (desenvolvimento), suporte a PostgreSQL
- **Processamento PDF**: PyMuPDF para renderização e extração de dimensões

## Configuração Avançada

### Para Produção (PostgreSQL)
```bash
# Instalar driver PostgreSQL
pip install psycopg2-binary

# Configurar URL do banco
echo "DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco" > .env
```

### Configurações Opcionais
```bash
# Tamanho máximo de upload (padrão: 50MB)
echo "MAX_CONTENT_LENGTH=104857600" >> .env

# Pasta de uploads personalizada
echo "UPLOAD_FOLDER=./meus_uploads" >> .env
```

## Solução de Problemas

### Erro: "ModuleNotFoundError"
- Certifique-se que o ambiente virtual está ativado
- Execute: `pip install -r requirements.txt`

### Erro: "Port 5000 is already in use"
- Altere a porta no final do arquivo `main.py`:
  ```python
  app.run(host='0.0.0.0', port=5001, debug=True)
  ```

### PDF não carrega
- Verifique se o arquivo PDF não está corrompido
- Certifique-se que o PDF tem menos de 50MB
- Verifique as permissões da pasta `uploads/`

### Coordenadas imprecisas
- O sistema usa conversão matemática precisa
- Zoom não afeta a precisão das coordenadas
- Coordenadas são sempre relativas ao PDF original

## Contribuição

Este projeto foi desenvolvido para captura precisa de coordenadas em documentos PDF. Para melhorias ou correções:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## Licença

Projeto desenvolvido para uso educacional e profissional.