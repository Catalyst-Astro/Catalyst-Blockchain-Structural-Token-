"""Main GUI application for FractalManager."""
from __future__ import annotations

import tkinter as tk
from tkinter import ttk, messagebox
from typing import Any

from .token_manager import TokenManager
from .dao_manager import DAOManager


class FractalGUI(ttk.Frame):
    """Tkinter based interface with tabs for token and DAO management."""

    def __init__(self, master: tk.Tk | None = None):
        super().__init__(master)
        self.master.title("FractalManager")
        self.pack(fill="both", expand=True)
        self.manager = TokenManager.connect()
        self.dao = DAOManager.connect()
        self._build_ui()

    def _build_ui(self) -> None:
        nb = ttk.Notebook(self)
        nb.pack(fill="both", expand=True)

        nb.add(self._token_tab(nb), text="Tokens")
        nb.add(self._transfer_tab(nb), text="Transfer")
        nb.add(self._dao_tab(nb), text="DAO")

    def _token_tab(self, parent: Any) -> ttk.Frame:
        frame = ttk.Frame(parent)
        ttk.Label(frame, text="Emitir cantidad").grid(row=0, column=0, pady=5)
        self.mint_amount = tk.Entry(frame)
        self.mint_amount.grid(row=0, column=1)
        ttk.Label(frame, text="Receptor").grid(row=1, column=0, pady=5)
        self.mint_to = tk.Entry(frame, width=42)
        self.mint_to.grid(row=1, column=1)
        ttk.Button(frame, text="Emitir", command=self._mint).grid(row=2, column=0, columnspan=2, pady=5)
        return frame

    def _transfer_tab(self, parent: Any) -> ttk.Frame:
        frame = ttk.Frame(parent)
        ttk.Label(frame, text="Destino").grid(row=0, column=0, pady=5)
        self.transfer_to = tk.Entry(frame, width=42)
        self.transfer_to.grid(row=0, column=1)
        ttk.Label(frame, text="Cantidad").grid(row=1, column=0, pady=5)
        self.transfer_amount = tk.Entry(frame)
        self.transfer_amount.grid(row=1, column=1)
        ttk.Button(frame, text="Enviar", command=self._transfer).grid(row=2, column=0, columnspan=2, pady=5)
        return frame

    def _dao_tab(self, parent: Any) -> ttk.Frame:
        frame = ttk.Frame(parent)
        ttk.Label(frame, text="Nueva propuesta").grid(row=0, column=0)
        self.prop_text = tk.Entry(frame, width=50)
        self.prop_text.grid(row=0, column=1)
        ttk.Button(frame, text="Crear", command=self._create_prop).grid(row=0, column=2, padx=5)

        self.props_list = tk.Listbox(frame, width=60, height=10)
        self.props_list.grid(row=1, column=0, columnspan=3, pady=5)
        ttk.Button(frame, text="Refrescar", command=self._load_props).grid(row=2, column=0, pady=5)
        ttk.Button(frame, text="Votar Sí", command=lambda: self._vote(True)).grid(row=2, column=1)
        ttk.Button(frame, text="Votar No", command=lambda: self._vote(False)).grid(row=2, column=2)
        return frame

    def _show_result(self, title: str, result: str) -> None:
        messagebox.showinfo(title, result)

    def _mint(self) -> None:
        to = self.mint_to.get()
        amt = int(self.mint_amount.get())
        tx_hash = self.manager.mint(to, amt)
        self._show_result("Mint", tx_hash)

    def _transfer(self) -> None:
        to = self.transfer_to.get()
        amt = int(self.transfer_amount.get())
        tx_hash = self.manager.transfer(to, amt)
        self._show_result("Transfer", tx_hash)

    def _create_prop(self) -> None:
        text = self.prop_text.get()
        tx_hash = self.dao.create_proposal(text)
        self._show_result("Crear propuesta", tx_hash)

    def _load_props(self) -> None:
        self.props_list.delete(0, tk.END)
        for idx, text in enumerate(self.dao.list_proposals()):
            self.props_list.insert(tk.END, f"{idx}: {text}")

    def _vote(self, support: bool) -> None:
        selection = self.props_list.curselection()
        if not selection:
            return
        prop_id = selection[0]
        tx_hash = self.dao.vote(prop_id, support)
        self._show_result("Voto", tx_hash)


def main() -> None:
    root = tk.Tk()
    FractalGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
