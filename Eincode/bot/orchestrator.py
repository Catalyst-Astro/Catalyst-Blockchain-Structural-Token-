#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST ORCHESTRATOR — Pentetraktys 4D Cognitive Engine
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | OSHIRO ERC-26+ | Autopoiesis Economics

Orquestador central que coordina TODOS los componentes Catalyst:
  ◆ Catalyst Chat (localhost:3000) — Interfaz Next.js PWA
  ◆ Catalyst Bot API (localhost:8000) — REST + Messenger + Threema
  ◆ Threema Web Bridge — Conexión directa sin Gateway
  ◆ Token Manager — División por tokens, coherencia semántica
  ◆ Juegos Lingüísticos — Postdoctorales, diálogo complejo
  ◆ Boo Casimir — Simulador cuántico + física
  ◆ Keep-Alive — Servicios 24/7

CAPABILITIES:
  P01 — Token counter + chunking (GPT-4/DeepSeek compatible)
  P02 — Semantic coherence scoring (0-1)
  P03 — Postdoctoral linguistic games engine
  P04 — Multi-channel message routing
  P05 — History/log aggregation (incubadoracatalyst@gmail.com)
  P06 — Hybrys monitoring across all channels
  P07 — Auto-organización Zettelkasten
  P08 — Cross-channel context synchronization
  P09 — Boo Casimir quantum simulation bridge
  P10 — 24/7 health monitoring + auto-restart

