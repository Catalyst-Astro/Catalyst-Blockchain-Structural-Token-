#!/usr/bin/env python3
# arke_studio_tkinter_puro.py - ARKE Studio 2.0 con Tkinter puro y DeepSeek API

import sys
import os
import json
import threading
import webbrowser
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from openai import OpenAI
from dotenv import load_dotenv

# ========== CONFIGURACIÓN ==========
PROJECT_ROOT = Path(__file__).parent
load_dotenv()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
if not DEEPSEEK_API_KEY:
    raise ValueError(
        "DEEPSEEK_API_KEY not set. Create a .env file with DEEPSEEK_API_KEY=your_key"
    )

client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url="https://api.deepseek.com")

# Lista de módulos (ajústala)
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

# ========== ESTILOS TKINTER (tema azul) ==========
def setup_styles():
    style = ttk.Style()
    style.theme_use('clam')
    # Colores personalizados
    style.configure('TFrame', background='#0a1a2f')
    style.configure('TLabel', background='#0a1a2f', foreground='#e0e7f5', font=('Segoe UI', 10))
    style.configure('TNotebook', background='#0a1a2f', borderwidth=0)
    style.configure('TNotebook.Tab', background='#1e2a3a', foreground='#e0e7f5', padding=[10,5], font=('Segoe UI', 10))
    style.map('TNotebook.Tab', background=[('selected', '#1e88e5')])
    style.configure('TButton', background='#1e88e5', foreground='white', borderwidth=0, focusthickness=0, font=('Segoe UI', 9))
    style.map('TButton', background=[('active', '#1565c0')])
    style.configure('TEntry', fieldbackground='#1e2a3a', foreground='white', insertcolor='white', borderwidth=1, relief='solid')
    style.configure('TText', background='#1e2a3a', foreground='white', insertbackground='white', borderwidth=0)

# ========== EDITOR CON NÚMEROS DE LÍNEA ==========
class LineNumberedText(tk.Frame):
    def __init__(self, master, **kwargs):
        super().__init__(master, bg='#0a1a2f')
        self.text = tk.Text(self, wrap=tk.NONE, bg='#1e2a3a', fg='#e0e7f5', insertbackground='white',
                            font=('Consolas', 10), **kwargs)
        self.linenumbers = tk.Text(self, width=4, wrap=tk.NONE, state=tk.DISABLED,
                                   bg='#0a1a2f', fg='#888', font=('Consolas', 10))
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

