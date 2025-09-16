from gi.repository import Gtk


class TokensView(Gtk.Box):
    """Vista para emitir y transferir tokens."""

    def __init__(self, app):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.app = app
        self.notebook = Gtk.Notebook()
        self.append(self.notebook)
        self._build_issue_tab()
        self._build_transfer_tab()

    def _build_issue_tab(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.issue_amount = Gtk.Entry()
        self.issue_amount.set_placeholder_text("Cantidad")
        self.issue_address = Gtk.Entry()
        self.issue_address.set_placeholder_text("Direcci\u00f3n")
        button = Gtk.Button(label="Ejecutar")
        button.connect("clicked", self.on_issue)
        for w in (self.issue_amount, self.issue_address, button):
            box.append(w)
        self.notebook.append_page(box, Gtk.Label(label="Emitir"))

    def _build_transfer_tab(self):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.transfer_amount = Gtk.Entry()
        self.transfer_amount.set_placeholder_text("Cantidad")
        self.transfer_address = Gtk.Entry()
        self.transfer_address.set_placeholder_text("Direcci\u00f3n")
        button = Gtk.Button(label="Ejecutar")
        button.connect("clicked", self.on_transfer)
        self.transfer_result = Gtk.Label()
        for w in (self.transfer_amount, self.transfer_address, button, self.transfer_result):
            box.append(w)
        self.notebook.append_page(box, Gtk.Label(label="Transferir"))

    def on_issue(self, _button):
        # Placeholder de emisi\u00f3n de tokens
        amount = self.issue_amount.get_text()
        address = self.issue_address.get_text()
        tx_hash = self.app.sign_and_send(amount, address, "issue")
        dialog = Gtk.MessageDialog(transient_for=self.get_root(), modal=True,
                                   message_type=Gtk.MessageType.INFO,
                                   buttons=Gtk.ButtonsType.OK,
                                   text=f"TX: {tx_hash}")
        dialog.connect("response", lambda *args: dialog.destroy())
        dialog.show()

    def on_transfer(self, _button):
        amount = self.transfer_amount.get_text()
        address = self.transfer_address.get_text()
        tx_hash = self.app.sign_and_send(amount, address, "transfer")
        self.transfer_result.set_text(f"TX: {tx_hash}")
