from gi.repository import Gtk


class EventsView(Gtk.Box):
    """Listado de eventos on-chain."""

    def __init__(self, app):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.app = app
        self.list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.append(self.list_box)
        self.refresh()

    def refresh(self):
        self.list_box.foreach(lambda w: self.list_box.remove(w))
        for evt in self.app.get_events():
            self.list_box.append(Gtk.Label(label=evt))
