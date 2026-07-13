#!/usr/bin/env python3
"""Calculadora de tiempo para crecimiento geométrico del pool."""
import sys, io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

USD_MXN = 17.4758
ETH_USD = 3150
ETH_MXN = ETH_USD * USD_MXN
CAT_MXN = 1.6184

seed_eth = 0.0005
seed_cat = 17

print()
print("═" * 78)
print("  ⏱️  TIEMPO ESTIMADO — CRECIMIENTO GEOMÉTRICO DEL POOL CAT/ETH")
print("═" * 78)
print(f"  Precio: 1 CAT = ${CAT_MXN} MXN | ETH = ${ETH_MXN:,.0f} MXN")
print()

# Escenarios de tiempo
escenarios = [
    ("🚀 AGRESIVO (inyectando capital cada vez)", "1-2 días por fase", 2),     # Inyectas ETH comprado
    ("⚡ MODERADO (reinversión de ganancias)", "3-5 días por fase", 4),          # Ganancias del pool + algo de capital
    ("🌱 ORGÁNICO (solo ganancias del pool)", "7-14 días por fase", 10),        # Solo lo que genera el pool
    ("🐢 CONSERVADOR (sin capital externo)", "15-30 días por fase", 22),        # Solo swap fees naturales
]

for nombre, ritmo, dias_por_fase in escenarios:
    total_dias = dias_por_fase * 13
    semanas = total_dias / 7
    meses = total_dias / 30

    print(f"  {nombre}")
    print(f"    Ritmo: {ritmo}")
    print(f"    Tiempo total: {total_dias} días = {semanas:.1f} semanas = {meses:.1f} meses")
    print()

    # Fases clave
    hitos = [
        (1, "SEMILLA — Precio correcto fijado"),
        (4, "BROTE — $22 MXN retirables a BBVA"),
        (8, "EXPANSIÓN — $352 MXN/mes a BBVA"),
        (13, "COSECHA — $11,269 MXN/ciclo a BBVA"),
    ]
    for fase, desc in hitos:
        dias = dias_por_fase * fase
        print(f"      Fase {fase:2d} ({dias:3d} días): {desc}")
    print()

# Tabla detallada para el escenario moderado
print("─" * 78)
print("  📅 CRONOGRAMA DETALLADO — ESCENARIO MODERADO (reinversión)")
print("─" * 78)
print(f"  {'Semana':<8} {'Fase':<18} {'ETH en Pool':<14} {'CAT en Pool':<14} {'Valor MXN':<16} {'Retirable'}")
print(f"  {'─'*8} {'─'*18} {'─'*14} {'─'*14} {'─'*16} {'─'*12}")

mult = 1
dias_por_fase = 4
for fase in range(1, 14):
    eth = seed_eth * mult
    cat = seed_cat * mult
    valor = eth * ETH_MXN + cat * CAT_MXN
    retirable = cat * 0.10 * CAT_MXN
    dias = dias_por_fase * fase
    sem = dias / 7

    print(f"  Sem {sem:<5.1f} Fase {fase:2d}: {['SEMILLA','GERMINACIÓN','BROTE','PLÁNTULA','CRECIM 1','CRECIM 2','EXPAN 1','EXPAN 2','ACEL 1','ACEL 2','DESPEGUE','ORBITAL','COSECHA'][fase-1]:<14s} {eth:>12.6f}  {cat:>12,.0f}  ${valor:>14,.0f}  ${retirable:>10,.0f}")
    mult *= 2

# El factor clave
print()
print("═" * 78)
print("  🔑 EL FACTOR CLAVE")
print("═" * 78)
print(f"""
  La velocidad NO depende del algoritmo — depende de cuánto ETH puedas
  inyectar al pool en cada fase.

  Fase 1:  0.0005 ETH = ${0.0005 * ETH_MXN:,.0f} MXN  ← $28 MXN
  Fase 5:  0.008 ETH  = ${0.008 * ETH_MXN:,.0f} MXN ← $440 MXN
  Fase 9:  0.128 ETH  = ${0.128 * ETH_MXN:,.0f} MXN ← $7,045 MXN
  Fase 13: 2.048 ETH  = ${2.048 * ETH_MXN:,.0f} MXN ← $112,740 MXN

  Si tienes $100,000 MXN hoy → llegas a Fase 12 en 1 día.
  Si reinviertes ganancias → llegas a Fase 8 en 1 mes.
  Si usas solo fees del pool → llegas a Fase 4 en 2 meses.

  EL ALGORITMO NO ES EL CUELLO DE BOTELLA.
  EL CAPITAL PARA INYECTAR ETH ES EL CUELLO DE BOTELLA.
""")
