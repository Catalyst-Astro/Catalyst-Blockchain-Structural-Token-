import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HefestosClient } from './domain/HefestosClient';
import { RunModel } from './domain/RunModel';
import { ClassicPanel } from './ui/ClassicPanel';
import type { MELE, NA } from './domain/types';

type RunStatus = 'idle' | 'loading' | 'success' | 'error';

const App: React.FC = () => {
  const client = useMemo(() => new HefestosClient(), []);
  const model = useMemo(() => new RunModel(), []);

  const [text, setText] = useState('');
  const [cycles, setCycles] = useState(1);
  const [jsonl, setJsonl] = useState('./state/runs.jsonl');
  const [hefestosPath, setHefestosPath] = useState('');
  const [na, setNa] = useState<NA>(model.na);
  const [mele, setMele] = useState<MELE>(model.mele);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<RunStatus>('idle');

  const classicRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (classicRef.current) {
      new ClassicPanel(classicRef.current);
    }
  }, []);

  const onRun = async () => {
    setStatus('loading');
    setError('');
    setOutput('');
    try {
      model.text = text;
      model.cycles = cycles;
      model.jsonl = jsonl;
      model.na = na;
      model.mele = mele;
      model.hefestosPath = hefestosPath;
      const res = await client.run(model.toRequest());
      setOutput(res.output);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus('error');
    }
  };

  const renderOutput = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-3">
          <div className="h-4 w-2/3 rounded-full bg-border skeleton" />
          <div className="h-4 w-full rounded-full bg-border skeleton" />
          <div className="h-4 w-3/4 rounded-full bg-border skeleton" />
          <p className="text-sm text-muted">Ejecutando ciclo Hefestos...</p>
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="rounded-lg border border-red-400/60 bg-red-500/10 p-4 text-sm text-red-200">
          <p className="font-semibold">Error de ejecución</p>
          <p className="mt-2 whitespace-pre-wrap">{error}</p>
        </div>
      );
    }
    if (!output) {
      return (
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Sin salida todavía. Ejecuta un ciclo para ver el reporte BAE 1.1.0.
        </div>
      );
    }
    return (
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/80 p-4 text-sm text-slate-100">
        {output}
      </pre>
    );
  };

  return (
    <div className="min-h-screen bg-bg px-6 py-6 text-fg md:px-10">
      <header className="mb-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Alejandría · BAE 1.1.0 (Hefestos)</p>
        <h1 className="text-3xl font-semibold">Catalyst GUI · Pentetraktys Desktop</h1>
        <p className="max-w-2xl text-sm text-muted">
          GUI desktop con IPC seguro para ejecutar el binario C++ Hefestos. Modelo y servicio usan clases TypeScript
          (OOP), con un panel DOM clásico para comparar patrones.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Entrada Hefestos</h2>
          <p className="mt-1 text-sm text-muted">Define texto, ciclos y parámetros NA/MELE antes de ejecutar.</p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="input-text" className="text-sm font-medium text-fg">Texto base</label>
              <textarea
                id="input-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={6}
                className="mt-2 w-full rounded-lg border border-border bg-transparent p-3 text-sm text-fg placeholder:text-muted focus-visible:outline-none"
                placeholder="Describe el experimento o la hipótesis inicial."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label htmlFor="input-cycles" className="text-sm font-medium text-fg">Ciclos</label>
                <input
                  id="input-cycles"
                  type="number"
                  min={1}
                  max={100}
                  value={cycles}
                  onChange={(event) => setCycles(Number(event.target.value))}
                  className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-fg focus-visible:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="input-jsonl" className="text-sm font-medium text-fg">Ruta JSONL</label>
                <input
                  id="input-jsonl"
                  value={jsonl}
                  onChange={(event) => setJsonl(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-fg focus-visible:outline-none"
                  placeholder="./state/runs.jsonl"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-bin" className="text-sm font-medium text-fg">Ruta binario Hefestos (opcional)</label>
              <input
                id="input-bin"
                value={hefestosPath}
                onChange={(event) => setHefestosPath(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-fg focus-visible:outline-none"
                placeholder="../../core/build/hefestos"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <fieldset className="rounded-lg border border-border p-4">
              <legend className="px-2 text-sm font-semibold text-fg">NA (riesgo operacional)</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['I', 'E', 'R', 'K'] as const).map((key) => (
                  <label key={key} className="text-sm text-muted">
                    {key}
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={na[key]}
                      onChange={(event) => setNa((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm text-fg focus-visible:outline-none"
                      aria-label={`NA ${key}`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-border p-4">
              <legend className="px-2 text-sm font-semibold text-fg">MELE (calidad editorial)</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['M', 'E', 'L', 'Et'] as const).map((key) => (
                  <label key={key} className="text-sm text-muted">
                    {key}
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={mele[key]}
                      onChange={(event) => setMele((prev) => ({ ...prev, [key]: Number(event.target.value) }))}
                      className="mt-1 w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm text-fg focus-visible:outline-none"
                      aria-label={`MELE ${key}`}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onRun}
              disabled={status === 'loading' || text.trim().length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Ejecutando…' : 'Run Hefestos'}
            </button>
            <span className="text-xs text-muted">Se requiere IPC activo (Electron) y binario compilado.</span>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold">ClassicPanel (OOP DOM)</h3>
            <p className="mt-1 text-sm text-muted">
              Ejemplo sin React: clase que controla DOM directo para comparar patrones.
            </p>
            <div ref={classicRef} className="mt-3 rounded-lg border border-border bg-bg p-3" />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-soft">
          <h2 className="text-xl font-semibold">Salida &amp; estado</h2>
          <p className="mt-1 text-sm text-muted">Incluye salida textual del CLI y estados de ejecución.</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-border bg-bg p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted">
                <span>Estado</span>
                <span>{status === 'idle' ? 'Listo' : status}</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    status === 'success' ? 'w-full bg-emerald-400' :
                    status === 'error' ? 'w-2/3 bg-red-400' :
                    status === 'loading' ? 'w-1/2 bg-primary' : 'w-1/5 bg-border'
                  }`}
                />
              </div>
            </div>

            {renderOutput()}
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
