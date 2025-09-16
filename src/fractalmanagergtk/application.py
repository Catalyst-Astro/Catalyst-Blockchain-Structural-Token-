from gi.repository import Gtk, Adw, Gio
from .views.home import HomeView
from .views.tokens import TokensView
from .views.dao import DaoView
from .views.contracts import ContractsView
from .views.events import EventsView
from web3 import Web3
import os
import json


class FractalManagerApplication(Adw.Application):
    """Aplicaci\u00f3n principal."""

    def __init__(self):
        super().__init__(application_id="com.example.FractalManagerGTK",
                         flags=Gio.ApplicationFlags.FLAGS_NONE)
        Adw.init()
        self.connect("activate", self.on_activate)
        self.rpc_endpoint = "https://localhost:8545"
        self.private_key = ""
        self.contracts = {
            "FractalStaking": [],
            "Dispenser": [],
        }
        self.load_env()
        self.web3 = Web3(Web3.HTTPProvider(self.rpc_endpoint))

    def load_env(self):
        env_path = os.path.expanduser("~/.fractal/env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    if line.startswith("PRIVATE_KEY="):
                        self.private_key = line.strip().split("=", 1)[1]
                    elif line.startswith("RPC_URL="):
                        self.rpc_endpoint = line.strip().split("=", 1)[1]

    def on_activate(self, app):
        self.window = Adw.ApplicationWindow(application=self)
        self.window.set_title("FractalManagerGTK")
        self.window.set_default_size(800, 600)
        self.view_stack = Adw.ViewStack()
        self.window.set_content(self.view_stack)
        self.build_views()
        self.window.present()

    def build_views(self):
        self.home_view = HomeView(self)
        self.tokens_view = TokensView(self)
        self.dao_view = DaoView(self)
        self.contracts_view = ContractsView(self)
        self.events_view = EventsView(self)
        self.view_stack.add_titled(self.home_view, "home", "Inicio")
        self.view_stack.add_titled(self.tokens_view, "tokens", "Tokens")
        self.view_stack.add_titled(self.dao_view, "dao", "DAO")
        self.view_stack.add_titled(self.contracts_view, "contracts", "Contratos")
        self.view_stack.add_titled(self.events_view, "events", "Eventos")

    # --- Placeholders API ---
    def get_balance(self):
        return 0

    def get_last_cycle(self):
        return "-"

    def get_reputation(self):
        return "-"

    def sign_and_send(self, amount, address, action):
        # Placeholder transaction signing
        data = f"{amount}:{address}:{action}".encode()
        return Web3.keccak(data).hex()

    def get_proposals(self):
        return []

    def create_proposal(self, text):
        pass

    def vote(self, proposal, value):
        pass

    def execute_contract(self, name, abi_item):
        pass

    def get_events(self):
        return []


def main() -> None:
    app = FractalManagerApplication()
    app.run([])


if __name__ == "__main__":
    main()
