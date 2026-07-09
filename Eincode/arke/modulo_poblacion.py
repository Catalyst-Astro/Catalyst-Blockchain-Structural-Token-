"""Herramientas básicas para el análisis demográfico en México.

Cada función representa un submódulo del Módulo 1: Población. Los cálculos se
basan en cifras publicadas por CONAPO (2020-2070) y se simplifican para fines
de ejemplo.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List


PROYECCIONES_CONAPO: Dict[str, Dict[str, float]] = {
    "pico_poblacional": {"anio": 2050, "poblacion_millones": 147.0},
    "crecimiento_2023": {"tasa": 0.009},
    "tasa_fecundidad": {"2023": 1.92, "2070": 1.49},
    "esperanza_vida_hombres": {"2023": 72.3, "2070": 79.9},
    "esperanza_vida_mujeres": {"2023": 78.6, "2070": 86.4},
    "proporcion_mayores": {"2022": 0.08, "2070": 0.30},
}


@dataclass
class EscenarioPoblacional:
    anio: int
    poblacion: float
    tasa_crecimiento: float


def simulate_population_forecast(
    country: str,
    start_year: int = 2020,
    end_year: int = 2050,
) -> List[EscenarioPoblacional]:
    """Genera escenarios demográficos simples a partir de las tasas de CONAPO."""

    escenario_base = PROYECCIONES_CONAPO.get("pico_poblacional", {})
    pico_anio = escenario_base.get("anio", 2050)
    crecimiento_inicial = PROYECCIONES_CONAPO.get("crecimiento_2023", {}).get("tasa", 0.009)
    decrecimiento_final = -0.0088

    paso = (decrecimiento_final - crecimiento_inicial) / max(1, (end_year - start_year))
    tasa = crecimiento_inicial
    poblacion = 126.0  # aproximado 2020

    resultados: List[EscenarioPoblacional] = []
    for anio in range(start_year, end_year + 1):
        poblacion *= 1 + tasa
        resultados.append(EscenarioPoblacional(anio, round(poblacion, 2), round(tasa, 4)))
        tasa += paso
        if anio == pico_anio:
            tasa = max(tasa, decrecimiento_final)
    return resultados


def analyze_aging_trends(country: str, years: Iterable[int]) -> Dict[int, float]:
    """Evalúa la proporción de adultos mayores según año."""

    prop_inicial = PROYECCIONES_CONAPO["proporcion_mayores"]["2022"]
    prop_final = PROYECCIONES_CONAPO["proporcion_mayores"]["2070"]
    ordered_years = sorted(years)
    span = max(ordered_years) - min(ordered_years)
    paso = (prop_final - prop_inicial) / max(1, span)
    datos: Dict[int, float] = {}
    for idx, anio in enumerate(ordered_years):
        datos[anio] = round(prop_inicial + paso * idx, 3)
    return datos


def evaluate_mortality_and_health(country_code: str, indicators: Iterable[str]) -> Dict[str, float]:
    """Regresa valores de ejemplo para mortalidad y esperanza de vida."""

    base = {
        "mortalidad_infantil": 12.5,
        "esperanza_vida": PROYECCIONES_CONAPO["esperanza_vida_mujeres"]["2023"],
    }
    return {ind: base.get(ind, 0.0) for ind in indicators}


def map_reproductive_rights(country_code: str, stratify_by: str = "nivel_educativo") -> Dict[str, str]:
    """Mapea derechos reproductivos por estrato de forma simbólica."""

    return {"estrato": stratify_by, "estatus": "en desarrollo"}


def analyze_marriage_trends(country_code: str, years: Iterable[int]) -> Dict[int, int]:
    """Genera datos ficticios de nupcialidad."""

    base = min(years)
    return {y: 500 - (y - base) * 5 for y in years}


def model_internal_migration(
    country_code: str,
    regions: int = 32,
    years: Iterable[int] | None = None,
) -> Dict[int, int]:
    """Simula flujos migratorios internos simplificados."""

    if years is None:
        years = [2020, 2030, 2040, 2050]
    return {anio: regions * 1000 - (idx * 100) for idx, anio in enumerate(years)}

def project_labor_market_aging(country: str, sector: str, until: int = 2050) -> Dict[str, float | str]:
    """Proyecta la participación de adultos mayores en la PEA por sector."""

    base = {"agropecuario": 0.12, "servicios": 0.2}
    tasa = base.get(sector, 0.15)
    incremento = (0.35 - tasa) / max(1, (until - 2020))
    return {"sector": sector, f"participacion_{until}": round(tasa + incremento * (until - 2020), 3)}


def assess_population_policies(country: str, indicators: Iterable[str]) -> Dict[str, str]:
    """Evaluación cualitativa de políticas de población."""

    evaluaciones = {ind: "pendiente" for ind in indicators}
    if "TGF" in evaluaciones:
        evaluaciones["TGF"] = "en descenso"
    return evaluaciones


__all__ = [
    "EscenarioPoblacional",
    "simulate_population_forecast",
    "analyze_aging_trends",
    "evaluate_mortality_and_health",
    "map_reproductive_rights",
    "analyze_marriage_trends",
    "model_internal_migration",
    "project_labor_market_aging",
    "assess_population_policies",
]

