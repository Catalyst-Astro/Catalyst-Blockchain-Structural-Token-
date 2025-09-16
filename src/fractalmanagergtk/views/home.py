from gi.repository import Gtk


class HomeView(Gtk.Box):
    """Vista de inicio que muestra saldo y reputaci\u00f3n."""

    def __init__(self, app):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=12)
        self.app = app
        self.balance_label = Gtk.Label(label="Saldo: 0 FRT")
        self.cycle_label = Gtk.Label(label="Ciclo DAO: -")
        self.rep_label = Gtk.Label(label="Reputaci\u00f3n: -")
        for child in (self.balance_label, self.cycle_label, self.rep_label):
            self.append(child)
        self.refresh()

    def refresh(self):
        # Llamadas a contratos placeholder
        try:
            balance = self.app.get_balance()
        except Exception:
            balance = 0
        self.balance_label.set_text(f"Saldo: {balance} FRT")
        self.cycle_label.set_text(f"Ciclo DAO: {self.app.get_last_cycle()}")
        self.rep_label.set_text(f"Reputaci\u00f3n: {self.app.get_reputation()}")
