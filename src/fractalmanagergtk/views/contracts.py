from gi.repository import Gtk
import json


class ContractsView(Gtk.Box):
    """Exploraci\u00f3n de contratos desplegados."""

    def __init__(self, app):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.app = app
        self.combo = Gtk.ComboBoxText()
        for name in self.app.contracts.keys():
            self.combo.append_text(name)
        self.combo.connect("changed", self.on_changed)
        self.append(self.combo)
        self.func_list = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.append(self.func_list)
        self.on_changed()

    def on_changed(self, *_):
        self.func_list.foreach(lambda w: self.func_list.remove(w))
        name = self.combo.get_active_text()
        if not name:
            return
        abi = self.app.contracts[name]
        for item in abi:
            if item.get("type") == "function" and item.get("stateMutability") != "view":
                row = Gtk.Box(spacing=6)
                label = Gtk.Label(label=item["name"])
                button = Gtk.Button(label="Ejecutar")
                button.connect("clicked", self.execute, name, item)
                row.append(label)
                row.append(button)
                self.func_list.append(row)

    def execute(self, _button, contract_name, abi_item):
        self.app.execute_contract(contract_name, abi_item)
