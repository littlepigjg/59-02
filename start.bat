@echo off
chcp 65001 >nul
echo ========================================
echo   Mock Data Generator Service
echo ========================================
echo.
echo [1/3] Checking node_modules...
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo [INFO] Dependencies already installed
)

echo.
echo [2/3] Starting service...
echo.
echo ========================================
echo   Service will start on http://localhost:3000
echo   Press Ctrl+C to stop
echo ========================================
echo.

call npm start

pause
