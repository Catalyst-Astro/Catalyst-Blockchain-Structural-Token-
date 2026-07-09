from dataclasses import dataclass
from typing import Dict

@dataclass
class Modulo:
    descripcion: str
    prompt_base: str


INDICE_MODULOS: Dict[str, Modulo] = {
    "Poblacion": Modulo(
        descripcion="Analisis demografico prospectivo, envejecimiento, salud publica y migracion interna.",
        prompt_base="""
# Analisis demografico con proyecciones a 2050
input_data = load_population_data('Mexico_2010')
forecast = simulate_population_dynamics(input_data, years=40)
plot_demographic_pyramid(forecast, year=2050)
""",
    ),
    "DesarrolloUrbano": Modulo(
        descripcion="Estructura metropolitana, movilidad y desigualdad territorial.",
        prompt_base="""
# Evaluacion de crecimiento urbano y desigualdad regional
urban_data = load_spatial_data('ciudades_mexico.geojson')
inequality = calculate_gini_by_region(urban_data)
render_map(inequality, title='Indice de Gini Regional')
""",
    ),
    "Migraciones": Modulo(
        descripcion="Migracion internacional, remesas y dinamicas transnacionales.",
        prompt_base="""
# Simulacion de flujos migratorios Mexico-EUA
migration_flows = model_migration('MX', 'US', years=30)
plot_migration_trends(migration_flows)
""",
    ),
    "MedioAmbiente": Modulo(
        descripcion="Agua, aire, biodiversidad y riesgo climatico.",
        prompt_base="""
# Diagnostico ambiental multisectorial
env_indicators = assess_environmental_health('MX', sectors=['agua', 'aire', 'suelos'])
generate_policy_alerts(env_indicators, threshold=0.7)
""",
    ),
    "DesigualdadSocial": Modulo(
        descripcion="Pobreza multidimensional, salud, educacion y territorio.",
        prompt_base="""
# Medicion de desigualdad social en municipios
social_data = load_social_indicators('INEGI_MUN_2020')
poverty_map = map_multidimensional_poverty(social_data)
display(poverty_map)
""",
    ),
    "MovimientosSociales": Modulo(
        descripcion="Actores colectivos y repertorios de accion.",
        prompt_base="""
# Mapeo de actores sociales por causa y territorio
movements = extract_social_movement_networks('protestas_2000_2020.json')
visualize_network(movements, dimension='causas')
""",
    ),
    "Educacion": Modulo(
        descripcion="Reformas curriculares y desigualdad educativa.",
        prompt_base="""
# Evaluacion de brechas educativas y efectividad curricular
edu_data = load_education_data('SEP_2015_2020')
learning_gaps = compute_learning_inequality(edu_data)
report(learning_gaps)
""",
    ),
    "RelacionesGenero": Modulo(
        descripcion="Derechos sexuales, violencia de genero y participacion politica.",
        prompt_base="""
# Diagnostico de violencia y brechas de genero por entidad
gender_data = load_gender_metrics('MX_2020')
analyze_gender_violence(gender_data)
""",
    ),
    "CrecimientoEconomico": Modulo(
        descripcion="Pobreza, empleo y politica fiscal.",
        prompt_base="""
# Evaluacion de impacto distributivo de politicas economicas
econ_data = load_macro_fiscal_data('SHCP_2000_2020')
simulate_equity_scenarios(econ_data)
""",
    ),
    "Microeconomia": Modulo(
        descripcion="Competencia, servicios publicos y regulacion.",
        prompt_base="""
# Evaluacion de competencia en telecomunicaciones y bancos
sector_data = load_sector_data('telecomunicaciones')
simulate_market_structure(sector_data)
""",
    ),
    "EconomiaRural": Modulo(
        descripcion="Tierra, ejido, migracion rural y subsidios.",
        prompt_base="""
# Modelo de transicion rural y subsidios al agro
rural_model = simulate_rural_transition('PROCAMPO', years=20)
evaluate_impact(rural_model)
""",
    ),
    "RelacionesInternacionales": Modulo(
        descripcion="TLCAN, migracion y gobernanza global.",
        prompt_base="""
# Analisis de insercion internacional de Mexico
foreign_policy = map_trade_and_migration_links('MX')
analyze_foreign_influence(foreign_policy)
""",
    ),
    "PoliticasPublicas": Modulo(
        descripcion="Evaluacion, profesionalizacion y federalismo.",
        prompt_base="""
# Evaluacion institucional de politicas publicas
policy_data = load_policy_evaluation_reports('CONEVAL')
assess_policy_effectiveness(policy_data)
""",
    ),
    "InstitucionesPoliticas": Modulo(
        descripcion="Partidos, elecciones y reformas democraticas.",
        prompt_base="""
# Simulacion de escenarios institucionales en regimenes de coalicion
simulate_governance_models('Mexico', variables=['coaliciones', 'fragmentacion'])
""",
    ),
    "SeguridadNacional": Modulo(
        descripcion="Crimen organizado, militarizacion y derechos humanos.",
        prompt_base="""
# Monitoreo de violencia e inteligencia territorial
violence_data = load_security_metrics('SESNSP')
generate_risk_zones_map(violence_data)
""",
    ),
    "CulturasIdentidades": Modulo(
        descripcion="Nacion, diversidad y discursos simbolicos.",
        prompt_base="""
# Analisis de narrativas nacionales y su evolucion
discourses = extract_identity_narratives('medios_1980_2020.txt')
topic_modeling(discourses)
""",
    ),
}

if __name__ == "__main__":
    for nombre, mod in INDICE_MODULOS.items():
        print(f"{nombre}: {mod.descripcion}\n{mod.prompt_base}\n")