═══════════════════════════════════════════════════════════════════════════
"""

import asyncio, json, os, sys, io, re, time, hashlib, logging, sqlite3
import subprocess, signal, threading, queue
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
from enum import Enum

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("orchestrator")

# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════
BELL = "13450.50"
VERSION = "3.0.0-orchestrator"
MASTER_EMAIL = "incubadoracatalyst@gmail.com"
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", os.getenv("AI_API_KEY", ""))

# Token limits (DeepSeek V3: 128K context, GPT-4o: 128K)
TOKEN_LIMITS = {
    "surface": 4096,
    "medium": 8192,
    "deep": 12288,
    "frontier": 16384,
    "max_context": 131072,  # DeepSeek max context
    "chunk_size": 16384,     # Max per chunk
    "overlap": 512,          # Overlap between chunks
}

# ═══════════════════════════════════════════════════════════════
# TOKEN MANAGER — Conteo + Chunking + Coherencia
# ═══════════════════════════════════════════════════════════════

class TokenManager:
    """
    Gestor de tokens con chunking inteligente y scoring de coherencia.
    Compatible con DeepSeek y GPT-4 tokenizers.
    """

    def __init__(self):
        self.total_tokens_processed = 0
        self.total_chunks_created = 0
        self.coherence_scores: List[float] = []
        log.info("[TokenManager] Inicializado")

    def count_tokens(self, text: str) -> int:
        """
        Estima tokens usando algoritmo compatible con GPT/DeepSeek.
        ~4 chars = 1 token para inglés, ~2.5 chars para español.
        Fórmula híbrida: word-based + char-based con ajuste latino.
        """
        if not text: return 0
        words = len(text.split())
        chars = len(text)
        # Detectar proporción de palabras en español/latino (más largas)
        spanish_markers = len(re.findall(r'[áéíóúñüÁÉÍÓÚÑÜ]', text))
        latin_ratio = min(1.0, spanish_markers / max(1, words) * 3)

        # Fórmula: palabras*1.3 + (chars/4)*(1+latin_ratio*0.3)
        tokens = int(words * 1.3 + (chars / 4.0) * (1.0 + latin_ratio * 0.3))
        return max(1, tokens)

    def chunk_text(self, text: str, max_tokens: int = None,
                   overlap: int = None) -> List[Dict[str, Any]]:
        """
        Divide texto en chunks manejables por el modelo.
        Retorna lista de {chunk_id, text, token_count, index}.
        Solapa chunks para mantener coherencia semántica.
        """
        if max_tokens is None:
            max_tokens = TOKEN_LIMITS["chunk_size"]
        if overlap is None:
            overlap = TOKEN_LIMITS["overlap"]

        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""
        current_tokens = 0
        chunk_idx = 0

        for para in paragraphs:
            para_tokens = self.count_tokens(para)

            if current_tokens + para_tokens > max_tokens and current_chunk:
                # Guardar chunk actual
                chunks.append({
                    "chunk_id": f"chunk-{chunk_idx}",
                    "text": current_chunk.strip(),
                    "token_count": current_tokens,
                    "index": chunk_idx,
                })
                chunk_idx += 1
                self.total_chunks_created += 1

                # Overlap: mantener últimas oraciones
                sentences = current_chunk.rsplit(". ", 2)
                overlap_text = ". ".join(sentences[-2:]) if len(sentences) > 1 else ""
                current_chunk = overlap_text
                current_tokens = self.count_tokens(overlap_text)

            current_chunk += para + "\n\n"
            current_tokens += para_tokens

        # Último chunk
        if current_chunk.strip():
            chunks.append({
                "chunk_id": f"chunk-{chunk_idx}",
                "text": current_chunk.strip(),
                "token_count": current_tokens,
                "index": chunk_idx,
            })
            self.total_chunks_created += 1

        self.total_tokens_processed += sum(c["token_count"] for c in chunks)
        return chunks

    def semantic_coherence(self, text: str, context: List[str] = None) -> float:
        """
        Evalúa coherencia semántica del texto (0-1).
        Usa métricas lingüísticas postdoctorales:
        - Densidad léxica
        - Conectores lógicos
        - Progresión temática
        - Referencia anafórica
        - Consistencia terminológica
        """
        score = 0.0
        weights = {
            "lexical_density": 0.20,
            "logical_connectors": 0.20,
            "thematic_progression": 0.20,
            "anaphoric_reference": 0.15,
            "terminological_consistency": 0.15,
            "contextual_relevance": 0.10,
        }

        # 1. Densidad léxica (palabras únicas / total)
        words = re.findall(r'\b\w+\b', text.lower())
        if not words: return 0.0
        unique_ratio = len(set(words)) / len(words)
        lexical_score = min(1.0, unique_ratio * 2.5)  # ~0.4 unique ratio = 1.0
        score += lexical_score * weights["lexical_density"]

        # 2. Conectores lógicos
        connectors = [
            r'\bpor\s+(?:lo\s+)?tanto\b', r'\bsin\s+embargo\b', r'\bademás\b',
            r'\bno\s+obstante\b', r'\bconsecuentemente\b', r'\bpor\s+consiguiente\b',
            r'\ben\s+cambio\b', r'\basimismo\b', r'\bigualmente\b', r'\bpor\s+ejemplo\b',
            r'\bes\s+decir\b', r'\ben\s+consecuencia\b', r'\bpor\s+otra?\s+parte\b',
            r'\bentonces\b', r'\bporque\b', r'\baunque\b', r'\bmientras\b',
            r'\btherefore\b', r'\bhowever\b', r'\bmoreover\b', r'\bthus\b',
            r'\bconsequently\b', r'\bfurthermore\b', r'\bnevertheless\b',
        ]
        connector_count = sum(len(re.findall(c, text, re.IGNORECASE)) for c in connectors)
        connector_score = min(1.0, connector_count / max(1, len(words) / 50))
        score += connector_score * weights["logical_connectors"]

        # 3. Progresión temática (repetición de términos clave entre oraciones)
        sentences = re.split(r'[.!?]+', text)
        if len(sentences) >= 2:
            overlaps = 0
            for i in range(len(sentences) - 1):
                s1_words = set(re.findall(r'\b\w{4,}\b', sentences[i].lower()))
                s2_words = set(re.findall(r'\b\w{4,}\b', sentences[i+1].lower()))
                if s1_words:
                    overlaps += len(s1_words & s2_words) / len(s1_words)
            thematic_score = min(1.0, overlaps / max(1, len(sentences) - 1))
        else:
            thematic_score = 0.5
        score += thematic_score * weights["thematic_progression"]

        # 4. Referencia anafórica (pronombres, determinantes, elipsis)
        anaphors = [
            r'\b(?:este|ese|aquel|esta|esa|aquella|estos|esos|aquellos)\b',
            r'\b(?:él|ella|ellos|ellas|lo|la|los|las|le|les)\b',
            r'\b(?:su|sus|cuyo|cuya|cuyos|cuyas)\b',
            r'\b(?:dicho|dicha|dichos|dichas|mencionado|anterior|mismo)\b',
            r'\b(?:it|they|them|this|that|these|those|its|their)\b',
        ]
        anaphor_count = sum(len(re.findall(a, text, re.IGNORECASE)) for a in anaphors)
        anaphor_score = min(1.0, anaphor_count / max(1, len(sentences) * 0.8))
        score += anaphor_score * weights["anaphoric_reference"]

        # 5. Consistencia terminológica
        terms = re.findall(r'\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}\b', text)
        term_variants = defaultdict(set)
        for t in terms:
            base = t.lower().rstrip('s')
            term_variants[base].add(t)
        if terms:
            variant_penalty = sum(1 for v in term_variants.values() if len(v) > 2) / max(1, len(term_variants))
            consistency_score = max(0.2, 1.0 - variant_penalty)
        else:
            consistency_score = 0.7
        score += consistency_score * weights["terminological_consistency"]

        # 6. Relevancia contextual (si hay contexto previo)
        if context:
            context_words = set()
            for ctx in context[-3:]:
                context_words.update(re.findall(r'\b\w{4,}\b', ctx.lower()))
            text_words = set(re.findall(r'\b\w{4,}\b', text.lower()))
            if context_words:
                relevance = len(context_words & text_words) / max(1, len(context_words))
                relevance_score = min(1.0, relevance * 3)
            else:
                relevance_score = 0.5
        else:
            relevance_score = 0.5
        score += relevance_score * weights["contextual_relevance"]

        self.coherence_scores.append(score)
        return round(min(1.0, score), 4)

    def stats(self) -> Dict[str, Any]:
        return {
            "total_tokens_processed": self.total_tokens_processed,
            "total_chunks_created": self.total_chunks_created,
            "avg_coherence": round(sum(self.coherence_scores) / max(1, len(self.coherence_scores)), 4),
            "coherence_trend": self._coherence_trend(),
        }

    def _coherence_trend(self) -> str:
        if len(self.coherence_scores) < 5: return "insufficient_data"
        recent = self.coherence_scores[-5:]
        if all(r > 0.7 for r in recent): return "excellent"
        if all(r > 0.5 for r in recent): return "good"
        if sum(1 for r in recent if r < 0.4) >= 3: return "declining"
        return "stable"


# ═══════════════════════════════════════════════════════════════
# LINGUISTIC GAMES ENGINE — Juegos Lingüísticos Postdoctorales
# ═══════════════════════════════════════════════════════════════

class LinguisticGamesEngine:
    """
    Motor de juegos lingüísticos postdoctorales para diálogo complejo.
    Inspirado en Wittgenstein, Lacan, Chomsky, y la pragmática formal.

    Juegos implementados:
      - Sprachspiel (Wittgenstein): juegos del lenguaje contextuales
      - Différance (Derrida): desplazamiento semántico
      - Mirror Stage (Lacan): reflejo especular del discurso
      - Deep Structure (Chomsky): transformaciones generativas
      - Gricean Implicature: máximas conversacionales y sus violaciones
      - Bakhtin Polyphony: polifonía dialógica
      - Peircean Semiosis: cadena triádica de signos
    """

    GAMES = {
        "sprachspiel": "Juego del lenguaje wittgensteiniano — el significado es uso en contexto",
        "differance": "Différance derridiana — desplazamiento y aplazamiento del sentido",
        "mirror": "Estadio del espejo lacaniano — el discurso del Otro",
        "deep_structure": "Estructura profunda chomskyana — transformación generativa",
        "grice": "Implicatura griceana — lo dicho vs lo implicado",
        "polyphony": "Polifonía bajtiniana — voces múltiples en diálogo",
        "semiosis": "Semiosis peirceana — representamen → objeto → interpretante",
        "casimir": "Vacío cuántico Casimir — fluctuaciones del sentido en el vacío",
    }

    def __init__(self):
        self.games_played = 0
        self.active_game: Optional[str] = None
        log.info(f"[LingGames] {len(self.GAMES)} juegos cargados")

    async def play(self, game: str, text: str, context: List[str] = None) -> Dict[str, Any]:
        """
        Ejecuta un juego lingüístico sobre el texto.
        Retorna análisis + texto transformado.
        """
        game = game.lower()
        if game not in self.GAMES:
            return {"error": f"Juego no encontrado: {game}", "available": list(self.GAMES.keys())}

        self.active_game = game
        self.games_played += 1

        result = {
            "game": game,
            "description": self.GAMES[game],
            "original_tokens": len(text.split()),
            "transformations": [],
            "analysis": {},
        }

        if game == "sprachspiel":
            result = self._sprachspiel(text, result)
        elif game == "differance":
            result = self._differance(text, result)
        elif game == "mirror":
            result = self._mirror_stage(text, result)
        elif game == "deep_structure":
            result = self._deep_structure(text, result)
        elif game == "grice":
            result = self._gricean(text, result)
        elif game == "polyphony":
            result = self._polyphony(text, result)
        elif game == "semiosis":
            result = self._semiosis(text, result)
        elif game == "casimir":
            result = self._casimir(text, result)

        return result

    def _sprachspiel(self, text: str, result: Dict) -> Dict:
        """Wittgenstein: significado como uso en contexto."""
        # Identificar "formas de vida" lingüísticas
        forms_of_life = {
            "científico": [r'\bhipótesis\b', r'\bteoría\b', r'\bexperimento\b', r'\bevidencia\b'],
            "cotidiano": [r'\bcreo\b', r'\bpienso\b', r'\bsiento\b', r'\bquiero\b'],
            "burocrático": [r'\bprocedimiento\b', r'\bprotocolo\b', r'\brequisito\b', r'\bplazo\b'],
            "poético": [r'\bmetáfora\b', r'\bverso\b', r'\brima\b', r'\bimagen\b'],
            "filosófico": [r'\bser\b', r'\bente\b', r'\besencia\b', r'\btrascendencia\b'],
        }

        detected = []
        for form, patterns in forms_of_life.items():
            score = sum(len(re.findall(p, text, re.IGNORECASE)) for p in patterns)
            if score > 0:
                detected.append({"form": form, "score": score})

        result["analysis"] = {
            "language_game": "El significado emerge del uso en el flujo de la vida",
            "forms_of_life": sorted(detected, key=lambda x: x["score"], reverse=True),
            "rule_following": "Las reglas gramaticales son costumbres sociales",
        }
        return result

    def _differance(self, text: str, result: Dict) -> Dict:
        """Derrida: el sentido se difiere y se difiere (aplaza)."""
        words = re.findall(r'\b\w+\b', text.lower())
        semantic_chains = []
        window = min(7, len(words))

        for i in range(len(words) - window + 1):
            chain = words[i:i+window]
            # Cada palabra difiere de la anterior (diferencia) y aplaza el sentido (diferimiento)
            semantic_chains.append({
                "chain": " → ".join(chain),
                "trace": f"La presencia de '{chain[-1]}' lleva la huella (trace) de '{chain[0]}'",
            })

        result["analysis"] = {
            "concept": "Différance — el sentido nunca está plenamente presente",
            "chains": semantic_chains[:5],
            "sous_rature": "Todo signo está 'bajo borradura' — presente y ausente a la vez",
        }
        return result

    def _mirror_stage(self, text: str, result: Dict) -> Dict:
        """Lacan: el estadio del espejo en el discurso."""
        # Identificar narcisismo textual: auto-referencias, "yo", reflejos
        self_refs = len(re.findall(r'\b(?:yo|mí|me|mi|conmigo)\b', text, re.IGNORECASE))
        other_refs = len(re.findall(r'\b(?:tú|él|ella|usted|ellos|otro|ajeno)\b', text, re.IGNORECASE))

        result["analysis"] = {
            "mirror_stage": "El yo se constituye en el reflejo del Otro",
            "self_references": self_refs,
            "other_references": other_refs,
            "narcissism_ratio": round(self_refs / max(1, self_refs + other_refs), 3),
            "symbolic_order": "El lenguaje estructura el inconsciente como un lenguaje",
        }
        return result

    def _deep_structure(self, text: str, result: Dict) -> Dict:
        """Chomsky: estructura profunda → transformaciones → estructura superficial."""
        # Análisis sintáctico simplificado
        svo_patterns = re.findall(
            r'\b(\w+)\s+(\w+(?:se|lo|la|le)?)\s+(\w+)\b', text
        )
        passive = len(re.findall(r'\b(?:fue|es|era|será|ha sido)\s+\w+(?:ado|ido)\b', text))
        questions = len(re.findall(r'\?', text))
        negations = len(re.findall(r'\b(?:no|nunca|jamás|tampoco)\b', text))

        result["analysis"] = {
            "deep_structures": len(svo_patterns),
            "transformations": {
                "passivization": passive,
                "interrogation": questions,
                "negation": negations,
            },
            "universal_grammar": "Toda lengua comparte principios estructurales innatos",
        }
        return result

    def _gricean(self, text: str, result: Dict) -> Dict:
        """Grice: máximas conversacionales y sus implicaturas."""
        # Evaluar las 4 máximas
        words = text.split()
        brevity = min(1.0, 100 / max(1, len(words)))  # Máxima de cantidad
        relevance_markers = len(re.findall(
            r'\b(?:relevante|importante|clave|esencial|pertinente)\b', text, re.IGNORECASE
        ))

        result["analysis"] = {
            "maxims": {
                "quantity": f"{'Respetada' if brevity > 0.3 else 'Violada (demasiada información)'}",
                "quality": "Evaluable solo con verificación externa",
                "relation": f"{'Reforzada' if relevance_markers > 0 else 'Neutral'} (marcadores de relevancia: {relevance_markers})",
                "manner": "Evaluable por claridad estructural",
            },
            "implicature": "Lo implicado excede lo dicho — el oyente infiere más allá de las palabras",
        }
        return result

    def _polyphony(self, text: str, result: Dict) -> Dict:
        """Bakhtin: múltiples voces en el discurso."""
        # Detectar voces: citas, ironía, heteroglosia
        quotes = len(re.findall(r'"([^"]*)"', text))
        citations = len(re.findall(r'\[(\d+)\]|\(\w+\s+\d{4}\)', text))
        voices = len(set(re.findall(r'\b(?:según|para|afirma|sostiene|argumenta|niega|refuta)\b', text, re.IGNORECASE)))

        result["analysis"] = {
            "voices_detected": max(1, quotes + citations + voices),
            "direct_quotes": quotes,
            "academic_citations": citations,
            "attribution_verbs": voices,
            "dialogical_imagination": "Cada enunciado es una respuesta a enunciados previos y anticipa respuestas futuras",
            "heteroglossia": "El lenguaje es estratificado — cada palabra huele a su contexto",
        }
        return result

    def _semiosis(self, text: str, result: Dict) -> Dict:
        """Peirce: cadena triádica representamen → objeto → interpretante."""
        # Identificar tríadas semióticas en el texto
        icons = len(re.findall(r'\b(?:como|similar|parecido|análogo|imagen)\b', text, re.IGNORECASE))
        indices = len(re.findall(r'\b(?:esto|aquí|ahora|este|ese)\b', text, re.IGNORECASE))
        symbols = len(re.findall(r'\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\b', text))  # Nombres propios/conceptos

        result["analysis"] = {
            "triadic_sign": "Representamen → Objeto → Interpretante (ad infinitum)",
            "iconic_signs": icons,
            "indexical_signs": indices,
            "symbolic_signs": symbols,
            "unlimited_semiosis": "Cada interpretante se convierte en signo para otro interpretante",
        }
        return result

    def _casimir(self, text: str, result: Dict) -> Dict:
        """Vacío cuántico Casimir: fluctuaciones del sentido en el vacío textual."""
        # Lo NO dicho es tan importante como lo dicho
        words = text.split()
        pauses = len(re.findall(r'[.,;:—…]', text))
        gaps = len(re.findall(r'\n\n|\r\n\r\n', text))

        result["analysis"] = {
            "quantum_vacuum": "El sentido emerge de la fluctuación entre presencia y ausencia",
            "fluctuations": {
                "pauses": pauses,
                "gaps": gaps,
                "silence_ratio": round(pauses / max(1, len(words)) * 100, 1),
            },
            "casimir_force": "La fuerza del sentido es inversamente proporcional a la distancia entre signos",
            "virtual_particles": "Cada espacio vacío está poblado de significados virtuales que nunca se actualizan",
        }
        return result

    def stats(self) -> Dict[str, Any]:
        return {
            "games_available": len(self.GAMES),
            "games_played": self.games_played,
            "active_game": self.active_game,
        }


# ═══════════════════════════════════════════════════════════════
# SERVICE MANAGER — Keep-Alive 24/7
# ═══════════════════════════════════════════════════════════════

@dataclass
class ServiceState:
    name: str
    port: int
    process: Optional[asyncio.subprocess.Process] = None
    healthy: bool = False
    last_check: datetime = field(default_factory=datetime.now)
    restart_count: int = 0
    max_restarts: int = 10

class ServiceManager:
    """Mantiene vivos los servicios 24/7 con health checks y auto-restart."""

    def __init__(self):
        self.services: Dict[str, ServiceState] = {}
        self.monitor_task: Optional[asyncio.Task] = None
        log.info("[ServiceManager] Inicializado")

    def register(self, name: str, port: int):
        self.services[name] = ServiceState(name=name, port=port)

    async def health_check(self, service: ServiceState) -> bool:
        """Verifica si un servicio está respondiendo."""
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection("127.0.0.1", service.port),
                timeout=5.0
            )
            writer.close()
            await writer.wait_closed()
            return True
        except:
            return False

    async def monitor_loop(self, interval: float = 30.0):
        """Loop de monitoreo 24/7."""
        log.info(f"[ServiceManager] Monitor iniciado (intervalo: {interval}s)")
        while True:
            for name, svc in self.services.items():
                healthy = await self.health_check(svc)
                svc.last_check = datetime.now()

                if healthy and not svc.healthy:
                    log.info(f"[{name}] ✅ Recuperado (puerto {svc.port})")
                elif not healthy and svc.healthy:
                    log.warning(f"[{name}] ❌ Caído (puerto {svc.port})")
                    if svc.restart_count < svc.max_restarts:
                        await self.restart_service(name)
                    else:
                        log.error(f"[{name}] 🚨 Máximo de reinicios alcanzado ({svc.max_restarts})")

                svc.healthy = healthy

            await asyncio.sleep(interval)

    async def restart_service(self, name: str):
        """Reinicia un servicio caído."""
        svc = self.services[name]
        svc.restart_count += 1
        log.warning(f"[{name}] Reiniciando (intento {svc.restart_count}/{svc.max_restarts})...")

        if name == "catalyst-chat":
            proc = await asyncio.create_subprocess_exec(
                "npx", "next", "dev", "-p", str(svc.port),
                cwd="../../apps/catalyst-chat",
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            svc.process = proc
        elif name == "catalyst-bot":
            proc = await asyncio.create_subprocess_exec(
                sys.executable, "api_server.py",
                cwd=os.path.dirname(os.path.abspath(__file__)),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            svc.process = proc

    def status(self) -> Dict[str, Any]:
        return {
            name: {
                "port": svc.port,
                "healthy": svc.healthy,
                "last_check": svc.last_check.isoformat(),
                "restart_count": svc.restart_count,
            }
            for name, svc in self.services.items()
        }


# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR — Central Coordinator
# ═══════════════════════════════════════════════════════════════

class CatalystOrchestrator:
    """
    Orquestador Central Pentetraktys 4D.
    Coordina TODOS los componentes y canales de comunicación.
    """

    def __init__(self):
        self.token_manager = TokenManager()
        self.ling_games = LinguisticGamesEngine()
        self.service_manager = ServiceManager()
        self.email = MASTER_EMAIL

        # Onto-Deonto Engine (análisis ontológico + deontológico)
        try:
            from onto_deonto_engine import OntoDeontoEngine
            self.onto_deonto = OntoDeontoEngine()
            log.info(f"  Onto-Deonto Engine: {self.onto_deonto.stats()['onto_categories']} categorías ontológicas + {self.onto_deonto.stats()['deonto_principles']} principios deontológicos")
        except Exception as e:
            self.onto_deonto = None
            log.warning(f"  Onto-Deonto Engine no disponible: {e}")

        # Log agregado
        self.db = self._init_log_db()

        # Cola de mensajes cross-channel
        self.message_queue: asyncio.Queue = asyncio.Queue()

        # Historial unificado
        self.unified_history: List[Dict] = []

        log.info(f"◆ Catalyst Orchestrator v{VERSION} | BELL {BELL}")
        log.info(f"  Master Email: {MASTER_EMAIL}")
        log.info(f"  Token Manager: OK")
        log.info(f"  Linguistic Games: {self.ling_games.GAMES} juegos")
        log.info(f"  DB Log: {self.db}")

    def _init_log_db(self) -> str:
        """Inicializa base de datos de log unificado."""
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "orchestrator_log.db")
        conn = sqlite3.connect(db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS unified_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT DEFAULT (datetime('now')),
                channel TEXT NOT NULL,
                email TEXT DEFAULT 'incubadoracatalyst@gmail.com',
                direction TEXT NOT NULL,
                message_text TEXT NOT NULL,
                token_count INTEGER DEFAULT 0,
                coherence_score REAL DEFAULT 0.0,
                linguistic_game TEXT,
                mode TEXT DEFAULT 'catalyst',
                depth TEXT DEFAULT 'medium',
                hybrys_score REAL,
                response_id TEXT,
                metadata TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_log_email ON unified_log(email);
            CREATE INDEX IF NOT EXISTS idx_log_channel ON unified_log(channel);
            CREATE INDEX IF NOT EXISTS idx_log_timestamp ON unified_log(timestamp);
        """)
        conn.commit()
        conn.close()
        return db_path

    def log_message(self, channel: str, direction: str, text: str,
                    token_count: int = 0, coherence: float = 0.0,
                    game: str = None, mode: str = "catalyst",
                    depth: str = "medium", hybrys: float = None,
                    response_id: str = None, metadata: Dict = None):
        """Registra mensaje en el log unificado."""
        conn = sqlite3.connect(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "orchestrator_log.db")
        )
        conn.execute(
            """INSERT INTO unified_log
               (channel, email, direction, message_text, token_count,
                coherence_score, linguistic_game, mode, depth, hybrys_score,
                response_id, metadata)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (channel, MASTER_EMAIL, direction, text[:5000], token_count,
             coherence, game, mode, depth, hybrys,
             response_id, json.dumps(metadata) if metadata else None)
        )
        conn.commit()
        conn.close()

        # También en memoria
        self.unified_history.append({
            "timestamp": datetime.now().isoformat(),
            "channel": channel,
            "direction": direction,
            "text_preview": text[:200],
            "tokens": token_count,
            "coherence": coherence,
        })

    def get_unified_log(self, limit: int = 100, channel: str = None,
                        email: str = None) -> List[Dict]:
        """Consulta el log unificado."""
        conn = sqlite3.connect(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "orchestrator_log.db")
        )
        conn.row_factory = sqlite3.Row
        query = "SELECT * FROM unified_log WHERE 1=1"
        params = []
        if channel:
            query += " AND channel=?"
            params.append(channel)
        if email:
            query += " AND email=?"
            params.append(email)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        rows = conn.execute(query, params).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def stats(self) -> Dict[str, Any]:
        """Estadísticas completas del orquestador."""
        conn = sqlite3.connect(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "orchestrator_log.db")
        )
        total_logs = conn.execute("SELECT COUNT(*) FROM unified_log").fetchone()[0]
        total_tokens = conn.execute(
            "SELECT COALESCE(SUM(token_count),0) FROM unified_log"
        ).fetchone()[0]
        avg_coherence = conn.execute(
            "SELECT COALESCE(AVG(coherence_score),0) FROM unified_log WHERE coherence_score > 0"
        ).fetchone()[0]
        by_channel = dict(conn.execute(
            "SELECT channel, COUNT(*) FROM unified_log GROUP BY channel"
        ).fetchall())
        conn.close()

        return {
            "version": VERSION,
            "bell": BELL,
            "master_email": MASTER_EMAIL,
            "total_messages_logged": total_logs,
            "total_tokens_logged": total_tokens,
            "avg_coherence": round(avg_coherence, 4),
            "by_channel": by_channel,
            "token_manager": self.token_manager.stats(),
            "linguistic_games": self.ling_games.stats(),
            "services": self.service_manager.status(),
            "unified_history_size": len(self.unified_history),
        }

    async def process_message(self, text: str, channel: str = "api",
                              mode: str = "catalyst", depth: str = "medium",
                              game: str = None) -> Dict[str, Any]:
        """
        Procesa un mensaje a través del pipeline completo:
        Token Manager → Coherencia → Juego Lingüístico → Orquestación
        """
        result = {
            "channel": channel,
            "timestamp": datetime.now().isoformat(),
            "original_text_length": len(text),
        }

        # 1. Token count
        tokens = self.token_manager.count_tokens(text)
        result["token_count"] = tokens

        # 2. Semantic coherence
        context_texts = [h["text_preview"] for h in self.unified_history[-10:]
                         if h.get("text_preview")]
        coherence = self.token_manager.semantic_coherence(text, context_texts)
        result["coherence_score"] = coherence

        # 3. Linguistic game (si se solicita)
        if game:
            game_result = await self.ling_games.play(game, text, context_texts)
            result["linguistic_game"] = game_result

        # 4. Onto-Deonto analysis (siempre)
        if self.onto_deonto:
            try:
                onto_deonto = self.onto_deonto.generate_response_framework(
                    text, "\n".join(context_texts[-3:]) if context_texts else "", mode
                )
                result["onto_deonto"] = {
                    "ontological": {
                        "categories": onto_deonto["ontological"]["categories"],
                        "mode_of_being": onto_deonto["ontological"]["mode_of_being"],
                        "depth": onto_deonto["ontological"]["depth"],
                        "aletheia": onto_deonto["ontological"]["aletheia"],
                    },
                    "deontological": {
                        "principles": onto_deonto["deontological"]["principles"],
                        "humanity_respect": onto_deonto["deontological"]["humanity_respect"],
                        "rawlsian_veil": onto_deonto["deontological"].get("rawlsian_veil", ""),
                        "self_referential_critique": onto_deonto["deontological"].get("self_referential_critique", ""),
                        "observational_note": onto_deonto["deontological"].get("observational_note", ""),
                    },
                    "pentetraktys_instruction": onto_deonto["pentetraktys_integration"],
                }
            except Exception as e:
                log.debug(f"Onto-deonto skip: {e}")

        # 5. Log unificado
        self.log_message(
            channel=channel,
            direction="incoming",
            text=text,
            token_count=tokens,
            coherence=coherence,
            game=game,
            mode=mode,
            depth=depth,
            metadata=result,
        )

        # 5. Chunking si es necesario
        if tokens > TOKEN_LIMITS["chunk_size"]:
            chunks = self.token_manager.chunk_text(text)
            result["chunked"] = True
            result["chunks"] = len(chunks)

        return result

    def report_to_main_interface(self) -> Dict[str, Any]:
        """
        Genera reporte completo para la interfaz principal (Catalyst Chat).
        Este reporte se envía vía API a localhost:3000.
        """
        return {
            "orchestrator": {
                "version": VERSION,
                "bell": BELL,
                "uptime": "24/7",
                "master_email": MASTER_EMAIL,
            },
            "services": self.service_manager.status(),
            "token_manager": self.token_manager.stats(),
            "linguistic_games": self.ling_games.stats(),
            "recent_activity": self.unified_history[-20:],
            "hybrys_status": self._hybrys_summary(),
        }

    def _hybrys_summary(self) -> Dict:
        conn = sqlite3.connect(
            os.path.join(os.path.dirname(os.path.abspath(__file__)), "orchestrator_log.db")
        )
        scores = [r[0] for r in conn.execute(
            "SELECT hybrys_score FROM unified_log WHERE hybrys_score IS NOT NULL ORDER BY timestamp DESC LIMIT 50"
        ).fetchall()]
        conn.close()

        if not scores:
            return {"status": "ok", "avg": 0, "max": 0}

        avg = sum(scores) / len(scores)
        return {
            "status": "ok" if avg < 0.15 else "warning" if avg < 0.30 else "critical",
            "avg_hybrys": round(avg, 4),
            "max_hybrys": round(max(scores), 4),
            "samples": len(scores),
        }


# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR API (FastAPI extension)
# ═══════════════════════════════════════════════════════════════

def create_orchestrator_app():
    """Crea una app FastAPI con el orquestador integrado."""
    try:
        from fastapi import FastAPI, HTTPException, Query
        from fastapi.responses import JSONResponse
        from pydantic import BaseModel
    except ImportError:
        log.error("FastAPI no disponible")
        return None

    orch = CatalystOrchestrator()
    orch.service_manager.register("catalyst-chat", 3000)
    orch.service_manager.register("catalyst-bot", 8000)

    app = FastAPI(
        title="Catalyst Orchestrator",
        description=f"BELL {BELL} | Pentetraktys 4D | OSHIRO ERC-26+",
        version=VERSION,
    )

    class ProcessRequest(BaseModel):
        text: str
        channel: str = "orchestrator"
        mode: str = "catalyst"
        depth: str = "medium"
        game: str = None

    @app.get("/orchestrator/health")
    async def health():
        return {"status": "ok", "version": VERSION}

    @app.get("/orchestrator/stats")
    async def stats():
        return orch.stats()

    @app.get("/orchestrator/report")
    async def report():
        """Reporte completo para la interfaz principal."""
        return orch.report_to_main_interface()

    @app.post("/orchestrator/process")
    async def process(req: ProcessRequest):
        """Procesa mensaje por el pipeline completo."""
        result = await orch.process_message(
            text=req.text, channel=req.channel,
            mode=req.mode, depth=req.depth, game=req.game,
        )
        return result

    @app.get("/orchestrator/log")
    async def get_log(channel: str = None, limit: int = 100):
        return {"logs": orch.get_unified_log(limit=limit, channel=channel)}

    @app.get("/orchestrator/games")
    async def list_games():
        return {"games": orch.ling_games.GAMES}

    @app.post("/orchestrator/games/{game}")
    async def play_game(game: str, req: ProcessRequest):
        result = await orch.ling_games.play(game, req.text)
        orch.log_message(
            channel="linguistic_game", direction="analysis",
            text=req.text, game=game,
            metadata=result,
        )
        return result

    return app, orch


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

async def main():
    """Inicia el orquestador standalone."""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  ◆ CATALYST ORCHESTRATOR v{VERSION}                    ║
║  BELL {BELL} | Pentetraktys 4D | OSHIRO ERC-26+        ║
║  Email: {MASTER_EMAIL}                ║
╚══════════════════════════════════════════════════════════════╝
""")

    orch = CatalystOrchestrator()
    orch.service_manager.register("catalyst-chat", 3000)
    orch.service_manager.register("catalyst-bot", 8000)

    # Test rápido
    result = await orch.process_message(
        "El sistema Catalyst es una arquitectura de banca autopoiética " +
        "que vincula cada token a actividad económica real, creando un " +
        "ecosistema financiero que se auto-regenera.",
        channel="orchestrator",
        mode="catalyst",
        depth="deep",
        game="sprachspiel",
    )

    print(f"\n◆ Pipeline test:")
    print(f"  Tokens: {result['token_count']}")
    print(f"  Coherencia: {result['coherence_score']}")
    if "linguistic_game" in result:
        lg = result["linguistic_game"]
        print(f"  Juego: {lg['game']} — {lg['description'][:80]}...")
        if "analysis" in lg:
            for k, v in lg["analysis"].items():
                if isinstance(v, (str, int, float)):
                    print(f"    {k}: {v}")

    print(f"\n◆ Stats:")
    stats = orch.stats()
    print(f"  Total mensajes: {stats['total_messages_logged']}")
    print(f"  Total tokens: {stats['total_tokens_logged']}")
    print(f"  Coherencia promedio: {stats['avg_coherence']}")

    print(f"\n◆ Servicios monitoreados:")
    for name, svc in stats['services'].items():
        print(f"  {name} (:{svc['port']}): {'OK' if svc.get('healthy') else 'desconocido'}")

    return orch


if __name__ == "__main__":
    asyncio.run(main())
