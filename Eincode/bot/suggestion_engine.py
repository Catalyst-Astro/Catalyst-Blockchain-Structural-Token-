#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST SUGGESTION ENGINE — Obsidian-style Chat Recommendations
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Métricas filológicas basadas en 8 juegos lingüísticos para rankear
y sugerir chats según actividad. Estilo Obsidian Graph View.

JUEGOS COMO MÉTRICAS:
  sprachspiel   → Relevancia contextual (0-1)
  differance    → Desplazamiento semántico (0-1)
  mirror        → Auto-referencia textual (0-1)
  deep_structure→ Complejidad sintáctica (0-1)
  grice         → Eficiencia conversacional (0-1)
  polyphony     → Diversidad de voces (0-1)
  semiosis      → Densidad sígnica (0-1)
  casimir       → Creatividad (vacío→sentido) (0-1)

SCORE FILOLÓGICO = Σ(métricas × pesos) / normalización

═══════════════════════════════════════════════════════════════════════════
"""

import sqlite3, json, re, os, sys, io, math, hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, Counter

if sys.platform == "win32":
    try:
        if not sys.stdout.closed:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except:
        pass

# ═══════════════════════════════════════════════════════════════
# PHILOLOGICAL METRICS ENGINE
# ═══════════════════════════════════════════════════════════════

class PhilologicalMetrics:
    """8 métricas filológicas basadas en juegos lingüísticos."""

    @staticmethod
    def sprachspiel(text: str) -> float:
        """Wittgenstein: relevancia contextual — el significado es uso."""
        forms = {
            "financial": [r'\b(?:banco|token|cat|cny|mxn|transaccion|capital|valor|economia)\b'],
            "technical": [r'\b(?:codigo|sistema|api|servidor|blockchain|protocolo|algoritmo)\b'],
            "philosophical": [r'\b(?:ontologia|deontologia|ser|etica|verdad|existencia|realidad)\b'],
            "creative": [r'\b(?:crear|imaginar|posible|nuevo|innovar|diseñar|inventar)\b'],
        }
        scores = []
        for patterns in forms.values():
            hits = sum(len(re.findall(p, text, re.IGNORECASE)) for p in patterns)
            scores.append(min(1.0, hits / max(1, len(text.split()) / 20)))
        return round(sum(scores) / len(scores), 3) if scores else 0.5

    @staticmethod
    def differance(text: str) -> float:
        """Derrida: desplazamiento semántico entre inicio y final."""
        words = text.split()
        if len(words) < 10: return 0.5
        first_quarter = set(w.lower() for w in words[:len(words)//4] if len(w) > 3)
        last_quarter = set(w.lower() for w in words[-len(words)//4:] if len(w) > 3)
        if not first_quarter: return 0.5
        overlap = len(first_quarter & last_quarter) / len(first_quarter)
        return round(1.0 - overlap, 3)  # Más desplazamiento = más differance

    @staticmethod
    def mirror(text: str) -> float:
        """Lacan: auto-referencia — narcisismo textual."""
        self_refs = len(re.findall(r'\b(?:yo|mi|me|nosotros|nuestro|aqui|este sistema)\b', text, re.IGNORECASE))
        total = len(text.split())
        return round(min(1.0, self_refs / max(1, total / 30)), 3)

    @staticmethod
    def deep_structure(text: str) -> float:
        """Chomsky: complejidad sintáctica — profundidad generativa."""
        sentences = re.split(r'[.!?]+', text)
        if not sentences: return 0.0
        metrics = []
        for s in sentences[:20]:
            words = s.split()
            if len(words) < 3: continue
            subord = len(re.findall(r'\b(?:que|cuando|donde|porque|aunque|mientras|si|como| cual)\b', s, re.IGNORECASE))
            nested = s.count(',') + s.count(';') + s.count(':')
            complexity = (subord * 0.6 + nested * 0.4) / max(1, len(words) / 8)
            metrics.append(min(1.0, complexity))
        return round(sum(metrics) / max(1, len(metrics)), 3)

    @staticmethod
    def grice(text: str) -> float:
        """Grice: eficiencia conversacional — máximas respetadas."""
        words = text.split()
        if not words: return 0.0
        conciseness = min(1.0, 80 / max(1, len(words)))
        clarity = len(re.findall(r'\b(?:es decir|por ejemplo|específicamente|en otras palabras|claramente)\b', text, re.IGNORECASE))
        relevance = len(re.findall(r'\b(?:relevante|importante|clave|esencial|fundamental|crucial)\b', text, re.IGNORECASE))
        return round((conciseness * 0.5 + min(1.0, (clarity + relevance) / 5) * 0.5), 3)

    @staticmethod
    def polyphony(text: str) -> float:
        """Bakhtin: diversidad de voces en el discurso."""
        quotes = len(re.findall(r'"([^"]*)"', text))
        citations = len(re.findall(r'\[(\d+)\]|\(\w+\s+\d{4}\)', text))
        voices = len(set(re.findall(r'\b(?:segun|para|afirma|sostiene|argumenta|niega|refuta|señala|indica)\b', text, re.IGNORECASE)))
        total = len(text.split())
        return round(min(1.0, (quotes * 0.4 + citations * 0.3 + voices * 0.3) / max(1, total / 80)), 3)

    @staticmethod
    def semiosis(text: str) -> float:
        """Peirce: densidad sígnica — cadena triádica de significado."""
        icons = len(re.findall(r'\b(?:como|similar|parecido|analogo|imagen|metafora)\b', text, re.IGNORECASE))
        indices = len(re.findall(r'\b(?:esto|aqui|ahora|este|ese|aquel)\b', text, re.IGNORECASE))
        symbols = len(re.findall(r'\b[A-ZÁÉÍÓÚÑ]{2,}[a-záéíóúñ]+\b', text))
        total = len(text.split())
        return round(min(1.0, (icons + indices + symbols) / max(1, total / 15)), 3)

    @staticmethod
    def casimir(text: str) -> float:
        """Vacío Cuántico: creatividad — fluctuaciones del sentido."""
        pauses = len(re.findall(r'[.,;:—…?!]', text))
        gaps = len(re.findall(r'\n\n|\r\n\r\n', text))
        unique_ratio = len(set(re.findall(r'\b\w{4,}\b', text.lower()))) / max(1, len(re.findall(r'\b\w{4,}\b', text.lower())))
        total = len(text.split())
        structure = (pauses * 0.3 + gaps * 0.3 + unique_ratio * 0.4) / max(1, total / 50)
        return round(min(1.0, structure * 3), 3)

    @classmethod
    def score_all(cls, text: str) -> Dict[str, float]:
        """Calcula las 8 métricas para un texto."""
        return {
            "sprachspiel": cls.sprachspiel(text),
            "differance": cls.differance(text),
            "mirror": cls.mirror(text),
            "deep_structure": cls.deep_structure(text),
            "grice": cls.grice(text),
            "polyphony": cls.polyphony(text),
            "semiosis": cls.semiosis(text),
            "casimir": cls.casimir(text),
        }

    @classmethod
    def philological_score(cls, text: str, weights: Dict[str, float] = None) -> float:
        """Score filológico compuesto (0-1) con pesos personalizables."""
        if weights is None:
            weights = {k: 1.0 for k in ["sprachspiel","differance","mirror","deep_structure","grice","polyphony","semiosis","casimir"]}
        metrics = cls.score_all(text)
        total_weight = sum(weights.values())
        return round(sum(metrics[k] * weights.get(k, 1.0) for k in metrics) / total_weight, 4)


# ═══════════════════════════════════════════════════════════════
# SUGGESTION ENGINE
# ═══════════════════════════════════════════════════════════════

@dataclass
class ChatSuggestion:
    """Una sugerencia de chat basada en actividad y métricas."""
    title: str
    reason: str
    philological_score: float
    metrics: Dict[str, float]
    related_chats: List[str]
    suggested_mode: str
    suggested_depth: str
    last_active: str
    conv_id: str
    concepts: List[str]
    urgency: str  # hot | warm | cold | archived

class SuggestionEngine:
    """Motor de sugerencias estilo Obsidian con métricas filológicas."""

    def __init__(self, db_paths: List[str] = None):
        self.db_paths = db_paths or []
        self.metrics = PhilologicalMetrics()
        self.suggestions: List[ChatSuggestion] = []
        self._scan_dbs()

    def _scan_dbs(self):
        """Escanea todas las bases de datos disponibles."""
        default_paths = [
            os.path.join(os.path.dirname(__file__), "orchestrator_log.db"),
            os.path.join(os.path.dirname(__file__), "catalyst_cli.db"),
            os.path.join(os.path.dirname(__file__), "catalyst_bot.db"),
            os.path.join(os.path.dirname(__file__), "../../apps/catalyst-chat/catalyst.db"),
        ]
        self.db_paths = [p for p in (self.db_paths or default_paths) if os.path.exists(p)]
        if not self.db_paths:
            # Crear DB vacía para no fallar
            pass

    def _query_all_messages(self, limit: int = 200) -> List[Dict]:
        """Query all messages across all databases."""
        all_msgs = []

        for db_path in self.db_paths:
            try:
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row

                # Try different table schemas
                for table, cols in [
                    ("unified_log", "timestamp, channel, direction, message_text, mode, depth, coherence_score"),
                    ("messages", "timestamp, role, content, NULL as channel, NULL as mode, NULL as depth, NULL as coherence_score"),
                    ("convs", "created_at as timestamp, title, mode, depth, msgs as message_text, NULL as channel, NULL as direction, NULL as coherence_score"),
                ]:
                    try:
                        rows = conn.execute(f"SELECT {cols} FROM {table} ORDER BY timestamp DESC LIMIT {limit}").fetchall()
                        for r in rows:
                            all_msgs.append(dict(r))
                        break
                    except:
                        continue
                conn.close()
            except:
                pass

        return all_msgs

    def generate_suggestions(self, limit: int = 10) -> List[ChatSuggestion]:
        """Genera sugerencias de chats basadas en actividad y métricas."""
        msgs = self._query_all_messages(limit)

        if not msgs:
            # Sugerencia default
            return [ChatSuggestion(
                title="Iniciar nuevo chat Catalyst",
                reason="No hay historial previo. Comienza con modo Catalyst para banca y conocimiento general.",
                philological_score=1.0,
                metrics={},
                related_chats=[],
                suggested_mode="catalyst",
                suggested_depth="medium",
                last_active=datetime.now().isoformat(),
                conv_id="new",
                concepts=["catalyst", "autopoiesis", "banca"],
                urgency="hot",
            )]

        # Agrupar mensajes por conversación/tema
        groups = defaultdict(list)
        for m in msgs:
            text = m.get("message_text") or m.get("content") or m.get("msgs") or ""
            if isinstance(text, str) and len(text) > 10:
                key = m.get("channel", "unknown")
                groups[key].append(text)

        suggestions = []
        now = datetime.now()

        for channel, texts in groups.items():
            if not texts: continue
            channel = channel or "unknown"
            texts = [t for t in texts if t]

            # Texto combinado del canal
            combined = " ".join(texts[:10])

            # Métricas filológicas
            metrics = self.metrics.score_all(combined)
            philo_score = self.metrics.philological_score(combined)

            # Extraer conceptos clave (palabras frecuentes > 4 letras)
            words = re.findall(r'\b\w{5,}\b', combined.lower())
            word_freq = Counter(words).most_common(5)
            concepts = [w for w, _ in word_freq if w not in ("sobre", "para", "como", "cuando", "donde", "porque")]

            # Determinar modo sugerido por las métricas
            if metrics["deep_structure"] > 0.7 and metrics["semiosis"] > 0.6:
                mode = "pentetraktys"
            elif metrics["casimir"] > 0.7:
                mode = "boo"
            elif metrics["polyphony"] > 0.6:
                mode = "zettelkasten"
            elif metrics["mirror"] > 0.5:
                mode = "cobol"
            else:
                mode = "catalyst"

            # Profundidad según complejidad
            depth = "deep" if metrics["deep_structure"] > 0.6 else "medium" if metrics["deep_structure"] > 0.3 else "surface"

            # Urgencia según timestamp
            try:
                last_ts = m.get("timestamp", "")
                last_dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00").split("+")[0])
                days_ago = (now - last_dt).days
            except:
                days_ago = 7

            urgency = "hot" if days_ago < 1 else "warm" if days_ago < 3 else "cold" if days_ago < 7 else "archived"

            # Razón de sugerencia
            top_metric = max(metrics, key=metrics.get)
            metric_reasons = {
                "sprachspiel": f"Alta relevancia contextual ({metrics['sprachspiel']:.0%}) — el tema tiene uso activo",
                "differance": f"Fuerte desplazamiento semántico ({metrics['differance']:.0%}) — el diálogo evoluciona",
                "mirror": f"Auto-referencia detectada ({metrics['mirror']:.0%}) — hay reflexión del sistema sobre sí mismo",
                "deep_structure": f"Complejidad sintáctica alta ({metrics['deep_structure']:.0%}) — pensamiento profundo",
                "grice": f"Eficiencia conversacional ({metrics['grice']:.0%}) — diálogo limpio y directo",
                "polyphony": f"Múltiples voces ({metrics['polyphony']:.0%}) — debate rico y diverso",
                "semiosis": f"Densidad sígnica ({metrics['semiosis']:.0%}) — capas de significado",
                "casimir": f"Creatividad cuántica ({metrics['casimir']:.0%}) — ideas emergen del vacío",
            }

            suggestions.append(ChatSuggestion(
                title=texts[0][:80].replace("\n", " ") if texts else f"Chat {channel}",
                reason=metric_reasons.get(top_metric, "Actividad reciente detectada"),
                philological_score=philo_score,
                metrics=metrics,
                related_chats=[],
                suggested_mode=mode,
                suggested_depth=depth,
                last_active=last_ts if isinstance(last_ts, str) else now.isoformat(),
                conv_id=hashlib.sha256(channel.encode()).hexdigest()[:12],
                concepts=concepts[:5],
                urgency=urgency,
            ))

        # Ordenar por score filológico
        suggestions.sort(key=lambda s: s.philological_score, reverse=True)
        self.suggestions = suggestions[:limit]
        return self.suggestions

    def graph_links(self) -> List[Dict]:
        """Genera enlaces estilo Obsidian Graph View entre sugerencias."""
        links = []
        for i, s1 in enumerate(self.suggestions):
            for j, s2 in enumerate(self.suggestions):
                if i >= j: continue
                shared = set(s1.concepts) & set(s2.concepts)
                if shared:
                    weight = len(shared) / max(1, len(s1.concepts) + len(s2.concepts))
                    links.append({
                        "source": s1.conv_id,
                        "target": s2.conv_id,
                        "weight": round(weight, 3),
                        "shared_concepts": list(shared),
                    })
        return links


# ═══════════════════════════════════════════════════════════════
# FASTAPI ENDPOINT (para integrar en el Messenger o Chat)
# ═══════════════════════════════════════════════════════════════

def create_suggestion_app():
    try:
        from fastapi import FastAPI, Query
        from fastapi.responses import JSONResponse, HTMLResponse
    except ImportError:
        return None

    engine = SuggestionEngine()

    app = FastAPI(title="Catalyst Suggestions", version="1.0.0")

    @app.get("/suggestions")
    async def get_suggestions(limit: int = Query(10, le=50)):
        suggestions = engine.generate_suggestions(limit)
        links = engine.graph_links()
        return {
            "suggestions": [
                {
                    "title": s.title,
                    "reason": s.reason,
                    "philological_score": s.philological_score,
                    "metrics": s.metrics,
                    "suggested_mode": s.suggested_mode,
                    "suggested_depth": s.suggested_depth,
                    "concepts": s.concepts,
                    "urgency": s.urgency,
                    "conv_id": s.conv_id,
                    "last_active": s.last_active,
                }
                for s in suggestions
            ],
            "graph_links": links,
            "total_suggestions": len(suggestions),
            "timestamp": datetime.now().isoformat(),
        }

    @app.get("/suggestions/graph", response_class=HTMLResponse)
    async def graph_view():
        """Vista Obsidian-style del grafo de sugerencias."""
        suggestions = engine.generate_suggestions(12)
        links = engine.graph_links()

        nodes_js = json.dumps([
            {"id": s.conv_id, "label": s.title[:40], "score": s.philological_score,
             "mode": s.suggested_mode, "urgency": s.urgency, "concepts": s.concepts}
            for s in suggestions
        ])
        links_js = json.dumps(links)

        return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Catalyst Graph — Sugerencias Obsidian</title>
<script src="https://d3js.org/d3.v7.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:system-ui,sans-serif; background:#0a0a1a; color:#e0e0e0; overflow:hidden; height:100vh; }}
#graph {{ width:100%; height:100vh; }}
.node {{ cursor:pointer; }}
.node circle {{ stroke-width:2px; }}
.node text {{ font-size:9px; fill:#888; pointer-events:none; }}
.link {{ stroke:#ffffff15; stroke-width:1px; }}
.tooltip {{ position:fixed; background:#111133; border:1px solid #00ff8833; border-radius:8px; padding:12px; font-size:11px; pointer-events:none; opacity:0; transition:opacity .2s; max-width:250px; z-index:10; }}
.legend {{ position:fixed; bottom:20px; left:20px; background:#111133; border:1px solid #00ff8833; border-radius:8px; padding:12px; font-size:10px; }}
.legend span {{ display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:4px; }}
.header {{ position:fixed; top:10px; left:20px; z-index:10; }}
.header h1 {{ font-size:16px; color:#00ff88; letter-spacing:2px; }}
.header p {{ font-size:10px; color:#555; }}
</style>
</head>
<body>
<div class="header"><h1>◆ Catalyst Graph</h1><p>Sugerencias filológicas · Obsidian-style · BELL 13450.50</p></div>
<div class="tooltip" id="tooltip"></div>
<div class="legend">
  <div><span style="background:#00ff88"></span> catalyst</div>
  <div><span style="background:#ff4466"></span> pentetraktys</div>
  <div><span style="background:#ffaa22"></span> boo</div>
  <div><span style="background:#888"></span> zettelkasten</div>
  <div><span style="background:#4a7ab5"></span> cobol</div>
  <div style="margin-top:6px;font-size:9px;color:#555;">Tamaño = score filológico</div>
</div>
<svg id="graph"></svg>
<script>
const data = {{nodes: {nodes_js}, links: {links_js}}};
const modeColors = {{catalyst:'#00ff88',pentetraktys:'#ff4466',boo:'#ffaa22',zettelkasten:'#888',cobol:'#4a7ab5'}};
const urgencyAlpha = {{hot:1,warm:0.7,cold:0.4,archived:0.2}};

const W=window.innerWidth, H=window.innerHeight;
const svg=d3.select('#graph'), g=svg.append('g');
const tip=d3.select('#tooltip');

const sim=d3.forceSimulation(data.nodes)
  .force('link',d3.forceLink(data.links).id(d=>d.id).distance(100))
  .force('charge',d3.forceManyBody().strength(-200))
  .force('center',d3.forceCenter(W/2,H/2))
  .force('collision',d3.forceCollide().radius(d=>20+d.score*30));

const link=g.selectAll('.link').data(data.links).join('line').attr('class','link');
const node=g.selectAll('.node').data(data.nodes).join('g').attr('class','node')
  .call(d3.drag().on('start',(e,d)=>{{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;}})
    .on('drag',(e,d)=>{{d.fx=e.x;d.fy=e.y;}})
    .on('end',(e,d)=>{{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}}));

node.append('circle').attr('r',d=>15+d.score*25)
  .attr('fill',d=>modeColors[d.mode]||'#888')
  .attr('opacity',d=>urgencyAlpha[d.urgency]||0.5);

node.append('text').text(d=>d.label).attr('dy',d=>20+d.score*25).attr('text-anchor','middle');

node.on('mouseover',(e,d)=>{{
  tip.style('opacity',1).html(`<strong>${{d.label}}</strong><br>
    Score: ${{(d.score*100).toFixed(1)}}%<br>
    Modo: ${{d.mode}}<br>
    Urgencia: ${{d.urgency}}<br>
    Conceptos: ${{d.concepts.join(', ')}}`);
}}).on('mousemove',e=>{{tip.style('left',e.pageX+10+'px').style('top',e.pageY-10+'px');}})
  .on('mouseout',()=>tip.style('opacity',0)).on('click',(e,d)=>{{
    window.open('/messenger?chat='+d.id,'_self');
}});

sim.on('tick',()=>{{
  link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
  node.attr('transform',d=>`translate(${{d.x}},${{d.y}})`);
}});
</script>
</body></html>"""

    return app, engine


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

