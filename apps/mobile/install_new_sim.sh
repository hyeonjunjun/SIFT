#!/bin/bash
set -e

# Previous successful build URL
APP_URL="https://expo.dev/artifacts/eas/qjbC23SucY9rnXimkv6scq.tar.gz"
DOWNLOAD_PATH="sift_build_new_sim.tar.gz"

echo "Downloading build..."
curl -L -o "$DOWNLOAD_PATH" "$APP_URL"

echo "Extracting..."
tar -xzf "$DOWNLOAD_PATH"

echo "Installing to Booted Simulator..."
# Find the .app directory (handle potential extracted folder structure)
APP_PATH=$(find . -name "*.app" | head -n 1)

if [ -z "$APP_PATH" ]; then
  echo "Error: Could not find .app file after extraction."
  exit 1
fi

xcrun simctl install booted "$APP_PATH"

echo "Success! Installed to simulator."
