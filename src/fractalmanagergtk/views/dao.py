from gi.repository import Gtk


class DaoView(Gtk.Box):
    """Interfaz para propuestas y votaci\u00f3n."""

    def __init__(self, app):
        super().__init__(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.app = app
        self.list_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=6)
        self.append(self.list_box)
        create_button = Gtk.Button(label="Nueva propuesta")
        create_button.connect("clicked", self.on_create)
        self.append(create_button)
        self.refresh()

    def refresh(self):
        self.list_box.foreach(lambda w: self.list_box.remove(w))
        for p in self.app.get_proposals():
            row = Gtk.Box(spacing=6)
            label = Gtk.Label(label=p)
            yes = Gtk.Button(label="S\u00ed")
            no = Gtk.Button(label="No")
            yes.connect("clicked", self.vote, p, True)
            no.connect("clicked", self.vote, p, False)
            for w in (label, yes, no):
                row.append(w)
            self.list_box.append(row)

    def on_create(self, _button):
        dialog = Gtk.MessageDialog(transient_for=self.get_root(), modal=True,
                                   buttons=Gtk.ButtonsType.OK_CANCEL,
                                   text="Crear propuesta")
        entry = Gtk.Entry()
        dialog.set_child(entry)
        dialog.connect("response", lambda d, r: (self.app.create_proposal(entry.get_text()), d.destroy()) if r == Gtk.ResponseType.OK else d.destroy())
        dialog.show()

    def vote(self, _button, proposal, value):
        self.app.vote(proposal, value)
