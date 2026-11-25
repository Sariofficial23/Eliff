@echo off
chcp 65001 >nul
title Elif - SERVER (yopmang)
powershell -ExecutionPolicy Bypass -File "%~dp0server-start.ps1"
