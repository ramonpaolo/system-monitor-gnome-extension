#!/bin/bash

# Script para instalar a extensão GNOME Shell
echo "Baixando e instalando a extensão GNOME Shell..."

# Criar diretório de extensões se não existir
mkdir -p ~/.local/share/gnome-shell/extensions

# Baixar a extensão (substitua pela URL real da extensão)
EXTENSION_URL="https://github.com/ramonpaolo/system-monitor-gnome-extension/archive/main.zip"
wget -O /tmp/extension.zip "$EXTENSION_URL"

# Extrair o conteúdo
unzip /tmp/extension.zip -d /tmp/

# Mover para o diretório de extensões
EXT_NAME=$(ls /tmp/*-main | xargs basename)
cp -r "/tmp/$EXT_NAME" ~/.local/share/gnome-shell/extensions/

# Reiniciar GNOME Shell
echo "Reiniciando GNOME Shell..."
killall gnome-shell

echo "Extensão instalada com sucesso!"
