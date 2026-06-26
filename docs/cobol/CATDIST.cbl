       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATDIST.
       AUTHOR. CATALYST BANKING SYSTEM.
       DATE-WRITTEN. 2026-06-25.
       SECURITY. BELL-13450-50 APACHE-2.0.
       REMARKS. DISTRIBUCION MULTI-CUENTA BBVA — PLANEACION DE PROYECTO.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-Z-SERIES.
       OBJECT-COMPUTER. IBM-Z-SERIES.
       SPECIAL-NAMES. DECIMAL-POINT IS COMMA.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ACCOUNTS-FILE ASSIGN TO CATACCTS.
           SELECT DISTRIB-FILE  ASSIGN TO CATDISTR.
           SELECT REPORT-FILE   ASSIGN TO CATRPT.
           SELECT SWIFT-FILE    ASSIGN TO CATSWIFT.

       DATA DIVISION.
       FILE SECTION.
       FD  ACCOUNTS-FILE.
       01  ACCT-REC.
           05  ACCT-NUM        PIC 9(2).
           05  ACCT-CLABE      PIC X(18).
           05  ACCT-BANK       PIC X(20).
           05  ACCT-TYPE       PIC X(15).
           05  ACCT-CAPACITY   PIC 9(15)V99.
           05  ACCT-ALLOCATED  PIC 9(15)V99.
           05  ACCT-STATUS     PIC X(10).

       FD  DISTRIB-FILE.
       01  DIST-REC.
           05  DIST-ID         PIC 9(4).
           05  DIST-DATE       PIC 9(8).
           05  DIST-ACCT-FROM  PIC 9(2).
           05  DIST-AMOUNT     PIC 9(15)V99.
           05  DIST-TO-CLABE   PIC X(18).
           05  DIST-STATUS     PIC X(10).
           05  DIST-SEAL       PIC X(64).

       FD  REPORT-FILE.
       01  RPT-LINE           PIC X(132).

       FD  SWIFT-FILE.
       01  SWF-REC.
           05  SWF-CLABE       PIC X(18).
           05  SWF-AMOUNT      PIC 9(15)V99.
           05  SWF-UETR        PIC X(16).
           05  SWF-STATUS      PIC X(15).

       WORKING-STORAGE SECTION.

      *─── CONFIGURACION DEL PROYECTO ────────────────────────────
       01  PROJECT-CONFIG.
           05  PROJ-NAME       PIC X(40)
               VALUE 'CATALYST BBVA MULTI-ACCOUNT DISTRIBUTION'.
           05  PROJ-VERSION    PIC X(5)  VALUE '1.0.0'.
           05  PROJ-METHOD     PIC X(20)
               VALUE 'WATERFALL-HYBRID'.
           05  PROJ-PHASE      PIC X(20)
               VALUE 'EXECUTION'.

      *─── PARAMETROS DE DISTRIBUCION ────────────────────────────
       01  DISTRIB-PARAMS.
           05  TOTAL-FUNDS     PIC 9(18)V99
               VALUE 1553462360000,00.
           05  MAX-PER-ACCT    PIC 9(15)V99
               VALUE 500000000,00.
           05  MAX-PER-TX      PIC 9(15)V99
               VALUE 10000000,00.
           05  MIN-PER-TX      PIC 9(10)V99
               VALUE 1000,00.
           05  FEE-PCT         PIC 9V999  VALUE 0,001.
           05  RETRY-MAX       PIC 9(2)   VALUE 3.
           05  ACCT-COUNT      PIC 9(4)   VALUE 0.
           05  TX-COUNT        PIC 9(6)   VALUE 0.

      *─── CUENTAS BBVA ──────────────────────────────────────────
       01  BBVA-ACCOUNTS.
           05  BBVA-ACCT OCCURS 10 TIMES.
               10  BBVA-CLABE   PIC X(18).
               10  BBVA-TYPE    PIC X(15).
               10  BBVA-LIMIT   PIC 9(15)V99.

      *─── CONTADORES ────────────────────────────────────────────
       01  WS-COUNTERS.
           05  WS-I            PIC 9(4).
           05  WS-J            PIC 9(4).
           05  WS-ACCT-ACTIVE  PIC 9(4).
           05  WS-TX-DONE      PIC 9(6).
           05  WS-TX-FAIL      PIC 9(6).
           05  WS-TX-RETRY     PIC 9(6).
           05  WS-BATCH-COUNT  PIC 9(4).
           05  WS-SWIFT-COUNT  PIC 9(4).

      *─── MONTOS ─────────────────────────────────────────────────
       01  WS-AMOUNTS.
           05  WS-REMAINING    PIC 9(18)V99.
           05  WS-CURRENT-TX   PIC 9(15)V99.
           05  WS-TOTAL-SENT   PIC 9(18)V99.
           05  WS-TOTAL-FEE    PIC 9(18)V99.
           05  WS-NET-SENT     PIC 9(18)V99.
           05  WS-BATCH-TOTAL  PIC 9(15)V99.
           05  WS-SWIFT-AMT    PIC 9(18)V99.

      *─── SEALS ──────────────────────────────────────────────────
       01  WS-SEALS.
           05  WS-BATCH-SEAL   PIC X(64).
           05  WS-MASTER-SEAL  PIC X(64).
           05  WS-SWIFT-SEAL   PIC X(64).

      *─── REPORTE ───────────────────────────────────────────────
       01  WS-REPORT.
           05  WS-RPT-DATE     PIC 9(8)  VALUE 20260625.
           05  WS-RPT-TIME     PIC 9(6)  VALUE 100000.
           05  WS-RPT-AUTHOR   PIC X(20)
               VALUE 'CATALYST COBOL P13'.

       PROCEDURE DIVISION.

       MAIN.
           PERFORM INIT-PROJECT.
           PERFORM SETUP-ACCOUNTS.
           PERFORM VALIDATE-CAPACITY.
           PERFORM EXECUTE-DISTRIBUTION.
           PERFORM GENERATE-SWIFT.
           PERFORM FINAL-REPORT.
           STOP RUN.

      *─── FASE 1: INICIO DEL PROYECTO ───────────────────────────

       INIT-PROJECT.
           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  ' PROJ-NAME.
           DISPLAY '  Version ' PROJ-VERSION
               ' | Metodo ' PROJ-METHOD.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY ' '.
           DISPLAY '  FONDOS TOTALES: $' TOTAL-FUNDS ' MXN'.
           DISPLAY '  MAX POR CUENTA: $' MAX-PER-ACCT ' MXN'.
           DISPLAY '  MAX POR TX:     $' MAX-PER-TX ' MXN'.
           DISPLAY '  COMISION:       ' FEE-PCT.

      *─── FASE 2: CONFIGURACION DE CUENTAS ──────────────────────

       SETUP-ACCOUNTS.
           DISPLAY ' '.
           DISPLAY '  [FASE 2] CONFIGURACION DE CUENTAS BBVA'.

           MOVE '012290015202390246' TO BBVA-CLABE(1).
           MOVE 'CONCENTRADORA'      TO BBVA-TYPE(1).
           MOVE 500000000,00         TO BBVA-LIMIT(1).

           MOVE '012180015123243964' TO BBVA-CLABE(2).
           MOVE 'OPERADORA'          TO BBVA-TYPE(2).
           MOVE 500000000,00         TO BBVA-LIMIT(2).

           MOVE '012290015202390259' TO BBVA-CLABE(3).
           MOVE 'CHEQUES PRINCIPAL'  TO BBVA-TYPE(3).
           MOVE 300000000,00         TO BBVA-LIMIT(3).

           MOVE '012290015202390262' TO BBVA-CLABE(4).
           MOVE 'DEBITO'             TO BBVA-TYPE(4).
           MOVE 200000000,00         TO BBVA-LIMIT(4).

           MOVE '012290015202390275' TO BBVA-CLABE(5).
           MOVE 'CREDITO'            TO BBVA-TYPE(5).
           MOVE 200000000,00         TO BBVA-LIMIT(5).

           MOVE '012290015202390288' TO BBVA-CLABE(6).
           MOVE 'AHORRO INVERSION'   TO BBVA-TYPE(6).
           MOVE 500000000,00         TO BBVA-LIMIT(6).

           MOVE '012290015202390291' TO BBVA-CLABE(7).
           MOVE 'PAGOS SERVICIOS'    TO BBVA-TYPE(7).
           MOVE 100000000,00         TO BBVA-LIMIT(7).

           MOVE '072290015202390252' TO BBVA-CLABE(8).
           MOVE 'CRYPTO BRIDGE'      TO BBVA-TYPE(8).
           MOVE 300000000,00         TO BBVA-LIMIT(8).

           MOVE '014290015202390247' TO BBVA-CLABE(9).
           MOVE 'SANTANDER RECAUD'   TO BBVA-TYPE(9).
           MOVE 200000000,00         TO BBVA-LIMIT(9).

           MOVE '021290015202390248' TO BBVA-CLABE(10).
           MOVE 'HSBC PAGADORA'      TO BBVA-TYPE(10).
           MOVE 200000000,00         TO BBVA-LIMIT(10).

           MOVE 10 TO WS-ACCT-ACTIVE.

           PERFORM VARYING WS-I FROM 1 BY 1
                   UNTIL WS-I > WS-ACCT-ACTIVE
               MOVE WS-I TO ACCT-NUM
               MOVE BBVA-CLABE(WS-I) TO ACCT-CLABE
               MOVE 'BBVA BANCOMER' TO ACCT-BANK
               MOVE BBVA-TYPE(WS-I) TO ACCT-TYPE
               MOVE BBVA-LIMIT(WS-I) TO ACCT-CAPACITY
               MOVE 0 TO ACCT-ALLOCATED
               MOVE 'ACTIVE' TO ACCT-STATUS
               WRITE ACCT-REC
               DISPLAY '  [' WS-I '] ' BBVA-TYPE(WS-I)
                   ' | ' BBVA-CLABE(WS-I)
                   ' | LIM $' BBVA-LIMIT(WS-I) ' MXN'
           END-PERFORM.

           DISPLAY '  CUENTAS ACTIVAS: ' WS-ACCT-ACTIVE.

      *─── FASE 3: VALIDACION DE CAPACIDAD ──────────────────────

       VALIDATE-CAPACITY.
           DISPLAY ' '.
           DISPLAY '  [FASE 3] VALIDACION DE CAPACIDAD'.

           MOVE 0 TO WS-TOTAL-CAPACITY.
           PERFORM VARYING WS-I FROM 1 BY 1
                   UNTIL WS-I > WS-ACCT-ACTIVE
               ADD BBVA-LIMIT(WS-I) TO WS-TOTAL-CAPACITY
           END-PERFORM.

           DISPLAY '  CAPACIDAD TOTAL: $' WS-TOTAL-CAPACITY ' MXN'.
           DISPLAY '  FONDOS A DISTRIBUIR: $' TOTAL-FUNDS ' MXN'.

           IF TOTAL-FUNDS > WS-TOTAL-CAPACITY
               DISPLAY '  ❌ ERROR: FONDOS EXCEDEN CAPACIDAD'.
               DISPLAY '  FALTAN $'
                   (TOTAL-FUNDS - WS-TOTAL-CAPACITY) ' MXN'.
               DISPLAY '  SE REQUIEREN MAS CUENTAS BBVA'.
               STOP RUN
           ELSE
               DISPLAY '  ✅ CAPACIDAD SUFICIENTE'.
               DISPLAY '  MARGEN: $'
                   (WS-TOTAL-CAPACITY - TOTAL-FUNDS) ' MXN'.

      *─── FASE 4: EJECUCION DE DISTRIBUCION ────────────────────

       EXECUTE-DISTRIBUTION.
           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  [FASE 4] EJECUCION DE DISTRIBUCION'.
           DISPLAY '═══════════════════════════════════════════════'.

           MOVE TOTAL-FUNDS TO WS-REMAINING.
           MOVE 0 TO WS-TOTAL-SENT WS-TOTAL-FEE WS-TX-DONE
                     WS-TX-FAIL WS-BATCH-COUNT.

      *    BUCLE PRINCIPAL: distribuir hasta agotar fondos
           MOVE 1 TO WS-I.
           MOVE 0 TO WS-BATCH-TOTAL.

           PERFORM UNTIL WS-REMAINING <= 0
               COMPUTE WS-CURRENT-TX =
                   FUNCTION MIN(WS-REMAINING, MAX-PER-TX)
               COMPUTE FEE-AMT = WS-CURRENT-TX * FEE-PCT
               COMPUTE NET-AMT = WS-CURRENT-TX - FEE-AMT

               ADD WS-CURRENT-TX TO WS-TOTAL-SENT
               ADD FEE-AMT TO WS-TOTAL-FEE
               ADD 1 TO WS-TX-DONE

               MOVE WS-CURRENT-TX TO DIST-AMOUNT
               MOVE BBVA-CLABE(WS-I) TO DIST-TO-CLABE
               MOVE WS-I TO DIST-ACCT-FROM
               MOVE 20260625 TO DIST-DATE
               MOVE 'EXECUTED' TO DIST-STATUS
               ADD WS-TX-DONE TO DIST-ID
               WRITE DIST-REC

               ADD WS-CURRENT-TX TO WS-BATCH-TOTAL

      *        Si lote llega a 100 TXs o cuenta llena, cambiar
               IF WS-TX-DONE / 100 = 0 OR
                  WS-BATCH-TOTAL >= BBVA-LIMIT(WS-I)
                   ADD 1 TO WS-I
                   IF WS-I > WS-ACCT-ACTIVE
                       MOVE 1 TO WS-I
                   END-IF
                   MOVE 0 TO WS-BATCH-TOTAL
                   ADD 1 TO WS-BATCH-COUNT
                   DISPLAY '  LOTE ' WS-BATCH-COUNT
                       ' COMPLETADO. CUENTA ' WS-I
                       ' | ENVIADO $' WS-TOTAL-SENT ' MXN'
               END-IF

               SUBTRACT WS-CURRENT-TX FROM WS-REMAINING
           END-PERFORM.

           COMPUTE WS-NET-SENT = WS-TOTAL-SENT - WS-TOTAL-FEE.

           DISPLAY ' '.
           DISPLAY '  DISTRIBUCION COMPLETADA:'.
           DISPLAY '  TX EJECUTADAS: ' WS-TX-DONE.
           DISPLAY '  TX FALLIDAS:   ' WS-TX-FAIL.
           DISPLAY '  LOTES:         ' WS-BATCH-COUNT.
           DISPLAY '  TOTAL ENVIADO: $' WS-TOTAL-SENT ' MXN'.
           DISPLAY '  COMISIONES:    $' WS-TOTAL-FEE ' MXN'.
           DISPLAY '  NETO BBVA:     $' WS-NET-SENT ' MXN'.

      *─── FASE 5: SWIFT MT103 ──────────────────────────────────

       GENERATE-SWIFT.
           DISPLAY ' '.
           DISPLAY '  [FASE 5] GENERANDO SWIFT MT103'.

           MOVE 0 TO WS-SWIFT-COUNT WS-SWIFT-AMT.

           PERFORM VARYING WS-I FROM 1 BY 1
                   UNTIL WS-I > WS-ACCT-ACTIVE
               IF BBVA-LIMIT(WS-I) > 300000000,00
                   MOVE BBVA-CLABE(WS-I) TO SWF-CLABE
                   MOVE BBVA-LIMIT(WS-I) TO SWF-AMOUNT
                   STRING 'UETR-CAT-' WS-I '-' WS-RPT-DATE
                       DELIMITED BY SIZE INTO SWF-UETR
                   MOVE 'MT103 FORMATTED' TO SWF-STATUS
                   ADD BBVA-LIMIT(WS-I) TO WS-SWIFT-AMT
                   ADD 1 TO WS-SWIFT-COUNT
                   WRITE SWF-REC
               END-IF
           END-PERFORM.

           DISPLAY '  SWIFT MT103 GENERADOS: ' WS-SWIFT-COUNT.
           DISPLAY '  MONTO SWIFT TOTAL: $' WS-SWIFT-AMT ' MXN'.

      *─── FASE 6: REPORTE FINAL ────────────────────────────────

       FINAL-REPORT.
           OPEN OUTPUT REPORT-FILE.

           MOVE '═══════════════════════════════════════════════'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  CATALYST BANK — PLANEACION DE PROYECTO'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  DISTRIBUCION MULTI-CUENTA BBVA'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '═══════════════════════════════════════════════'
               TO RPT-LINE. WRITE RPT-LINE.

           MOVE ' ' TO RPT-LINE. WRITE RPT-LINE.

           MOVE '  ── METODOLOGIA ──' TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  WATERFALL-HYBRID: Fases secuenciales'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  con revisiones regulatorias en cada fase.'
               TO RPT-LINE. WRITE RPT-LINE.

           MOVE ' ' TO RPT-LINE. WRITE RPT-LINE.

           MOVE '  ── FASES DEL PROYECTO ──'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  F1 ANALISIS:     Requisitos regulatorios'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  F2 DISENO:       Arquitectura multi-cuenta'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  F3 DESARROLLO:   COBOL CATDIST + CATBANK'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  F4 PRUEBAS:      SPEI sandbox + CEP'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  F5 DESPLIEGUE:   Produccion BBVA 10 CLABEs'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  F6 MANTENIMIENTO:Monitoreo + Auditoria'
               TO RPT-LINE. WRITE RPT-LINE.

           MOVE ' ' TO RPT-LINE. WRITE RPT-LINE.

           MOVE '  ── CUENTAS BBVA ──' TO RPT-LINE. WRITE RPT-LINE.
           PERFORM VARYING WS-I FROM 1 BY 1
                   UNTIL WS-I > WS-ACCT-ACTIVE
               STRING '  [' WS-I '] ' BBVA-TYPE(WS-I)
                   ' | ' BBVA-CLABE(WS-I)
                   ' | CAP $' BBVA-LIMIT(WS-I) ' MXN'
                   DELIMITED BY SIZE INTO RPT-LINE
               WRITE RPT-LINE
           END-PERFORM.

           MOVE ' ' TO RPT-LINE. WRITE RPT-LINE.

           MOVE '  ── RESULTADOS ──' TO RPT-LINE. WRITE RPT-LINE.
           STRING '  TX EJECUTADAS: ' WS-TX-DONE
               DELIMITED BY SIZE INTO RPT-LINE. WRITE RPT-LINE.
           STRING '  TOTAL ENVIADO: $' WS-TOTAL-SENT ' MXN'
               DELIMITED BY SIZE INTO RPT-LINE. WRITE RPT-LINE.
           STRING '  COMISIONES:    $' WS-TOTAL-FEE ' MXN'
               DELIMITED BY SIZE INTO RPT-LINE. WRITE RPT-LINE.
           STRING '  NETO BBVA:     $' WS-NET-SENT ' MXN'
               DELIMITED BY SIZE INTO RPT-LINE. WRITE RPT-LINE.
           STRING '  SWIFT MT103:   ' WS-SWIFT-COUNT ' mensajes'
               DELIMITED BY SIZE INTO RPT-LINE. WRITE RPT-LINE.

           MOVE ' ' TO RPT-LINE. WRITE RPT-LINE.
           MOVE '═══════════════════════════════════════════════'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '  CATDIST PROYECTO — PLANEACION COMPLETADA'
               TO RPT-LINE. WRITE RPT-LINE.
           MOVE '═══════════════════════════════════════════════'
               TO RPT-LINE. WRITE RPT-LINE.

           CLOSE REPORT-FILE.
           CLOSE ACCOUNTS-FILE.
           CLOSE DISTRIB-FILE.
           CLOSE SWIFT-FILE.

           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  PROYECTO CATDIST — COMPLETADO'.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  METODO:    ' PROJ-METHOD.
           DISPLAY '  CUENTAS:   ' WS-ACCT-ACTIVE.
           DISPLAY '  TX TOTAL:  ' WS-TX-DONE.
           DISPLAY '  SWIFT:     ' WS-SWIFT-COUNT.
           DISPLAY '  ENVIADO:   $' WS-TOTAL-SENT ' MXN'.
           DISPLAY '  NETO BBVA: $' WS-NET-SENT ' MXN'.
           DISPLAY '  REPORTE:   CATRPT'.
           DISPLAY '═══════════════════════════════════════════════'.

       END PROGRAM CATDIST.
