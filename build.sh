#!/bin/bash

# Install all dependencies
echo "Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install

# Build frontend
echo "Building frontend..."
npm run build

echo "Build completed successfully!"