# ========== APLICACIÓN PRINCIPAL ==========
class ARKEStudio(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("ARKE Studio 2.0 - DeepSeek API")
        self.geometry("1300x800")
        self.configure(bg='#0a1a2f')
        setup_styles()
        
        # Variables
        self.modules_map = {}
        self.current_module = None
        self.conversation = []  # historial del chat
        
        # Crear notebook (pestañas)
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Pestaña Chat
        self.chat_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.chat_tab, text="💬 Chat con DeepSeek")
        self._build_chat_tab()
        
        # Pestaña Editor
        self.editor_tab = ttk.Frame(self.notebook)
        self.notebook.add(self.editor_tab, text="📝 Editor ARKE")
        self._build_editor_tab()
        
        # Cargar módulos
        self._load_module_list()
        self._check_api_health()
    
    # ================== CHAT TAB ==================
    def _build_chat_tab(self):
        # Panel izquierdo (configuración)
        left = ttk.Frame(self.chat_tab, width=250)
        left.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        left.pack_propagate(False)
        ttk.Label(left, text="DeepSeek Cloud", font=('Segoe UI', 16, 'bold')).pack(pady=10)
        ttk.Button(left, text="➕ Nueva conversación", command=self._new_conversation).pack(fill=tk.X, padx=10, pady=5)
        
        # Temperatura
        ttk.Label(left, text="Temperatura (0.0-1.0):").pack(anchor=tk.W, padx=10, pady=(20,0))
        self.temp_var = tk.DoubleVar(value=0.7)
        temp_slider = ttk.Scale(left, from_=0.0, to=1.0, variable=self.temp_var, orient=tk.HORIZONTAL)
        temp_slider.pack(fill=tk.X, padx=10, pady=5)
        self.temp_label = ttk.Label(left, text=f"{self.temp_var.get():.2f}")
        self.temp_label.pack(anchor=tk.W, padx=10)
        temp_slider.configure(command=lambda val: self.temp_label.configure(text=f"{float(val):.2f}"))
        
        ttk.Button(left, text="🗑️ Limpiar historial", command=self._clear_history).pack(fill=tk.X, padx=10, pady=20)
        self.status_label = ttk.Label(left, text="● Conectando a DeepSeek...", foreground='orange')
        self.status_label.pack(side=tk.BOTTOM, pady=10)
        
        # Área de chat (derecha)
        right = ttk.Frame(self.chat_tab)
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Canvas con scroll para burbujas
        self.chat_canvas = tk.Canvas(right, bg='#0a1a2f', highlightthickness=0)
        scrollbar = ttk.Scrollbar(right, orient=tk.VERTICAL, command=self.chat_canvas.yview)
        self.chat_scrollable = tk.Frame(self.chat_canvas, bg='#0a1a2f')
        self.chat_canvas.create_window((0,0), window=self.chat_scrollable, anchor='nw')
        self.chat_canvas.configure(yscrollcommand=scrollbar.set)
        self.chat_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.chat_scrollable.bind('<Configure>', lambda e: self.chat_canvas.configure(scrollregion=self.chat_canvas.bbox('all')))
        
        # Entrada de texto
        input_frame = ttk.Frame(right)
        input_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=5)
        self.input_text = tk.Text(input_frame, height=4, wrap=tk.WORD, bg='#1e2a3a', fg='white', insertbackground='white', font=('Segoe UI', 10))
        self.input_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0,5))
        self.input_text.bind('<Shift-Return>', lambda e: None)
        self.input_text.bind('<Return>', self._send_event)
        self.send_btn = ttk.Button(input_frame, text="Enviar", command=self._send_message)
        self.send_btn.pack(side=tk.RIGHT)
        
        self._add_system_message("Conectado a DeepSeek Cloud.")
    
    def _add_bubble(self, role, text):
        frame = tk.Frame(self.chat_scrollable, bg='#0a1a2f')
        frame.pack(fill=tk.X, padx=10, pady=5)
        if role == 'user':
            color = '#1e88e5'
            anchor = 'e'
        else:
            color = '#2d2d2d'
            anchor = 'w'
        bubble = tk.Label(frame, text=text, bg=color, fg='white', wraplength=600, justify=tk.LEFT if role=='assistant' else tk.RIGHT,
                          font=('Segoe UI', 10), padx=10, pady=5, relief=tk.RAISED, bd=0)
        bubble.pack(anchor=anchor, padx=5, pady=2)
        self.chat_canvas.yview_moveto(1.0)
    
    def _add_system_message(self, text):
        frame = tk.Frame(self.chat_scrollable, bg='#0a1a2f')
        frame.pack(fill=tk.X, padx=10, pady=2)
        label = tk.Label(frame, text=f"ℹ️ {text}", bg='#0a1a2f', fg='#888', font=('Segoe UI', 9, 'italic'))
        label.pack(anchor='center', pady=2)
        self.chat_canvas.yview_moveto(1.0)
    
    def _send_event(self, event):
        if not (event.state & 0x1):
            self._send_message()
            return 'break'
    
    def _send_message(self):
        user_text = self.input_text.get('1.0', 'end-1c').strip()
        if not user_text:
            return
        self._add_bubble('user', user_text)
        self.conversation.append({'role': 'user', 'content': user_text})
        self.input_text.delete('1.0', 'end')
        self.send_btn.config(state=tk.DISABLED, text='Consultando...')
        threading.Thread(target=self._query_deepseek, daemon=True).start()
    
    def _query_deepseek(self):
        messages = self.conversation[-10:]
        try:
            response = client.chat.completions.create(
                model='deepseek-chat',
                messages=messages,
                temperature=self.temp_var.get(),
                max_tokens=1000
            )
            answer = response.choices[0].message.content
            self.after(0, self._display_answer, answer)
        except Exception as e:
            self.after(0, self._display_answer, f"❌ Error: {str(e)}")
        finally:
            self.after(0, lambda: self.send_btn.config(state=tk.NORMAL, text='Enviar'))
    
    def _display_answer(self, answer):
        self._add_bubble('assistant', answer)
        self.conversation.append({'role': 'assistant', 'content': answer})
    
    def _new_conversation(self):
        self.conversation.clear()
        for widget in self.chat_scrollable.winfo_children():
            widget.destroy()
        self._add_system_message('Nueva conversación iniciada.')
    
    def _clear_history(self):
        self._new_conversation()
    
    def _check_api_health(self):
        try:
            client.chat.completions.create(model='deepseek-chat', messages=[{'role':'user','content':'ping'}], max_tokens=1)
            self.status_label.config(text='● DeepSeek Cloud conectado', foreground='lightgreen')
        except:
            self.status_label.config(text='❌ Error de conexión', foreground='red')
        self.after(30000, self._check_api_health)
    
    # ================== EDITOR TAB ==================
    def _build_editor_tab(self):
        # Izquierda: lista de módulos
        left = ttk.Frame(self.editor_tab, width=250)
        left.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        left.pack_propagate(False)
        ttk.Label(left, text='Módulos ARKE', font=('Segoe UI', 14, 'bold')).pack(pady=5)
        self.module_listbox = tk.Listbox(left, bg='#1e2a3a', fg='white', selectbackground='#1e88e5', font=('Consolas', 10))
        self.module_listbox.pack(fill=tk.BOTH, expand=True, pady=5)
        self.module_listbox.bind('<<ListboxSelect>>', self._on_module_select)
        
        # Centro: editor
        center = ttk.Frame(self.editor_tab)
        center.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.editor = LineNumberedText(center, height=30)
        self.editor.pack(fill=tk.BOTH, expand=True)
        
        # Derecha: botones
        right = ttk.Frame(self.editor_tab, width=200)
        right.pack(side=tk.RIGHT, fill=tk.Y, padx=5, pady=5)
        ttk.Label(right, text='Acciones', font=('Segoe UI', 12, 'bold')).pack(pady=5)
        ttk.Button(right, text='💾 Guardar', command=self._save_module).pack(fill=tk.X, pady=5)
        ttk.Button(right, text='🔄 Recargar', command=self._reload_module).pack(fill=tk.X, pady=5)
        ttk.Button(right, text='🤖 Mejorar con DeepSeek', command=self._improve_module).pack(fill=tk.X, pady=5)
        ttk.Button(right, text='📋 Copiar código', command=self._copy_code).pack(fill=tk.X, pady=5)
        ttk.Button(right, text='🔍 Auditar todos', command=self._audit_all).pack(fill=tk.X, pady=5)
    
    def _load_module_list(self):
        for mod in MODULES_FIXED:
            candidates = [PROJECT_ROOT / mod, PROJECT_ROOT / 'arke' / mod, PROJECT_ROOT / 'ser' / mod]
            found = next((p for p in candidates if p.exists()), None)
            if found:
                self.modules_map[mod] = found
                self.module_listbox.insert(tk.END, mod)
        if self.modules_map:
            self.module_listbox.selection_set(0)
            self._on_module_select(None)
    
    def _on_module_select(self, event):
        sel = self.module_listbox.curselection()
        if not sel: return
        self.current_module = self.module_listbox.get(sel[0])
        self._load_module_code()
    
    def _load_module_code(self):
        path = self.modules_map.get(self.current_module)
        if not path: return
        try:
            with open(path, 'r', encoding='utf-8') as f:
                code = f.read()
            self.editor.set_code(code)
        except Exception as e:
            messagebox.showerror('Error', f'No se pudo cargar: {e}')
    
    def _save_module(self):
        if not self.current_module: return
        code = self.editor.get_code()
        path = self.modules_map[self.current_module]
        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(code)
            messagebox.showinfo('Guardado', f'{self.current_module} guardado.')
        except Exception as e:
            messagebox.showerror('Error', str(e))
    
    def _reload_module(self):
        if self.current_module:
            self._load_module_code()
    
    def _copy_code(self):
        self.clipboard_clear()
        self.clipboard_append(self.editor.get_code())
        messagebox.showinfo('Copiado', 'Código copiado al portapapeles.')
    
    def _improve_module(self):
        if not self.current_module:
            messagebox.showwarning('Sin módulo', 'Selecciona un módulo.')
            return
        code = self.editor.get_code()
        prompt = f"""Mejora el siguiente código Python. Devuelve SOLO el código mejorado, sin explicaciones.
Si no hay cambios, devuelve el código original exactamente.

CÓDIGO:
{code}
"""
        threading.Thread(target=self._call_deepseek_improve, args=(prompt,), daemon=True).start()
        messagebox.showinfo('Mejora', 'Enviando a DeepSeek...')
    
    def _call_deepseek_improve(self, prompt):
        try:
            response = client.chat.completions.create(
                model='deepseek-chat',
                messages=[{'role': 'user', 'content': prompt}],
                temperature=0.2,
                max_tokens=4000
            )
            improved = response.choices[0].message.content.strip()
            # Limpiar marcadores
            if improved.startswith('```python'):
                improved = improved.split('```python', 1)[1].split('```', 1)[0].strip()
            elif improved.startswith('```'):
                improved = improved.split('```', 1)[1].split('```', 1)[0].strip()
            if improved and improved != self.editor.get_code():
                self.after(0, lambda: self.editor.set_code(improved))
                self.after(0, lambda: messagebox.showinfo('Mejora', 'Código mejorado aplicado.'))
            else:
                self.after(0, lambda: messagebox.showinfo('Mejora', 'Sin cambios sugeridos.'))
        except Exception as e:
            self.after(0, lambda: messagebox.showerror('Error', str(e)))
    
    def _audit_all(self):
        resultados = []
        for nombre, ruta in self.modules_map.items():
            try:
                with open(ruta, 'r', encoding='utf-8') as f:
                    codigo = f.read()
                compile(codigo, nombre, 'exec')
                resultados.append(f"✅ {nombre}")
            except SyntaxError as e:
                resultados.append(f"❌ {nombre}: {e.msg} (línea {e.lineno})")
            except Exception as e:
                resultados.append(f"⚠️ {nombre}: {e}")
        if resultados:
            msg = '\n'.join(resultados[:50])
            messagebox.showinfo('Auditoría', msg if msg else 'Sin problemas.')
        else:
            messagebox.showinfo('Auditoría', 'No se encontraron módulos.')

if __name__ == '__main__':
    app = ARKEStudio()
    app.mainloop()