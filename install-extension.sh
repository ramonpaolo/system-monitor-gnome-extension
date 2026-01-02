#!/bin/bash

# Script to install the GNOME Shell extension
echo "Downloading and installing the GNOME Shell extension..."

# Create extensions directory if it doesn't exist
mkdir -p ~/.local/share/gnome-shell/extensions

# Download the extension (replace with the actual extension URL)
EXTENSION_URL="https://github.com/ramonpaolo/system-monitor-gnome-extension/archive/main.zip"
wget -O /tmp/extension.zip "$EXTENSION_URL"

# Extract the content
unzip /tmp/extension.zip -d /tmp/

rm -rf /tmp/extension.zip

mv "/tmp/system-monitor-gnome-extension-main" ~/.local/share/gnome-shell/extensions/system-monitor@system-monitor.com

# Restart GNOME Shell
echo "Restarting GNOME Shell..."
killall gnome-shell

echo "Extension installed successfully!"

echo "Enabling the extension..."

export DISPLAY=:0
export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus"

gnome-extensions enable system-monitor@system-monitor.com
