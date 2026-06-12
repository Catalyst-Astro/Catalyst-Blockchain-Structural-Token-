import os
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkinter.scrolledtext import ScrolledText
from pathlib import Path
import re
import threading
from datetime import datetime

# ========== CONFIGURACIÓN ==========
PROJECT_ROOT = Path(__file__).parent
MODULES = [
    "arke_consciencia.py", "arke_cognicion.py", "arke_decision.py",
    "arke_prediccion.py", "ser.py", "ein_ser.py", "arke_gobernanza.py",
    "arke_orquestador.py", "modulo_poblacion.py", "main.py",
    "arke_aprendizaje.py", "generar_prompts.py", "arke_chat.py"
]  # Puedes expandirlo o leer el directorio automáticamente

# Temas para el log (etiqueta -> color)
LOG_THEMES = {
    "CONSCIENCIA": "#4CAF50",   # verde
    "COGNICION": "#2196F3",     # azul
    "DECISION": "#FF9800",      # naranja
    "SER": "#9C27B0",           # púrpura
    "GOBERNANZA": "#F44336",    # rojo
    "APRENDIZAJE": "#00BCD4",   # cian
    "ERROR": "#D32F2F",         # rojo oscuro
    "OK": "#388E3C"             # verde oscuro
}

# ========== VALIDADOR DE DIRECTRICES ==========
def validate_against_directives(code, directives_text):
    """
    Aplica las directrices escritas por el usuario al código.
    Devuelve (es_valido, lista_de_mensajes)
    """
    issues = []
    # Directrices por defecto (predominantes de ARKE)
    if "docstring" in directives_text.lower() or not directives_text.strip():
        if not re.search(r'""".*?"""', code, re.DOTALL):
            issues.append("❌ Falta docstring en el módulo (directriz de documentación).")
    
    if "icd" in directives_text.lower() or "coherencia" in directives_text.lower():
        if "ICD" not in code and "coherencia" not in code.lower():
            issues.append("⚠️ No se encontró referencia al Índice de Coherencia Decisional (ICD).")
    
    if "ser" in directives_text.lower():
        if "SER" not in code and "ein_ser" not in code:
            issues.append("⚠️ El módulo no integra el umbral SER.")
    
    # Directrices personalizadas (puedes ampliar)
    for line in directives_text.split('\n'):
        if line.strip().startswith("requiere:"):
            required_word = line.split(":", 1)[1].strip()
            if required_word and required_word not in code:
                issues.append(f"❌ Directriz personalizada incumplida: falta '{required_word}'")
    
    return len(issues) == 0, issues

# ========== EDITOR CON NÚMEROS DE LÍNEA ==========
class LineNumberedText(tk.Frame):
    def __init__(self, master, **kwargs):
        super().__init__(master)
        self.text = ScrolledText(self, wrap=tk.NONE, **kwargs)
        self.linenumbers = tk.Text(self, width=4, wrap=tk.NONE, state=tk.DISABLED, 
                                   bg="#f0f0f0", fg="#555", font=("Consolas", 10))
        self.text.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        self.linenumbers.pack(side=tk.LEFT, fill=tk.Y)
        self.text.bind('<KeyRelease>', self.on_change)
        self.text.bind('<MouseWheel>', self.on_scroll)
        self.update_linenumbers()

    def on_change(self, event=None):
        self.update_linenumbers()

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

    def get_code(self):
        return self.text.get('1.0', tk.END)

    def set_code(self, code):
        self.text.delete('1.0', tk.END)
        self.text.insert('1.0', code)
        self.update_linenumbers()

