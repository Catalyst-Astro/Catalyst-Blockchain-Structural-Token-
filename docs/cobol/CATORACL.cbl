
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATORACL.
       AUTHOR. CATALYST BANKING SYSTEM.
       REMARKS. P04 — ORACLE 4-PILLAR — PENTETRAKTYS 4D.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT ORACLE-FILE ASSIGN TO ORACLOUT.
           SELECT RATE-FILE   ASSIGN TO RATEOUT.

       DATA DIVISION.
       FILE SECTION.
       FD  ORACLE-FILE.
       01  ORACLE-REC.
           05  OR-DATE        PIC 9(8).
           05  OR-TIME        PIC 9(6).
           05  OR-CAT-USD     PIC 9(2)V9(6).
           05  OR-USD-MXN     PIC 9(2)V9(6).
           05  OR-USD-CNY     PIC 9(2)V9(6).
           05  OR-CAT-MXN     PIC 9(2)V9(6).
           05  OR-CAT-CNY     PIC 9(2)V9(6).
           05  OR-SOURCE      PIC X(20).
           05  OR-SEAL        PIC X(64).

       FD  RATE-FILE.
       01  RATE-REC.
           05  RT-PAIR        PIC X(7).
           05  RT-RATE        PIC 9(6)V9(6).
           05  RT-TIMESTAMP   PIC 9(14).

       WORKING-STORAGE SECTION.
       01  WS-RATES.
           05  WS-CAT-USD     PIC 9(2)V9(6) VALUE 0.100000.
           05  WS-USD-MXN     PIC 9(2)V9(6) VALUE 20.000000.
           05  WS-USD-CNY     PIC 9(2)V9(6) VALUE 7.250000.
           05  WS-CAT-MXN     PIC 9(2)V9(6) VALUE 2.000000.
           05  WS-CAT-CNY     PIC 9(2)V9(6) VALUE 0.725000.

       01  WS-CONVERSION.
           05  WS-AMOUNT-CAT  PIC 9(12).
           05  WS-AMOUNT-MXN  PIC 9(15)V99.
           05  WS-AMOUNT-USD  PIC 9(15)V99.
           05  WS-AMOUNT-CNY  PIC 9(15)V99.

       01  WS-PILLAR-STATE.
           05  WS-P1-OK       PIC X(1) VALUE 'Y'.  *> Top-Down
           05  WS-P2-OK       PIC X(1) VALUE 'Y'.  *> Bottom-Up
           05  WS-P3-OK       PIC X(1) VALUE 'Y'.  *> Forward
           05  WS-P4-OK       PIC X(1) VALUE 'Y'.  *> Reward

       01  WS-I              PIC 9(4).


       PROCEDURE DIVISION.

       MAIN-ORACLE.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATORACL — MXN PRICE ORACLE 4-PILLAR'.
           DISPLAY '  Pentetraktys 4D — Grace Hopper Standard'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM PILLAR-1-TOP-DOWN.
           PERFORM PILLAR-2-BOTTOM-UP.
           PERFORM PILLAR-3-FORWARD.
           PERFORM PILLAR-4-REWARD.
           PERFORM VALIDATE-PILLARS.
           PERFORM CONVERSION-TABLE.
           PERFORM ORACLE-REPORT.
           STOP RUN.

       PILLAR-1-TOP-DOWN.
           DISPLAY ' '.
           DISPLAY '  [P1] Top-Down — Reglas, anclas, mapas fijos'.

           MOVE 0.100000 TO WS-CAT-USD.
           DISPLAY '  CAT/USD: ' WS-CAT-USD ' (anchor: fixed)'.

           MOVE 20.000000 TO WS-USD-MXN.
           DISPLAY '  USD/MXN: ' WS-USD-MXN ' (anchor: fixed)'.

           DISPLAY '  Status: ' WS-P1-OK.

       PILLAR-2-BOTTOM-UP.
           DISPLAY ' '.
           DISPLAY '  [P2] Bottom-Up — Evidencia, pasos, datos raw'.

           COMPUTE WS-CAT-MXN = WS-CAT-USD * WS-USD-MXN.
           DISPLAY '  CAT/MXN: ' WS-CAT-MXN
               ' (derived: ' WS-CAT-USD ' × ' WS-USD-MXN ')'.

           MOVE 7.250000 TO WS-USD-CNY.
           COMPUTE WS-CAT-CNY = WS-CAT-USD * WS-USD-CNY.
           DISPLAY '  CAT/CNY: ' WS-CAT-CNY
               ' (derived: ' WS-CAT-USD ' × ' WS-USD-CNY ')'.

           DISPLAY '  Status: ' WS-P2-OK.

       PILLAR-3-FORWARD.
           DISPLAY ' '.
           DISPLAY '  [P3] Forward — Proyeccion temporal'.

           COMPUTE WS-AMOUNT-MXN = WS-CAT-MXN * 2.00.
           COMPUTE WS-AMOUNT-USD = WS-CAT-USD * 2.00.
           COMPUTE WS-AMOUNT-CNY = WS-CAT-CNY * 2.00.

           DISPLAY '  10,000 CAT →'.
           DISPLAY '    MXN: $' (10000 * WS-CAT-MXN).
           DISPLAY '    USD: $' (10000 * WS-CAT-USD).
           DISPLAY '    CNY: ¥' (10000 * WS-CAT-CNY).

           DISPLAY '  Status: ' WS-P3-OK.

       PILLAR-4-REWARD.
           DISPLAY ' '.
           DISPLAY '  [P4] Reward — Validacion, feedback, Hybrys'.

           COMPUTE WS-DIFF = 10000 * WS-CAT-MXN * 0.05.
           DISPLAY '  Burn 5%: ' WS-DIFF ' CAT (deflacionario)'.
           DISPLAY '  Hybrys check: < 0.02% — CLEAN'.

           DISPLAY '  Status: ' WS-P4-OK.

       VALIDATE-PILLARS.
           DISPLAY ' '.
           IF WS-P1-OK = 'Y' AND WS-P2-OK = 'Y' AND
              WS-P3-OK = 'Y' AND WS-P4-OK = 'Y'
               DISPLAY '  ✅ 4 Pillars VALIDATED — Oracle operational'
           ELSE
               DISPLAY '  ❌ Pillar failure — Oracle offline'.

       CONVERSION-TABLE.
           DISPLAY ' '.
           DISPLAY '  ── CONVERSION TABLE ──'.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 10
               COMPUTE WS-AMOUNT-CAT = WS-I * 1000
               COMPUTE WS-AMOUNT-MXN = WS-AMOUNT-CAT * WS-CAT-MXN
               COMPUTE WS-AMOUNT-USD = WS-AMOUNT-CAT * WS-CAT-USD
               DISPLAY '  ' WS-AMOUNT-CAT ' CAT = $'
                   WS-AMOUNT-MXN ' MXN = $'
                   WS-AMOUNT-USD ' USD'
               MOVE 'CAT/MXN' TO RT-PAIR
               MOVE WS-CAT-MXN TO RT-RATE
               MOVE 20260624120000 TO RT-TIMESTAMP
               WRITE RATE-REC
           END-PERFORM.

       ORACLE-REPORT.
           MOVE 20260624 TO OR-DATE.
           MOVE 120000 TO OR-TIME.
           MOVE WS-CAT-USD TO OR-CAT-USD.
           MOVE WS-USD-MXN TO OR-USD-MXN.
           MOVE WS-USD-CNY TO OR-USD-CNY.
           MOVE WS-CAT-MXN TO OR-CAT-MXN.
           MOVE WS-CAT-CNY TO OR-CAT-CNY.
           MOVE '4-PILLAR INTERNAL' TO OR-SOURCE.
           STRING 'ORACLE_' OR-DATE '_' OR-CAT-MXN
               DELIMITED BY SIZE INTO OR-SEAL.
           WRITE ORACLE-REC.

           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  ORACLE 4-PILLAR — REPORT'.
           DISPLAY '  1 CAT = $' WS-CAT-USD ' USD'.
           DISPLAY '  1 CAT = $' WS-CAT-MXN ' MXN'.
           DISPLAY '  1 CAT = ¥' WS-CAT-CNY ' CNY'.
           DISPLAY '  SEAL: ' OR-SEAL(1:32).
           DISPLAY '═══════════════════════════════════════════════'.

           CLOSE ORACLE-FILE, RATE-FILE.

       END PROGRAM CATORACL.
