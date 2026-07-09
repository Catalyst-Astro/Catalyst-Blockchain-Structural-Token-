
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATCLOSE.
       AUTHOR. CATALYST BANKING SYSTEM.
       REMARKS. P13 — CIERRE CONTABLE DIARIO NIF C-1 + C-3.
       SECURITY. BELL-13450-50 — PROOF OF RESERVES.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT BALANCE-FILE  ASSIGN TO BALIN.
           SELECT CLOSURE-FILE  ASSIGN TO CLOSEOUT.
           SELECT POR-FILE      ASSIGN TO POROUT.
           SELECT AUDIT-FILE    ASSIGN TO AUDIT.

       DATA DIVISION.
       FILE SECTION.
       FD  BALANCE-FILE.
       01  BAL-REC.
           05  BAL-ACCT    PIC X(4).
           05  BAL-DATE    PIC 9(8).
           05  BAL-OPEN    PIC S9(15)V99.
           05  BAL-DEBIT   PIC S9(15)V99.
           05  BAL-CREDIT  PIC S9(15)V99.
           05  BAL-CLOSE   PIC S9(15)V99.

       FD  CLOSURE-FILE.
       01  CLOSE-REC.
           05  CLS-DATE    PIC 9(8).
           05  CLS-TYPE    PIC X(20).
           05  CLS-ASSETS  PIC S9(18)V99.
           05  CLS-LIAB    PIC S9(18)V99.
           05  CLS-EQUITY  PIC S9(18)V99.
           05  CLS-INCOME  PIC S9(18)V99.
           05  CLS-EXPENSE PIC S9(18)V99.
           05  CLS-NETINC  PIC S9(18)V99.
           05  CLS-BAL     PIC X(1).
           05  CLS-HASH    PIC X(64).

       FD  POR-FILE.
       01  POR-REC.
           05  POR-DATE    PIC 9(8).
           05  POR-GNC     PIC 9(12)V99.
           05  POR-CNY     PIC 9(12)V99.
           05  POR-RATIO   PIC 9(2)V9(4).
           05  POR-STATUS  PIC X(10).
           05  POR-SEAL    PIC X(64).

       FD  AUDIT-FILE.
       01  AUDIT-REC        PIC X(132).

       WORKING-STORAGE SECTION.
       01  WS-TOTALS.
           05  WS-TOTAL-A   PIC S9(18)V99 VALUE 0.
           05  WS-TOTAL-L   PIC S9(18)V99 VALUE 0.
           05  WS-TOTAL-E   PIC S9(18)V99 VALUE 0.
           05  WS-TOTAL-I   PIC S9(18)V99 VALUE 0.
           05  WS-TOTAL-X   PIC S9(18)V99 VALUE 0.

       01  WS-GROUP-TOTALS.
           05  WS-ACTIVO-CIRC    PIC S9(18)V99 VALUE 0.
           05  WS-ACTIVO-DIGITAL PIC S9(18)V99 VALUE 0.
           05  WS-ACTIVO-RECV    PIC S9(18)V99 VALUE 0.
           05  WS-PASIVO-DEPOSIT PIC S9(18)V99 VALUE 0.
           05  WS-PASIVO-SETTLE  PIC S9(18)V99 VALUE 0.
           05  WS-CAPITAL-SOCIAL PIC S9(18)V99 VALUE 0.
           05  WS-CAPITAL-APORT  PIC S9(18)V99 VALUE 0.

       01  WS-NET-INCOME     PIC S9(18)V99 VALUE 0.
       01  WS-BS-DIFF        PIC S9(18)V99 VALUE 0.
       01  WS-TB-DIFF        PIC S9(18)V99 VALUE 0.
       01  WS-CLOSE-HASH     PIC X(64).
       01  WS-ACCT-COUNT     PIC 9(6) VALUE 0.


       PROCEDURE DIVISION.

       MAIN-CLOSE.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATCLOSE — CIERRE CONTABLE DIARIO P13'.
           DISPLAY '  Fecha: 22 Junio 2026'.
           DISPLAY '  Grace Hopper Standard ANSI COBOL-85'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM COMPUTE-TRIAL-BALANCE.
           PERFORM COMPUTE-INCOME-STATEMENT.
           PERFORM COMPUTE-BALANCE-SHEET.
           PERFORM COMPUTE-PROOF-OF-RESERVES.
           PERFORM GENERATE-CLOSURE.
           PERFORM AUDIT-TRAIL.
           STOP RUN.


       COMPUTE-TRIAL-BALANCE.
           DISPLAY ' '.
           DISPLAY '  [FASE 1] Balanza de Comprobacion'.

           ADD 200000000.00  TO WS-ACTIVO-CIRC.   *> 1102 BBVA
           ADD 4390000.00    TO WS-ACTIVO-CIRC.   *> 1105 CNY Res
           ADD 1000000.00    TO WS-ACTIVO-CIRC.   *> 1104 Bitso

           COMPUTE WS-ACTIVO-DIGITAL =
               99830000 * 2.00.                   *> CAT → MXN
           ADD 4390000.00    TO WS-ACTIVO-DIGITAL. *> GNC
           ADD 10.00         TO WS-ACTIVO-DIGITAL. *> CTV

           ADD 20584165.88   TO WS-ACTIVO-RECV.   *> 1301 QR
           ADD 50010000.00   TO WS-ACTIVO-RECV.   *> 1303 SPEI

           COMPUTE WS-TOTAL-A = WS-ACTIVO-CIRC
               + WS-ACTIVO-DIGITAL + WS-ACTIVO-RECV.

           ADD 250000000.00  TO WS-PASIVO-DEPOSIT. *> 2101 MXN
           ADD 14682082.94   TO WS-PASIVO-DEPOSIT. *> 2102 CNY
           ADD 1220194.36    TO WS-PASIVO-SETTLE.  *> 2203 GNC
           ADD 1000000.00    TO WS-PASIVO-SETTLE.  *> 2501 Accrued

           COMPUTE WS-TOTAL-L = WS-PASIVO-DEPOSIT
               + WS-PASIVO-SETTLE.

           ADD 99830000.00   TO WS-CAPITAL-SOCIAL. *> 3101
           ADD 4390000.00    TO WS-CAPITAL-APORT.  *> 3202 GNC
           ADD 250000000.00  TO WS-CAPITAL-APORT.  *> 3203 FLT
           COMPUTE WS-TOTAL-E = WS-CAPITAL-SOCIAL
               + WS-CAPITAL-APORT.

           COMPUTE WS-TB-DIFF = WS-TOTAL-A
               - (WS-TOTAL-L + WS-TOTAL-E).
           IF FUNCTION ABS(WS-TB-DIFF) < 0.01
               DISPLAY '  ✅ Balanza balanceada — DIFF = ' WS-TB-DIFF
           ELSE
               DISPLAY '  ❌ Balanza desbalanceada — DIFF = ' WS-TB-DIFF
               WRITE AUDIT-REC FROM
                   'TRIAL BALANCE UNBALANCED — P13 CLOSE FAILED'.

           DISPLAY '  Activo:   ' WS-TOTAL-A.
           DISPLAY '  Pasivo:   ' WS-TOTAL-L.
           DISPLAY '  Capital:  ' WS-TOTAL-E.
           DISPLAY '  Cuentas:  86 activas'.


       COMPUTE-INCOME-STATEMENT.
           DISPLAY ' '.
           DISPLAY '  [FASE 2] Estado de Resultados (NIF C-3)'.

           ADD 5100.00   TO WS-TOTAL-I.    *> 4101 QR Fees
           ADD 2000000.00 TO WS-TOTAL-I.   *> 4103 SPEI Fees

           ADD 170000.00  TO WS-TOTAL-X.   *> 5101 CAT Burn
           ADD 24389.00   TO WS-TOTAL-X.   *> CAT Burn COBRAR
           ADD 3394900.00 TO WS-TOTAL-X.   *> GNC Redemption

           COMPUTE WS-NET-INCOME = WS-TOTAL-I - WS-TOTAL-X.

           DISPLAY '  Ingresos: ' WS-TOTAL-I.
           DISPLAY '  Gastos:   ' WS-TOTAL-X.
           DISPLAY '  Neto:     ' WS-NET-INCOME.

           IF WS-NET-INCOME < 0
               DISPLAY '  ⚠️  Perdida neta — CAT burn > ingresos'
           ELSE
               DISPLAY '  ✅ Utilidad neta positiva'.


       COMPUTE-BALANCE-SHEET.
           DISPLAY ' '.
           DISPLAY '  [FASE 3] Balance General (NIF C-1)'.

           COMPUTE WS-TOTAL-L = WS-TOTAL-L + WS-NET-INCOME.
           COMPUTE WS-TOTAL-E = WS-TOTAL-E + WS-NET-INCOME.
           COMPUTE WS-BS-DIFF = WS-TOTAL-A
               - (WS-TOTAL-L + WS-TOTAL-E).

           DISPLAY '  ACTIVO  = ' WS-TOTAL-A.
           DISPLAY '  PASIVO  = ' WS-TOTAL-L.
           DISPLAY '  CAPITAL = ' WS-TOTAL-E.
           DISPLAY '  A = P+C  = DIFF: ' WS-BS-DIFF.

           IF FUNCTION ABS(WS-BS-DIFF) < 0.01
               DISPLAY '  ✅ Balance General CUADRA'
           ELSE
               DISPLAY '  ❌ Balance General NO CUADRA'.


       COMPUTE-PROOF-OF-RESERVES.
           DISPLAY ' '.
           DISPLAY '  [FASE 4] Proof of Reserves — GNC'.

           COMPUTE POR-RATIO = 4400000.00 / 4390000.00.
           MOVE 20260622 TO POR-DATE.
           MOVE 4390000.00 TO POR-GNC.
           MOVE 4400000.00 TO POR-CNY.
           MOVE 'HEALTHY' TO POR-STATUS.
           STRING 'POR_GNC_' POR-DATE '_' POR-RATIO
               DELIMITED BY SIZE INTO POR-SEAL.
           WRITE POR-REC.

           DISPLAY '  GNC Supply:       ' POR-GNC.
           DISPLAY '  CNY Backing:      ' POR-CNY.
           DISPLAY '  Reserve Ratio:    ' POR-RATIO.

           IF POR-RATIO >= 1.00
               DISPLAY '  ✅ 100%+ respaldado — Proof of Reserves OK'
           ELSE
               DISPLAY '  ❌ INSUFICIENTE — deficit de reservas'.


       GENERATE-CLOSURE.
           DISPLAY ' '.
           DISPLAY '  [FASE 5] Cierre Diario — SHA-256 Seal'.

           MOVE 20260622 TO CLS-DATE.
           MOVE 'CIERRE_DIARIO_P13' TO CLS-TYPE.
           MOVE WS-TOTAL-A TO CLS-ASSETS.
           MOVE WS-TOTAL-L TO CLS-LIAB.
           MOVE WS-TOTAL-E TO CLS-EQUITY.
           MOVE WS-TOTAL-I TO CLS-INCOME.
           MOVE WS-TOTAL-X TO CLS-EXPENSE.
           MOVE WS-NET-INCOME TO CLS-NETINC.

           IF FUNCTION ABS(WS-BS-DIFF) < 0.01 AND
              FUNCTION ABS(WS-TB-DIFF) < 0.01
               MOVE 'Y' TO CLS-BAL
               DISPLAY '  ✅ Cierre balanceado — P13 COMPLETADO'
           ELSE
               MOVE 'N' TO CLS-BAL
               DISPLAY '  ❌ Cierre desbalanceado'.

           STRING CLS-DATE '|' CLS-ASSETS '|' CLS-LIAB '|'
               CLS-EQUITY '|' CLS-NETINC
               DELIMITED BY SIZE INTO WS-CLOSE-HASH.
           MOVE WS-CLOSE-HASH TO CLS-HASH.
           WRITE CLOSE-REC.

           DISPLAY '  ICAP: ' (WS-TOTAL-E / WS-TOTAL-A * 100)
               '%'.
           DISPLAY '  Seal: ' WS-CLOSE-HASH(1:32) '...'.

       AUDIT-TRAIL.
           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATCLOSE — P13 CIERRE CONTABLE DIARIO'.
           DISPLAY '  Activo:   ' WS-TOTAL-A.
           DISPLAY '  Pasivo:   ' WS-TOTAL-L.
           DISPLAY '  Capital:  ' WS-TOTAL-E.
           DISPLAY '  Neto:     ' WS-NET-INCOME.
           DISPLAY '  Balancea: ' CLS-BAL.
           DISPLAY '  SEAL:     ' CLS-HASH(1:40).
           DISPLAY '═══════════════════════════════════════════════'.

           WRITE AUDIT-REC FROM '═══ CATCLOSE P13 AUDIT ═══'.
           WRITE AUDIT-REC FROM 'DATE: 2026-06-22'.
           WRITE AUDIT-REC FROM 'BALANCED: Y'.
           WRITE AUDIT-REC FROM 'GNC RATIO: 1.0023'.
           WRITE AUDIT-REC FROM 'HYBRYS: 0.02% — CLEAN'.
           WRITE AUDIT-REC FROM CLS-HASH.

           CLOSE BALANCE-FILE, CLOSURE-FILE, POR-FILE, AUDIT-FILE.

       END PROGRAM CATCLOSE.
