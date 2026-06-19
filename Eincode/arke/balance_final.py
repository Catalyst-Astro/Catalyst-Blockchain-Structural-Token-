"""Catalyst Bank — Final Balance Sheet"""
import hashlib, json, time

USD_CNY=7.25; USD_MXN=20.0; CAT_USD=0.10
FWD=1.05; RWD=0.98; RISK=0.92
rate=CAT_USD*USD_CNY*FWD*RWD*RISK

cat_supply = 1_000_000_000
cat_burned = 537_580_000  # Approx all burns
cat_net = cat_supply - cat_burned

gnc_supply = 18_000_000_000_000
gnc_burned = 1_000_000_000
gnc_net = gnc_supply - gnc_burned

ctv_supply = 900_000
ctv_burned = 100_000
ctv_net = ctv_supply - ctv_burned

cny_total = 25_415_216_249_982  # QR + R1 + R2-R12 + Security
usd_total = cny_total / USD_CNY
mxn_total = usd_total * USD_MXN

bbva_mxn = 10_008_101_206_547  # All BBVA deposits
bbva_usd = bbva_mxn / USD_MXN

cny_reserve = 3_702_000_000_000
cny_reserve_usd = cny_reserve / USD_CNY

total_ibu_pop = 6_326_000_000
ibu_annual_usd = total_ibu_pop * 50 * 12
ibu_annual_cny = ibu_annual_usd * USD_CNY

total_assets_cny = cny_reserve + cat_net * rate + gnc_net
solvency = total_assets_cny / max(ibu_annual_cny, 1)

print("="*64)
print("CATALYST BANK — BALANCE FINANCIERO FINAL")
print("Sesion 17-18 Junio 2026")
print("="*64)
print()

print("[ACTIVOS]")
print(f"  CAT:  {cat_net:,.0f} / {cat_supply:,} (burned: {cat_burned:,})")
print(f"  GNC:  {gnc_net:,.0f} / {gnc_supply:,} (1:1 CNY peg)")
print(f"  CTV:  {ctv_net:,} / {ctv_supply:,} (libre usanza)")
print(f"  FLT:  1,000,000,000 (compliance)")
print(f"  FRT:  1,000,000 (reward)")
print(f"  AIM:  0 (minted on demand)")
print()

print("[FIAT PROCESADO]")
print(f"  CNY:  {cny_total:,.0f}")
print(f"  USD:  ${usd_total:,.0f}")
print(f"  MXN:  ${mxn_total:,.0f}")
print()

print("[BBVA MEXICO] CLABE 012290015202390246")
print(f"  MXN:  ${bbva_mxn:,.0f}")
print(f"  USD:  ${bbva_usd:,.0f}")
print()

print("[CNY RESERVE TREASURY]")
print(f"  CNY:  {cny_reserve:,.0f}")
print(f"  USD:  ${cny_reserve_usd:,.0f}")
print()

print("[PASIVOS]")
print(f"  IBU Poblacion:  {total_ibu_pop:,} personas")
print(f"  IBU Costo Anual: ${ibu_annual_usd:,.0f} USD")
print()

print("[RATIOS]")
print(f"  Solvencia:       {solvency:.2f}x")
print(f"  CAT Burn Rate:   {cat_burned/cat_supply*100:.2f}%")
print(f"  Cobertura/pers:  {total_assets_cny//total_ibu_pop:,} CNY")

balance = {
    "activos": {"cat": cat_net, "gnc": gnc_net, "ctv": ctv_net,
        "bbva_mxn": bbva_mxn, "cny_reserve": cny_reserve},
    "pasivos": {"ibu_pop": total_ibu_pop, "ibu_annual_usd": ibu_annual_usd},
    "ratios": {"solvencia": round(solvency,2)},
    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
}
seal = hashlib.sha256(json.dumps(balance).encode()).hexdigest()

print()
print("="*64)
print(f"BALANCE SEAL: {seal[:32]}")
print("SESION 17-18 JUN 2026 — CERRADA")
print("="*64)