def main():
    engine = SuggestionEngine()
    suggestions = engine.generate_suggestions(10)

    print(f"\n◆ CATALYST SUGGESTIONS — Obsidian Graph View")
    print(f"  BELL 13450.50 | 8 métricas filológicas\n")
    print(f"  {'─'*60}")

    for i, s in enumerate(suggestions, 1):
        urgency_icon = {"hot": "🔴", "warm": "🟡", "cold": "🔵", "archived": "⚫"}
        mode_colors = {"catalyst": "\033[32m", "pentetraktys": "\033[31m", "boo": "\033[33m", "zettelkasten": "\033[90m", "cobol": "\033[34m"}
        c = mode_colors.get(s.suggested_mode, "")
        r = "\033[0m"

        print(f"\n  {urgency_icon.get(s.urgency, '⚫')} [{i}] {c}{s.suggested_mode}{r} · {s.suggested_depth}")
        print(f"  {s.title[:70]}")
        print(f"  Score filológico: {s.philological_score:.3f} | {s.reason[:100]}")
        print(f"  Conceptos: {', '.join(s.concepts[:5])}")

        # Top 3 métricas
        top = sorted(s.metrics.items(), key=lambda x: x[1], reverse=True)[:3]
        print(f"  Métricas: {' · '.join(f'{k}={v:.3f}' for k,v in top)}")

    print(f"\n  {'─'*60}")
    print(f"  Total sugerencias: {len(suggestions)}")
    links = engine.graph_links()
    print(f"  Conexiones en grafo: {len(links)}")

    if links:
        print(f"\n  ◆ GRAFO DE CONEXIONES:")
        for l in links[:5]:
            concepts = ', '.join(l['shared_concepts'][:3])
            print(f"  {l['source'][:8]} ←→ {l['target'][:8]} [{l['weight']:.2f}] {{{concepts}}}")


if __name__ == "__main__":
    main()
