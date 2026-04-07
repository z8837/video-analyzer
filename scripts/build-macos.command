#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Installing dependencies if needed..."
npm install

echo "Building macOS release..."
npm run dist:mac

echo "Opening release folder..."
open release
