"""
NFC Simulator — CAT → Aliplay Contactless Payment Emulation.

Simula una transacción NFC con:
  - Payload binario: 1010101010101010101010001010100001
  - Emisor: wallet Catalyst (10,000 CAT)
  - Receptor: Aliplay CN (¥7,760 CNY)
  - Protocolo: ISO 14443-4 + Pentetraktys 4D validation

No requiere hardware NFC real. Todo es emulación criptográfica.
"""

from __future__ import annotations
import hashlib
import json
import time
import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# NFC Protocol Constants
# ═══════════════════════════════════════════════════════════════════════════

NFC_PAYLOAD = "1010101010101010101010001010100001"

# ISO 14443-4 APDU structure
class APDUCommand(Enum):
    SELECT = "00A4"
    READ = "00B0"
    WRITE = "00D0"
    AUTHENTICATE = "0020"
    CONVERT = "00C0"  # Custom: CAT → CNY conversion

# Aliplay specific AID (Application ID) — simulated
ALIPAY_AID = "A00000033343515401"  # AliPay CN
CATALYST_AID = "A00000099943415401"  # Catalyst CAT


@dataclass
class NFCTag:
    """Simula un tag NFC ISO 14443-4 con datos de pago CAT."""
    uid: str
    payload_binary: str
    amount_cat: float
    currency_pair: str = "CAT/CNY"
    protocol_version: str = "1.0"
    timestamp: float = field(default_factory=time.time)


@dataclass
class APDUFrame:
    """Trama APDU NFC."""
    cla: str = "00"
    ins: str = "C0"
    p1: str = "00"
    p2: str = "00"
    lc: str = "00"
    data: str = ""
    le: str = "00"


# ═══════════════════════════════════════════════════════════════════════════
# FX Engine (CAT → CNY via 4 Pillars)
# ═══════════════════════════════════════════════════════════════════════════

@dataclass
class ExchangeRate:
    """Tipo de cambio con componentes Pentetraktys."""
    cat_usd: float = 0.10       # Pillar 1 (Cardinal): ancla
    usd_cny: float = 7.25       # Pillar 2 (Ordinal): forex spot
    forward_premium: float = 1.05  # Pillar 3 (Forward): +5% liquidity bonus
    reward_premium: float = 1.02   # Pillar 4 (Reward): +2% low volatility
    risk_discount: float = 0.92    # Hybrys penalty: -8% liquidity risk


