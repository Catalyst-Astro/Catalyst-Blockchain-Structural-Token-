#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════
CATALYST BANK — BANXICO REAL MXN ORACLE (v1.0)
═══════════════════════════════════════════════════════════════════════════
BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+ | Banxico SIE API

TOKEN: [loaded from .env — BANXICO_API_TOKEN]
ENDPOINT: https://www.banxico.org.mx/SieAPIRest/service/v1/

SERIES:
  SF43718 — USD/MXN Tipo de cambio FIX (Promedio del día)
  SF46410 — USD/MXN Tipo de cambio para solventar obligaciones
  SF60653 — USD/MXN Tipo de cambio FIX (Cierre)
  SP68257 — UDI (Unidad de Inversión)
  SF61745 — TIIE 28 días (Tasa de interés interbancaria)

PROPOSITO: Conectar Catalyst al tipo de cambio oficial del Diario Oficial
           de la Federación (DOF) via Banxico. Esto da VALOR REAL MXN
           a todos los tokens del ecosistema.

USO:
  python3 Eincode/arke/banxico_oracle.py          # Consulta única
  python3 Eincode/arke/banxico_oracle.py --watch  # Monitoreo continuo
  python3 Eincode/arke/banxico_oracle.py --save   # Guardar en JSON
═══════════════════════════════════════════════════════════════════════════
"""

import hashlib, json, time, os, sys, io, ssl, uuid
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Load .env (simple parser, no external deps) ──
def _load_env():
    """Load .env file into os.environ. Secures API tokens outside git."""
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ.setdefault(key.strip(), val.strip())
_load_env()

# ═══════════════════════════════════════════════════════════════
# CONFIGURACION BANXICO API
# Token loaded from .env (BANXICO_API_TOKEN) for security.
# Get your own token at: https://www.banxico.org.mx/SieAPIRest/
# ═══════════════════════════════════════════════════════════════
BANXICO_CONFIG = {
    "token": os.environ.get("BANXICO_API_TOKEN", ""),
    "base_url": os.environ.get("BANXICO_BASE_URL", "https://www.banxico.org.mx/SieAPIRest/service/v1"),
    "series": {
        "usd_mxn_fix": {
            "id": "SF43718",
            "name": "Tipo de cambio FIX — USD/MXN (Promedio diario)",
            "source": "DOF — Diario Oficial de la Federacion",
            "weight": 0.40,  # 40% en el oracle 4-pillar
        },
        "usd_mxn_obligaciones": {
            "id": "SF46410",
            "name": "Tipo de cambio para solventar obligaciones — USD/MXN",
            "source": "DOF",
            "weight": 0.15,
        },
        "usd_mxn_cierre": {
            "id": "SF60653",
            "name": "Tipo de cambio FIX — USD/MXN (Cierre)",
            "source": "DOF",
            "weight": 0.15,
        },
        "udi": {
            "id": "SP68257",
            "name": "UDI — Unidad de Inversion (valor diario)",
            "source": "Banxico",
            "weight": 0.10,
        },
        "tiie_28": {
            "id": "SF61745",
            "name": "TIIE — Tasa de Interes Interbancaria 28 dias",
            "source": "Banxico",
            "weight": 0.10,
        },
        "cny_mxn": {
            "id": "SF290363",
            "name": "CNY/MXN — Tipo de cambio Yuan/Peso (si disponible)",
            "source": "Banxico",
            "weight": 0.10,
        },
    },
    "limits": {
        "max_requests_per_hour": 100,
        "max_series_per_request": 10,
        "data_retention_hours": 24,
    },
}


# ═══════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════

@dataclass
class BanxicoRate:
    """Un dato puntual de tipo de cambio."""
    series_id: str
    series_name: str
    date: str
    value: float
    timestamp: str


@dataclass
class MXNValuation:
    """Valoración completa MXN de los tokens Catalyst."""
    timestamp: str
    usd_mxn_fix: float         # USD/MXN FIX oficial (DOF)
    usd_mxn_cierre: float       # USD/MXN cierre
    udi_value: float            # UDI valor diario
    tiie_28: float              # TIIE 28 días
    cat_usd: float              # CAT/USD (P1 oracle)
    cat_mxn_4pillar: float      # CAT/MXN via 4-pillar
    cat_mxn_real: float         # CAT/MXN via Banxico + backing
    gnc_cny: float              # GNC/CNY (1:1 peg)
    gnc_mxn: float              # GNC/MXN (via Banxico)
    ctv_mxn: float              # CTV/MXN (via GNC bridge)
    aim_usd: float              # AIM/USD ($0.01 peg)
    aim_mxn: float              # AIM/MXN (via Banxico)
    backing_ratio: float        # Ratio de respaldo GNC/CAT
    seal: str


# ═══════════════════════════════════════════════════════════════
# BANXICO API CLIENT
# ═══════════════════════════════════════════════════════════════

class BanxicoOracleClient:
    """Cliente de la API de Banxico SIE para tipos de cambio oficiales."""

    def __init__(self, token: str = None):
        self.token = token or BANXICO_CONFIG["token"]
        self.base_url = BANXICO_CONFIG["base_url"]
        self.session_start = datetime.now()
        self.requests_made = 0
        self.cache: Dict[str, BanxicoRate] = {}
        self.last_request_time = None

    def _make_request(self, endpoint: str) -> Dict:
        """Realiza una solicitud autenticada a la API de Banxico."""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            "Bmx-Token": self.token,
            "Accept": "application/json",
            "User-Agent": "Catalyst-Banking-System/2.0 (ElasticSupply)",
        }

        ctx = ssl.create_default_context()
        req = Request(url, headers=headers)
        self.requests_made += 1
        self.last_request_time = datetime.now()

        try:
            resp = urlopen(req, timeout=30, context=ctx)
            data = json.loads(resp.read().decode('utf-8'))
            return {"success": True, "data": data, "http_status": resp.status}
        except HTTPError as e:
            return {"success": False, "error": f"HTTP {e.code}", "data": None, "http_status": e.code}
        except URLError as e:
            return {"success": False, "error": str(e.reason), "data": None, "http_status": 0}
        except json.JSONDecodeError as e:
            return {"success": False, "error": f"JSON parse error: {e}", "data": None, "http_status": 0}

    def get_series_range(self, series_id: str, start_date: str = None, end_date: str = None) -> List[BanxicoRate]:
        """Obtiene datos de una serie en un rango de fechas.

        Endpoint: /series/{series_id}/datos/{start_date}/{end_date}
        Si no se especifican fechas, obtiene los últimos 5 días.
        """
        if not start_date:
            start_date = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")

        endpoint = f"series/{series_id}/datos/{start_date}/{end_date}"
        result = self._make_request(endpoint)

        rates = []
        if result["success"] and result["data"]:
            bmx = result["data"].get("bmx", {})
            series_data = bmx.get("series", [])
            for serie in series_data:
                series_name = serie.get("titulo", series_id)
                datos = serie.get("datos", [])
                for dato in datos:
                    rates.append(BanxicoRate(
                        series_id=series_id,
                        series_name=series_name,
                        date=dato.get("fecha", ""),
                        value=float(dato.get("dato", 0).replace(",", "")),
                        timestamp=datetime.now().isoformat(),
                    ))
        return rates

    def get_latest_rate(self, series_id: str) -> Optional[BanxicoRate]:
        """Obtiene el dato más reciente de una serie."""
        rates = self.get_series_range(series_id)
        return rates[0] if rates else None

    def get_usd_mxn_fix(self) -> Optional[BanxicoRate]:
        """Obtiene el tipo de cambio FIX USD/MXN más reciente (DOF)."""
        return self.get_latest_rate("SF43718")

    def get_usd_mxn_cierre(self) -> Optional[BanxicoRate]:
        """Obtiene el tipo de cambio cierre USD/MXN."""
        return self.get_latest_rate("SF60653")

    def get_udi(self) -> Optional[BanxicoRate]:
        """Obtiene el valor UDI más reciente."""
        return self.get_latest_rate("SP68257")

    def get_all_rates(self) -> Dict[str, BanxicoRate]:
        """Obtiene todos los tipos de cambio configurados."""
        results = {}
        for key, config in BANXICO_CONFIG["series"].items():
            rate = self.get_latest_rate(config["id"])
            if rate:
                results[key] = rate
                self.cache[config["id"]] = rate
        return results


# ═══════════════════════════════════════════════════════════════
# MXN VALUATION ENGINE (4-PILLAR + BANXICO)
# ═══════════════════════════════════════════════════════════════

class MXNValuationEngine:
    """Calcula el valor real MXN de todos los tokens Catalyst usando Banxico + 4-pillar."""

    def __init__(self, banxico_client: BanxicoOracleClient):
        self.banxico = banxico_client
        self.last_valuation: Optional[MXNValuation] = None

        # CAT 4-pillar constants
        self.cat_usd_base = 0.10      # P1: CAT/USD base
        self.usd_cny_forex = 7.25      # USD/CNY forex interbancario
        self.fwd_bonus = 1.05          # Forward bonus
        self.rwd_premium = 0.98        # Reward premium
        self.risk_discount = 0.92      # Risk discount

    def calculate(self) -> MXNValuation:
        """Calcula la valoración completa MXN usando Banxico + 4-pillar."""
        all_rates = self.banxico.get_all_rates()

        # ── PILLAR 1: Banxico FIX (40%) ──
        usd_mxn_fix = all_rates.get("usd_mxn_fix")
        usd_mxn_fix_val = usd_mxn_fix.value if usd_mxn_fix else 20.00

        # ── PILLAR 2: Banxico Cierre (15%) ──
        usd_mxn_cierre = all_rates.get("usd_mxn_cierre")
        usd_mxn_cierre_val = usd_mxn_cierre.value if usd_mxn_cierre else 20.00

        # ── PILLAR 3: Banxico Obligaciones (15%) ──
        usd_mxn_oblig = all_rates.get("usd_mxn_obligaciones")
        usd_mxn_oblig_val = usd_mxn_oblig.value if usd_mxn_oblig else 20.00

        # ── PILLAR 4: UDI + TIIE (10% cada uno) ──
        udi = all_rates.get("udi")
        udi_val = udi.value if udi else 8.15  # UDI ~$8.15 MXN aprox

        tiie = all_rates.get("tiie_28")
        tiie_val = tiie.value if tiie else 11.50  # TIIE ~11.5% aprox

        # ── CNY/MXN via forex cross (USD/MXN ÷ USD/CNY) ──
        # La serie SF290363 no siempre tiene datos. Calculamos:
        # CNY/MXN = USD/MXN_FIX / USD/CNY_forex
        cny_data = all_rates.get("cny_mxn")
        if cny_data and cny_data.value > 1.01:
            cny_mxn_val = cny_data.value  # Usar dato Banxico si es real (>1)
        else:
            cny_mxn_val = usd_mxn_fix_val / 7.25  # Forex cross: 17.4758 / 7.25 ≈ 2.41

        # ═══════════════════════════════════════════════════════
        # 4-PILLAR WEIGHTED USD/MXN
        # ═══════════════════════════════════════════════════════
        usd_mxn_weighted = (
            usd_mxn_fix_val * 0.40 +
            usd_mxn_cierre_val * 0.15 +
            usd_mxn_oblig_val * 0.15 +
            (udi_val / 0.4075) * 0.10 +    # UDI proxy: UDI ≈ 0.4075 USD histórico
            (usd_mxn_fix_val) * 0.10        # TIIE-weighted base
        )

        # ═══════════════════════════════════════════════════════
        # CAT REAL MXN VALUE
        # ═══════════════════════════════════════════════════════
        cat_usd_4pillar = (
            self.cat_usd_base *
            self.fwd_bonus *
            self.rwd_premium *
            self.risk_discount
        )  # = $0.0926 USD

        cat_mxn_4pillar = cat_usd_4pillar * usd_mxn_weighted
        cat_mxn_real = cat_usd_4pillar * usd_mxn_fix_val  # Official DOF rate

        # ═══════════════════════════════════════════════════════
        # GNC REAL MXN VALUE (1 GNC = 1 CNY → MXN)
        # ═══════════════════════════════════════════════════════
        gnc_cny = 1.00  # 1:1 peg
        gnc_mxn = 1.00 * cny_mxn_val  # 1 CNY → MXN

        # ═══════════════════════════════════════════════════════
        # CTV REAL MXN VALUE (1 CTV = 1000 GNC)
        # ═══════════════════════════════════════════════════════
        ctv_mxn = gnc_mxn * 1000

        # ═══════════════════════════════════════════════════════
        # AIM REAL MXN VALUE ($0.01 USD → MXN)
        # ═══════════════════════════════════════════════════════
        aim_usd = 0.01
        aim_mxn = aim_usd * usd_mxn_fix_val

        # ═══════════════════════════════════════════════════════
        # BACKING RATIO (GNC / CAT supply)
        # ═══════════════════════════════════════════════════════
        # GNC backed by ~¥855B CNY = ~$2.35T MXN
        # CAT elastic cap ~1.24T tokens
        backing_ratio = (855036398770 * cny_mxn_val) / (1247791572047 * cat_mxn_real) if cat_mxn_real > 0 else 1.0

        valuation = MXNValuation(
            timestamp=datetime.now().isoformat(),
            usd_mxn_fix=usd_mxn_fix_val,
            usd_mxn_cierre=usd_mxn_cierre_val,
            udi_value=udi_val,
            tiie_28=tiie_val,
            cat_usd=cat_usd_4pillar,
            cat_mxn_4pillar=round(cat_mxn_4pillar, 6),
            cat_mxn_real=round(cat_mxn_real, 6),
            gnc_cny=gnc_cny,
            gnc_mxn=round(gnc_mxn, 6),
            ctv_mxn=round(ctv_mxn, 2),
            aim_usd=aim_usd,
            aim_mxn=round(aim_mxn, 6),
            backing_ratio=round(backing_ratio, 4),
            seal=hashlib.sha256(
                f"{datetime.now().isoformat()}{usd_mxn_fix_val}{cat_mxn_real}".encode()
            ).hexdigest(),
        )

        self.last_valuation = valuation
        return valuation


# ═══════════════════════════════════════════════════════════════
# DISPLAY & REPORT
# ═══════════════════════════════════════════════════════════════

def display_valuation(valuation: MXNValuation, rates: Dict):
    """Muestra la valoración MXN completa."""
    print()
    print("═" * 72)
    print("  CATALYST BANK — VALOR REAL MXN (Banxico + 4-Pillar)")
    print("  Fuente: Diario Oficial de la Federacion (DOF)")
    print(f"  Timestamp: {valuation.timestamp}")
    print("═" * 72)

    print(f"\n  ┌─────────────────────────────────────────────────┐")
    print(f"  │ USD/MXN FIX (DOF):    ${valuation.usd_mxn_fix:>12.4f} MXN          │")
    print(f"  │ USD/MXN Cierre:       ${valuation.usd_mxn_cierre:>12.4f} MXN          │")
    print(f"  │ UDI:                  ${valuation.udi_value:>12.6f} MXN          │")
    print(f"  │ TIIE 28 días:         {valuation.tiie_28:>12.4f}%               │")
    print(f"  └─────────────────────────────────────────────────┘")

    print(f"\n  ┌─────────────────────────────────────────────────┐")
    print(f"  │ VALOR REAL DE TOKENS EN MXN (PESOS MEXICANOS)   │")
    print(f"  ├─────────────────────────────────────────────────┤")
    print(f"  │ CAT/MXN (4-pillar):   ${valuation.cat_mxn_4pillar:>12.6f} MXN          │")
    print(f"  │ CAT/MXN (DOF real):   ${valuation.cat_mxn_real:>12.6f} MXN          │")
    print(f"  │ GNC/MXN (1 CNY=MXN):  ${valuation.gnc_mxn:>12.6f} MXN          │")
    print(f"  │ CTV/MXN (1000 GNC):   ${valuation.ctv_mxn:>12.2f} MXN          │")
    print(f"  │ AIM/MXN ($0.01 USD):  ${valuation.aim_mxn:>12.6f} MXN          │")
    print(f"  │ Backing Ratio:        {valuation.backing_ratio:>12.4f}x              │")
    print(f"  └─────────────────────────────────────────────────┘")

    print(f"\n  ┌─────────────────────────────────────────────────┐")
    print(f"  │ USO FACIL EN TODOS LADOS:                       │")
    print(f"  │  1 CAT = ${valuation.cat_mxn_real:.6f} MXN (tipo de cambio DOF)   │")
    print(f"  │  1 GNC = ${valuation.gnc_mxn:.6f} MXN (1 CNY via Banxico)     │")
    print(f"  │  1 CTV = ${valuation.ctv_mxn:.2f} MXN (1000 GNC)              │")
    print(f"  │  1 AIM = ${valuation.aim_mxn:.6f} MXN ($0.01 USD via DOF)     │")
    print(f"  └─────────────────────────────────────────────────┘")

    # Estado del token Banxico
    print(f"\n  Banxico API Token: {BANXICO_CONFIG['token'][:16]}...")
    print(f"  Requests made: {sum(1 for r in rates.values() if r)}")
    print(f"  SEAL: {valuation.seal}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Catalyst Banxico Real MXN Oracle")
    parser.add_argument("--watch", action="store_true", help="Monitoreo continuo")
    parser.add_argument("--save", action="store_true", help="Guardar en archivo JSON")
    parser.add_argument("--token", type=str, default=None, help="Token Banxico (opcional)")
    args = parser.parse_args()

    print()
    print("═" * 72)
    print("  CATALYST BANK — BANXICO REAL MXN ORACLE")
    print("  BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+")
    print("═" * 72)
    print(f"  Token: {BANXICO_CONFIG['token'][:16]}...{BANXICO_CONFIG['token'][-8:]}")
    print(f"  Endpoint: {BANXICO_CONFIG['base_url']}")
    print(f"  Series activas: {len(BANXICO_CONFIG['series'])}")
    print()

    # Crear cliente
    token = args.token or BANXICO_CONFIG["token"]
    banxico = BanxicoOracleClient(token=token)

    # Obtener todos los rates
    print("Consultando Banxico API...")
    all_rates = banxico.get_all_rates()

    # Mostrar datos crudos
    print(f"\n  Datos obtenidos de Banxico:")
    for key, rate in all_rates.items():
        config = BANXICO_CONFIG["series"][key]
        print(f"  {config['name']}: {rate.value} (fecha: {rate.date})")
        print(f"    Serie: {config['id']} | Peso: {config['weight']*100:.0f}% | Fuente: {config['source']}")

    # Calcular valoración MXN
    engine = MXNValuationEngine(banxico)
    valuation = engine.calculate()

    # Mostrar resultados
    display_valuation(valuation, all_rates)

    # Guardar
    if args.save:
        arke_dir = os.path.dirname(os.path.abspath(__file__))
        report_path = os.path.join(
            arke_dir,
            f"banxico_mxn_valuation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        report_data = {
            "oracle": "Banxico SIE API",
            "token_prefix": BANXICO_CONFIG["token"][:16],
            "timestamp": valuation.timestamp,
            "rates": {
                "usd_mxn_fix": valuation.usd_mxn_fix,
                "usd_mxn_cierre": valuation.usd_mxn_cierre,
                "udi": valuation.udi_value,
                "tiie_28": valuation.tiie_28,
            },
            "tokens_mxn": {
                "CAT_MXN": valuation.cat_mxn_real,
                "GNC_MXN": valuation.gnc_mxn,
                "CTV_MXN": valuation.ctv_mxn,
                "AIM_MXN": valuation.aim_mxn,
            },
            "4pillar": {
                "cat_usd_base": engine.cat_usd_base,
                "usd_cny_forex": engine.usd_cny_forex,
                "fwd_bonus": engine.fwd_bonus,
                "rwd_premium": engine.rwd_premium,
                "risk_discount": engine.risk_discount,
            },
            "seal": valuation.seal,
        }
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)
        print(f"\n  Reporte guardado: {report_path}")

    # Watch mode
    if args.watch:
        print("\n  Monitoreo continuo activado (Ctrl+C para salir)...")
        try:
            while True:
                time.sleep(3600)  # Cada hora
                print(f"\n  [{datetime.now().strftime('%H:%M:%S')}] Actualizando...")
                all_rates = banxico.get_all_rates()
                valuation = engine.calculate()
                print(f"  USD/MXN FIX: ${valuation.usd_mxn_fix:.4f} | CAT/MXN: ${valuation.cat_mxn_real:.6f}")
        except KeyboardInterrupt:
            print("\n  Monitoreo detenido.")

    return valuation


if __name__ == "__main__":
    main()
