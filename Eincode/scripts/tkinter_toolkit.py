#!/usr/bin/env python3
# ARKE Studio v4.0 - Terminal CMD Admin + Mejora paralela con Ollama

import sys
import os
import json
import argparse
import threading
import concurrent.futures
import webbrowser
import subprocess
import shlex
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox
from tkinter.scrolledtext import ScrolledText
import requests

# ========== CONFIGURACIÓN ==========
PROJECT_ROOT = Path(__file__).parent.parent
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"  # Cambia según tu modelo descargado

MODULES_FIXED = [
    "arke_consciencia.py", "arke_cognicion.py", "arke_decision.py",
    "arke_prediccion.py", "ser.py", "ein_ser.py", "arke_gobernanza.py",
    "arke_orquestador.py", "modulo_poblacion.py", "main.py",
    "arke_aprendizaje.py", "generar_prompts.py", "arke_chat.py",
    "icd.py", "logger.py", "models.py", "orchestrator.py", "repository.py",
    "ser_actions.py", "ser_core.py", "settings.py", "uow.py",
    "gpt_oss_adapter.py", "indice_modulos.py", "init_db.py", "middleware.py",
    "notoria_engine.py", "arke_core.py", "arke_modulos.py", "cognicion.py",
    "consciencia.py", "db.py", "deps.py", "doctrina_viva.py", "api.py", "cache.py"
]

BG_COLOR = "#0a1a2f"
FG_COLOR = "#e0e7f5"
ACCENT_COLOR = "#1e88e5"
LOG_THEMES = {
    "INFO": "#64b5f6", "OK": "#4caf50", "ERROR": "#f44336",
    "MEJORA": "#ff9800", "PARALELO": "#9c27b0", "SISTEMA": "#00bcd4"
}

# ========== FUNCIONES CLI ==========
def run_health():
    print("✅ ARKE Studio v4.0")
    try:
        requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": "ping", "stream": False}, timeout=2)
        print("✅ Ollama conectado")
    except:
        print("❌ Ollama no responde")
    print(f"Módulos: {len(MODULES_FIXED)}")
    return 0

def run_smoke():
    print("🧪 Smoke test...")
    try:
        import tkinter; print("✅ tkinter")
        import requests; print("✅ requests")
        print("✅ Smoke test exitoso")
        return 0
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

# ========== COMPONENTES TKINTER ==========
class LineNumberedText(tk.Frame):
    def __init__(self, master, **kwargs):
        super().__init__(master)
        self.text = ScrolledText(self, wrap=tk.NONE, **kwargs)
        self.linenumbers = tk.Text(self, width=4, wrap=tk.NONE, state=tk.DISABLED,
                                   bg="#1e2a3a", fg="#888", font=("Consolas", 10))
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.linenumbers.pack(side=tk.LEFT, fill=tk.Y)
        self.text.bind('<KeyRelease>', self.on_change)
        self.text.bind('<MouseWheel>', self.on_scroll)
        self.update_linenumbers()
    def on_change(self, event=None): self.update_linenumbers()
    def on_scroll(self, event):
        self.linenumbers.yview_scroll(int(-1*(event.delta/120)), "units")
        self.text.yview_scroll(int(-1*(event.delta/120)), "units")
    def update_linenumbers(self):
        lines = int(self.text.index('end-1c').split('.')[0])
        numbers = '\n'.join(str(i) for i in range(1, lines+1))
        self.linenumbers.config(state=tk.NORMAL)
        self.linenumbers.delete('1.0', tk.END)
        self.linenumbers.insert('1.0', numbers)
        self.linenumbers.config(state=tk.DISABLED)
    def get_code(self): return self.text.get('1.0', tk.END)
    def set_code(self, code):
        self.text.delete('1.0', tk.END)
        self.text.insert('1.0', code)
        self.update_linenumbers()

