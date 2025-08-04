#!/usr/bin/env python3
"""
Script de configuração automática para o Sistema PDF Coordinate Capture
Execute este script para configurar automaticamente o ambiente local.
"""

import os
import sys
import subprocess
import platform

def run_command(command, shell=False):
    """Executa um comando e retorna o resultado"""
    try:
        result = subprocess.run(command, shell=shell, check=True, 
                              capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def check_python_version():
    """Verifica se a versão do Python é adequada"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ é necessário. Versão atual:", 
              f"{version.major}.{version.minor}.{version.micro}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detectado")
    return True

def create_venv():
    """Cria o ambiente virtual"""
    print("\n📦 Criando ambiente virtual...")
    success, output = run_command([sys.executable, "-m", "venv", ".venv"])
    if success:
        print("✅ Ambiente virtual criado com sucesso")
        return True
    else:
        print("❌ Erro ao criar ambiente virtual:", output)
        return False

def get_activation_command():
    """Retorna o comando de ativação do ambiente virtual"""
    if platform.system() == "Windows":
        return ".venv\\Scripts\\activate"
    else:
        return "source .venv/bin/activate"

def install_requirements():
    """Instala as dependências"""
    print("\n📋 Instalando dependências...")
    
    # Determina o executável Python no ambiente virtual
    if platform.system() == "Windows":
        pip_executable = ".venv\\Scripts\\pip"
        python_executable = ".venv\\Scripts\\python"
    else:
        pip_executable = ".venv/bin/pip"
        python_executable = ".venv/bin/python"
    
    # Atualiza pip
    success, output = run_command([python_executable, "-m", "pip", "install", "--upgrade", "pip"])
    if not success:
        print("⚠️ Aviso: Não foi possível atualizar o pip")
    
    # Instala as dependências
    success, output = run_command([pip_executable, "install", "-r", "requirements.txt"])
    if success:
        print("✅ Dependências instaladas com sucesso")
        return True
    else:
        print("❌ Erro ao instalar dependências:", output)
        return False

def create_env_file():
    """Cria o arquivo .env se não existir"""
    if not os.path.exists(".env"):
        print("\n🔧 Criando arquivo de configuração...")
        import secrets
        secret_key = secrets.token_urlsafe(32)
        
        env_content = f"""# Configuração automática gerada
SESSION_SECRET={secret_key}
DATABASE_URL=sqlite:///pdf_coords.db
MAX_CONTENT_LENGTH=52428800
UPLOAD_FOLDER=./uploads
TEMP_FOLDER=./temp
"""
        try:
            with open(".env", "w", encoding="utf-8") as f:
                f.write(env_content)
            print("✅ Arquivo .env criado com chave secreta segura")
            return True
        except Exception as e:
            print(f"❌ Erro ao criar arquivo .env: {e}")
            return False
    else:
        print("✅ Arquivo .env já existe")
        return True

def create_directories():
    """Cria as pastas necessárias"""
    print("\n📁 Criando diretórios necessários...")
    directories = ["uploads", "temp", "instance"]
    
    for directory in directories:
        try:
            os.makedirs(directory, exist_ok=True)
            print(f"✅ Diretório '{directory}' criado/verificado")
        except Exception as e:
            print(f"❌ Erro ao criar diretório '{directory}': {e}")
            return False
    return True

def main():
    """Função principal de configuração"""
    print("🚀 Sistema PDF Coordinate Capture - Configuração Automática")
    print("=" * 60)
    
    # Verificar versão do Python
    if not check_python_version():
        return False
    
    # Criar ambiente virtual
    if not os.path.exists(".venv"):
        if not create_venv():
            return False
    else:
        print("✅ Ambiente virtual já existe")
    
    # Instalar dependências
    if not install_requirements():
        return False
    
    # Criar arquivo .env
    if not create_env_file():
        return False
    
    # Criar diretórios
    if not create_directories():
        return False
    
    print("\n" + "=" * 60)
    print("🎉 Configuração concluída com sucesso!")
    print("\n📋 Próximos passos:")
    print(f"   1. Ative o ambiente virtual: {get_activation_command()}")
    print("   2. Execute o sistema: python main.py")
    print("   3. Abra o navegador em: http://localhost:5000")
    print("\n💡 Dicas:")
    print("   • Edite o arquivo .env para personalizar configurações")
    print("   • Consulte o README.md para informações detalhadas")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Configuração cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        sys.exit(1)