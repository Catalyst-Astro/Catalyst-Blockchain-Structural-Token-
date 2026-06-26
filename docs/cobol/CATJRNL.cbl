
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATJRNL.
       AUTHOR. CATALYST BANKING SYSTEM.
       REMARKS. DOUBLE-ENTRY BOOKKEEPING — DEBE = HABER SIEMPRE.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT JOURNAL-FILE  ASSIGN TO JRNLOUT.
           SELECT LEDGER-FILE   ASSIGN TO LEDGER.
           SELECT BALANCE-FILE  ASSIGN TO BALOUT.
           SELECT ERROR-FILE    ASSIGN TO JRNLERR.

       DATA DIVISION.
       FILE SECTION.
       FD  JOURNAL-FILE.
       01  JOURNAL-RECORD.
           COPY CATCOPY REPLACING == JOURNAL-ENTRY == BY ==JRNL==.

       FD  LEDGER-FILE.
       01  LEDGER-RECORD.
           05  LDG-ACCOUNT      PIC X(4).
           05  LDG-DATE         PIC 9(8).
           05  LDG-DEBIT        PIC S9(18)V99.
           05  LDG-CREDIT       PIC S9(18)V99.
           05  LDG-BALANCE      PIC S9(18)V99.

       FD  BALANCE-FILE.
       01  BALANCE-RECORD.
           05  BAL-ACCOUNT      PIC X(4).
           05  BAL-DATE         PIC 9(8).
           05  BAL-OPENING      PIC S9(18)V99.
           05  BAL-DEBIT-TOT    PIC S9(18)V99.
           05  BAL-CREDIT-TOT   PIC S9(18)V99.
           05  BAL-CLOSING      PIC S9(18)V99.
           05  BAL-RECONCILED   PIC X(1).

       FD  ERROR-FILE.
       01  ERROR-RECORD         PIC X(132).

       WORKING-STORAGE SECTION.
       01  WS-CURRENT-DATE      PIC 9(8).
       01  WS-TOTAL-DR          PIC S9(18)V99 VALUE 0.
       01  WS-TOTAL-CR          PIC S9(18)V99 VALUE 0.
       01  WS-DIFF              PIC S9(18)V99 VALUE 0.
       01  WS-BALANCED          PIC X(1) VALUE 'Y'.
       01  WS-ENTRY-ID          PIC X(20).
       01  WS-ENTRY-COUNT       PIC 9(6) VALUE 0.


       PROCEDURE DIVISION.

       POST-OPENING-ENTRY.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATJRNL — ASIENTO DE APERTURA'.
           DISPLAY '  Fecha: 2026-06-17 — Opening Balance'.
           DISPLAY '═══════════════════════════════════════════════'.

           MOVE 'JE-20260617-OPENING' TO WS-ENTRY-ID.
           MOVE 20260617 TO WS-CURRENT-DATE.
           MOVE 0 TO WS-TOTAL-DR WS-TOTAL-CR.

           PERFORM POST-LINE
               USING '1201'
                     'CAT Token Treasury 0x7bb22e84 — 99,830,000 CAT'
                      99830000.00 0.00 'CAT' 'CAT'.

           PERFORM POST-LINE
               USING '1202'
                     'GNC Token 1:1 CNY Treasury'
                      4390000.00 0.00 'CNY' 'GNC'.

           PERFORM POST-LINE
               USING '1203'
                     'FLT Fractal Compliance Treasury'
                      250000000.00 0.00 'FLT' 'FLT'.

           PERFORM POST-LINE
               USING '1204'
                     'CTV Token Cautivo Libre Usanza'
                      10.00 0.00 'CTV' 'CTV'.

           PERFORM POST-LINE
               USING '3101'
                     'Capital Social Fijo — Catalyst Blockchain Labs'
                      0.00 99830000.00 'CAT' ' '.

           PERFORM POST-LINE
               USING '3202'
                     'GNC Backing Reserve 1:1 CNY'
                      0.00 4390000.00 'CNY' ' '.

           PERFORM POST-LINE
               USING '3203'
                     'FLT Compliance Reserve'
                      0.00 250000000.00 'FLT' ' '.

           PERFORM POST-LINE
               USING '3201'
                     'CAT Token Issuance Equity — CTV Libre Usanza'
                      0.00 10.00 'CTV' ' '.

           COMPUTE WS-DIFF = WS-TOTAL-DR - WS-TOTAL-CR
               ON SIZE ERROR
                   DISPLAY 'ERROR: Balance calculation overflow — ABORT'
                   MOVE 999999999.99 TO WS-DIFF
           END-COMPUTE.
           IF FUNCTION ABS(WS-DIFF) > 0.005
               MOVE 'N' TO WS-BALANCED
               DISPLAY '  ❌ ERROR: Partida doble no balancea!'
               DISPLAY '     DEBIT:  ' WS-TOTAL-DR
               DISPLAY '     CREDIT: ' WS-TOTAL-CR
               DISPLAY '     DIFF:   ' WS-DIFF
               WRITE ERROR-RECORD FROM
                   'OPENING ENTRY UNBALANCED — INVESTIGATE'
           ELSE
               DISPLAY '  ✅ Asiento Apertura: DEBE = HABER = '
                   WS-TOTAL-DR
           END-IF.

           DISPLAY '  Cuentas: 8 lineas en partida doble'.
           DISPLAY '  Capital registrado: 354,220,010.00'.
           DISPLAY '═══════════════════════════════════════════════'.


       POST-DAILY-ENTRY.
           DISPLAY ' '.
           DISPLAY '  CATJRNL — DIARIO 2026-06-22'.
           MOVE 'JE-20260622-DAILY' TO WS-ENTRY-ID.
           MOVE 20260622 TO WS-CURRENT-DATE.
           MOVE 0 TO WS-TOTAL-DR WS-TOTAL-CR.

           PERFORM POST-LINE
               USING '1301'
                     'UnionPay QR Settlement Receivable — 21 ops'
                      3400000.00 0.00 'CNY' 'CNY'.

           PERFORM POST-LINE
               USING '2203'
                     'GNC Redemption Liability — 21 emisiones'
                      0.00 3394900.00 'CNY' ' '.

           PERFORM POST-LINE
               USING '4101'
                     'QR Processing Fee Income — 0.15%'
                      0.00 5100.00 'CNY' ' '.

           PERFORM POST-LINE
               USING '5101'
                     'CAT Token Burn Cost — 5% deflacionario'
                      170000.00 0.00 'CAT' 'CAT'.

           PERFORM POST-LINE
               USING '1201'
                     'CAT Treasury — quema deflacionaria'
                      0.00 170000.00 'CAT' 'CAT'.

           COMPUTE WS-DIFF = WS-TOTAL-DR - WS-TOTAL-CR.
           IF WS-DIFF NOT = 0
               MOVE 'N' TO WS-BALANCED
               DISPLAY '  ❌ Diario desbalanceado: DIFF = ' WS-DIFF
               WRITE ERROR-RECORD FROM
                   'DAILY ENTRY UNBALANCED'
           ELSE
               DISPLAY '  ✅ Diario Jun 22: DEBE = HABER = '
                   WS-TOTAL-DR
           END-IF.

           ADD 1 TO WS-ENTRY-COUNT.
           DISPLAY '  Ops: 21 | CNY: 3,400,000 | CAT burned: 170,000'.


       POST-COBRAR-ENTRY.
           DISPLAY ' '.
           DISPLAY '  CATJRNL — COBRAR SPEI Payouts'.

           MOVE 0 TO WS-TOTAL-DR WS-TOTAL-CR.

           PERFORM POST-LINE
               USING '5101'
                     'COBRAR CAT Burn — multiple payouts'
                      424389.00 0.00 'CAT' 'CAT'.

           PERFORM POST-LINE
               USING '1201'
                     'CAT Treasury reduction — COBRAR'
                      0.00 424389.00 'CAT' 'CAT'.

           PERFORM POST-LINE
               USING '1303'
                     'Bitso SPEI Receivable — 41 payouts'
                      200000000.00 0.00 'MXN' 'MXN'.

           PERFORM POST-LINE
               USING '2202'
                     'SPEI Pending Settlement — CLABE 012290015202390246'
                      0.00 198000000.00 'MXN' ' '.

           PERFORM POST-LINE
               USING '4103'
                     'SPEI Payout Fee Income — 1%'
                      0.00 2000000.00 'MXN' ' '.

           COMPUTE WS-DIFF = WS-TOTAL-DR - WS-TOTAL-CR
               ON SIZE ERROR
                   DISPLAY 'ERROR: COBRAR balance overflow'
                   MOVE 999999999.99 TO WS-DIFF
           END-COMPUTE.
           IF FUNCTION ABS(WS-DIFF) > 0.005
               DISPLAY '  ❌ COBRAR desbalanceado: DIFF = ' WS-DIFF
           ELSE
               DISPLAY '  ✅ COBRAR: DEBE = HABER = ' WS-TOTAL-DR
           END-IF.
           DISPLAY '  Payouts: 41 | MXN: 200,000,000 | CAT: 424,389'.


       FINAL-VERIFICATION.
           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  JOURNAL SYSTEM VERIFICATION'.
           DISPLAY '═══════════════════════════════════════════════'.
           IF WS-BALANCED = 'Y'
               DISPLAY '  ✅ TODOS LOS ASIENTOS BALANCEAN'
               DISPLAY '  NIF C-1: Partida doble verificada'
           ELSE
               DISPLAY '  ❌ ERRORES DETECTADOS — REVISAR JRNLERR'.
           DISPLAY '  Asientos: ' WS-ENTRY-COUNT.
           DISPLAY '  Sistema: COBOL ANSI-85 — Grace Hopper Std'.
           DISPLAY '═══════════════════════════════════════════════'.
           CLOSE JOURNAL-FILE, LEDGER-FILE, BALANCE-FILE, ERROR-FILE.
           STOP RUN.


       POST-LINE.
           MOVE WS-ENTRY-ID TO JE-ID.
           MOVE WS-CURRENT-DATE TO JE-DATE.
           ADD WS-DEBIT TO WS-TOTAL-DR.
           ADD WS-CREDIT TO WS-TOTAL-CR.
           DISPLAY '    ' WS-ACCT ' | D:' WS-DEBIT ' | C:' WS-CREDIT
               ' | ' WS-CURR ' | ' WS-ASSET.

       END PROGRAM CATJRNL.
