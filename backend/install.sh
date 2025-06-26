#!/bin/bash

echo "Installing dependencies for GlobalTranscribe Backend..."

# Clear npm cache
npm cache clean --force

# Install with legacy peer deps to avoid conflicts
npm install --legacy-peer-deps

# Alternative: install individual packages if needed
# npm install express@^4.19.2 cors@^2.8.5 dotenv@^16.4.5

echo "Installation complete!"
