@echo off
cd /d "d:\Bài tập\cosmetic-shop"
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "fix: add product images and fix flicker bug"
"C:\Program Files\Git\bin\git.exe" push origin main
pause
