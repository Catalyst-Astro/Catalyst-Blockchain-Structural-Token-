#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Catalyst Bank -- Back-Populate Accounting (June 17-22, 2026).

Reads all existing daily reports, QR triggers, treasury data, and transaction logs,
then creates full double-entry journal entries for all activity since June 17.

Usage:
    python scripts/backpopulate_accounting.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlalchemy.ext.asyncio import AsyncSession

from arke.db import async_session_maker, init_db
from arke.accounting.backpopulate import BackpopulateService


async def main() -> None:
    print("=" * 62)
    print("  CATALYST BANK -- Retro-Poblacion Contable")
    print("  Periodo: 17 Junio - 22 Junio 2026")
    print("=" * 62)

    # Initialize database tables
    print("\n[Init] Creando tablas contables...")
    await init_db()
    print("  [OK] Tablas listas")

    # Run back-population
    async with async_session_maker() as session:
        service = BackpopulateService(session, project_root=PROJECT_ROOT)
        summary = await service.run()

    # Print final summary
    print("\n" + "=" * 62)
    print("  RESUMEN FINAL")
    print("=" * 62)
    print(f"  Catalogo inicializado:  {summary['catalog_initialized']} cuentas")
    print(f"  Asientos creados:       {len(summary['entries_created'])}")
    for eid in summary["entries_created"]:
        print(f"    [OK] {eid}")
    print(f"  Cierres diarios:        {len(summary['closure_dates'])}")
    for cd in summary["closure_dates"]:
        print(f"    [OK] {cd}")
    print(f"  Conciliaciones:         {len(summary['reconciliations'])}")
    if summary["errors"]:
        print(f"  [!] Errores:            {len(summary['errors'])}")
        for err in summary["errors"]:
            print(f"    [X] {err}")
    else:
        print(f"  [OK] Sin errores")
    print("=" * 62)

    # Quick verification
    async with async_session_maker() as session:
        from arke.models import JournalEntry, DailyClosure, ReconciliationLog
        from sqlalchemy import select, func

        je_count = (await session.execute(select(func.count(JournalEntry.id)))).scalar_one()
        dc_count = (await session.execute(select(func.count(DailyClosure.id)))).scalar_one()
        rec_matched = (await session.execute(
            select(func.count(ReconciliationLog.id)).where(ReconciliationLog.is_matched == True)  # noqa: E712
        )).scalar_one()

        print(f"\n  VERIFICACION:")
        print(f"    Journal entries en DB:   {je_count}")
        print(f"    Daily closures en DB:    {dc_count}")
        print(f"    Conciliaciones matched:  {rec_matched}")
        status = "SALUDABLE" if je_count > 0 and rec_matched > 0 else "REVISAR"
        print(f"    Estado:                  [{('OK' if je_count > 0 else '!!')}] {status}")

    print("\n  Retro-poblacion completada.\n")


if __name__ == "__main__":
    asyncio.run(main())