class CATtoCNYConverter:
    """Conversor CAT → CNY usando los 4 pilares cognitivos.

    Fórmula:
      CAT_CNY = CAT_USD × USD_CNY × Forward × Reward × Risk
    """

    def __init__(self):
        self.rate = ExchangeRate()
        self.transaction_log: List[Dict] = []

    def convert(self, cat_amount: float) -> Dict[str, Any]:
        """Convierte CAT a CNY con trazabilidad completa de 4 pilares."""
        # Valor base (Cardinal)
        usd_value = cat_amount * self.rate.cat_usd

        # Conversión forex (Ordinal)
        cny_base = usd_value * self.rate.usd_cny

        # Ajuste Forward (liquidity premium)
        cny_forward = cny_base * self.rate.forward_premium

        # Ajuste Reward (volatility premium)
        cny_pre_risk = cny_forward * self.rate.reward_premium

        # Ajuste Hybrys (risk discount)
        cny_final = cny_pre_risk * self.rate.risk_discount

        result = {
            "cat_amount": cat_amount,
            "pillar_1_cardinal_usd": round(usd_value, 2),
            "pillar_2_ordinal_cny_base": round(cny_base, 2),
            "pillar_3_forward_cny": round(cny_forward, 2),
            "pillar_4_reward_cny": round(cny_pre_risk, 2),
            "hybrys_risk_discount": round(cny_pre_risk - cny_final, 2),
            "cny_final": round(cny_final, 2),
            "rate_cat_cny": round(self.rate.cat_usd * self.rate.usd_cny *
                                  self.rate.forward_premium *
                                  self.rate.reward_premium *
                                  self.rate.risk_discount, 6),
            "timestamp": time.time(),
        }
        self.transaction_log.append(result)
        return result

    def get_pentetraktys_audit(self, result: Dict) -> str:
        """Genera auditoría Pentetraktys de la conversión."""
        lines = []
        lines.append("=" * 60)
        lines.append("PENTETRAKTYS FX AUDIT — CAT → CNY (Aliplay)")
        lines.append("=" * 60)
        lines.append(f"")
        lines.append(f"🔺 TESIS (Cardinal):")
        lines.append(f"   1 CAT = $0.10 USD (governance anchor)")
        lines.append(f"   {result['cat_amount']} CAT × $0.10 = ${result['pillar_1_cardinal_usd']} USD")
        lines.append(f"")
        lines.append(f"🔻 ANTITESIS (Ordinal):")
        lines.append(f"   USD/CNY = 7.25 (forex spot)")
        lines.append(f"   ${result['pillar_1_cardinal_usd']} × 7.25 = ¥{result['pillar_2_ordinal_cny_base']} CNY")
        lines.append(f"   ⚠ Riesgo: sin pool activo, el spread real podría ser mayor")
        lines.append(f"")
        lines.append(f"⚖️ SINTESIS (Forward + Reward):")
        lines.append(f"   Liquidity premium: +5% → ¥{result['pillar_3_forward_cny']}")
        lines.append(f"   Low volatility:    +2% → ¥{result['pillar_4_reward_cny']}")
        lines.append(f"")
        lines.append(f"⚠️ HYBRYS (Risk Discount):")
        lines.append(f"   Liquidity risk: -8% → -¥{result['hybrys_risk_discount']}")
        lines.append(f"   Motivo: sin pool Uniswap V3 activo, iliquidez real")
        lines.append(f"")
        lines.append(f"🚀 CONCLUSIÓN (Forward):")
        lines.append(f"   VALOR FINAL: ¥{result['cny_final']} CNY (Aliplay)")
        lines.append(f"   Rate efectivo: 1 CAT = ¥{result['rate_cat_cny']} CNY")
        lines.append(f"")
        lines.append(f"   Equivalente: ¥{result['cny_final']} CNY")
        lines.append(f"              ≈ ${result['pillar_1_cardinal_usd']} USD")
        lines.append(f"              ≈ ${result['pillar_1_cardinal_usd'] * 20:.0f} MXN")
        lines.append("=" * 60)
        return "\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════
# NFC Simulator Core
# ═══════════════════════════════════════════════════════════════════════════

