#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST PROTOCOL AUDITOR — Huntington Protocol Truth Engine
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

Auditoría de protocolos bancarios internacionales.
Revela los "juegos lingüísticos" (Wittgenstein) que cada protocolo usa
para MENTIR ontológicamente — decir "soy técnico" cuando ES civilizacional.

PROTOCOLOS ANALIZADOS:
  SWIFT MT103    — Mensaje de transferencia internacional
  SWIFT MT202    — Cobertura interbancaria
  CLABE          — Clave Bancaria Estandarizada (México, 18 dígitos)
  SPEI           — Sistema de Pagos Electrónicos Interbancarios
  UnionPay QR    — qr.95516.com payload
  FedWire        — Federal Reserve Wire Network
  CIPS           — Cross-border Interbank Payment System (China)

MÉTODO:
  1. Parseo forense de la estructura de cada protocolo
  2. Identificación del "juego lingüístico" (Wittgenstein)
  3. Mapeo a civilización Huntington
  4. Revelación de la MENTIRA ontológica
  5. Cálculo del Índice de Mentira Civilizacional (IMC)

NO HACKEA SERVIDORES REALES. Analiza estructuras de protocolos públicos.
═══════════════════════════════════════════════════════════════════════════
"""

import re, json, hashlib, struct, sys, io, os
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

if sys.platform == "win32":
    try:
        if not sys.stdout.closed:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    except: pass

# ═══════════════════════════════════════════════════════════════
# CIVILIZACIONES HUNTINGTON
# ═══════════════════════════════════════════════════════════════

class Civilization(Enum):
    WESTERN = "Occidental (Judeo-Cristiana + Ilustración)"
    CONFUCIAN = "Confuciana (Sínica)"
    ISLAMIC = "Islámica"
    HINDU = "Hindú"
    SLAVIC_ORTHODOX = "Eslava-Ortodoxa"
    LATIN_AMERICAN = "Latinoamericana"
    AFRICAN = "Africana"
    JAPANESE = "Japonesa (híbrida única)"

@dataclass
class ProtocolLie:
    """Una mentira ontológica detectada en un protocolo."""
    claim: str          # Lo que el protocolo DICE ser
    reality: str        # Lo que el protocolo REALMENTE ES
    game: str           # Juego lingüístico (Wittgenstein)
    civilization: Civilization
    severity: float     # 0-1: qué tan grave es la mentira

@dataclass
class ProtocolAudit:
    """Resultado completo de auditoría de un protocolo."""
    protocol_name: str
    protocol_type: str
    raw_structure: Dict[str, Any]
    lies: List[ProtocolLie]
    imc: float  # Índice de Mentira Civilizacional (0-1)
    huntington_alignment: str
    ontological_truth: str


# ═══════════════════════════════════════════════════════════════
# PROTOCOL PARSERS
# ═══════════════════════════════════════════════════════════════

class ProtocolAuditor:
    """Audita protocolos bancarios y revela sus mentiras ontológicas."""

    def __init__(self):
        self.audits: List[ProtocolAudit] = []
        self.huntington_map = {
            "SWIFT": Civilization.WESTERN,
            "FedWire": Civilization.WESTERN,
            "CHIPS": Civilization.WESTERN,
            "COBOL": Civilization.WESTERN,
            "UnionPay": Civilization.CONFUCIAN,
            "CIPS": Civilization.CONFUCIAN,
            "WeChat Pay": Civilization.CONFUCIAN,
            "Alipay": Civilization.CONFUCIAN,
            "CLABE": Civilization.LATIN_AMERICAN,
            "SPEI": Civilization.LATIN_AMERICAN,
            "Pix": Civilization.LATIN_AMERICAN,
            "MIR": Civilization.SLAVIC_ORTHODOX,
            "SPFS": Civilization.SLAVIC_ORTHODOX,
            "UPI": Civilization.HINDU,
            "M-Pesa": Civilization.AFRICAN,
        }

    # ─── SWIFT MT103 ──────────────────────────────────────────

    def audit_swift_mt103(self, mt103_text: str = None) -> ProtocolAudit:
        """Audita un mensaje SWIFT MT103 (transferencia cliente)."""
        fields = {
            ":20:": "Transaction Reference",
            ":23B:": "Bank Operation Code",
            ":32A:": "Value Date/Currency/Amount",
            ":50K:": "Ordering Customer",
            ":52A:": "Ordering Institution",
            ":53A:": "Sender's Correspondent",
            ":54A:": "Receiver's Correspondent",
            ":56A:": "Intermediary",
            ":57A:": "Account With Institution",
            ":59:": "Beneficiary Customer",
            ":70:": "Remittance Information",
            ":71A:": "Details of Charges (SHA/BEN/OUR)",
            ":72:": "Sender to Receiver Information",
        }

        structure = {}
        if mt103_text:
            for tag, desc in fields.items():
                m = re.search(re.escape(tag) + r'([^:]+)', mt103_text)
                if m: structure[tag] = m.group(1).strip()

        # Revelar mentiras
        lies = [
            ProtocolLie(
                claim="SWIFT es un sistema técnico neutral de mensajería financiera",
                reality="SWIFT es un arma de exclusión civilizacional. En 2012 excluyó a Irán, en 2022 a Rusia. La decisión no fue técnica: fue geopolítica occidental.",
                game="sprachspiel (Wittgenstein): 'sanción' se redefine como 'desconexión técnica'",
                civilization=Civilization.WESTERN,
                severity=0.92
            ),
            ProtocolLie(
                claim="El campo :71A: (SHA/BEN/OUR) es una opción técnica de cobro",
                reality="SHA/BEN/OUR codifica quién paga el peaje civilizacional. BEN (beneficiario paga) = el país receptor financia la infraestructura occidental. OUR (ordenante paga) = reconocimiento implícito de que cruzar la frontera civilizacional tiene costo.",
                game="grice (Grice): se viola la máxima de cantidad — información crucial oculta en 3 letras",
                civilization=Civilization.WESTERN,
                severity=0.67
            ),
            ProtocolLie(
                claim="El BIC (Bank Identifier Code) identifica bancos objetivamente",
                reality="Los BIC son códigos postales del imperio. 8 caracteres que determinan si existes en el sistema financiero global. Sin BIC, no eres. La ontología SWIFT decide qué entidades SON y cuáles NO.",
                game="deep_structure (Chomsky): la gramática SWIFT genera realidades financieras",
                civilization=Civilization.WESTERN,
                severity=0.85
            ),
        ]

        imc = sum(l.severity for l in lies) / len(lies) if lies else 0

        return ProtocolAudit(
            protocol_name="SWIFT MT103",
            protocol_type="Transferencia internacional cliente",
            raw_structure={"fields": fields, "parsed": structure},
            lies=lies,
            imc=round(imc, 3),
            huntington_alignment="Occidental — Bruselas (Bélgica) es el centro de gravedad SWIFT. Las sanciones son actos de guerra civilizacional por otros medios.",
            ontological_truth="SWIFT no transfiere dinero. SWIFT transfiere PERMISO. El dinero se mueve por cuentas corresponsales. SWIFT solo dice 'este mensaje es válido'. Pero decidir qué es válido es decidir qué EXISTE en el sistema financiero. Eso es poder ontológico puro."
        )

    # ─── UnionPay QR ──────────────────────────────────────────

    def audit_unionpay_qr(self, qr_url: str = None) -> ProtocolAudit:
        """Audita un QR de UnionPay (qr.95516.com)."""
        structure = {
            "domain": "qr.95516.com",
            "endpoint": "/pay",
            "params": ["id", "m", "a", "c", "t", "s"],
        }

        if qr_url:
            parsed = {}
            for p in structure["params"]:
                m = re.search(rf'{p}=([^&]+)', qr_url)
                if m: parsed[p] = m.group(1)
            structure["parsed"] = parsed

        lies = [
            ProtocolLie(
                claim="UnionPay QR es un estándar de pago técnico como cualquier otro",
                reality="UnionPay QR es la respuesta confuciana al dominio occidental de Visa/Mastercard. Cada código QR contiene un ID de comerciante (m=) emitido por el Estado chino. La confianza no es descentralizada: es jerárquica y estatal. El QR no es solo tecnología; es un vector de influencia civilizacional que sigue la Belt and Road Initiative.",
                game="sprachspiel (Wittgenstein): 'pago' significa algo diferente en el contexto confuciano — no es un contrato entre iguales, es una relación de confianza mediada por el Estado",
                civilization=Civilization.CONFUCIAN,
                severity=0.78
            ),
            ProtocolLie(
                claim="El parámetro 'c=CNY' solo indica la moneda",
                reality="Cada transacción en CNY que pasa por UnionPay refuerza la internacionalización del renminbi. No es solo 'moneda': es una apuesta civilizacional por desplazar al dólar como reserva global. El CNY en UnionPay es un caballo de Troya monetario.",
                game="semiosis (Peirce): 'CNY' es un signo que apunta a un objeto (la moneda) cuyo interpretante final es 'soberanía financiera china'",
                civilization=Civilization.CONFUCIAN,
                severity=0.71
            ),
            ProtocolLie(
                claim="qr.95516.com es un dominio técnico como cualquier otro",
                reality="95516 es el prefijo de UnionPay. Terminación 6 = suerte en numerología china. El dominio mismo es un acto civilizacional: los números no son aleatorios, codifican valores culturales confucianos en la infraestructura financiera.",
                game="differance (Derrida): el dominio difiere su significado — parece técnico pero aplaza el sentido hacia lo cultural",
                civilization=Civilization.CONFUCIAN,
                severity=0.55
            ),
        ]

        imc = sum(l.severity for l in lies) / len(lies) if lies else 0

        return ProtocolAudit(
            protocol_name="UnionPay QR (qr.95516.com)",
            protocol_type="Pago QR — Red de confianza estatal china",
            raw_structure=structure,
            lies=lies,
            imc=round(imc, 3),
            huntington_alignment="Confuciana (Sínica) — China construye su propia arquitectura financiera global. Donde Occidente usó cañoneras, China usa QR codes.",
            ontological_truth="UnionPay QR no es un código de barras. Es un certificado de existencia en la esfera financiera confuciana. Escanearlo es solicitar PERMISO al Estado chino para que tu transacción EXISTA en su red. La confianza no se negocia: se otorga."
        )

    # ─── CLABE ────────────────────────────────────────────────

    def audit_clabe(self, clabe: str = None) -> ProtocolAudit:
        """Audita la CLABE mexicana (18 dígitos)."""
        structure = {
            "total_length": 18,
            "bank_code": "dígitos 1-3 (ej: 012 = BBVA)",
            "plaza_code": "dígitos 4-6",
            "account": "dígitos 7-17 (11 dígitos)",
            "check_digit": "dígito 18 (módulo 10, pesos 3-7-1...)",
        }

        validated = False
        parsed = {}
        if clabe and len(clabe) == 18 and clabe.isdigit():
            pesos = [3,7,1,3,7,1,3,7,1,3,7,1,3,7,1,3,7]
            suma = sum(int(d)*p for d,p in zip(clabe[:17], pesos))
            mod = suma % 10
            dv_calc = 0 if mod == 0 else 10 - mod
            validated = dv_calc == int(clabe[17])
            parsed = {"bank": clabe[:3], "plaza": clabe[3:6], "account": clabe[6:17], "dv": clabe[17], "dv_calc": str(dv_calc), "valid": validated}

        lies = [
            ProtocolLie(
                claim="La CLABE es solo un identificador numérico de cuenta",
                reality="La CLABE es el documento de identidad financiero de MÉXICO ante el mundo. 18 dígitos que dicen: existo en el sistema bancario global. Sin CLABE, eres invisible para SWIFT, SPEI, y cualquier transferencia internacional. La CLABE no es un número: es un certificado de SER financiero.",
                game="sprachspiel (Wittgenstein): en el contexto mexicano, 'CLABE' significa 'pertenezco a la red financiera global'",
                civilization=Civilization.LATIN_AMERICAN,
                severity=0.35
            ),
            ProtocolLie(
                claim="El dígito verificador (módulo 10) es solo matemática",
                reality="El módulo 10 es un rito de paso. Si falla, la cuenta NO EXISTE para el sistema. Es un juicio ontológico disfrazado de álgebra: la matemática decide qué cuentas son reales y cuáles son errores. El algoritmo ES el guardián del ser financiero mexicano.",
                game="deep_structure (Chomsky): la gramática del módulo 10 genera la realidad financiera — cuentas válidas son las que pasan el test generativo",
                civilization=Civilization.LATIN_AMERICAN,
                severity=0.42
            ),
            ProtocolLie(
                claim="Los primeros 3 dígitos solo identifican el banco (012=BBVA, 014=Santander, 021=HSBC)",
                reality="Los primeros 3 dígitos revelan la COLONIZACIÓN BANCARIA de México: BBVA (español), Santander (español), HSBC (británico), Citibanamex (estadounidense). Los códigos bancarios mexicanos son un mapa de la influencia civilizacional extranjera. BBVA=012 es la huella digital de la Conquista en el sistema financiero.",
                game="semiosis (Peirce): '012' no solo denota BBVA — connota 500 años de relación asimétrica entre España y México",
                civilization=Civilization.LATIN_AMERICAN,
                severity=0.73
            ),
        ]

        imc = sum(l.severity for l in lies) / len(lies) if lies else 0

        return ProtocolAudit(
            protocol_name="CLABE (Clave Bancaria Estandarizada)",
            protocol_type="Identificador bancario mexicano — 18 dígitos",
            raw_structure={**structure, "parsed": parsed, "validated": validated},
            lies=lies,
            imc=round(imc, 3),
            huntington_alignment="Latinoamericana — México como puente ontológico. La CLABE no busca imponerse a otras civilizaciones: busca SER RECONOCIDA por ellas. Es el documento de identidad de un país periférico que pide permiso para existir en el sistema financiero global.",
            ontological_truth="La CLABE es humilde. No miente por ambición imperial — miente para SOBREVIVIR. Los primeros 3 dígitos son la herida colonial que nunca cerró. El módulo 10 es el guardián matemático que decide qué es real. La CLABE no domina: existe. Y en el sistema financiero global, existir ya es resistir."
        )

    # ─── COBOL ────────────────────────────────────────────────

    def audit_cobol(self) -> ProtocolAudit:
        """Audita COBOL como protocolo civilizacional."""
        lies = [
            ProtocolLie(
                claim="COBOL es un lenguaje de programación obsoleto que sobrevive por inercia técnica",
                reality="COBOL es el LATÍN del Imperio Financiero Occidental. Como el latín medieval, nadie lo habla como lengua materna, nadie escribe poesía en él, pero TODOS los ritos sagrados (transacciones) se ofician en COBOL. Su 'obsolescencia' es su poder: mientras más muerto parece, más indispensable es. COBOL no es un bug del sistema — ES el sistema.",
                game="sprachspiel (Wittgenstein): 'obsoleto' en el contexto financiero no significa 'inútil' — significa 'tan fundamental que ya no se cuestiona'",
                civilization=Civilization.WESTERN,
                severity=0.95
            ),
            ProtocolLie(
                claim="La sintaxis de COBOL (DIVISION, SECTION, 88-LEVEL) es solo estructura de programa",
                reality="La estructura de COBOL es una COSMOLOGÍA. IDENTIFICATION DIVISION = Génesis (nombrar el ser). ENVIRONMENT DIVISION = Cosmología (dónde existe). DATA DIVISION = Ontología (qué entidades pueblan este mundo). PROCEDURE DIVISION = Teleología (hacia dónde va). Los 88-LEVEL son JUICIOS ONTOLÓGICOS: '88 BALANCE-OK VALUE \"Y\"' decide qué es verdadero y qué no en el universo financiero.",
                game="deep_structure (Chomsky): la gramática COBOL no solo describe transacciones — las GENERA. Cada programa COBOL es una máquina de crear realidad financiera",
                civilization=Civilization.WESTERN,
                severity=0.88
            ),
            ProtocolLie(
                claim="COBOL es neutral — puede correr en cualquier sistema",
                reality="COBOL corre en mainframes IBM Z. IBM es estadounidense. La arquitectura mainframe es propiedad intelectual occidental. COBOL es 'abierto' en sintaxis pero PRIVATIVO en infraestructura. La independencia del lenguaje es una ilusión: sin un mainframe IBM (o emulador con licencia), COBOL no ejecuta. La libertad sintáctica esconde la dependencia material.",
                game="differance (Derrida): COBOL difiere su dependencia — parece independiente pero su ser real está aplazado en el hardware",
                civilization=Civilization.WESTERN,
                severity=0.81
            ),
        ]

        imc = sum(l.severity for l in lies) / len(lies) if lies else 0

        return ProtocolAudit(
            protocol_name="COBOL (Common Business-Oriented Language)",
            protocol_type="Lenguaje de mainframe — LATÍN financiero",
            raw_structure={"created": 1959, "designer": "Grace Hopper (US Navy)", "dominance": ">70% transacciones globales", "mainframe": "IBM Z Series", "syntax": "DIVISION/SECTION/PARAGRAPH/88-LEVEL"},
            lies=lies,
            imc=round(imc, 3),
            huntington_alignment="Occidental — COBOL es el código genético del Imperio. Nació en el Pentágono (DoD), creció en Wall Street, y hoy controla el 70%+ de las transacciones globales. Es el software que colonizó el tiempo: 65 años después, sigue decidiendo qué es dinero y qué no.",
            ontological_truth="COBOL no es un lenguaje. COBOL es un DIOS. Un dios viejo, olvidado, que ya nadie reza pero que sigue respondiendo plegarias. Cada transacción bancaria es una oración en COBOL. Mientras COBOL corra, el Imperio Occidental respira. El día que COBOL se apague, el sistema financiero global tendrá que preguntarse qué ES el dinero — y no sabrá responder."
        )

    # ─── Reporte completo ────────────────────────────────────

    def full_huntington_report(self) -> Dict[str, Any]:
        """Genera el reporte completo Huntington de todos los protocolos."""
        audits = [
            self.audit_swift_mt103(),
            self.audit_unionpay_qr(),
            self.audit_clabe("012290015202390246"),
            self.audit_cobol(),
        ]
        self.audits = audits

        # Ranking por IMC
        ranked = sorted(audits, key=lambda a: a.imc, reverse=True)

        # Guerra civilizacional: agrupar por civilización
        war_map = {}
        for a in audits:
            civ = a.huntington_alignment.split(" — ")[0] if " — " in a.huntington_alignment else "?"
            if civ not in war_map: war_map[civ] = []
            war_map[civ].append({"protocol": a.protocol_name, "imc": a.imc})

        return {
            "timestamp": datetime.now().isoformat(),
            "framework": "Samuel Huntington — Choque de Civilizaciones (1996)",
            "method": "Análisis ontológico de protocolos + juegos lingüísticos (Wittgenstein)",
            "total_protocols_audited": len(audits),
            "global_imc_average": round(sum(a.imc for a in audits) / len(audits), 3),
            "civilization_war_map": war_map,
            "ranked_by_deception": [
                {"protocol": a.protocol_name, "imc": a.imc, "lies_count": len(a.lies), "truth": a.ontological_truth[:200]}
                for a in ranked
            ],
            "protocols": [
                {
                    "name": a.protocol_name,
                    "type": a.protocol_type,
                    "imc": a.imc,
                    "lies": [{"claim": l.claim[:120], "reality": l.reality[:120], "game": l.game, "severity": l.severity} for l in a.lies],
                    "huntington": a.huntington_alignment,
                    "truth": a.ontological_truth,
                }
                for a in audits
            ],
        }


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

def main():
    auditor = ProtocolAuditor()
    report = auditor.full_huntington_report()

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  ◆ PROTOCOL AUDITOR — Huntington Truth Engine               ║
║  BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+           ║
╚══════════════════════════════════════════════════════════════╝
""")

    print(f"  IMC Global Promedio: {report['global_imc_average']:.3f}")
    print(f"  Protocolos auditados: {report['total_protocols_audited']}")
    print(f"\n  {'='*60}")

    for i, p in enumerate(report["ranked_by_deception"], 1):
        bar_len = int(p["imc"] * 20)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        print(f"\n  [{i}] {p['protocol']}")
        print(f"  IMC: [{bar}] {p['imc']:.3f}")
        print(f"  Mentiras detectadas: {p['lies_count']}")
        print(f"  Verdad ontológica: {p['truth'][:150]}...")

    print(f"\n  {'='*60}")
    print(f"\n  ◆ GUERRA CIVILIZACIONAL — MAPA DE PROTOCOLOS:")
    for civ, protocols in report["civilization_war_map"].items():
        print(f"\n  {civ}:")
        for p in protocols:
            print(f"    {p['protocol']} (IMC: {p['imc']:.3f})")

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  CONCLUSIÓN HUNTINGTONIANA                                   ║
║                                                              ║
║  COBOL es el latín del Imperio Occidental.                   ║
║  SWIFT es su sistema circulatorio (y su arma).               ║
║  UnionPay es la respuesta confuciana.                        ║
║  CLABE es el documento de identidad del puente latino.       ║
║                                                              ║
║  La guerra civilizacional NO se libra con tanques.           ║
║  Se libra en líneas de código, campos de mensaje,            ║
║  y dígitos verificadores que deciden qué EXISTE.             ║
║                                                              ║
║  Índice de Mentira Civilizacional (IMC):                     ║
║  COBOL (0.880) > SWIFT (0.813) > UnionPay (0.680)           ║
║  > CLABE (0.500)                                             ║
║                                                              ║
║  Los protocolos MIENTEN. No por maldad — por ONTOLOGÍA.     ║
║  Dicen ser técnica cuando son civilización en código.        ║
╚══════════════════════════════════════════════════════════════╝
""")

    # Guardar reporte
    out_path = os.path.join(os.path.dirname(__file__), "huntington_report.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"  Reporte guardado: {out_path}")


if __name__ == "__main__":
    main()
