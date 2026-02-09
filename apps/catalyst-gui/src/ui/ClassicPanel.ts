export class ClassicPanel {
  private root: HTMLElement;
  private label: HTMLDivElement;
  private button: HTMLButtonElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = '';

    this.label = document.createElement('div');
    this.label.textContent = 'ClassicPanel: listo (OOP DOM)';
    this.label.className = 'text-sm text-muted';

    this.button = document.createElement('button');
    this.button.textContent = 'Ping';
    this.button.className =
      'rounded-md border border-border px-3 py-1 text-sm font-semibold text-fg transition duration-150 hover:border-primary';
    this.button.onclick = () => {
      this.label.textContent = `ClassicPanel: ping @ ${new Date().toISOString()}`;
    };

    const wrap = document.createElement('div');
    wrap.className = 'flex flex-wrap items-center gap-2';
    wrap.appendChild(this.button);
    wrap.appendChild(this.label);

    this.root.appendChild(wrap);
  }
}