class ThemedLog(ScrolledText):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self.config(state=tk.DISABLED, bg="#0a1a2f", fg="#e0e7f5", insertbackground="white")
        for theme, color in LOG_THEMES.items():
            self.tag_config(theme, foreground=color, font=("Consolas", 9, "bold"))
        self.tag_config("TIMESTAMP", foreground="#888", font=("Consolas", 8))
    def write_log(self, theme, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.config(state=tk.NORMAL)
        self.insert(tk.END, f"[{timestamp}] ", "TIMESTAMP")
        self.insert(tk.END, f"{theme:10} ", theme)
        self.insert(tk.END, f"{message}\n")
        self.see(tk.END)
        self.config(state=tk.DISABLED)

class CmdTerminal(tk.Frame):
    """Terminal embebida que ejecuta comandos CMD como administrador (con elevación si es necesario)"""
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self.configure(bg="#0a1a2f")
        self.prompt = "C:\\> "
        self.current_dir = str(Path.home())
        
        # Área de texto para mostrar salida
        self.output = tk.Text(self, wrap=tk.WORD, bg="#0a1a2f", fg="#e0e7f5",
                              font=("Consolas", 9), insertbackground="white")
        self.output.pack(fill=tk.BOTH, expand=True)
        self.output.config(state=tk.DISABLED)
        
        # Frame para entrada
        input_frame = ttk.Frame(self)
        input_frame.pack(fill=tk.X, pady=2)
        ttk.Label(input_frame, text=">", font=("Consolas", 10, "bold")).pack(side=tk.LEFT, padx=2)
        self.entry = tk.Entry(input_frame, bg="#1e2a3a", fg="#e0e7f5",
                              font=("Consolas", 9), insertbackground="white")
        self.entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.entry.bind("<Return>", self.execute_command)
        self.entry.focus()
        
        # Botón para ejecutar como administrador (elevado)
        self.admin_btn = ttk.Button(self, text="👑 Ejecutar como Admin", command=self.run_as_admin)
        self.admin_btn.pack(side=tk.RIGHT, pady=2)
        
        self.write_output(f"Terminal CMD lista. Directorio actual: {self.current_dir}\n")
    
    def write_output(self, text):
        self.output.config(state=tk.NORMAL)
        self.output.insert(tk.END, text)
        self.output.see(tk.END)
        self.output.config(state=tk.DISABLED)
    
    def execute_command(self, event=None):
        cmd = self.entry.get().strip()
        if not cmd:
            return
        self.entry.delete(0, tk.END)
        self.write_output(f"\n{self.prompt}{cmd}\n")
        
        # Comandos internos
        if cmd.lower() == "cls" or cmd.lower() == "clear":
            self.output.config(state=tk.NORMAL)
            self.output.delete('1.0', tk.END)
            self.output.config(state=tk.DISABLED)
            return
        elif cmd.lower().startswith("cd "):
            new_dir = cmd[3:].strip()
            try:
                os.chdir(new_dir)
                self.current_dir = os.getcwd()
                self.write_output(f"Directorio cambiado a: {self.current_dir}\n")
            except Exception as e:
                self.write_output(f"Error: {e}\n")
            return
        
        # Ejecutar comando externo
        try:
            process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE,
                cwd=self.current_dir,
                encoding='utf-8',
                errors='replace'
            )
            stdout, stderr = process.communicate(timeout=60)
            if stdout:
                self.write_output(stdout)
            if stderr:
                self.write_output(f"STDERR: {stderr}\n")
            self.write_output(f"\n")
        except subprocess.TimeoutExpired:
            self.write_output("Comando cancelado por timeout (60s).\n")
        except Exception as e:
            self.write_output(f"Error al ejecutar: {e}\n")
    
    def run_as_admin(self):
        """Intenta ejecutar un comando con privilegios elevados (abre nueva ventana CMD como admin)"""
        cmd = self.entry.get().strip()
        if not cmd:
            self.write_output("Escribe un comando primero.\n")
            return
        try:
            # Usar shell32 para ejecutar como administrador
            subprocess.run(f'runas /user:Administrador "cmd /c {cmd}"', shell=True, check=False)
            self.write_output(f"Solicitando elevación para: {cmd}\n")
        except Exception as e:
            self.write_output(f"No se pudo elevar: {e}\n")