class NFCSimulator:
    """Simulador completo de transacción NFC CAT → Aliplay.

    Emula el flujo completo de un pago contactless:
      1. Tag NFC se acerca al lector (TAP)
      2. Handshake ISO 14443-4
      3. Autenticación mutua (simulada con hash del payload binario)
      4. Conversión CAT → CNY vía Pentetraktys 4D
      5. Confirmación de pago
      6. Recibo firmado
    """

    def __init__(self):
        self.converter = CATtoCNYConverter()
        self.tags: Dict[str, NFCTag] = {}
        self.sessions: List[Dict] = []
        self._session_counter = 0

    def create_tag(
        self,
        uid: str,
        amount_cat: float = 10000.0,
        payload: str = NFC_PAYLOAD,
    ) -> NFCTag:
        """Crea un tag NFC con el monto en CAT y el payload binario."""
        tag = NFCTag(
            uid=uid,
            payload_binary=payload,
            amount_cat=amount_cat,
        )
        self.tags[uid] = tag
        return tag

    def decode_payload(self, payload: str) -> Dict[str, Any]:
        """Decodifica el payload binario NFC en instrucciones de pago."""
        ones = payload.count("1")
        zeros = payload.count("0")

        # Estructura rítmica: pares "10" indican miles de CAT
        pairs_10 = 0
        i = 0
        while i < len(payload) - 1:
            if payload[i:i+2] == "10":
                pairs_10 += 1
            i += 1

        # Pausas agrupadas (ceros consecutivos) = niveles de riesgo
        risk_levels = 0
        max_zeros = 0
        current_zeros = 0
        for c in payload:
            if c == "0":
                current_zeros += 1
            else:
                if current_zeros >= 3:
                    risk_levels += 1
                max_zeros = max(max_zeros, current_zeros)
                current_zeros = 0
        if current_zeros >= 3:
            risk_levels += 1
            max_zeros = max(max_zeros, current_zeros)

        # Hash del payload como firma
        payload_hash = hashlib.sha256(payload.encode()).hexdigest()[:16]

        return {
            "payload": payload,
            "length": len(payload),
            "ones": ones,
            "zeros": zeros,
            "pairs_10": pairs_10,
            "implied_cat_thousands": pairs_10,  # Cada "10" = 1,000 CAT
            "risk_levels": risk_levels,
            "max_consecutive_zeros": max_zeros,
            "payload_hash": payload_hash,
            "protocol": "ISO 14443-4 + Pentetraktys 4D",
        }

    def simulate_tap(self, uid: str) -> Dict[str, Any]:
        """Simula un TAP NFC completo.

        Returns:
            Dict con el resultado de la transacción, auditoría y recibo.
        """
        if uid not in self.tags:
            return {"error": f"Tag {uid} no encontrado"}

        tag = self.tags[uid]
        self._session_counter += 1
        session_id = f"NFC-{self._session_counter:04d}"

        # ── Fase 1: Handshake ISO 14443-4 ──
        handshake = self._iso_handshake(tag)

        # ── Fase 2: Decodificar payload ──
        decoded = self.decode_payload(tag.payload_binary)

        # ── Fase 3: Autenticación mutua ──
        auth = self._mutual_auth(tag, decoded)

        # ── Fase 4: Conversión CAT → CNY ──
        conversion = self.converter.convert(tag.amount_cat)

        # ── Fase 5: Auditoría Pentetraktys ──
        audit = self.converter.get_pentetraktys_audit(conversion)

        # ── Fase 6: Generar recibo ──
        receipt = self._generate_receipt(session_id, tag, decoded, conversion, auth)

        session = {
            "session_id": session_id,
            "timestamp": time.time(),
            "tag_uid": uid,
            "handshake_ms": handshake["duration_ms"],
            "auth_established": auth["success"],
            "conversion": conversion,
            "decoded_payload": decoded,
            "receipt_hash": receipt["receipt_hash"],
            "pentetraktys_audit": audit,
        }
        self.sessions.append(session)

        return session

    def _iso_handshake(self, tag: NFCTag) -> Dict[str, Any]:
        """Simula handshake ISO 14443-4."""
        start = time.time()

        # Simular latencia NFC (~35ms típico)
        time.sleep(0.035)

        # Seleccionar AID
        select_apdu = APDUFrame(ins="A4", data=ALIPAY_AID)
        # Autenticar
        auth_apdu = APDUFrame(ins="20", data=tag.payload_binary[:16])

        duration = (time.time() - start) * 1000

        return {
            "protocol": "ISO 14443-4",
            "aid_selected": ALIPAY_AID,
            "select_apdu": f"{select_apdu.cla}{select_apdu.ins}{select_apdu.p1}{select_apdu.p2}",
            "duration_ms": round(duration, 1),
            "signal_strength": -37,  # dBm simulado
        }

    def _mutual_auth(self, tag: NFCTag, decoded: Dict) -> Dict[str, Any]:
        """Autenticación mutua usando el payload como secreto compartido."""
        challenge = hashlib.sha256(
            f"{tag.uid}{tag.timestamp}{decoded['payload_hash']}".encode()
        ).hexdigest()[:32]

        response = hashlib.sha256(
            f"{challenge}{tag.payload_binary}{tag.timestamp}".encode()
        ).hexdigest()[:32]

        return {
            "success": True,
            "method": "SHA256-Mutual-Challenge",
            "challenge": challenge,
            "response": response,
            "key_derived_from": "binary_payload",
        }

    def _generate_receipt(
        self,
        session_id: str,
        tag: NFCTag,
        decoded: Dict,
        conversion: Dict,
        auth: Dict,
    ) -> Dict[str, Any]:
        """Genera recibo firmado de la transacción NFC."""
        receipt_data = {
            "session": session_id,
            "uid": tag.uid,
            "amount_cat": tag.amount_cat,
            "amount_cny": conversion["cny_final"],
            "rate": conversion["rate_cat_cny"],
            "timestamp": tag.timestamp,
            "payload_hash": decoded["payload_hash"],
            "auth_challenge": auth["challenge"][:16],
        }

        receipt_json = json.dumps(receipt_data, sort_keys=True)
        receipt_hash = hashlib.sha256(receipt_json.encode()).hexdigest()

        receipt_data["receipt_hash"] = receipt_hash
        receipt_data["receipt_json"] = receipt_json

        return receipt_data

    def print_simulation(self, session: Dict) -> None:
        """Imprime la simulación NFC completa en formato legible."""
        dec = session["decoded_payload"]
        conv = session["conversion"]

        print()
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║       NFC CONTACTLESS PAYMENT — CATALYST → ALIPLAY          ║")
        print("╠══════════════════════════════════════════════════════════════╣")
        print(f"║ Session:  {session['session_id']}")
        print(f"║ Protocol: ISO 14443-4 + Pentetraktys 4D")
        print(f"║ Handshake: {session['handshake_ms']}ms")
        print(f"║ Signal:   {session.get('signal_strength', -37)} dBm")
        print("╠══════════════════════════════════════════════════════════════╣")
        print("║                       [ TAP NFC ]                           ║")
        print("╠══════════════════════════════════════════════════════════════╣")
        print(f"║ Tag UID:  {session['tag_uid']}")
        print(f"║ Payload:  {dec['payload']}")
        print(f"║ Hash:     {dec['payload_hash']}")
        print("╠══════════════════════════════════════════════════════════════╣")
        print(f"║ Amount:   {conv['cat_amount']:,.0f} CAT")
        print(f"║ Rate:     1 CAT = {conv['rate_cat_cny']} CNY")
        print(f"║                         ========")
        print(f"║ TOTAL:    {conv['cny_final']:,.2f} CNY (Aliplay)")
        print(f"║           ≈ ${conv['pillar_1_cardinal_usd']:,.2f} USD")
        print(f"║           ≈ ${conv['pillar_1_cardinal_usd'] * 20:,.0f} MXN")
        print("╠══════════════════════════════════════════════════════════════╣")
        print(f"║ Fee:      5% burn = {conv['cat_amount'] * 0.05:,.0f} CAT burned")
        print(f"║           80% provider = {conv['cny_final'] * 0.80:,.2f} CNY")
        print(f"║           15% treasury = {conv['cny_final'] * 0.15:,.2f} CNY")
        print("╠══════════════════════════════════════════════════════════════╣")
        print(f"║ Status:   APPROVED")
        print(f"║ Auth:     Mutual SHA-256 OK")
        print(f"║ Receipt:  {session['receipt_hash'][:32]}")
        print("╚══════════════════════════════════════════════════════════════╝")

        # Auditoría Pentetraktys
        print()
        print(session["pentetraktys_audit"])


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    """Ejecuta la simulación NFC completa."""
    sim = NFCSimulator()

    # Crear tag NFC con 10,000 CAT
    tag = sim.create_tag(
        uid="04:A3:8F:2C:11:00:01",
        amount_cat=10000.0,
        payload=NFC_PAYLOAD,
    )

    # Simular TAP
    session = sim.simulate_tap(tag.uid)

    # Mostrar resultado
    sim.print_simulation(session)

    # Exportar recibo
    print("\n" + "=" * 60)
    print("RECEIPT (JSON):")
    print(json.dumps({
        "session": session["session_id"],
        "amount_cat": session["conversion"]["cat_amount"],
        "amount_cny": session["conversion"]["cny_final"],
        "rate": session["conversion"]["rate_cat_cny"],
        "payload_hash": session["decoded_payload"]["payload_hash"],
        "receipt_hash": session["receipt_hash"],
        "pentetraktys_phase": "conclusion",
    }, indent=2))


if __name__ == "__main__":
    main()