# ========== LOG TEMÁTICO ==========
class ThemedLog(ScrolledText):
    def __init__(self, master, **kwargs):
        super().__init__(master, **kwargs)
        self.config(state=tk.DISABLED)
        for theme, color in LOG_THEMES.items():
            self.tag_config(theme, foreground=color, font=("Consolas", 9, "bold"))
        self.tag_config("TIMESTAMP", foreground="#888", font=("Consolas", 8))

    def write_log(self, theme, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.config(state=tk.NORMAL)
        self.insert(tk.END, f"[{timestamp}] ", "TIMESTAMP")
        self.insert(tk.END, f"{theme:12} ", theme)
        self.insert(tk.END, f"{message}\n")
        self.see(tk.END)
        self.config(state=tk.DISABLED)

# ========== APLICACIÓN PRINCIPAL ==========
class ARKEStudio:
    def __init__(self, root):
        self.root = root
        self.root.title("ARKE Studio v1.0 - Consciencia Epistémica")
        self.root.geometry("1200x700")
        self.current_module = None
        self.modules_map = {}  # nombre -> ruta

        # Construir panel principal
        self.create_widgets()
        self.load_module_list()
        self.log.write_log("CONSCIENCIA", "ARKE Studio iniciado. Ontología simbólica activa.")

    def create_widgets(self):
        # Panel izquierdo (módulos)
        left_frame = ttk.Frame(self.root, width=250)
        left_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        ttk.Label(left_frame, text="🧠 Módulos ARKE", font=("Segoe UI", 12, "bold")).pack(pady=5)
        self.module_listbox = tk.Listbox(left_frame, font=("Consolas", 10))
        self.module_listbox.pack(fill=tk.BOTH, expand=True)
        self.module_listbox.bind('<<ListboxSelect>>', self.on_module_select)

        # Área central (editor + log)
        center_frame = ttk.Frame(self.root)
        center_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Editor con números de línea
        self.editor = LineNumberedText(center_frame, font=("Consolas", 10), height=20)
        self.editor.pack(fill=tk.BOTH, expand=True)

        # Log temático
        ttk.Label(center_frame, text="📜 Bitácora Simbólica", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(5,0))
        self.log = ThemedLog(center_frame, height=12, font=("Consolas", 9))
        self.log.pack(fill=tk.BOTH, expand=True)

        # Panel inferior (directrices y acciones)
        bottom_frame = ttk.Frame(self.root)
        bottom_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=5, pady=5)

        ttk.Label(bottom_frame, text="📜 Directrices predominantes (una por línea):").pack(anchor=tk.W)
        self.directives_text = tk.Text(bottom_frame, height=4, font=("Segoe UI", 9))
        self.directives_text.pack(fill=tk.X, pady=2)
        # Cargar directrices por defecto
        default_directives = """requiere: docstring
requiere: ICD
# Puedes añadir: requiere: SER , o cualquier palabra clave"""
        self.directives_text.insert('1.0', default_directives)

        btn_frame = ttk.Frame(bottom_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        ttk.Button(btn_frame, text="💾 Actualizar según directrices", command=self.update_module).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="🔄 Recargar módulo", command=self.reload_current_module).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="🧪 Validar sin guardar", command=self.validate_only).pack(side=tk.LEFT, padx=5)

    def load_module_list(self):
        # Buscar módulos en PROJECT_ROOT
        found = []
        for mod in MODULES:
            path = PROJECT_ROOT / mod
            if path.exists():
                self.modules_map[mod] = path
                found.append(mod)
            else:
                # Búsqueda recursiva simple
                for py in PROJECT_ROOT.rglob("*.py"):
                    if py.name == mod:
                        self.modules_map[mod] = py
                        found.append(mod)
                        break
        for mod in found:
            self.module_listbox.insert(tk.END, mod)
        if found:
            self.module_listbox.selection_set(0)
            self.on_module_select(None)

    def on_module_select(self, event):
        selection = self.module_listbox.curselection()
        if not selection:
            return
        mod_name = self.module_listbox.get(selection[0])
        self.current_module = mod_name
        self.load_module_code(mod_name)

    def load_module_code(self, mod_name):
        path = self.modules_map.get(mod_name)
        if not path:
            self.log.write_log("ERROR", f"No se encontró la ruta de {mod_name}")
            return
        try:
            with open(path, 'r', encoding='utf-8') as f:
                code = f.read()
            self.editor.set_code(code)
            self.log.write_log("OK", f"Módulo {mod_name} cargado desde {path}")
        except Exception as e:
            self.log.write_log("ERROR", f"Error al cargar {mod_name}: {e}")

    def reload_current_module(self):
        if self.current_module:
            self.load_module_code(self.current_module)

    def validate_only(self):
        if not self.current_module:
            return
        code = self.editor.get_code()
        directives = self.directives_text.get('1.0', tk.END)
        valid, issues = validate_against_directives(code, directives)
        if valid:
            self.log.write_log("OK", "✅ Validación exitosa: el código cumple con las directrices.")
        else:
            for issue in issues:
                self.log.write_log("DECISION", issue)
            self.log.write_log("ERROR", "❌ Validación fallida. Corrige antes de actualizar.")

    def update_module(self):
        if not self.current_module:
            messagebox.showwarning("Sin módulo", "Selecciona un módulo primero.")
            return
        code = self.editor.get_code()
        directives = self.directives_text.get('1.0', tk.END)
        valid, issues = validate_against_directives(code, directives)
        if not valid:
            msg = "El código no cumple con las directrices:\n" + "\n".join(issues)
            answer = messagebox.askyesno("Validación fallida", msg + "\n\n¿Guardar de todas formas?")
            if not answer:
                return
        # Guardar
        path = self.modules_map[self.current_module]
        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(code)
            self.log.write_log("GOBERNANZA", f"Módulo {self.current_module} actualizado según directrices.")
            messagebox.showinfo("Actualizado", f"{self.current_module} guardado correctamente.")
        except Exception as e:
            self.log.write_log("ERROR", f"No se pudo guardar: {e}")
            messagebox.showerror("Error", f"No se pudo guardar: {e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = ARKEStudio(root)
    root.mainloop()