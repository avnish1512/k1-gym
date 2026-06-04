@echo off
REM K1 Gym Fitness Center - Web Build and Deployment Script

echo.
echo Building K1 Gym app for web deployment...
echo.

REM Set execution policy
powershell -NoProfile -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force"

REM Install dependencies
echo Installing dependencies...
call npm install

REM Export for web
echo.
echo Exporting for web...
call npx expo export --platform web

REM Check if dist folder has content
if exist dist (
    dir dist | find /C ":" >nul
    if %ERRORLEVEL% equ 0 (
        echo.
        echo ✅ Web build successful! Files are in dist/
        echo.
        echo 📦 Deployment options:
        echo 1. Vercel:  npx vercel --prod
        echo 2. Netlify: npx netlify-cli deploy --prod --dir=dist
        echo 3. Render:  Visit https://render.com and connect this repo
        echo 4. GitHub Pages: Push to gh-pages branch
        echo.
    ) else (
        echo.
        echo ⚠️ dist folder appears empty. Trying alternative method...
        call npx expo prebuild --platform web
    )
) else (
    echo.
    echo ⚠️ dist folder not found. Build may have failed.
)

pause
