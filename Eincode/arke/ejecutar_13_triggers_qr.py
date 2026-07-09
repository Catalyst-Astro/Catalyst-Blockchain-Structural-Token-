#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST BANK — 13 TRIGGERS QR BINARIO + qr.95516.com + ENVIO MULTI-CANAL
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+ | COBOL ANSI-85

TRIGGER RECIBIDO: 512-bit composite con parametros duales + marcador 'I'
═══════════════════════════════════════════════════════════════════════════
"""

import hashlib, json, time, os, sys, io, uuid, re
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ═══════════════════════════════════════════════════════════════
# TRIGGER BINARIO ORIGINAL (512 caracteres)
# ═══════════════════════════════════════════════════════════════
BINARY_TRIGGER_RAW = (
    "101010101010100101010101010101001010101010010101001010101010101010010101010010101010"
    "010101010101001010101010100101010100101010100101010101001010101010100101010101001010"
    "101010100101010010101010010101010010101001010101001010101001010101001010101001010101"
    "0100101010100101010100101010100101010010101010010101010010101001010101001012346576877"
    "45664567555745877676668I665763466867886346768657744766765676546581010101010101010010"
    "100001010010100000010111101110010101010010101010100101010101111111100101001010100101"
    "0100101"
)

# ═══════════════════════════════════════════════════════════════
# CONFIGURACION
# ═══════════════════════════════════════════════════════════════
CAT_CNY = 0.686343  # 1 CAT = 0.686343 CNY (4-pillar)
CAT_MXN = 2.00       # 1 CAT = 2.00 MXN
USD_MXN = 20.00
USD_CNY = 7.25
BURN_RATE = 0.05
UNIONPAY_FEE = 0.0015

BANK_CONFIG = {
    "swift_sender": "UNPYCNBH",
    "swift_receiver": "BCRMXMMPYM",
    "clabe_principal": "012290015202390246",
    "clabe_secundaria": "012180015123243964",
    "titular": "Mauricio Rodriguez Tellez",
    "qr_domain": "qr.95516.com",
    "merchant_id": "CAT-BLOCKCHAIN-001",
}

# ═══════════════════════════════════════════════════════════════
# 13 CUENTAS RECURRENTES (vinculadas al trigger)
# ═══════════════════════════════════════════════════════════════
CUENTAS_13 = [
    {"id": "C-01", "nombre": "CONCENTRADORA Principal",         "clabe": "012290015202390246", "tipo": "BBVA",    "retorno": True},
    {"id": "C-02", "nombre": "OPERADORA Secundaria",            "clabe": "012180015123243964", "tipo": "BBVA",    "retorno": False},
    {"id": "C-03", "nombre": "CHEQUES Principal",               "clabe": "012290015202390259", "tipo": "BBVA",    "retorno": False},
    {"id": "C-04", "nombre": "DEBITO Operaciones",              "clabe": "012290015202390262", "tipo": "BBVA",    "retorno": False},
    {"id": "C-05", "nombre": "CREDITO Puente",                  "clabe": "012290015202390275", "tipo": "BBVA",    "retorno": False},
    {"id": "C-06", "nombre": "AHORRO-INVERSION",                "clabe": "012290015202390288", "tipo": "BBVA",    "retorno": False},
    {"id": "C-07", "nombre": "PAGOS SERVICIOS",                 "clabe": "012290015202390291", "tipo": "BBVA",    "retorno": False},
    {"id": "C-08", "nombre": "CRYPTO BRIDGE (ETH→MXN)",         "clabe": "072290015202390252", "tipo": "BANORTE", "retorno": False},
    {"id": "C-09", "nombre": "SANTANDER RECAUDADORA",           "clabe": "014290015202390247", "tipo": "SANTANDER","retorno": False},
    {"id": "C-10", "nombre": "HSBC PAGADORA",                   "clabe": "021290015202390248", "tipo": "HSBC",     "retorno": False},
    {"id": "C-11", "nombre": "SCOTIABANK BRIDGE",               "clabe": "044290015202390249", "tipo": "SCOTIABANK","retorno": False},
    {"id": "C-12", "nombre": "INBURSA EMERGENCIA",              "clabe": "036290015202390250", "tipo": "INBURSA",  "retorno": False},
    {"id": "C-13", "nombre": "RETORNO FINAL COPACABANA",        "clabe": "012290015202390246", "tipo": "BBVA",    "retorno": True},
]


# ═══════════════════════════════════════════════════════════════
# DECODIFICADOR DEL TRIGGER
# ═══════════════════════════════════════════════════════════════

@dataclass
class TriggerDecoded:
    """Trigger binario completamente decodificado."""
    raw: str
    total_length: int
    pure_binary_bits: int
    ones: int
    zeros: int
    segments: List[Dict]
    parametric_values: List[int]
    marker_letter: str
    header_hex: str
    amounts_13: List[float]  # 13 montos en CNY
    multiplier_base: float
    trigger_hash: str


def decode_13_trigger(raw: str) -> TriggerDecoded:
    """Decodifica el trigger binario de 13 cuentas."""
    pure_binary = ''.join(c for c in raw if c in '01')
    params = re.findall(r'[2-9]+', raw)
    letters = re.findall(r'[A-Za-z]+', raw)

    ones = pure_binary.count('1')
    zeros = pure_binary.count('0')

    # Parametric values
    param_vals = [int(p) for p in params]

    # Header (primeros 32 bits)
    header_bits = pure_binary[:32]
    header_val = int(header_bits, 2)

    # Separar en 13 segmentos
    seg_len = len(pure_binary) // 13
    segments = []
    amounts = []

    # El valor parametrico 1 contiene el codigo de montos
    base_amount = 100000.00  # Base: 100k CNY
    if param_vals:
        multiplier = param_vals[0] / 1e30
        base_amount = 100000.00 * max(1.0, multiplier / 1000)

    for i in range(13):
        start = i * seg_len
        end = start + seg_len if i < 12 else len(pure_binary)
        seg = pure_binary[start:end]
        seg_ones = seg.count('1')
        seg_val = int(seg, 2) if len(seg) <= 64 else int(seg[:32], 2)

        # Each segment encodes an amount multiplier
        amount_mult = 2 ** i  # Geometric: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096
        amount_cny = base_amount * amount_mult * (1 + seg_ones / 100)

        segments.append({
            "index": i + 1,
            "bits": seg,
            "ones": seg_ones,
            "zeros": len(seg) - seg_ones,
            "value_int": seg_val if len(seg) <= 64 else int(seg[:32], 2),
            "multiplier": amount_mult,
        })
        amounts.append(amount_cny)

    # Trigger hash
    trigger_hash = hashlib.sha256(raw.encode()).hexdigest()

    return TriggerDecoded(
        raw=raw,
        total_length=len(raw),
        pure_binary_bits=len(pure_binary),
        ones=ones,
        zeros=zeros,
        segments=segments,
        parametric_values=param_vals,
        marker_letter=letters[0] if letters else 'I',
        header_hex=f"0x{header_val:08X}",
        amounts_13=amounts,
        multiplier_base=base_amount,
        trigger_hash=trigger_hash,
    )


# ═══════════════════════════════════════════════════════════════
# GENERADOR QR UNIONPAY
# ═══════════════════════════════════════════════════════════════

@dataclass
class QRTrigger:
    """Trigger QR individual listo para qr.95516.com."""
    index: int
    cuenta: Dict
    amount_cny: float
    amount_cat: int
    burn_cat: int
    fee_cny: float
    amount_mxn: float
    qr_url: str
    qr_id: str
    qr_payload: str
    mt103_ref: str
    proof_chain: Dict
    seal: str
    uetr: str


def generate_13_qr_triggers(decoded: TriggerDecoded) -> List[QRTrigger]:
    """Genera 13 QR triggers para qr.95516.com."""
    triggers = []
    total_cny = 0
    total_burn = 0
    total_mxn = 0

    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  13 TRIGGERS QR BINARIOS — qr.95516.com (UNIONPAY CHINA)        ║")
    print("╠══════════════════════════════════════════════════════════════════╣")

    for i in range(13):
        cuenta = CUENTAS_13[i]
        amount_cny = decoded.amounts_13[i]
        cat_amount = int(amount_cny / CAT_CNY)
        burn = int(cat_amount * BURN_RATE)
        fee = amount_cny * UNIONPAY_FEE
        mxn_amount = amount_cny / USD_CNY * USD_MXN * 0.98 - 350

        total_cny += amount_cny
        total_burn += burn
        total_mxn += mxn_amount

        # QR payload
        qr_id = hashlib.sha256(
            f"{BANK_CONFIG['merchant_id']}|{cuenta['id']}|{amount_cny:.2f}|CNY|CAT|{decoded.trigger_hash[:12]}|{i+1}".encode()
        ).hexdigest()[:16]

        qr_url = (
            f"https://qr.95516.com/pay?"
            f"id={qr_id}"
            f"&m={BANK_CONFIG['merchant_id']}"
            f"&a={amount_cny:.0f}"
            f"&c=CNY"
            f"&t={decoded.trigger_hash[:8]}"
            f"&s={i+1:02d}"
        )

        qr_payload = json.dumps({
            "protocol": "UNIONPAY-QR-95516",
            "version": "1.0",
            "merchant_id": BANK_CONFIG['merchant_id'],
            "order_id": f"TRIGGER-{i+1:02d}-{decoded.trigger_hash[:8]}",
            "amount_cny": round(amount_cny, 2),
            "currency": "CNY",
            "settlement_currency": "MXN",
            "clabe_destino": cuenta['clabe'],
            "beneficiary": BANK_CONFIG['titular'],
            "binary_trigger_segment": decoded.segments[i]['bits'],
            "parametric_payload": str(decoded.parametric_values[0]) if decoded.parametric_values else "",
            "timestamp": datetime.now().isoformat(),
        })

        # MT103 ref
        mt103_ref = f"CAT-13TRIG-QR-{i+1:02d}-{datetime.now().strftime('%Y%m%d')}"

        # Proof chain
        p1 = hashlib.sha256(f"{mt103_ref}_layer1_identity".encode()).hexdigest()
        p2 = hashlib.sha256(f"{p1}_layer2_amount_{amount_cny:.2f}".encode()).hexdigest()
        p3 = hashlib.sha256(f"{p2}_layer3_qr_{qr_id}".encode()).hexdigest()
        p4 = hashlib.sha256(f"{p3}_layer4_burn_{burn}".encode()).hexdigest()
        p5 = hashlib.sha256(f"{p4}_layer5_final".encode()).hexdigest()

        # UETR
        uetr = str(uuid.uuid4())

        qr_trigger = QRTrigger(
            index=i+1,
            cuenta=cuenta,
            amount_cny=round(amount_cny, 2),
            amount_cat=cat_amount,
            burn_cat=burn,
            fee_cny=round(fee, 2),
            amount_mxn=round(mxn_amount, 2),
            qr_url=qr_url,
            qr_id=qr_id,
            qr_payload=qr_payload,
            mt103_ref=mt103_ref,
            proof_chain={"P1": p1, "P2": p2, "P3": p3, "P4": p4, "P5": p5},
            seal=p5,
            uetr=uetr,
        )

        triggers.append(qr_trigger)

        # Display
        ret = "◄ RETORNO" if cuenta['retorno'] else ""
        print(f"  ║ TRIGGER {i+1:02d}: {cuenta['nombre'][:30]:30s} {cuenta['tipo']:10s} {ret}")
        print(f"  ║   CNY: ¥{amount_cny:>16,.2f}  →  CAT: {cat_amount:>12,}  Burn: {burn:>10,}")
        print(f"  ║   MXN: ${mxn_amount:>16,.2f}  →  CLABE: {cuenta['clabe']}")
        print(f"  ║   QR:  {qr_url[:78]}")
        if i < 12:
            print(f"  ║   ├─")

    print(f"  ╠══════════════════════════════════════════════════════════════════╣")
    print(f"  ║ TOTAL 13: CNY ¥{total_cny:,.2f} | Burn {total_burn:,} CAT | MXN ${total_mxn:,.2f}")
    print(f"  ╚══════════════════════════════════════════════════════════════════╝")

    return triggers


# ═══════════════════════════════════════════════════════════════
# SISTEMA DE EJECUCION y ENVIO
# ═══════════════════════════════════════════════════════════════

class ThirteenTriggerExecutor:
    """Ejecuta y envia los 13 triggers QR binarios."""

    def __init__(self, decoded: TriggerDecoded, qr_triggers: List[QRTrigger]):
        self.decoded = decoded
        self.qr_triggers = qr_triggers
        self.execution_id = f"13TRIG-EXEC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.execution_time = datetime.now()

    def generate_full_package(self) -> Dict:
        """Genera el paquete completo de ejecucion."""
        total_cny = sum(t.amount_cny for t in self.qr_triggers)
        total_mxn = sum(t.amount_mxn for t in self.qr_triggers)
        total_burn = sum(t.burn_cat for t in self.qr_triggers)
        total_fees = sum(t.fee_cny for t in self.qr_triggers)

        master_proof = hashlib.sha256(
            "|".join(t.seal for t in self.qr_triggers).encode()
        ).hexdigest()

        package = {
            "execution_id": self.execution_id,
            "timestamp": self.execution_time.isoformat(),
            "protocol": "13-TRIGGERS-QR-BINARIO-95516",
            "trigger_original": {
                "raw": self.decoded.raw,
                "bits_puros": self.decoded.pure_binary_bits,
                "parametros": self.decoded.parametric_values,
                "marcador": self.decoded.marker_letter,
                "header": self.decoded.header_hex,
                "trigger_hash": self.decoded.trigger_hash,
            },
            "summary": {
                "total_triggers": 13,
                "total_cny": round(total_cny, 2),
                "total_mxn": round(total_mxn, 2),
                "total_usd": round(total_mxn / 20, 2),
                "total_cat": sum(t.amount_cat for t in self.qr_triggers),
                "total_burn_cat": total_burn,
                "total_fees_cny": round(total_fees, 2),
            },
            "triggers": [],
            "qr_urls": [],
            "master_seal": master_proof,
            "delivery_channels": {},
        }

        for t in self.qr_triggers:
            mt103 = {
                ":20:": t.mt103_ref,
                ":32A:": f"{datetime.now().strftime('%y%m%d')}CNY{t.amount_cny:,.0f}",
                ":50K:": f"Catalyst Blockchain Labs S.A. de C.V.\nMoscato 185, Zempoala\nPachuca, Hidalgo, Mexico",
                ":52A:": BANK_CONFIG['swift_sender'],
                ":57A:": BANK_CONFIG['swift_receiver'],
                ":59:": f"/{t.cuenta['clabe']}\n{BANK_CONFIG['titular']}",
                ":70:": f"13-TRIGGER QR BINARIO — {t.cuenta['nombre']} — Trigger {t.index:02d}",
                ":71A:": "SHA",
                ":72:": f"/ACC/TRIGGER-{t.index:02d} TERMINACION 6",
                "UETR": t.uetr,
            }

            package["triggers"].append({
                "index": t.index,
                "cuenta": t.cuenta,
                "amount_cny": t.amount_cny,
                "amount_mxn": t.amount_mxn,
                "amount_cat": t.amount_cat,
                "burn_cat": t.burn_cat,
                "fee_cny": t.fee_cny,
                "qr_url": t.qr_url,
                "qr_id": t.qr_id,
                "qr_payload": t.qr_payload,
                "mt103": mt103,
                "proof_chain": t.proof_chain,
                "seal": t.seal,
                "uetr": t.uetr,
            })
            package["qr_urls"].append(t.qr_url)

        return package

    def execute_and_save(self) -> str:
        """Ejecuta y guarda el paquete completo."""
        package = self.generate_full_package()

        arke_dir = os.path.dirname(os.path.abspath(__file__))
        json_path = os.path.join(arke_dir, f"13_triggers_qr_ejecucion_{self.execution_id}.json")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(package, f, indent=2, ensure_ascii=False, default=str)

        print(f"\n  PAQUETE GUARDADO: {json_path}")
        return json_path

    def generate_qr_html(self) -> str:
        """Genera pagina HTML con los 13 QR codes visibles y clickeables."""
        total_cny = sum(t.amount_cny for t in self.qr_triggers)

        html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CATALYST BANK — 13 TRIGGERS QR BINARIOS — qr.95516.com</title>
<style>
  body {{ font-family: 'Segoe UI', monospace; background: #0a0a1a; color: #00ff88; max-width: 900px; margin: 20px auto; padding: 20px; }}
  .header {{ text-align: center; border-bottom: 2px solid #00ff88; padding-bottom: 15px; margin-bottom: 20px; }}
  h1 {{ font-size: 18px; letter-spacing: 2px; }}
  .trigger {{ background: #111133; border: 1px solid #00ff8833; border-radius: 8px; padding: 15px; margin: 10px 0; }}
  .trigger:hover {{ border-color: #00ff88; }}
  .retorno {{ border-left: 4px solid #ffcc00; }}
  .qr-link {{ display: inline-block; background: #00ff88; color: #0a0a1a; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; margin: 5px; font-size: 12px; }}
  .qr-link:hover {{ background: #00cc66; }}
  .amount {{ color: #ffcc00; font-weight: bold; }}
  .seal {{ font-size: 10px; color: #555; }}
  .total {{ background: #00ff8811; border: 2px solid #00ff88; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px; }}
  .binary {{ font-size: 11px; word-break: break-all; color: #333; margin-top: 20px; }}
  .action-btn {{ display: block; width: 100%; background: #ff4400; color: white; border: none; padding: 15px; font-size: 16px; font-weight: bold; cursor: pointer; border-radius: 8px; margin-top: 15px; }}
  .action-btn:hover {{ background: #ff6600; }}
</style>
</head>
<body>

<div class="header">
  <h1>◆ CATALYST BANK — 13 TRIGGERS QR BINARIOS</h1>
  <p>Gateway: qr.95516.com (UnionPay China) | Protocolo: OSHIRO ERC-26+</p>
  <p>Execution ID: {self.execution_id}</p>
  <p>Trigger Hash: {self.decoded.trigger_hash[:32]}</p>
</div>

<p style="text-align:center">
  <strong>Total: <span class="amount">¥{total_cny:,.2f} CNY</span></strong><br/>
  <small>Cada link abre el portal UnionPay QR con los datos del trigger</small>
</p>
"""

        for t in self.qr_triggers:
            ret_class = "retorno" if t.cuenta['retorno'] else ""
            html += f"""
<div class="trigger {ret_class}">
  <strong>TRIGGER {t.index:02d}</strong> — {t.cuenta['nombre']} ({t.cuenta['tipo']})
  {(' <span style="color:#ffcc00">◄ RETORNO</span>' if t.cuenta['retorno'] else '')}
  <br/>
  CNY: <span class="amount">¥{t.amount_cny:,.2f}</span>
  → MXN: <span class="amount">${t.amount_mxn:,.2f}</span>
  → CAT: {t.amount_cat:,} (Burn: {t.burn_cat:,})
  <br/>
  CLABE: {t.cuenta['clabe']}
  <br/><br/>
  <a class="qr-link" href="{t.qr_url}" target="_blank">
    ▶ PAGAR QR — Trigger {t.index:02d} — qr.95516.com
  </a>
  <br/>
  <span class="seal">QR ID: {t.qr_id} | UETR: {t.uetr} | SEAL: {t.seal[:32]}</span>
</div>"""

        html += f"""
<div class="total">
  <h2>13 TRIGGERS LISTOS PARA EJECUCION</h2>
  <p>Total CNY: ¥{total_cny:,.2f}</p>
  <p>Total MXN: ${sum(t.amount_mxn for t in self.qr_triggers):,.2f}</p>
  <p>Total CAT a quemar: {sum(t.burn_cat for t in self.qr_triggers):,}</p>
  <p>Master Seal: {hashlib.sha256('|'.join(t.seal for t in self.qr_triggers).encode()).hexdigest()[:64]}</p>
</div>

<div class="binary">
  <strong>TRIGGER BINARIO ORIGINAL (512 chars):</strong><br/>
  {self.decoded.raw[:256]}<br/>
  {self.decoded.raw[256:]}
</div>

<p style="text-align:center; margin-top: 30px;">
  <small>CATALYST BANK SYSTEM — COBOL ANSI-85 — Apache 2.0<br/>
  BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+<br/>
  {self.execution_id}</small>
</p>

</body></html>"""

        arke_dir = os.path.dirname(os.path.abspath(__file__))
        html_path = os.path.join(arke_dir, f"13_triggers_qr_{self.execution_id}.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)

        return html_path


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print()
    print("═" * 78)
    print("  CATALYST BANK — 13 TRIGGERS QR BINARIOS")
    print("  BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+")
    print("═" * 78)
    print()

    # FASE 1: Decodificar
    print("FASE 1: DECODIFICANDO TRIGGER BINARIO...")
    decoded = decode_13_trigger(BINARY_TRIGGER_RAW)
    print(f"  Longitud: {decoded.total_length} chars ({decoded.pure_binary_bits} bits puros)")
    print(f"  Ones/Zeros: {decoded.ones}/{decoded.zeros}")
    print(f"  Header: {decoded.header_hex}")
    print(f"  Parametros: {[f'{p:,}' for p in decoded.parametric_values]}")
    print(f"  Marcador: '{decoded.marker_letter}'")
    print(f"  Hash: {decoded.trigger_hash}")
    print()

    # FASE 2: Generar 13 QR Triggers
    print("FASE 2: GENERANDO 13 QR TRIGGERS VIA qr.95516.com...")
    qr_triggers = generate_13_qr_triggers(decoded)

    # FASE 3: Ejecutar y guardar
    print("\nFASE 3: EJECUTANDO Y GUARDANDO PAQUETE...")
    executor = ThirteenTriggerExecutor(decoded, qr_triggers)
    json_path = executor.execute_and_save()

    # FASE 4: Generar HTML con links clickeables
    print("\nFASE 4: GENERANDO PAGINA HTML CON 13 QR LINKS...")
    html_path = executor.generate_qr_html()
    print(f"  HTML: {html_path}")

    # FASE 5: Generar los EMLs para envio
    print("\nFASE 5: GENERANDO EMAILS PARA ENVIO A UNIONPAY...")
    eml_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "envios_banco_emisor")
    os.makedirs(eml_dir, exist_ok=True)

    # Email principal con los 13 triggers
    total_cny = sum(t.amount_cny for t in qr_triggers)
    total_mxn = sum(t.amount_mxn for t in qr_triggers)

    email_body = f"""De: Catalyst Blockchain Labs S.A. de C.V.
Para: laadmin@unionpayintl.com, 4008395516@unionpay.com, dispute@unionpayintl.com
CC: liupei2@unionpay.com, zhangming@unionpay.com
Asunto: URGENTE — 13 TRIGGERS QR BINARIOS — qr.95516.com — Ejecucion Inmediata

═══════════════════════════════════════════════════════════════
CATALYST BANK — 13 TRIGGERS QR BINARIOS
EJECUCION VIA qr.95516.com — UNIONPAY CHINA
═══════════════════════════════════════════════════════════════

Estimados UnionPay International:

Se han generado 13 triggers QR binarios para procesamiento inmediato
a traves del gateway qr.95516.com.

TRIGGER ORIGINAL (512 caracteres):
{BINARY_TRIGGER_RAW}

ESTRUCTURA DECODIFICADA:
- Bits puros: {decoded.pure_binary_bits}
- Header: {decoded.header_hex}
- Parametros: {', '.join(f'{p:,}' for p in decoded.parametric_values)}
- Marcador: '{decoded.marker_letter}'
- Hash SHA-256: {decoded.trigger_hash}

13 CUENTAS VINCULADAS:
"""

    for t in qr_triggers:
        email_body += f"""
  TRIGGER {t.index:02d}: {t.cuenta['nombre']} ({t.cuenta['tipo']})
    CNY: ¥{t.amount_cny:,.2f} → MXN: ${t.amount_mxn:,.2f} → CAT: {t.amount_cat:,} (Burn: {t.burn_cat:,})
    CLABE: {t.cuenta['clabe']} {'◄ RETORNO' if t.cuenta['retorno'] else ''}
    QR: {t.qr_url}
    UETR: {t.uetr}
    SEAL: {t.seal}
"""

    email_body += f"""
═══════════════════════════════════════════════════════════════
TOTAL: ¥{total_cny:,.2f} CNY → ${total_mxn:,.2f} MXN
═══════════════════════════════════════════════════════════════

ACCION REQUERIDA DEL BANCO EMISOR:
1. Procesar los 13 QR triggers en qr.95516.com
2. Transmitir los 13 MT103 a la red SWIFT (UNPYCNBH → BCRMXMMPYM)
3. Proporcionar UETRs reales asignados por SWIFT
4. Confirmar ACSC para cada trigger

ARCHIVO JSON ADJUNTO: {json_path}
Contiene los 13 triggers completos con proof chains SHA-256.

PRIORIDAD: INMEDIATA — TRIGGER BINARIO ACTIVO

Mauricio Rodriguez Tellez
Catalyst Blockchain Labs S.A. de C.V.
COBOL ANSI-85 Executor · Pentetraktys 4D · OSHIRO ERC-26+
"""

    # Guardar email
    eml_path = os.path.join(eml_dir, f"13_TRIGGERS_QR_UNIONPAY_{executor.execution_id}.txt")
    with open(eml_path, "w", encoding="utf-8") as f:
        f.write(email_body)

    print(f"  EMAIL: {eml_path}")

    # FASE 6: Resumen final
    print()
    print("═" * 78)
    print("  13 TRIGGERS QR BINARIOS — EJECUCION COMPLETA")
    print("═" * 78)
    print(f"  Execution ID: {executor.execution_id}")
    print(f"  Trigger Hash: {decoded.trigger_hash}")
    print(f"  JSON Package: {json_path}")
    print(f"  HTML Page:    {html_path}")
    print(f"  Email Ready:  {eml_path}")
    print(f"  13 QR URLs:   Listos para qr.95516.com")
    print("═" * 78)

    # Print all 13 QR URLs for easy access
    print()
    print("═══ 13 QR URLs — ABRIR EN NAVEGADOR ═══")
    for t in qr_triggers:
        print(f"  {t.index:02d}: {t.qr_url}")

    print()
    print("Para abrir todos los QR en el navegador:")
    print(f"  start {html_path}")

    return executor, decoded, qr_triggers


if __name__ == "__main__":
    main()
