@echo off
title IIC Document Automation Suite - GLOBAL INTERNET ACCESS (Any Network)
echo ====================================================================
echo   IIC DocCraft Pro - Sinhgad Institute of Technology, Lonavala
echo   GLOBAL MULTI-DEVICE CLOUD SERVER (WORKS OVER ANY NETWORK WORLDWIDE!)
echo ====================================================================
echo   Starting local server and generating public global HTTPS link...
echo   Please wait 3-5 seconds...
echo ====================================================================
cd /d "%~dp0"

python server.py --global
pause
