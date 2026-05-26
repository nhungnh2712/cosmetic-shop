@echo off
cd /d "d:\Bài tập\cosmetic-shop"
"C:\Program Files\Git\bin\git.exe" init
"C:\Program Files\Git\bin\git.exe" config user.email "nhungnh2712@gmail.com"
"C:\Program Files\Git\bin\git.exe" config user.name "nhungnh2712"
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "first commit"
"C:\Program Files\Git\bin\git.exe" branch -M main
"C:\Program Files\Git\bin\git.exe" remote remove origin 2>nul
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/nhungnh2712/cosmetic-shop.git
"C:\Program Files\Git\bin\git.exe" push -u origin main
pause
