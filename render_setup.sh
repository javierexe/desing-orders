#!/bin/bash

# Render.com setup script para Tesseract OCR
# Este script instala Tesseract y las dependencias necesarias

set -e

echo "🔧 Iniciando setup de Tesseract OCR en Render..."

# Actualizar lista de paquetes
echo "📦 Actualizando lista de paquetes..."
apt-get update

# Instalar Tesseract OCR y idiomas
echo "🔤 Instalando Tesseract OCR..."
apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa

# Instalar librerías de desarrollo para OpenCV
echo "📸 Instalando dependencias de OpenCV..."
apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libglib2.0-dev

# Verificar instalación de Tesseract
echo "✅ Verificando instalación de Tesseract..."
tesseract --version

echo "🎉 ¡Setup completado exitosamente!"