@echo off
setlocal
cd /d "%~dp0"

echo Instalando PyInstaller si no está...
pip show pyinstaller >nul 2>nul
if errorlevel 1 (
    pip install pyinstaller
)

echo.
echo Compilando ProyectoArkeToolkit.exe...

pyinstaller ^
  --noconfirm ^
  --clean ^
  --name ProyectoArkeToolkit ^
  --onefile ^
  --windowed ^
  --add-data ".env;." ^
  --hidden-import "openai" ^
  --hidden-import "dotenv" ^
  --hidden-import "tkinter" ^
  --hidden-import "ast" ^
  scripts\tkinter_toolkit.py

if errorlevel 1 (
    echo Error en la compilacion.
    exit /b 1
)

echo.
echo Compilacion exitosa.
echo Ejecutable generado en: dist\ProyectoArkeToolkit.exe
echo.
echo Para usarlo:
echo   dist\ProyectoArkeToolkit.exe
echo   dist\ProyectoArkeToolkit.exe --health --pretty
echo   dist\ProyectoArkeToolkit.exe --query "tu pregunta" --pretty

exit /b 0