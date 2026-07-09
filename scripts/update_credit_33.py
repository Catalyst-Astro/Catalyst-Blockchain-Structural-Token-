"""Update credit lines with 33.33% treasury justification"""
import json

lines = [
    ("LC-001", "Linea Principal BBVA", "MXN", 66660000, 0.0, "33.33% CAT Treasury (33.33M CAT)"),
    ("LC-002", "Linea Secundaria CNY", "CNY", 329967, 0.0, "33.33% GNC Backing (330K GNC)"),
    ("LC-003", "Linea UnionPay Receivable", "CNY", 3400000, 0.0015, "100% QR Triggers ejecutados"),
    ("LC-004", "Linea SPEI Bridge", "MXN", 50000000, 0.01, "80% LTV SPEI + 33.33% reserva"),
    ("LC-005", "Linea Gas Relayer CAT", "CAT", 333300, 0.0, "33.33% Gas Pool (333K CAT)"),
]

print("LINEAS DE CREDITO ACTUALIZADAS - 33.33% TREASURY")
print("=" * 55)
total_mxn = 0
total_cny = 0
for l in lines:
    if l[2] == "MXN": total_mxn += l[3]
    elif l[2] == "CNY": total_cny += l[3]
    print(f"  {l[0]}: {l[1]}")
    print(f"    {l[2]} {l[3]:,.0f} | Tasa: {l[4]*100}% | {l[5]}")

print()
print(f"TOTAL MXN: ${total_mxn:,.0f}")
print(f"TOTAL CNY: {total_cny:,.0f}")
print("JUSTIFICADO: 33.33% Treasury + QR Triggers")

contract = {
    "documento": "LINEA_CREDITO_33PCT_TREASURY",
    "fecha": "2026-06-23",
    "acreditado": "Mauricio Rodriguez Tellez",
    "split": "33.33% liquido / 66.67% reserva",
    "total_disponible_mxn": total_mxn,
    "total_disponible_cny": total_cny,
    "lineas": [{"id": l[0], "nombre": l[1], "moneda": l[2], "monto": l[3], "tasa": l[4], "respaldo": l[5]} for l in lines]
}
from pathlib import Path
p = Path("Eincode/arke/linea_credito_contrato.json")
p.write_text(json.dumps(contract, indent=2, ensure_ascii=False))
print(f"\nContrato actualizado: {p}")
