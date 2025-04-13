#!/bin/bash

# Install dependencies for user function
echo "Installing dependencies for user function..."
cd user
npm install
cd ..

# Install dependencies for login function
echo "Installing dependencies for login function..."
cd login
npm install
cd ..

# Install global dependencies used by other functions
echo "Installing global dependencies..."
npm install

echo "All dependencies installed!"
