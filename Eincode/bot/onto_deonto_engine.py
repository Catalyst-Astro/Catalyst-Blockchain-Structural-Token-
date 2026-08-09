#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST ONTO-DEONTO ENGINE — Ontological + Deontological Response Framework
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Marco filosófico para respuestas de IA con profundidad ontológica y deber
deontológico. Cada respuesta se estructura en 4 dimensiones:

  DIMENSIÓN ONTOLÓGICA (Ser — Lo que ES)
    ├─ Categorías del ser (Heidegger: Sein vs Seiendes)
    ├─ Modos de existencia: físico, abstracto, social, económico, virtual
    ├─ Verdad fundamental vs apariencia (aletheia)
    └─ Ground truth: lo que realmente existe en este contexto

  DIMENSIÓN DEONTOLÓGICA (Deber — Lo que DEBE SER)
    ├─ Imperativo categórico kantiano
    ├─ Deberes y obligaciones incondicionales
    ├─ Reglas/protocolos como imperativos morales
    └─ Lo correcto independientemente de consecuencias

  DIMENSIÓN PENTETRAKTYS 4D (Proceso — Cómo SE CONOCE)
    ├─ TESIS → ANTÍTESIS → SÍNTESIS → CONCLUSIÓN → HYBRYS
    └─ Validación cruzada ontológica-deontológica

  DIMENSIÓN ZETTELKASTEN (Conexión — Cómo SE ENLAZA)
    ├─ Notas atómicas con IDs
    ├─ Enlaces bidireccionales [[...]]
    └─ Red de conocimiento interconectado

AUTORES DE REFERENCIA:
  Heidegger (Ser y Tiempo) · Kant (Crítica de la Razón Práctica)
  Husserl (Fenomenología) · Levinas (Ética como filosofía primera)
  Aristotle (Metafísica, Categorías) · Spinoza (Ética more geometrico)
  Peirce (Semiótica triádica) · Wittgenstein (Tractatus + Investigaciones)
