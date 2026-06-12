@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo Python no esta disponible en PATH.
    exit /b 1
)

set "MODE=%~1"
if "%MODE%"=="" goto run_ui
if /I "%MODE%"=="ui" goto run_ui
if /I "%MODE%"=="retro" goto run_retro
if /I "%MODE%"=="health" goto run_health
if /I "%MODE%"=="smoke" goto run_smoke
if /I "%MODE%"=="validate" goto run_validate
if /I "%MODE%"=="checkpoint" goto run_checkpoint
if /I "%MODE%"=="help" goto show_help

echo Modo no reconocido: %MODE%
goto show_help

:run_ui
python scripts\tkinter_toolkit.py
goto finish

:run_retro
python scripts\arke_retro_ui.py
goto finish

:run_health
python scripts\tkinter_toolkit.py --health --pretty
goto finish

:run_smoke
python scripts\tkinter_toolkit.py --smoke
goto finish

:run_validate
python scripts\tkinter_toolkit.py --validate
goto finish

:run_checkpoint
shift
python scripts\tkinter_toolkit.py --checkpoint %*
goto finish

:show_help
echo Uso:
echo   launch_toolkit.bat
echo   launch_toolkit.bat ui
echo   launch_toolkit.bat retro
echo   launch_toolkit.bat health
echo   launch_toolkit.bat smoke
echo   launch_toolkit.bat validate
echo   launch_toolkit.bat checkpoint --query "firma validada control interno"
echo.
echo Para compilar el exe:
echo   build_toolkit_exe.bat
exit /b 0

:finish
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%