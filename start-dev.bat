@echo off
echo Démarrage de GlobalTranscribe en mode développement...
echo.

REM Démarrer le backend
echo Démarrage du backend...
start cmd /k "cd backend && npm run dev"

REM Attendre 3 secondes
timeout /t 3 /nobreak > nul

REM Démarrer le frontend
echo Démarrage du frontend...
start cmd /k "cd frontend && npm start"

echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Appuyez sur une touche pour fermer ce script...
pause > nul
