#!/bin/bash
# Rende pubblica la porta 3001 (se non già pubblica)
gh codespace ports visibility 3001:public -c $CODESPACE_NAME 2>/dev/null
# Avvia il backend
node api/index.js
