#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════
ORDER BOOK CAT — Límites de compra/venta a precio fijo Banxico
═══════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D

Sin Uniswap. Sin slippage. Sin x*y=k.
Tú pones el precio. El comprador acepta o no.

PLATAFORMAS DE ORDER BOOK (sin listado, sin capital mínimo):
  1. 0x Protocol / Matcha — limit orders en Base
  2. 1inch Limit Orders — órdenes límite gratuitas
  3. CoW Swap — subastas batch (mejor precio, sin MEV)
  4. Catalyst BondingCurve — tu propio market maker on-chain

ESTRATEGIA:
  - Publicar órdenes de venta: 1000 CAT a $1.62 MXN c/u
  - El precio NO se mueve con swaps pequeños
  - Sin slippage, sin curva x*y=k
  - El comprador ve el precio exacto y decide
═══════════════════════════════════════════════════════════════
"""

import hashlib, json, time, os, sys, io
from datetime import datetime
from dataclasses import dataclass
from typing import List, Optional

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ═══════════════════════════════════════════════════════════
# DATOS REALES
# ═══════════════════════════════════════════════════════════
USD_MXN = 17.4758
CAT_MXN = 1.6184
CAT_USD = 0.0926
ETH_USD = 3150.00
CAT_ETH = CAT_USD / ETH_USD  # 0.0000294

CAT_ADDRESS = "0xcf0440fAB2cfF8D7c885a292FB8A7b94643a1F80"
OWNER = "0xa221AC0B816fC46f562De5385166025e98aAeD75"

# ═══════════════════════════════════════════════════════════
# PLATAFORMAS ORDER BOOK (GRATIS, sin listado)
# ═══════════════════════════════════════════════════════════

PLATFORMS = {
    "0x_matcha": {
        "name": "0x Protocol / Matcha",
        "url": "https://matcha.xyz",
        "type": "Limit Order (off-chain relay, on-chain settlement)",
        "chain": "Base (8453)",
        "fee": "0% (maker) / 0.2% (taker)",
        "min_order": "$1 USD",
        "how_to": "matcha.xyz → Connect Wallet → Limit Order → Sell CAT for ETH at price",
        "link_template": f"https://matcha.xyz/limit/base/{CAT_ADDRESS}/ETH?amount={{amount}}&price={{price}}",
        "pros": ["Sin gas para crear orden", "Precio fijo sin slippage", "La orden vive hasta que se llene"],
    },
    "1inch_limit": {
        "name": "1inch Limit Orders",
        "url": "https://app.1inch.io",
        "type": "Limit Order",
        "chain": "Base (8453)",
        "fee": "0% maker fee",
        "min_order": "$10 USD",
        "how_to": "app.1inch.io → Limit → Sell CAT → Set price → Create order",
        "link_template": f"https://app.1inch.io/#/8453/limit/{CAT_ADDRESS}/ETH",
        "pros": ["Agregación de liquidez de múltiples fuentes", "Precio se respeta exacto"],
    },
    "cow_swap": {
        "name": "CoW Swap (Batch Auctions)",
        "url": "https://swap.cow.fi",
        "type": "Batch Auction (coincidencia de voluntades)",
        "chain": "Ethereum + Base compatible",
        "fee": "0% (solvers compiten por tu orden)",
        "min_order": "$5 USD",
        "how_to": "swap.cow.fi → Limit Order → Sell CAT → Set min ETH received",
        "link_template": f"https://swap.cow.fi/#/8453/limit/{CAT_ADDRESS}/ETH",
        "pros": ["Mejor ejecución por subasta", "Protegido contra MEV", "Sin gas si no se ejecuta"],
    },
}

# ═══════════════════════════════════════════════════════════
# SIMULADOR DE ORDER BOOK
# ═══════════════════════════════════════════════════════════

@dataclass
class LimitOrder:
    order_id: str
    side: str          # BUY o SELL
    cat_amount: float
    price_mxn: float   # Precio en MXN por CAT
    total_mxn: float
    total_eth: float
    platform: str
    status: str
    seal: str

def create_limit_order(side: str, cat_amount: float, price_mxn: float, platform: str = "0x_matcha") -> LimitOrder:
    total_mxn = cat_amount * price_mxn
    total_eth = cat_amount * CAT_ETH

    order_id = hashlib.sha256(
        f"{side}{cat_amount}{price_mxn}{datetime.now().isoformat()}".encode()
    ).hexdigest()[:16]

    return LimitOrder(
        order_id=order_id,
        side=side.upper(),
        cat_amount=cat_amount,
        price_mxn=price_mxn,
        total_mxn=total_mxn,
        total_eth=total_eth,
        platform=platform,
        status="OPEN",
        seal=hashlib.sha256(f"{order_id}{datetime.now().isoformat()}".encode()).hexdigest(),
    )

def simulate_order_book():
    """Muestra cómo funciona el order book con CAT a precio fijo Banxico."""

    print()
    print("═" * 78)
    print("  📖 ORDER BOOK CAT — Precio Fijo Banxico $1.6184 MXN/CAT")
    print("═" * 78)

    # Mostrar plataformas
    print("\n  🏦 PLATAFORMAS DE ORDER BOOK (SIN LISTADO, GRATIS):")
    print(f"  {'─'*74}")
    for key, p in PLATFORMS.items():
        print(f"  {p['name']}")
        print(f"    URL:  {p['url']}")
        print(f"    Fee:  {p['fee']}")
        print(f"    Mín:  {p['min_order']}")
        print(f"    Pros: {', '.join(p['pros'][:2])}")
        print()

    # Simular órdenes de venta
    print("  📊 ÓRDENES DE VENTA (SELL CAT → ETH):")
    print(f"  {'─'*74}")
    print(f"  {'Orden':<10} {'CAT':<12} {'Precio MXN':<14} {'Total MXN':<16} {'Total ETH':<14} {'Monto USD'}")
    print(f"  {'─'*10} {'─'*12} {'─'*14} {'─'*16} {'─'*14} {'─'*10}")

    orders = []
    amounts = [100, 500, 1000, 5000, 10000, 50000, 100000]
    for amt in amounts:
        order = create_limit_order("SELL", amt, CAT_MXN, "0x_matcha")
        orders.append(order)
        print(f"  {order.order_id:<10} {order.cat_amount:>10,.0f}  ${order.price_mxn:>10.4f}  ${order.total_mxn:>14,.2f}  {order.total_eth:>12.6f}  ${order.total_mxn/USD_MXN:>8,.2f}")

    # Mostrar ventajas
    print(f"\n  ╔══════════════════════════════════════════════════════════════════════════╗")
    print(f"  ║  VENTAJAS DEL ORDER BOOK vs UNISWAP AMM                                 ║")
    print(f"  ╠══════════════════════════════════════════════════════════════════════════╣")
    print(f"  ║                                                                          ║")
    print(f"  ║  ❌ UNISWAP AMM (x*y=k):                                                 ║")
    print(f"  ║     - 50 CAT swap → precio cae de $1.62 a $0.41                         ║")
    print(f"  ║     - Slippage brutal con poca liquidez                                  ║")
    print(f"  ║     - El precio lo dicta el último swap                                  ║")
    print(f"  ║                                                                          ║")
    print(f"  ║  ✅ ORDER BOOK (precio fijo):                                             ║")
    print(f"  ║     - Tú pones el precio ($1.6184 MXN/CAT)                               ║")
    print(f"  ║     - El comprador acepta o rechaza                                       ║")
    print(f"  ║     - Sin slippage, sin curva x*y=k                                       ║")
    print(f"  ║     - La orden vive días/semanas hasta que se llene                       ║")
    print(f"  ║     - Cero gas para crear la orden (0x, 1inch, CoW)                      ║")
    print(f"  ║                                                                          ║")
    print(f"  ╚══════════════════════════════════════════════════════════════════════════╝")

    # Links directos
    print(f"\n  🔗 LINKS DIRECTOS PARA PUBLICAR ÓRDENES AHORA:")
    for key, p in PLATFORMS.items():
        link = p['link_template'].replace('{amount}', '1000').replace('{price}', str(CAT_ETH))
        print(f"  {p['name']}:")
        print(f"  {link}")
        print()

    return orders


def main():
    orders = simulate_order_book()

    # Guardar resumen
    report = {
        "strategy": "ORDER_BOOK_FIXED_PRICE",
        "price_target_mxn": CAT_MXN,
        "price_target_eth": CAT_ETH,
        "platforms": list(PLATFORMS.keys()),
        "active_orders": len(orders),
        "total_cat_listed": sum(o.cat_amount for o in orders),
        "total_mxn_value": sum(o.total_mxn for o in orders),
        "timestamp": datetime.now().isoformat(),
    }

    arke_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(arke_dir, "orderbook_estrategia.json"), "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"  Estrategia guardada en orderbook_estrategia.json")


if __name__ == "__main__":
    main()
