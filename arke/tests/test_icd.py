from arke.icd import ContextoEvaluacion, calcular_icd


def test_calcular_icd_range() -> None:
    ctx = ContextoEvaluacion(
        actor="persona",
        intencion="ayudar",
        impacto_ambiental=0.2,
        impacto_social=0.5,
        riesgo=0.3,
        insights=["dato1", "dato2"],
    )
    icd = calcular_icd(ctx)
    assert 0 <= icd <= 1


def test_calcular_icd_extremos() -> None:
    ctx = ContextoEvaluacion(
        actor="bot",
        intencion="dañar",
        impacto_ambiental=-1.0,
        impacto_social=-1.0,
        riesgo=1.0,
        insights=[],
    )
    icd = calcular_icd(ctx)
    assert icd == 0
