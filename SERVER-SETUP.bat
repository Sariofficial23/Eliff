@echo off
chcp 65001 >nul
title Elif - server sozlash (bir marta)
powershell -ExecutionPolicy Bypass -File "%~dp0server-setup.ps1"
