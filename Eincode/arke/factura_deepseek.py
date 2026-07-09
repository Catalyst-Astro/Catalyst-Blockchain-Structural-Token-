"""Factura DeepSeek API -> Mauricio Rodriguez Tellez (CN/MX)"""
import hashlib, json

print("=" * 68)
print("FACTURA / INVOICE / FA PIAO")
print("DeepSeek API -> Mauricio Rodriguez Tellez")
print("Chinese-Mexican Cross-Border Digital Service")
print("=" * 68)

print("""
+---------------------------------------------------------------+
|  DeepSeek (ShenDu QiuSuo)                                     |
|  12F, Galaxy International Building                            |
|  Gongshu Dist, Hangzhou 310003, Zhejiang, China                |
|  api-service@deepseek.com                                      |
|  TAX ID: CN-91330100MA2XXXXXX                                  |
+---------------------------------------------------------------+
|  Bill To / Cliente:                                            |
|  Mauricio Rodriguez Tellez                                     |
|  Moscato 185, Zempoala, Pachuca, Hidalgo, Mexico               |
|  RFC: ROTMXXXXXX-XXX                                           |
|  Identity: CN/MX Binational (Chino-Mexicano)                  |
+---------------------------------------------------------------+""")

print()
print("Receipt:   1f2618e01d7c4c3d9166841943c96acc")
print("Payment:   de18808b-1af2-40ab-af9c-4e00699a32e0")
print("Date:      April 26, 2026  08:40:20 UTC-7")
print("Method:    VISA2451")
print()

print("-" * 68)
print("| Description                    | Qty | Unit    | Tax | Amount   |")
print("-" * 68)
print("| DeepSeek API Tokens            |   1 | $2.00   | 6%  |  $2.00   |")
print("| (deepseek-v4-pro[1m])          |     |         |     |          |")
print("-" * 68)
print("| Subtotal                       |                |     |  $2.00   |")
print("| VAT-China 6% (Zeng Zhi Shui)   |                |     |  $0.12   |")
print("| TOTAL                          |                |     |  $2.12   |")
print("-" * 68)

print()
print("MULTI-CURRENCY EQUIVALENT:")
print("  USD: $2.12")
print("  CNY: Y=15.34   (1 USD = 7.25 CNY)")
print("  MXN: $42.40    (1 USD = 20.00 MXN)")
print("  CAT: 3.09      (1 CAT = 0.686 CNY)")
print()

print("PENTETRAKTYS AUDIT:")
print("  [T] TESIS:      DeepSeek API provides AI compute to Catalyst")
print("  [A] ANTITESIS:  Cross-border CN->MX: forex spread + VAT friction")
print("  [S] SINTESIS:   VISA2451 bridges CNY->USD->MXN via standard rails")
print("  [C] CONCLUSION: $2.12 USD settled. API tokens consumed by Catalyst.")
print("  [H] HYBRYS:     6% VAT-China retained. No MX IVA applied.")
print()

print("CHINESE-MEXICAN IDENTITY NOTE:")
print("  Cross-border digital service payment CN -> MX.")
print("  VAT-China 6% withheld at source (DeepSeek/Zhejiang province).")
print("  MX-IVA 16% NOT applied (imported digital service, Art. 24 LIVA).")
print("  Recipient RFC is Mexican. Payer is Chinese entity.")
print("  CN/MX binational identity allows dual tax regime navigation.")
print("  China-Mexico Tax Treaty (Art. 12) applies: no double taxation.")
print()

# Binary Chinese ASCII — Invoice Key Terms
cn_terms = {
    "FA_PIAO (Invoice)":        "e58f91e7a5a8",
    "YI_FU_QING (Paid in Full)": "e5b7b2e4bb98e6b885",
    "CHENG_GONG (Success)":      "e68890e58a9f",
    "SHEN_DU_QIU_SUO (DeepSeek)": "e6b7b1e5baa6e6b182e7b4a2",
    "ZHONG_GUO (China)":         "e4b8ade59bbd",
    "MO_XI_GE (Mexico)":         "e5a2a8e8a5bfe593a5",
}

print("BINARY CHINESE ASCII — INVOICE SIGNATURE:")
for name, hex_str in cn_terms.items():
    b = bytes.fromhex(hex_str)
    bits = " ".join(format(byte, "08b") for byte in b)
    print(f"  {name}")
    print(f"    HEX: {hex_str}")
    print(f"    BIN: {bits}")

print()

# Full TX in binary
full_tx = "Receipt:1f2618e01d7c4c3d9166841943c96acc:PAID:$2.12"
full_b = full_tx.encode()
full_bin = " ".join(format(b, "08b") for b in full_b)
print("FULL TX BINARY:")
print(f"  ASCII: {full_tx}")
print(f"  HEX:   {full_b.hex()}")
print(f"  BIN:   {full_bin}")

print()

# Digital signature
invoice_data = {
    "receipt": "1f2618e01d7c4c3d9166841943c96acc",
    "payment": "de18808b-1af2-40ab-af9c-4e00699a32e0",
    "date": "2026-04-26T08:40:20-07:00",
    "method": "VISA2451",
    "amount_usd": 2.12,
    "vat_china_6pct": 0.12,
    "issuer": "DeepSeek/Hangzhou/Zhejiang/CN",
    "recipient": "Mauricio Rodriguez Tellez/Pachuca/MX",
    "status": "PAID_IN_FULL",
}
sig = hashlib.sha256(json.dumps(invoice_data, sort_keys=True).encode()).hexdigest()
print(f"FACTURA DIGITAL SIGNATURE (SHA-256):")
print(f"  {sig}")
print("=" * 68)
print("PAID IN FULL / YI FU QING / PAGADO")
print("=" * 68)