# ========== APLICACIÓN PRINCIPAL ==========
class ARKEStudioV4:
    def __init__(self, root):
        self.root = root
        self.root.title("ARKE Studio v4.0 · Deep Blue · Terminal Admin + Ollama")
        self.root.geometry("1600x900")
        self.root.configure(bg="#0a1a2f")
        
        # Estilo ttk
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#0a1a2f")
        style.configure("TLabel", background="#0a1a2f", foreground="#e0e7f5", font=("Segoe UI", 10))
        style.configure("TButton", background="#1e88e5", foreground="white", font=("Segoe UI", 9))
        style.map("TButton", background=[("active", "#1565c0")])
        
        self.modules_map = {}
        self.current_module = None
        self.create_widgets()
        self.load_module_list()
        self.log.write_log("SISTEMA", f"ARKE Studio v4.0 iniciado. Ollama modelo: {OLLAMA_MODEL}")
    
    def create_widgets(self):
        # Panel izquierdo: módulos
        left_frame = ttk.Frame(self.root, width=300)
        left_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        ttk.Label(left_frame, text="🧠 Módulos ARKE (Redes Neuronales)", font=("Segoe UI", 12, "bold")).pack(pady=5)
        self.module_listbox = tk.Listbox(left_frame, font=("Consolas", 10), bg="#1e2a3a", fg="#e0e7f5", selectbackground="#1e88e5")
        self.module_listbox.pack(fill=tk.BOTH, expand=True)
        self.module_listbox.bind('<<ListboxSelect>>', self.on_module_select)
        
        # Panel central superior: editor
        center_frame = ttk.Frame(self.root)
        center_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.editor = LineNumberedText(center_frame, font=("Consolas", 10), bg="#0a1a2f", fg="#e0e7f5", insertbackground="white")
        self.editor.pack(fill=tk.BOTH, expand=True)
        
        # Panel central inferior: bitácora
        ttk.Label(center_frame, text="📜 Bitácora de Evolución", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(5,0))
        self.log = ThemedLog(center_frame, height=10, font=("Consolas", 9))
        self.log.pack(fill=tk.BOTH, expand=True)
        
        # Panel derecho: controles + terminal
        right_frame = ttk.Frame(self.root, width=500)
        right_frame.pack(side=tk.RIGHT, fill=tk.Y, padx=5, pady=5)
        
        # Botones de evolución
        ttk.Label(right_frame, text="🚀 Evolución Autónoma", font=("Segoe UI", 14, "bold")).pack(pady=10)
        self.think_btn = ttk.Button(right_frame, text="🧠 Pensar y Mejorar TODOS los módulos", command=self.think_all_modules)
        self.think_btn.pack(fill=tk.X, pady=5)
        ttk.Button(right_frame, text="🔄 Mejorar solo el módulo actual", command=self.improve_current_module).pack(fill=tk.X, pady=5)
        ttk.Button(right_frame, text="📋 Copiar código al portapapeles", command=self.copy_code).pack(fill=tk.X, pady=5)
        ttk.Button(right_frame, text="🌐 Abrir DeepSeek Web (referencia)", command=lambda: webbrowser.open("https://chat.deepseek.com")).pack(fill=tk.X, pady=5)
        
        self.status_label = ttk.Label(right_frame, text="⚡ Esperando acción...", font=("Segoe UI", 9, "italic"))
        self.status_label.pack(pady=10)
        
        # Terminal CMD embebida
        ttk.Label(right_frame, text="💻 Terminal CMD (Administrador)", font=("Segoe UI", 10, "bold")).pack(pady=(10,0))
        self.terminal = CmdTerminal(right_frame, height=15)
        self.terminal.pack(fill=tk.BOTH, expand=True, pady=5)
    
    def load_module_list(self):
        for mod_name in MODULES_FIXED:
            candidates = [PROJECT_ROOT / mod_name, PROJECT_ROOT / "arke" / mod_name, PROJECT_ROOT / "ser" / mod_name]
            found = next((p for p in candidates if p.exists()), None)
            if found:
                self.modules_map[mod_name] = found
                self.module_listbox.insert(tk.END, mod_name)
            else:
                self.log.write_log("ERROR", f"No encontrado: {mod_name}")
        if self.modules_map:
            self.module_listbox.selection_set(0)
            self.on_module_select(None)
    
    def on_module_select(self, event):
        sel = self.module_listbox.curselection()
        if not sel: return
        self.current_module = self.module_listbox.get(sel[0])
        self.load_module_code(self.current_module)
    
    def load_module_code(self, mod_name):
        path = self.modules_map.get(mod_name)
        if not path: return
        try:
            with open(path, 'r', encoding='utf-8') as f:
                code = f.read()
            self.editor.set_code(code)
            self.log.write_log("INFO", f"{mod_name} cargado en el editor.")
        except Exception as e:
            self.log.write_log("ERROR", str(e))
    
    def copy_code(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.editor.get_code())
        self.log.write_log("INFO", "Código copiado al portapapeles.")
    
    def improve_current_module(self):
        if not self.current_module:
            messagebox.showwarning("Sin módulo", "Selecciona un módulo.")
            return
        self.log.write_log("MEJORA", f"Mejorando {self.current_module}...")
        self.status_label.config(text=f"Mejorando {self.current_module}...")
        threading.Thread(target=self._improve_one, args=(self.current_module,), daemon=True).start()
    
    def think_all_modules(self):
        modules_to_process = list(self.modules_map.keys())
        if not modules_to_process:
            self.log.write_log("ERROR", "No hay módulos para mejorar.")
            return
        self.think_btn.config(state=tk.DISABLED)
        self.status_label.config(text=f"Procesando {len(modules_to_process)} módulos en paralelo...")
        self.log.write_log("PARALELO", f"Iniciando mejora paralela de {len(modules_to_process)} módulos.")
        
        def run_parallel():
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(self._improve_one, mod): mod for mod in modules_to_process}
                for future in concurrent.futures.as_completed(futures):
                    mod = futures[future]
                    try:
                        result = future.result()
                        self.root.after(0, self.log.write_log, "OK", f"{mod}: {result}")
                    except Exception as e:
                        self.root.after(0, self.log.write_log, "ERROR", f"{mod}: {e}")
            self.root.after(0, self.think_btn.config, {'state': tk.NORMAL})
            self.root.after(0, self.status_label.config, {'text': "⚡ Evolución completada."})
            self.root.after(0, self.log.write_log, "PARALELO", "Mejora paralela finalizada.")
        
        threading.Thread(target=run_parallel, daemon=True).start()
    
    def _improve_one(self, module_name):
        path = self.modules_map.get(module_name)
        if not path:
            return "Archivo no encontrado"
        with open(path, 'r', encoding='utf-8') as f:
            original = f.read()
        
        prompt = f"""Eres un experto en mejorar código Python. Analiza el siguiente módulo y sugiere mejoras concretas (eficiencia, legibilidad, buenas prácticas, comentarios). Devuelve SOLO el código mejorado, sin explicaciones adicionales, ni markdown, ni texto fuera del código. Si no hay mejoras que hacer, devuelve exactamente el mismo código.

--- MÓDULO: {module_name} ---
{original}
--- FIN ---
"""
        try:
            response = requests.post(OLLAMA_URL, json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "temperature": 0.2,
                "max_tokens": 4000
            }, timeout=120)
            if response.status_code != 200:
                return f"Error HTTP {response.status_code}"
            improved = response.json().get('response', '').strip()
            # Limpiar marcadores de código
            if improved.startswith("```python"):
                improved = improved.split("```python", 1)[1].split("```", 1)[0].strip()
            elif improved.startswith("```"):
                improved = improved.split("```", 1)[1].split("```", 1)[0].strip()
            
            if improved and improved != original:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(improved)
                evo_log = PROJECT_ROOT / "evolucion_log.json"
                entry = {"timestamp": datetime.now().isoformat(), "module": module_name, "changed": True}
                if evo_log.exists():
                    with open(evo_log, 'r') as f:
                        data = json.load(f)
                else:
                    data = []
                data.append(entry)
                with open(evo_log, 'w') as f:
                    json.dump(data, f, indent=2)
                return "✅ Mejorado y guardado"
            else:
                return "ℹ️ Sin cambios necesarios"
        except Exception as e:
            return f"❌ Error: {str(e)}"

# ========== PUNTO DE ENTRADA ==========
def launch_gui():
    root = tk.Tk()
    app = ARKEStudioV4(root)
    root.mainloop()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--smoke", action="store_true")
    args = parser.parse_args()
    if args.health:
        sys.exit(run_health())
    elif args.smoke:
        sys.exit(run_smoke())
    else:
        launch_gui()