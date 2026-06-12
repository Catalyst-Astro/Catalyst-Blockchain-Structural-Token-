from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
import tkinter as tk


PROJECT_ROOT = Path(__file__).resolve().parent.parent
LEGACY_MODULES_DIR = PROJECT_ROOT / "arke"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(LEGACY_MODULES_DIR) not in sys.path:
    sys.path.insert(0, str(LEGACY_MODULES_DIR))

from arke.arke_orquestador import OrquestadorArke  # type: ignore  # noqa: E402


class RetroPanel(tk.Frame):
    def __init__(self, master: tk.Misc) -> None:
        super().__init__(master, bg="#0a0a0a")
        self._build_ui()
        self.orquestador = OrquestadorArke()
        self._log_system("ARK-E RETRO INTERFACE INICIALIZADA")

    def _build_ui(self) -> None:
        self.master.title("ARK-E // Retro Command Deck")
        self.master.geometry("1200x760")
        self.master.configure(bg="#0a0a0a")
        self.pack(fill=tk.BOTH, expand=True)

        top = tk.Frame(self, bg="#0a0a0a")
        top.pack(fill=tk.X, padx=12, pady=(12, 6))

        tk.Label(
            top,
            text="ARK-E ORQUESTADOR // CONSOLA RETRO",
            fg="#35ff7a",
            bg="#0a0a0a",
            font=("Consolas", 15, "bold"),
        ).pack(side=tk.LEFT)

        self.clock_label = tk.Label(
            top, text="", fg="#35ff7a", bg="#0a0a0a", font=("Consolas", 11)
        )
        self.clock_label.pack(side=tk.RIGHT)
        self._tick_clock()

        body = tk.Frame(self, bg="#0a0a0a")
        body.pack(fill=tk.BOTH, expand=True, padx=12, pady=6)

        left = tk.Frame(body, bg="#0a0a0a", bd=1, relief=tk.GROOVE, highlightbackground="#1f5f3a")
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        right = tk.Frame(body, bg="#0a0a0a", bd=1, relief=tk.GROOVE, highlightbackground="#1f5f3a")
        right.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(8, 0))

        self.console = tk.Text(
            left,
            wrap=tk.WORD,
            bg="#030303",
            fg="#35ff7a",
            insertbackground="#35ff7a",
            font=("Consolas", 11),
            relief=tk.FLAT,
            padx=10,
            pady=10,
        )
        self.console.pack(fill=tk.BOTH, expand=True)
        self.console.config(state=tk.DISABLED)

        self.telemetry = tk.Text(
            right,
            wrap=tk.WORD,
            bg="#050505",
            fg="#89ffad",
            insertbackground="#89ffad",
            font=("Consolas", 10),
            relief=tk.FLAT,
            padx=10,
            pady=10,
        )
        self.telemetry.pack(fill=tk.BOTH, expand=True)
        self.telemetry.config(state=tk.DISABLED)

        bottom = tk.Frame(self, bg="#0a0a0a")
        bottom.pack(fill=tk.X, padx=12, pady=(0, 12))

        self.input_var = tk.StringVar()
        entry = tk.Entry(
            bottom,
            textvariable=self.input_var,
            bg="#030303",
            fg="#35ff7a",
            insertbackground="#35ff7a",
            font=("Consolas", 11),
            relief=tk.FLAT,
        )
        entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=6)
        entry.bind("<Return>", self._run_flow_event)
        entry.focus_set()

        tk.Button(
            bottom,
            text="EJECUTAR FLUJO",
            command=self._run_flow,
            bg="#133320",
            fg="#b8ffcf",
            activebackground="#1e4a2c",
            activeforeground="#d8ffe5",
            font=("Consolas", 10, "bold"),
            relief=tk.FLAT,
            padx=12,
            pady=6,
        ).pack(side=tk.LEFT, padx=(8, 0))

    def _tick_clock(self) -> None:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.clock_label.configure(text=now)
        self.after(1000, self._tick_clock)

    def _log_console(self, message: str) -> None:
        self.console.config(state=tk.NORMAL)
        self.console.insert(tk.END, f"{message}\n")
        self.console.see(tk.END)
        self.console.config(state=tk.DISABLED)

    def _log_system(self, message: str) -> None:
        stamp = datetime.now().strftime("%H:%M:%S")
        self._log_console(f"[{stamp}] :: {message}")

    def _write_telemetry(self, payload: dict) -> None:
        self.telemetry.config(state=tk.NORMAL)
        self.telemetry.delete("1.0", tk.END)
        self.telemetry.insert(tk.END, json.dumps(payload, indent=2, ensure_ascii=False))
        self.telemetry.config(state=tk.DISABLED)

    def _run_flow_event(self, _event: tk.Event) -> str:
        self._run_flow()
        return "break"

    def _run_flow(self) -> None:
        entrada = self.input_var.get().strip()
        if not entrada:
            self._log_system("ENTRADA VACIA, ESPERANDO CONTEXTO")
            return

        self.input_var.set("")
        self._log_system(f"INPUT > {entrada}")

        try:
            resultado = self.orquestador.ejecutar_flujo(entrada)
        except Exception as exc:
            self._log_system(f"ERROR ORQUESTADOR: {exc}")
            return

        analisis = resultado.get("analisis", {})
        prediccion = resultado.get("prediccion", {})
        aprendizaje = resultado.get("aprendizaje", {})
        decision = resultado.get("decision", {})
        manifestacion = resultado.get("manifestacion")
        escenarios = resultado.get("escenarios", [])
        modulos_activados = resultado.get("modulos_activados", [])
        entropia = resultado.get("entropia_interna", "-")
        idt = resultado.get("idt", "-")
        vt = resultado.get("vt", "-")
        accion = resultado.get("accion", {})

        self._log_system(
            "ANALISIS -> TOKENS="
            f"{len(analisis.get('tokens', []))} | RELEVANCIA={analisis.get('relevancia', '-')}"
        )
        self._log_system(
            "PREDICCION -> FUTURO="
            f"{prediccion.get('futuro_probable', '-')} | RIESGO={prediccion.get('riesgo', '-')}"
        )
        self._log_system(
            "DECISION -> OPCION="
            f"{decision.get('opcion', '-')} | ICD={decision.get('ICD', '-')}"
        )
        self._log_system(f"ATENCION -> MODULOS={modulos_activados} | ENTROPIA={entropia}")
        self._log_system(f"COLAPSO -> IDT={idt} | VT={vt}")
        self._log_system(f"ACCION -> {accion.get('recomendada', manifestacion)}")
        self._log_system(f"APRENDIZAJE -> {aprendizaje}")
        self._log_system(f"MANIFESTACION -> {manifestacion}")
        self._log_system("-" * 56)

        self._write_telemetry(
            {
                "input": entrada,
                "analisis": analisis,
                "prediccion": prediccion,
                "aprendizaje": aprendizaje,
                "escenarios": escenarios,
                "decision": decision,
                "manifestacion": manifestacion,
            }
        )


def main() -> None:
    root = tk.Tk()
    RetroPanel(root)
    root.mainloop()


if __name__ == "__main__":
    main()