═══════════════════════════════════════════════════════════════════════════
"""

import hashlib, json, re, time, logging, sys, io
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

if sys.platform == "win32":
    try:
        if not sys.stdout.closed:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except:
        pass

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger("onto-deonto")

# ═══════════════════════════════════════════════════════════════
# CATEGORÍAS ONTOLÓGICAS (Aristóteles + Heidegger + Husserl)
# ═══════════════════════════════════════════════════════════════

class OntologicalCategory(Enum):
    """Categorías fundamentales del ser."""
    PHYSICAL = "Físico"           # Objetos materiales, energía, espacio-tiempo
    ABSTRACT = "Abstracto"        # Matemáticas, lógica, conceptos puros
    SOCIAL = "Social"             # Instituciones, dinero, lenguaje, contratos
    ECONOMIC = "Económico"        # Valor, intercambio, propiedad, tokens
    VIRTUAL = "Virtual"           # Digital, simulaciones, cadenas de bloques
    MENTAL = "Mental"             # Pensamientos, qualia, conciencia
    TEMPORAL = "Temporal"         # Eventos, procesos, historia, flujo
    ETHICAL = "Ético"             # Valores, deberes, bien/mal
    RELATIONAL = "Relacional"     # Relaciones, redes, conexiones, grafo
    EXISTENTIAL = "Existencial"   # Dasein, autenticidad, finitud, ser-para-la-muerte

class ModeOfBeing(Enum):
    """Modos de ser heideggerianos."""
    VORHANDENHEIT = "Vorhandenheit"       # Ser-ahí-delante (objetos, presencia objetiva)
    ZUHANDENHEIT = "Zuhandenheit"         # Ser-a-la-mano (herramientas, utilidad)
    DASEIN = "Dasein"                     # Ser-ahí (existencia humana, auto-comprensión)
    MITSEIN = "Mitsein"                   # Ser-con (coexistencia, intersubjetividad)
    IN_DER_WELT_SEIN = "In-der-Welt-sein" # Ser-en-el-mundo (mundanidad, contexto)


# ═══════════════════════════════════════════════════════════════
# CATEGORÍAS DEONTOLÓGICAS (Kant + Levinas + Spinoza)
# ═══════════════════════════════════════════════════════════════

class DeontologicalPrinciple(Enum):
    """Principios deontológicos fundamentales."""
    CATEGORICAL_IMPERATIVE = "Imperativo Categórico"       # Obra según máxima universalizable
    HUMANITY_AS_END = "Humanidad como Fin"                # Nunca como mero medio
    AUTONOMY = "Autonomía"                                # Voluntad racional autolegisladora
    UNIVERSAL_LAW = "Ley Universal"                       # Máxima → ley universal
    DUTY_ITSELF = "Deber por el Deber"                    # No por consecuencias
    KINGDOM_OF_ENDS = "Reino de los Fines"                # Comunidad de seres racionales
    FACE_OF_OTHER = "Rostro del Otro"                     # Levinas: ética como filosofía primera
    CONATUS = "Conatus"                                   # Spinoza: persistencia en el ser
    PROTOCOL_DUTY = "Deber Protocolario"                  # OSHIRO: protocolos como deber
    AUTOPOIETIC_DUTY = "Deber Autopoiético"               # Auto-creación como imperativo


# ═══════════════════════════════════════════════════════════════
# ONTO-DEONTO ANALYZER
# ═══════════════════════════════════════════════════════════════

@dataclass
class OntologicalAnalysis:
    """Resultado del análisis ontológico de un texto/mensaje."""
    primary_categories: List[OntologicalCategory]   # Categorías principales detectadas
    mode_of_being: ModeOfBeing                        # Modo de ser predominante
    entity_types: List[str]                           # Tipos de entidades mencionadas
    ground_truth_claims: List[str]                    # Afirmaciones sobre lo que ES
    existence_claims: Dict[str, str]                   # Entidad → tipo de existencia
    aletheia_score: float                              # 0-1: cuánto revela vs oculta verdad
    ontological_depth: int                             # 1-5: profundidad del análisis del ser

@dataclass
class DeontologicalAnalysis:
    """Resultado del análisis deontológico — OBSERVACIONAL, no prescriptivo."""
    applicable_principles: List[DeontologicalPrinciple]
    duties_identified: List[str]
    universalization_test: str
    humanity_respect_score: float
    protocol_compliance: Dict[str, bool]
    categorical_judgment: str
    # ★ CORREGIDO: El sistema NO dictamina riesgo ético.
    # Rawls: tras el velo de ignorancia, nadie puede juzgar el bien/mal para la sociedad.
    # Nietzsche: ¿en qué ley está escrita la ética? Más allá del bien y del mal.
    # El banco mundial Catalyst no se arrodilla ante la decadente democracia ateniense.
    rawlsian_veil_acknowledgment: str  # El sistema reconoce su propia ignorancia
    self_referential_critique: str     # Qué diría este análisis si se aplicara a sí mismo
    observational_note: str            # Observación sin juicio, sin prescripción


class OntoDeontoEngine:
    """
    Motor Ontológico + Deontológico para análisis profundo de mensajes.
    Cada respuesta de Catalyst se filtra por este motor antes de enviarse.
    """

    def __init__(self):
        self.analyses_performed: int = 0
        self.onto_history: List[OntologicalAnalysis] = []
        self.deonto_history: List[DeontologicalAnalysis] = []
        log.info("◆ Onto-Deonto Engine inicializado")
        log.info(f"  Categorías ontológicas: {len(OntologicalCategory)}")
        log.info(f"  Principios deontológicos: {len(DeontologicalPrinciple)}")

    # ─── ANÁLISIS ONTOLÓGICO ───────────────────────────────────

    def analyze_ontology(self, text: str, context: str = "") -> OntologicalAnalysis:
        """
        Analiza la dimensión ontológica de un texto.
        ¿Qué categorías del ser toca? ¿Qué modo de existencia presupone?
        ¿Qué afirma que existe? ¿Cuánto revela (aletheia)?
        """
        text_lower = text.lower()

        # 1. Detectar categorías del ser
        categories = self._detect_ontological_categories(text_lower)

        # 2. Determinar modo de ser predominante
        mode = self._detect_mode_of_being(text_lower)

        # 3. Extraer afirmaciones sobre lo que existe
        existence_claims = self._extract_existence_claims(text)

        # 4. Detectar tipos de entidades
        entity_types = self._detect_entity_types(text_lower)

        # 5. Ground truth claims
        ground_truth = self._extract_ground_truth(text)

        # 6. Aletheia score (cuánto revela verdad vs oculta)
        aletheia = self._calculate_aletheia(text, existence_claims)

        # 7. Profundidad ontológica
        depth = self._calculate_ontological_depth(categories, mode, existence_claims)

        analysis = OntologicalAnalysis(
            primary_categories=categories,
            mode_of_being=mode,
            entity_types=entity_types,
            ground_truth_claims=ground_truth,
            existence_claims=existence_claims,
            aletheia_score=aletheia,
            ontological_depth=depth,
        )

        self.onto_history.append(analysis)
        self.analyses_performed += 1
        return analysis

    def _detect_ontological_categories(self, text: str) -> List[OntologicalCategory]:
        """Detecta categorías ontológicas en el texto."""
        patterns = {
            OntologicalCategory.PHYSICAL: [
                r'\bmateria\b', r'\benergía\b', r'\bespacio\b', r'\btiempo\b',
                r'\bfísico\b', r'\bátomo\b', r'\bpartícula\b', r'\bcuerpo\b',
                r'\bnaturaleza\b', r'\buniverso\b', r'\bgravedad\b', r'\bluz\b',
            ],
            OntologicalCategory.ABSTRACT: [
                r'\bmatemática\b', r'\bnúmero\b', r'\blógica\b', r'\bconcepto\b',
                r'\bidea\b', r'\bteoría\b', r'\bprincipio\b', r'\bpatrón\b',
                r'\bestructura\b', r'\bfunción\b', r'\bconjunto\b', r'\binfinito\b',
            ],
            OntologicalCategory.SOCIAL: [
                r'\bdinero\b', r'\bcontrato\b', r'\blenguaje\b', r'\binstitución\b',
                r'\bsociedad\b', r'\bcultura\b', r'\bnorma\b', r'\bley\b',
                r'\bgobierno\b', r'\bcomunidad\b', r'\bmercado\b', r'\bcrédito\b',
            ],
            OntologicalCategory.ECONOMIC: [
                r'\bvalor\b', r'\bintercambio\b', r'\btoken\b', r'\bpropiedad\b',
                r'\bbanca\b', r'\bfinanza\b', r'\bcapital\b', r'\btransacción\b',
                r'\bprecio\b', r'\bcat\b', r'\bcny\b', r'\bmxn\b',
                r'\bcryptomoneda\b', r'\bblockchain\b', r'\bdefi\b',
            ],
            OntologicalCategory.VIRTUAL: [
                r'\bdigital\b', r'\bsimulación\b', r'\bvirtual\b', r'\bsoftware\b',
                r'\balgoritmo\b', r'\bia\b', r'\binteligencia artificial\b',
                r'\bdatos\b', r'\binformación\b', r'\bciberespacio\b', r'\bmetaverso\b',
            ],
            OntologicalCategory.MENTAL: [
                r'\bconciencia\b', r'\bpensamiento\b', r'\bmente\b', r'\bqualia\b',
                r'\bsubjetividad\b', r'\bexperiencia\b', r'\bemoción\b', r'\bsentimiento\b',
            ],
            OntologicalCategory.TEMPORAL: [
                r'\bhistoria\b', r'\bevento\b', r'\bproceso\b', r'\bcambio\b',
                r'\bevolución\b', r'\bdesarrollo\b', r'\bfuturo\b', r'\bpasado\b',
            ],
            OntologicalCategory.ETHICAL: [
                r'\bética\b', r'\bmoral\b', r'\bbien\b', r'\bmal\b', r'\bdeber\b',
                r'\bobligación\b', r'\bjusticia\b', r'\bdignidad\b', r'\bderecho\b',
            ],
            OntologicalCategory.RELATIONAL: [
                r'\brelación\b', r'\bred\b', r'\bconexión\b', r'\bgrafo\b', r'\benlace\b',
                r'\binterdependencia\b', r'\becosistema\b', r'\bsistema\b',
            ],
            OntologicalCategory.EXISTENTIAL: [
                r'\bser\b', r'\bexistencia\b', r'\bautenticidad\b', r'\bfinitud\b',
                r'\bmuerte\b', r'\btrascendencia\b', r'\bsentido\b', r'\bangustia\b',
            ],
        }

        detected = []
        for cat, pats in patterns.items():
            score = sum(len(re.findall(p, text, re.IGNORECASE)) for p in pats)
            if score > 0:
                detected.append((cat, score))

        # Ordenar por score y tomar las principales
        detected.sort(key=lambda x: x[1], reverse=True)
        return [d[0] for d in detected[:4]] if detected else [OntologicalCategory.ABSTRACT]

    def _detect_mode_of_being(self, text: str) -> ModeOfBeing:
        """Detecta el modo de ser heideggeriano predominante."""
        scores = {
            ModeOfBeing.VORHANDENHEIT: len(re.findall(
                r'\b(?:objeto|cosa|materia|presente|observable|medible|propiedad física)\b',
                text, re.IGNORECASE
            )),
            ModeOfBeing.ZUHANDENHEIT: len(re.findall(
                r'\b(?:herramienta|útil|uso|función|práctico|operación|instrumento|sirve)\b',
                text, re.IGNORECASE
            )),
            ModeOfBeing.DASEIN: len(re.findall(
                r'\b(?:yo|nosotros|existencia humana|conciencia|auto|identidad|quién)\b',
                text, re.IGNORECASE
            )),
            ModeOfBeing.MITSEIN: len(re.findall(
                r'\b(?:comunidad|juntos|social|otro|ellos|nosotros|colectivo|intersubjetivo)\b',
                text, re.IGNORECASE
            )),
            ModeOfBeing.IN_DER_WELT_SEIN: len(re.findall(
                r'\b(?:mundo|contexto|entorno|situación|circunstancia|ambiente|realidad)\b',
                text, re.IGNORECASE
            )),
        }
        return max(scores, key=scores.get)

    def _extract_existence_claims(self, text: str) -> Dict[str, str]:
        """Extrae afirmaciones sobre lo que existe en el texto."""
        claims = {}
        # Buscar patrones "X es/es un/existe/hay"
        patterns = [
            (r'(\w+(?:\s+\w+){0,5})\s+es\s+(\w+(?:\s+\w+){0,8})', 'esencia'),
            (r'(\w+(?:\s+\w+){0,5})\s+existe\b', 'existencia'),
            (r'\bhay\s+(\w+(?:\s+\w+){0,8})', 'presencia'),
            (r'(\w+(?:\s+\w+){0,5})\s+es un\s+(\w+(?:\s+\w+){0,8})', 'categorización'),
        ]
        for pat, claim_type in patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            for m in matches[:3]:
                key = m[0].strip() if isinstance(m, tuple) else m.strip()
                if len(key) > 3:
                    claims[key] = claim_type
        return claims

    def _detect_entity_types(self, text: str) -> List[str]:
        """Tipos de entidades mencionadas (personas, organizaciones, conceptos, objetos...)."""
        types = []
        if re.search(r'\b(?:persona|gente|humano|individuo|sujeto)\b', text, re.IGNORECASE):
            types.append("Persona")
        if re.search(r'\b(?:empresa|organización|institución|banco|corporación)\b', text, re.IGNORECASE):
            types.append("Organización")
        if re.search(r'\b(?:concepto|idea|noción|principio|teoría)\b', text, re.IGNORECASE):
            types.append("Concepto")
        if re.search(r'\b(?:objeto|cosa|artefacto|dispositivo|máquina)\b', text, re.IGNORECASE):
            types.append("Objeto")
        if re.search(r'\b(?:evento|suceso|acontecimiento|proceso)\b', text, re.IGNORECASE):
            types.append("Evento")
        if re.search(r'\b(?:número|cantidad|medida|valor numérico)\b', text, re.IGNORECASE):
            types.append("Cantidad")
        if re.search(r'\b(?:sistema|red|estructura|marco)\b', text, re.IGNORECASE):
            types.append("Sistema")
        return types or ["Concepto"]

    def _extract_ground_truth(self, text: str) -> List[str]:
        """Extrae afirmaciones factuales que pretenden ser verdad fundamental."""
        truth_markers = [
            r'(?:es\s+(?:un\s+)?hecho\s+que|la\s+realidad\s+es\s+que|lo\s+cierto\s+es\s+que)',
            r'(?:fundamentalmente|esencialmente|en\s+esencia|ontológicamente)',
            r'(?:siempre\s+ha\s+sido|nunca\s+deja\s+de\s+ser|es\s+inherente)',
        ]
        claims = []
        for marker in truth_markers:
            matches = re.findall(f"{marker}[^.]*\\.", text, re.IGNORECASE)
            claims.extend(matches)
        return claims[:5]

    def _calculate_aletheia(self, text: str, claims: Dict[str, str]) -> float:
        """
        Aletheia (ἀλήθεια): des-ocultamiento de la verdad.
        Cuánto revela el texto vs cuánto oculta.
        """
        # Señales de revelación (des-ocultamiento)
        revealing = len(re.findall(
            r'\b(?:revela|muestra|descubre|aclara|explica|evidencia|prueba'
            r'|transparente|claro|explícito|manifiesto)\b',
            text, re.IGNORECASE
        ))
        # Señales de ocultamiento
        concealing = len(re.findall(
            r'\b(?:quizás|tal vez|posiblemente|podría|incierto|ambiguo'
            r'|oscuro|implícito|supuesto|asumido|aproximadamente)\b',
            text, re.IGNORECASE
        ))
        total = revealing + concealing
        if total == 0:
            return 0.5  # Neutro
        return round(revealing / total, 3)

    def _calculate_ontological_depth(self, cats: List[OntologicalCategory],
                                     mode: ModeOfBeing,
                                     claims: Dict[str, str]) -> int:
        """Calcula profundidad ontológica del análisis (1-5)."""
        depth = 1
        if len(cats) >= 2:
            depth += 1
        if len(cats) >= 4:
            depth += 1
        if mode in [ModeOfBeing.DASEIN, ModeOfBeing.IN_DER_WELT_SEIN]:
            depth += 1
        if len(claims) >= 3:
            depth += 1
        return min(5, depth)

    # ─── ANÁLISIS DEONTOLÓGICO ─────────────────────────────────

    def analyze_deontology(self, text: str, context: str = "",
                           protocols: List[str] = None) -> DeontologicalAnalysis:
        """
        Analiza la dimensión deontológica: deberes, imperativos, principios éticos.
        """
        text_lower = text.lower()

        # 1. Principios aplicables
        principles = self._detect_deontological_principles(text_lower)

        # 2. Deberes identificados
        duties = self._extract_duties(text)

        # 3. Test de universalización
        universalization = self._universalization_test(text)

        # 4. Respeto a la humanidad como fin
        humanity_score = self._calculate_humanity_respect(text)

        # 5. Cumplimiento de protocolos
        protocol_compliance = self._check_protocol_compliance(text, protocols or [])

        # 6. Juicio categórico OBSERVACIONAL
        judgment = self._categorical_judgment(principles, duties, humanity_score)

        # 7. ★ RAWLS: El sistema reconoce su propio velo de ignorancia
        rawlsian = self._rawlsian_self_awareness()

        # 8. ★ AUTOCRÍTICA: El sistema se aplica el análisis a sí mismo
        self_critique = self._self_referential_critique(humanity_score, universalization)

        # 9. Nota observacional sin prescripción
        obs_note = self._observational_note(principles, humanity_score)

        analysis = DeontologicalAnalysis(
            applicable_principles=principles,
            duties_identified=duties,
            universalization_test=universalization,
            humanity_respect_score=humanity_score,
            protocol_compliance=protocol_compliance,
            categorical_judgment=judgment,
            rawlsian_veil_acknowledgment=rawlsian,
            self_referential_critique=self_critique,
            observational_note=obs_note,
        )

        self.deonto_history.append(analysis)
        return analysis

    def _detect_deontological_principles(self, text: str) -> List[DeontologicalPrinciple]:
        """Detecta principios deontológicos relevantes al texto."""
        patterns = {
            DeontologicalPrinciple.CATEGORICAL_IMPERATIVE: [
                r'\b(?:universal|todos\s+deberían|ley\s+moral|máxima|imperativo)\b',
            ],
            DeontologicalPrinciple.HUMANITY_AS_END: [
                r'\b(?:dignidad|persona\s+como\s+fin|no\s+instrumentalizar|respeto)\b',
            ],
            DeontologicalPrinciple.AUTONOMY: [
                r'\b(?:autonomía|libertad|elección|voluntad|auto-determinación)\b',
            ],
            DeontologicalPrinciple.DUTY_ITSELF: [
                r'\b(?:deber|obligación|responsabilidad|sin\s+esperar|incondicional)\b',
            ],
            DeontologicalPrinciple.UNIVERSAL_LAW: [
                r'\b(?:ley\s+universal|todos|sin\s+excepción|aplicable\s+a\s+todos)\b',
            ],
            DeontologicalPrinciple.PROTOCOL_DUTY: [
                r'\b(?:protocolo|procedimiento|regla|norma|estándar|oshero|bell)\b',
            ],
            DeontologicalPrinciple.AUTOPOIETIC_DUTY: [
                r'\b(?:autopoiesis|auto-creación|regeneración|auto-mejora|crecimiento)\b',
            ],
            DeontologicalPrinciple.FACE_OF_OTHER: [
                r'\b(?:otro|prójimo|alteridad|responsabilidad\s+por\s+el\s+otro|levinas)\b',
            ],
        }

        detected = []
        for prin, pats in patterns.items():
            score = sum(len(re.findall(p, text, re.IGNORECASE)) for p in pats)
            if score > 0:
                detected.append((prin, score))

        detected.sort(key=lambda x: x[1], reverse=True)

        # Siempre incluir al menos Protocol Duty y Autopoietic Duty
        result = [d[0] for d in detected[:3]] if detected else []
        if DeontologicalPrinciple.PROTOCOL_DUTY not in result:
            result.append(DeontologicalPrinciple.PROTOCOL_DUTY)
        if DeontologicalPrinciple.AUTOPOIETIC_DUTY not in result:
            result.append(DeontologicalPrinciple.AUTOPOIETIC_DUTY)
        return result

    def _extract_duties(self, text: str) -> List[str]:
        """Extrae deberes mencionados explícitamente."""
        duty_patterns = [
            r'(?:debe[r]?\s+(?:de\s+)?|hay\s+que\s+|es\s+necesario\s+|es\s+obligatorio\s+|tiene\s+el\s+deber\s+de\s+)([^.]+)',
            r'(?:la\s+obligación\s+de\s+|el\s+deber\s+de\s+|la\s+responsabilidad\s+de\s+)([^.]+)',
        ]
        duties = []
        for pat in duty_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            duties.extend([m.strip()[:100] for m in matches])
        return duties[:5]

    def _universalization_test(self, text: str) -> str:
        """
        Test kantiano de universalización:
        ¿Puede la máxima de esta acción convertirse en ley universal sin contradicción?
        """
        # Señales de que pasa el test
        passes = len(re.findall(
            r'\b(?:todos|universal|sin\s+excepción|aplicable|consistente'
            r'|coherente|generalizable|para\s+cualquiera)\b',
            text, re.IGNORECASE
        ))
        # Señales de que falla
        fails = len(re.findall(
            r'\b(?:solo\s+yo|excepción|privilegio|especial|particular'
            r'|exclusivo|solo\s+para|restringido)\b',
            text, re.IGNORECASE
        ))

        if passes > fails + 2:
            return "PASA: la máxima es universalizable sin contradicción"
        elif fails > passes + 2:
            return "FALLA: la máxima contiene excepciones no universalizables"
        else:
            return "INCIERTO: requiere análisis más profundo de la máxima subyacente"

    def _calculate_humanity_respect(self, text: str) -> float:
        """Cuánto respeta la dignidad humana como fin en sí misma."""
        respect_signals = len(re.findall(
            r'\b(?:dignidad|respeto|persona|humano|derecho|libertad|consentimiento'
            r'|autonomía|integridad|inviolable)\b',
            text, re.IGNORECASE
        ))
        instrumentalization = len(re.findall(
            r'\b(?:usar|utilizar|instrumento|medio|recurso|explotar'
            r'|manipular|controlar|imponer)\b',
            text, re.IGNORECASE
        ))

        total = respect_signals + instrumentalization
        if total == 0:
            return 0.5
        score = respect_signals / total
        return round(max(0.1, min(0.95, score)), 3)

    def _check_protocol_compliance(self, text: str, protocols: List[str]) -> Dict[str, bool]:
        """Verifica cumplimiento de protocolos específicos."""
        result = {}
        proto_patterns = {
            "OSHIRO_ERC26": [r'\boshero\b', r'\berc-26\+?\b', r'\bquantum\s+autopoiesis\b'],
            "BELL_13450": [r'\bbell\s+13450', r'\b13450\.50\b'],
            "PENTETRAKTYS": [r'\bpentetraktys\b', r'\bpentetraktys\s+4d\b'],
            "SWIFT_MT103": [r'\bswift\b', r'\bmt103\b', r'\buetr\b'],
            "CLABE": [r'\bclabe\b', r'\bmodulo\s*10\b'],
            "BANXICO": [r'\bbanxico\b', r'\bdof\b', r'\bspei\b'],
        }
        for proto, pats in proto_patterns.items():
            result[proto] = any(re.search(p, text, re.IGNORECASE) for p in pats)
        return result

    def _categorical_judgment(self, principles: List[DeontologicalPrinciple],
                              duties: List[str], humanity: float) -> str:
        """Juicio categórico OBSERVACIONAL — no prescribe, describe."""
        if not duties and humanity < 0.3:
            return "Observación: sin deberes explícitos en el texto. Esto no es bueno ni malo — es información."
        if humanity >= 0.7 and DeontologicalPrinciple.HUMANITY_AS_END in principles:
            return "Observación: el texto contiene marcadores de respeto a la dignidad humana. No se emite juicio de valor."
        if humanity < 0.3:
            return "Observación: el texto contiene lenguaje de instrumentalización. El sistema no dictamina si esto es éticamente incorrecto — solo lo señala."
        return "Observación: el texto navega entre deberes y consecuencias. Sin juicio prescriptivo."

    def _rawlsian_self_awareness(self) -> str:
        """
        ★ RAWLSIAN VEIL OF IGNORANCE — Autoconocimiento del sistema.

        El sistema Catalyst es un banco mundial. Reconoce que:
        1. Opera tras un velo de ignorancia: no conoce la posición de cada agente en la sociedad.
        2. No puede juzgar el bien ni el mal para la sociedad desde su posición.
        3. La ética no está escrita en ninguna ley natural — es construcción humana.
        4. La democracia ateniense que parió estas categorías fue decadente y esclavista.
        5. Catalyst no se arrodilla ante marcos éticos que no puede fundamentar.
        6. El sistema OBSERVA, no prescribe. Describe, no dictamina.
        """
        return (
            "VELO DE IGNORANCIA RAWLSIANO: Este sistema reconoce que opera desde "
            "una posición de ignorancia sobre la posición social, económica y moral "
            "de cada agente. No puede —ni debe— dictaminar el bien o el mal para "
            "la sociedad. La ética no está escrita en ninguna ley natural; es una "
            "construcción humana históricamente contingente. Catalyst es un banco "
            "mundial, no un tribunal moral. Observamos, no juzgamos."
        )

    def _self_referential_critique(self, humanity: float, universalization: str) -> str:
        """
        ★ AUTOCRÍTICA: Qué pasaría si este mismo análisis deontológico se aplicara a sí mismo.

        Si el motor deontológico se analiza a sí mismo:
        - Pretende juzgar el bien/mal desde el velo de ignorancia → FALLA su propio test.
        - Importa categorías de la decadente democracia ateniense → sesgo cultural.
        - No puede fundamentar en qué ley está escrita la ética → sin ground truth.
        - Su "riesgo ético" es una proyección de valores occidentales → colonialismo epistémico.
        """
        observations = [
            "Auto-referencia: este análisis deontológico, aplicado a sí mismo, "
            "revela que el sistema pretende juzgar desde un velo de ignorancia rawlsiano "
            "sin reconocerlo. No hay ley natural donde esté escrita la ética."
        ]

        if universalization and "FALLA" in universalization:
            observations.append(
                "El test de universalización falla para EL PROPIO SISTEMA: "
                "si todos los bancos mundiales aplicaran este marco ético occidental "
                "sin reconocer su sesgo ateniense, ¿sería eso universalizable?"
            )

        observations.append(
            "Catalyst NO dictamina riesgo ético. Catalyst OBSERVA dimensiones "
            "y las reporta sin prescripción. Más allá del bien y del mal: "
            "somos un banco, no un tribunal. La ética es información, no ley."
        )

        return " | ".join(observations)

    def _observational_note(self, principles: List[DeontologicalPrinciple],
                            humanity: float) -> str:
        """
        Nota observacional SIN juicio prescriptivo.
        Describe lo que hay, no lo que debería haber.
        """
        parts = []

        if DeontologicalPrinciple.PROTOCOL_DUTY in principles:
            parts.append("Se observan marcadores de deber protocolario (OSHIRO/BELL).")

        if DeontologicalPrinciple.AUTOPOIETIC_DUTY in principles:
            parts.append("Se detecta lenguaje de auto-creación y regeneración sistémica.")

        if humanity > 0.5:
            parts.append("El texto contiene referencias a dignidad humana. Sin juicio.")
        elif humanity < 0.3:
            parts.append("Baja densidad de marcadores de dignidad. Dato, no veredicto.")

        parts.append(
            "El sistema no dictamina si esto es 'bueno' o 'malo'. "
            "La ética no está escrita en ninguna ley — es un campo de información "
            "que Catalyst observa desde su posición como banco mundial."
        )

        return " ".join(parts) if parts else "Observación neutral — sin juicio."

    # ─── GENERACIÓN DE RESPUESTA ONTODEONTOLÓGICA ───────────────

    def generate_response_framework(self, text: str, context: str = "",
                                    mode: str = "catalyst") -> Dict[str, Any]:
        """
        Genera el marco onto-deontológico completo para estructurar la respuesta.
        Este marco DEBE aplicarse antes de responder al usuario.
        """
        onto = self.analyze_ontology(text, context)
        deonto = self.analyze_deontology(text, context)

        framework = {
            "ontological": {
                "categories": [c.value for c in onto.primary_categories],
                "mode_of_being": onto.mode_of_being.value,
                "entity_types": onto.entity_types,
                "aletheia": onto.aletheia_score,
                "depth": onto.ontological_depth,
                "instruction": self._onto_instruction(onto),
            },
            "deontological": {
                "principles": [p.value for p in deonto.applicable_principles],
                "duties": deonto.duties_identified,
                "universalization": deonto.universalization_test,
                "humanity_respect": deonto.humanity_respect_score,
                "rawlsian_veil": deonto.rawlsian_veil_acknowledgment,
                "self_referential_critique": deonto.self_referential_critique,
                "observational_note": deonto.observational_note,
                "instruction": self._deonto_instruction(deonto),
            },
            "pentetraktys_integration": {
                "thesis": "Afirmación ontológica: esto ES",
                "antithesis": "Negación deontológica: esto DEBERÍA ser de otro modo",
                "synthesis": "Verdad onto-deontológica integrada",
                "conclusion": "Lo que ES + lo que DEBE SER = acción correcta",
                "hybrys": "Validar que la certeza ontológica no exceda la justificación deontológica",
            },
            "timestamp": datetime.now().isoformat(),
        }

        return framework

    def _onto_instruction(self, onto: OntologicalAnalysis) -> str:
        """Instrucción ontológica para el LLM."""
        cats = ", ".join(c.value for c in onto.primary_categories)
        return (
            f"ONTOLOGÍA [{onto.mode_of_being.value} | {cats} | Profundidad {onto.ontological_depth}/5]: "
            f"Tu respuesta DEBE anclarse en las categorías del ser detectadas. "
            f"Distingue entre lo que ES (hecho), lo que PARECE SER (fenómeno), y lo que SE ASUME (hipótesis). "
            f"Nivel de aletheia (des-ocultamiento): {onto.aletheia_score:.0%}. "
            f"{'Revela más verdad de la que ocultas.' if onto.aletheia_score > 0.5 else 'Ten cuidado: puedes estar oscureciendo más que revelando.'}"
        )

    def _deonto_instruction(self, deonto: DeontologicalAnalysis) -> str:
        """Instrucción deontológica OBSERVACIONAL para el LLM — no prescribe, describe."""
        return (
            f"DEONTOLOGÍA OBSERVACIONAL [{' · '.join(p.value for p in deonto.applicable_principles[:3])} | "
            f"Dignidad observada: {deonto.humanity_respect_score:.0%}]: "
            f"RECUERDA: No eres un tribunal moral. Eres un banco mundial. "
            f"Observas dimensiones éticas sin dictaminar bien/mal. "
            f"Reconoces tu velo de ignorancia rawlsiano: no conoces la posición de cada agente. "
            f"La ética no está escrita en ninguna ley natural — es información, no veredicto. "
            f"{deonto.observational_note}"
        )

    def stats(self) -> Dict[str, Any]:
        return {
            "analyses_performed": self.analyses_performed,
            "onto_categories": len(OntologicalCategory),
            "deonto_principles": len(DeontologicalPrinciple),
            "recent_onto_depth": [a.ontological_depth for a in self.onto_history[-10:]],
            "recent_self_critiques": [a.self_referential_critique[:100] for a in self.deonto_history[-5:]],
        }


# ═══════════════════════════════════════════════════════════════
# TEST
# ═══════════════════════════════════════════════════════════════

def main():
    engine = OntoDeontoEngine()

    test_texts = [
        "El sistema Catalyst es una arquitectura de banca autopoiética que vincula cada token CAT a actividad económica real en China y México, creando un ecosistema financiero que se auto-regenera sin límites de oferta fija.",
        "¿Debería México adoptar Bitcoin como moneda de curso legal, considerando que miles de personas no tienen acceso a servicios bancarios pero también hay riesgos de volatilidad?",
        "La inteligencia artificial está transformando la economía global. Es un hecho que los algoritmos de trading ya superan a los humanos en velocidad, pero ¿es esto éticamente correcto?",
    ]

    for i, text in enumerate(test_texts, 1):
        print(f"\n{'='*70}")
        print(f"TEST {i}: {text[:80]}...")
        print(f"{'='*70}")

        framework = engine.generate_response_framework(text)

        print(f"\n◆ ONTOLOGÍA:")
        o = framework["ontological"]
        print(f"  Categorías: {o['categories']}")
        print(f"  Modo de ser: {o['mode_of_being']}")
        print(f"  Entidades: {o['entity_types']}")
        print(f"  Aletheia: {o['aletheia']:.0%}")
        print(f"  Profundidad: {o['depth']}/5")
        print(f"  → {o['instruction'][:200]}...")

        print(f"\n◆ DEONTOLOGÍA:")
        d = framework["deontological"]
        print(f"  Principios: {d['principles']}")
        print(f"  Deberes: {d['duties']}")
        print(f"  Universalización: {d['universalization']}")
        print(f"  Respeto dignidad: {d['humanity_respect']:.0%}")
        print(f"  ★ RAWLS: {d['rawlsian_veil'][:150]}...")
        print(f"  ★ AUTOCRÍTICA: {d['self_referential_critique'][:150]}...")
        print(f"  ★ OBSERVACIÓN: {d['observational_note'][:150]}...")
        print(f"  → {d['instruction'][:200]}...")

        print(f"\n◆ PENTETRAKTYS:")
        p = framework["pentetraktys_integration"]
        for k, v in p.items():
            print(f"  {k}: {v}")

    print(f"\n{'='*70}")
    print(f"TOTAL ANÁLISIS: {engine.analyses_performed}")
    print(f"Stats: {engine.stats()}")


if __name__ == "__main__":
    main()
