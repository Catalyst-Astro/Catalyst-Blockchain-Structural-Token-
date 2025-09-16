# FractalApp Desktop Application

import os
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk
from web3 import Web3

# Optional IPFS integration
try:
    import ipfshttpclient
except Exception:  # If IPFS client isn't available or fails to import
    ipfshttpclient = None


class FractalApp(tk.Tk):
    """Simple Tkinter application with Web3 integration."""

    def __init__(self, provider_uri: str, contract_address: str, abi: list):
        super().__init__()
        self.title("FractalApp")
        self.geometry("800x600")

        # Web3 setup
        self.w3 = Web3(Web3.HTTPProvider(provider_uri))
        if not self.w3.is_connected():
            messagebox.showwarning("Conexión", "No se pudo conectar a la red Ethereum")
        self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)

        # Notebook with tabs
        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True)

        self.tab_inicio = ttk.Frame(notebook)
        self.tab_eventos = ttk.Frame(notebook)
        self.tab_token = ttk.Frame(notebook)
        self.tab_dao = ttk.Frame(notebook)
        self.tab_perfil = ttk.Frame(notebook)

        notebook.add(self.tab_inicio, text="Inicio")
        notebook.add(self.tab_eventos, text="Eventos")
        notebook.add(self.tab_token, text="Token")
        notebook.add(self.tab_dao, text="DAO")
        notebook.add(self.tab_perfil, text="Perfil")

        self.create_token_tab()
        self.create_eventos_tab()
        self.create_dao_tab()
        self.create_perfil_tab()

    # --- Token / Staking ---
    def create_token_tab(self):
        frame = ttk.Frame(self.tab_token, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Cantidad FRT").grid(row=0, column=0, sticky="w")
        self.amount_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.amount_var).grid(row=0, column=1)

        ttk.Label(frame, text="Propósito simbólico").grid(row=1, column=0, sticky="w")
        self.purpose_var = tk.StringVar()
        ttk.Entry(frame, textvariable=self.purpose_var).grid(row=1, column=1)

        stake_btn = ttk.Button(frame, text="Stakear", command=self.stake_tokens)
        stake_btn.grid(row=2, column=0, columnspan=2, pady=10)

        self.stake_response = tk.Text(frame, height=5, width=60)
        self.stake_response.grid(row=3, column=0, columnspan=2)

    def stake_tokens(self):
        try:
            amount = int(self.amount_var.get())
        except ValueError:
            messagebox.showerror("Error", "Cantidad inválida")
            return

        purpose = self.purpose_var.get()

        account = self.w3.eth.accounts[0] if self.w3.eth.accounts else None
        if not account:
            messagebox.showerror("Cuenta", "No hay cuenta disponible")
            return

        tx = self.contract.functions.stake(amount, purpose).build_transaction({
            "from": account,
            "nonce": self.w3.eth.get_transaction_count(account)
        })
        signed = self.w3.eth.account.sign_transaction(tx, os.getenv("PRIVATE_KEY", ""))
        tx_hash = self.w3.eth.send_raw_transaction(signed.rawTransaction)

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        text = f"Hash: {tx_hash.hex()}\nBloque: {receipt.blockNumber}"
        self.stake_response.delete("1.0", tk.END)
        self.stake_response.insert(tk.END, text)

    # --- Eventos ---
    def create_eventos_tab(self):
        frame = ttk.Frame(self.tab_eventos, padding=10)
        frame.pack(fill="both", expand=True)

        filter_frame = ttk.Frame(frame)
        filter_frame.pack(fill="x")

        ttk.Label(filter_frame, text="DAO:").pack(side="left")
        self.dao_filter = ttk.Entry(filter_frame, width=10)
        self.dao_filter.pack(side="left")

        ttk.Label(filter_frame, text="Ciclo:").pack(side="left")
        self.cycle_filter = ttk.Entry(filter_frame, width=5)
        self.cycle_filter.pack(side="left")

        ttk.Label(filter_frame, text="Principio:").pack(side="left")
        self.principle_filter = ttk.Entry(filter_frame, width=10)
        self.principle_filter.pack(side="left")

        ttk.Button(filter_frame, text="Filtrar", command=self.load_events).pack(side="left", padx=5)

        columns = ("dao", "ciclo", "principio", "descripcion")
        self.events_table = ttk.Treeview(frame, columns=columns, show="headings")
        for col in columns:
            self.events_table.heading(col, text=col.title())
        self.events_table.pack(fill="both", expand=True)

        self.load_events()

    def load_events(self):
        # Dummy event loading – replace with real on-chain filter if available
        for row in self.events_table.get_children():
            self.events_table.delete(row)

        sample_events = [
            {"dao": "A", "ciclo": 1, "principio": "X", "descripcion": "Evento 1"},
            {"dao": "B", "ciclo": 2, "principio": "Y", "descripcion": "Evento 2"},
        ]
        dao_f = self.dao_filter.get()
        ciclo_f = self.cycle_filter.get()
        princ_f = self.principle_filter.get()
        for ev in sample_events:
            if dao_f and ev["dao"] != dao_f:
                continue
            if ciclo_f and str(ev["ciclo"]) != ciclo_f:
                continue
            if princ_f and ev["principio"] != princ_f:
                continue
            self.events_table.insert("", tk.END, values=(ev["dao"], ev["ciclo"], ev["principio"], ev["descripcion"]))

    # --- DAO ---
    def create_dao_tab(self):
        frame = ttk.Frame(self.tab_dao, padding=10)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="Descripción propuesta").pack(anchor="w")
        self.proposal_text = tk.Text(frame, height=3)
        self.proposal_text.pack(fill="x")

        submit_btn = ttk.Button(frame, text="Crear propuesta", command=self.submit_proposal)
        submit_btn.pack(pady=5)

        vote_frame = ttk.Frame(frame)
        vote_frame.pack(pady=10)
        ttk.Button(vote_frame, text="Sí", command=lambda: self.cast_vote(True)).pack(side="left", padx=5)
        ttk.Button(vote_frame, text="No", command=lambda: self.cast_vote(False)).pack(side="left", padx=5)

        self.dao_result = tk.Text(frame, height=5)
        self.dao_result.pack(fill="both", expand=True)

    def submit_proposal(self):
        desc = self.proposal_text.get("1.0", tk.END).strip()
        if not desc:
            messagebox.showwarning("Propuesta", "La descripción está vacía")
            return
        # Placeholder: store description locally
        self.current_proposal = desc
        messagebox.showinfo("Propuesta", "Propuesta creada")

    def cast_vote(self, approve: bool):
        if not hasattr(self, "current_proposal"):
            messagebox.showwarning("DAO", "No hay propuesta")
            return
        result = "aprobada" if approve else "rechazada"
        summary = f"La propuesta '{self.current_proposal}' fue {result}."
        self.dao_result.delete("1.0", tk.END)
        self.dao_result.insert(tk.END, summary)

    # --- Perfil ---
    def create_perfil_tab(self):
        frame = ttk.Frame(self.tab_perfil, padding=10)
        frame.pack(fill="both", expand=True)

        self.addr_var = tk.StringVar(value="")
        self.reputation_var = tk.StringVar(value="0")
        self.cycles_var = tk.StringVar(value="0")
        self.archetype_var = tk.StringVar(value="N/A")

        ttk.Label(frame, text="Dirección:").grid(row=0, column=0, sticky="w")
        ttk.Label(frame, textvariable=self.addr_var).grid(row=0, column=1, sticky="w")

        ttk.Label(frame, text="Reputación:").grid(row=1, column=0, sticky="w")
        ttk.Label(frame, textvariable=self.reputation_var).grid(row=1, column=1, sticky="w")

        ttk.Label(frame, text="Ciclos participados:").grid(row=2, column=0, sticky="w")
        ttk.Label(frame, textvariable=self.cycles_var).grid(row=2, column=1, sticky="w")

        ttk.Label(frame, text="Arquetipo:").grid(row=3, column=0, sticky="w")
        ttk.Label(frame, textvariable=self.archetype_var).grid(row=3, column=1, sticky="w")

        ttk.Button(frame, text="Actualizar", command=self.load_profile).grid(row=4, column=0, columnspan=2, pady=10)

    def load_profile(self):
        account = self.w3.eth.accounts[0] if self.w3.eth.accounts else ""
        self.addr_var.set(account)
        # Placeholder metrics
        self.reputation_var.set("1")
        self.cycles_var.set("3")
        self.archetype_var.set("Neutro")


if __name__ == "__main__":
    # Basic ERC20 ABI subset with stake function
    ABI = [
        {
            "inputs": [
                {"internalType": "uint256", "name": "amount", "type": "uint256"},
                {"internalType": "string", "name": "purpose", "type": "string"}
            ],
            "name": "stake",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]

    PROVIDER_URI = os.getenv("WEB3_PROVIDER_URI", "http://localhost:8545")
    CONTRACT_ADDRESS = os.getenv("FRACTAL_TOKEN_ADDRESS", "0x0000000000000000000000000000000000000000")

    app = FractalApp(PROVIDER_URI, CONTRACT_ADDRESS, ABI)
    app.mainloop()
