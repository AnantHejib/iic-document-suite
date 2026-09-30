@echo off
title IIC Document Automation Suite - SIT Lonavala (Multi-Device Active)
echo ========================================================
echo   IIC DocCraft Pro - Sinhgad Institute of Technology
echo   Document Automation Suite & Official Letterhead
echo   [Multi-Device Live Sync Active]
echo ========================================================
cd /d "%~dp0"

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting Multi-Device Server and Live Database...
    python server.py
) else (
    echo Opening application directly in default browser...
    start "" "%~dp0index.html"
)
pause
