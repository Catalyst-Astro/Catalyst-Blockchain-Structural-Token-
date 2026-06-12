#!/usr/bin/env python3
# chatgpt_style.py - Interfaz estilo ChatGPT con CustomTkinter y Ollama

import sys
import threading
import requests
import json
from datetime import datetime
import customtkinter as ctk
from tkinter import scrolledtext

# Configuración de Ollama (ajusta si es necesario)
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"  # o deepseek-r1:7b, etc.

# Configuración de la apariencia
ctk.set_appearance_mode("dark")  # "light" o "dark"
ctk.set_default_color_theme("blue")  # "blue", "green", "dark-blue"

class ChatGPTClone(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("ARKE Chat - Asistente con Ollama")
        self.geometry("1000x700")
        self.minsize(800, 500)
        
        # Variables de estado
        self.conversation_history = []  # guarda {"role": "user" o "assistant", "content": texto}
        self.current_message = ""
        
        # Crear la interfaz
        self.create_widgets()
        self.add_system_message("Bienvenido. Estoy conectado a Ollama con el modelo " + OLLAMA_MODEL)
    
    def create_widgets(self):
        # Frame principal (sidebar + chat)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Sidebar izquierdo (opciones)
        self.sidebar = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nswe")
        self.sidebar.grid_propagate(False)
        
        ctk.CTkLabel(self.sidebar, text="ARKE Studio", font=ctk.CTkFont(size=20, weight="bold")).pack(pady=20)
        
        # Botón de nueva conversación
        self.new_chat_btn = ctk.CTkButton(self.sidebar, text="➕ Nueva conversación", command=self.new_conversation)
        self.new_chat_btn.pack(pady=10, padx=10, fill="x")
        
        # Configuración del modelo
        ctk.CTkLabel(self.sidebar, text="Modelo:", font=ctk.CTkFont(size=12)).pack(anchor="w", padx=10, pady=(20,0))
        self.model_var = ctk.StringVar(value=OLLAMA_MODEL)
        self.model_entry = ctk.CTkEntry(self.sidebar, textvariable=self.model_var)
        self.model_entry.pack(padx=10, fill="x", pady=5)
        
        ctk.CTkLabel(self.sidebar, text="Temperatura (0.0-1.0):", font=ctk.CTkFont(size=12)).pack(anchor="w", padx=10, pady=(10,0))
        self.temp_var = ctk.DoubleVar(value=0.7)
        self.temp_slider = ctk.CTkSlider(self.sidebar, from_=0.0, to=1.0, variable=self.temp_var, number_of_steps=20)
        self.temp_slider.pack(padx=10, fill="x", pady=5)
        
        # Botón de limpiar historial
        self.clear_btn = ctk.CTkButton(self.sidebar, text="🗑️ Limpiar historial", command=self.clear_history, fg_color="gray")
        self.clear_btn.pack(pady=20, padx=10, fill="x")
        
        # Estado de conexión
        self.status_label = ctk.CTkLabel(self.sidebar, text="● Conectado a Ollama", text_color="green", font=ctk.CTkFont(size=10))
        self.status_label.pack(side="bottom", pady=10)
        
        # Área principal de chat
        self.chat_frame = ctk.CTkFrame(self)
        self.chat_frame.grid(row=0, column=1, sticky="nswe", padx=10, pady=10)
        self.chat_frame.grid_columnconfigure(0, weight=1)
        self.chat_frame.grid_rowconfigure(0, weight=1)
        
        # Canvas para scroll del chat
        self.canvas = ctk.CTkCanvas(self.chat_frame, highlightthickness=0)
        self.scrollbar = ctk.CTkScrollbar(self.chat_frame, orientation="vertical", command=self.canvas.yview)
        self.scrollable_frame = ctk.CTkFrame(self.canvas)
        self.scrollable_frame.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0,0), window=self.scrollable_frame, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        self.canvas.grid(row=0, column=0, sticky="nswe")
        self.scrollbar.grid(row=0, column=1, sticky="ns")
        
        # Área de entrada de texto
        self.input_frame = ctk.CTkFrame(self)
        self.input_frame.grid(row=1, column=1, sticky="ew", padx=10, pady=(0,10))
        self.input_frame.grid_columnconfigure(0, weight=1)
        
        self.input_text = ctk.CTkTextbox(self.input_frame, height=80, font=ctk.CTkFont(size=13))
        self.input_text.grid(row=0, column=0, sticky="ew", padx=(0,10))
        self.input_text.bind("<Shift-Return>", self.send_message_event)
        self.input_text.bind("<Return>", self.send_message_event)
        
        self.send_btn = ctk.CTkButton(self.input_frame, text="Enviar", width=80, command=self.send_message)
        self.send_btn.grid(row=0, column=1, sticky="e")
        
        # Inicializar scroll al fondo
        self.after(100, self.scroll_to_bottom)
    
    def scroll_to_bottom(self):
        self.canvas.yview_moveto(1.0)
    
    def add_bubble(self, role, text):
        """Añade una burbuja de chat al scrollable frame."""
        frame = ctk.CTkFrame(self.scrollable_frame, corner_radius=15)
        frame.pack(fill="x", padx=10, pady=5)
        
        # Color según rol
        if role == "user":
            bg_color = "#1e88e5"
            fg_color = "white"
            anchor = "e"
            justify = "right"
        else:
            bg_color = "#2d2d2d"
            fg_color = "#e0e0e0"
            anchor = "w"
            justify = "left"
        
        label = ctk.CTkLabel(frame, text=text, wraplength=500, justify=justify, 
                             fg_color=bg_color, text_color=fg_color, 
                             corner_radius=10, padx=10, pady=8)
        label.pack(anchor=anchor, padx=5, pady=2)
        
        # Actualizar scroll
        self.scroll_to_bottom()
    
    def add_system_message(self, text):
        """Mensaje del sistema (gris)."""
        frame = ctk.CTkFrame(self.scrollable_frame, corner_radius=10)
        frame.pack(fill="x", padx=10, pady=2)
        label = ctk.CTkLabel(frame, text=f"ℹ️ {text}", text_color="#888888", font=ctk.CTkFont(size=10, slant="italic"))
        label.pack(anchor="center", pady=2)
        self.scroll_to_bottom()
    
    def send_message_event(self, event):
        if event.state & 0x1:  # Shift+Enter -> nueva línea
            return
        else:
            self.send_message()
            return "break"
    
    def send_message(self):
        user_text = self.input_text.get("1.0", "end-1c").strip()
        if not user_text:
            return
        
        # Mostrar mensaje del usuario
        self.add_bubble("user", user_text)
        self.conversation_history.append({"role": "user", "content": user_text})
        
        # Limpiar entrada
        self.input_text.delete("1.0", "end")
        
        # Deshabilitar botón mientras se procesa
        self.send_btn.configure(state="disabled", text="Pensando...")
        
        # Llamar a Ollama en otro hilo
        threading.Thread(target=self.ask_ollama, daemon=True).start()
    
    def ask_ollama(self):
        # Construir el prompt con historial reciente (últimos 10 mensajes)
        recent = self.conversation_history[-10:]
        prompt = ""
        for msg in recent:
            role = "Usuario" if msg["role"] == "user" else "Asistente"
            prompt += f"{role}: {msg['content']}\n"
        prompt += "Asistente:"
        
        model = self.model_var.get().strip()
        if not model:
            model = OLLAMA_MODEL
        
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "temperature": self.temp_var.get(),
            "max_tokens": 1000
        }
        try:
            response = requests.post(OLLAMA_URL, json=payload, timeout=120)
            if response.status_code == 200:
                answer = response.json().get("response", "").strip()
                if not answer:
                    answer = "(Respuesta vacía)"
                self.root.after(0, self.display_assistant_answer, answer)
            else:
                self.root.after(0, self.display_assistant_answer, f"❌ Error HTTP {response.status_code}")
        except Exception as e:
            self.root.after(0, self.display_assistant_answer, f"❌ Error: {str(e)}")
        finally:
            self.root.after(0, lambda: self.send_btn.configure(state="normal", text="Enviar"))
    
    def display_assistant_answer(self, answer):
        self.add_bubble("assistant", answer)
        self.conversation_history.append({"role": "assistant", "content": answer})
    
    def new_conversation(self):
        self.conversation_history.clear()
        # Limpiar el scrollable frame
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        self.add_system_message("Nueva conversación iniciada.")
    
    def clear_history(self):
        self.conversation_history.clear()
        # Limpiar solo los mensajes del chat, dejando el sistema
        for widget in self.scrollable_frame.winfo_children():
            widget.destroy()
        self.add_system_message("Historial borrado. Puedes empezar de nuevo.")

if __name__ == "__main__":
    app = ChatGPTClone()
    app.mainloop()