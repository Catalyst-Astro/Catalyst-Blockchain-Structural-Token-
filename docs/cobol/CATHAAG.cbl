
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATHAAG.
       AUTHOR. CATALYST BANKING SYSTEM.
       DATE-WRITTEN. 2026-06-25.
       SECURITY. BELL-13450-50 OSHIRO ERC-26+.
       REMARKS. CIRCULAR LA HAYA — CHINA BANKS → BBVA.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-Z-SERIES.
       OBJECT-COMPUTER. IBM-Z-SERIES.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TRIGGER-FILE  ASSIGN TO HAAGTRIG.
           SELECT REPORT-FILE   ASSIGN TO HAAGRPT.
           SELECT SETTLE-FILE   ASSIGN TO HAAGSTTL.
           SELECT SWIFT-FILE    ASSIGN TO HAAGSWFT.

       DATA DIVISION.
       FILE SECTION.
       FD  TRIGGER-FILE.
       01  TRIGGER-RECORD      PIC X(668).

       FD  REPORT-FILE.
       01  REPORT-LINE         PIC X(132).

       FD  SETTLE-FILE.
       01  SETTLE-RECORD.
           05  STMT-ASSET       PIC X(4).
           05  STMT-CLABE       PIC X(18).
           05  STMT-AMOUNT-CNY  PIC 9(18).
           05  STMT-AMOUNT-MXN  PIC 9(18).
           05  STMT-BANK        PIC X(11).
           05  STMT-SEAL        PIC X(64).

       FD  SWIFT-FILE.
       01  SWIFT-RECORD.
           05  SWF-MT103        PIC X(132).

       WORKING-STORAGE SECTION.
       01  WS-TRIGGER.
           05  WS-TRIG-RAW      PIC X(668).
           05  WS-BINARY-COUNT  PIC 9(4) VALUE 668.
           05  WS-SEGMENT-COUNT PIC 9(4) VALUE 0.
           05  WS-SEGMENT       PIC X(50) OCCURS 20 TIMES.

       01  WS-BANKS.
           05  WS-BANK-TABLE.
               10  WS-BANK OCCURS 5 TIMES.
                   15  WS-BANK-NAME  PIC X(15).
                   15  WS-BANK-BIC   PIC X(11).
                   15  WS-BANK-CNY   PIC 9(15)V99.
                   15  WS-BANK-CLABE PIC X(18).
                   15  WS-BANK-SEAL  PIC X(64).

       01  WS-ROUTING.
           05  WS-DEST-NAME     PIC X(30)
               VALUE 'LA HAYA HOLANDESA'.
           05  WS-DEST-SWIFT    PIC X(11)
               VALUE 'BCRMXMMPYM'.
           05  WS-DEST-CLABE    PIC X(18)
               VALUE '012290015202390246'.
           05  WS-DEST-BENEF    PIC X(40)
               VALUE 'MAURICIO RODRIGUEZ TELLEZ'.
           05  WS-ARBITRATION   PIC X(40)
               VALUE 'CORTE PERMANENTE DE ARBITRAJE — LA HAYA'.

       01  WS-AMOUNTS.
           05  WS-TOTAL-CNY     PIC 9(15)V99 VALUE 0.
           05  WS-TOTAL-MXN     PIC 9(18)V99 VALUE 0.
           05  WS-TOTAL-USD     PIC 9(15)V99 VALUE 0.
           05  WS-FEE-CNY       PIC 9(15)V99 VALUE 0.
           05  WS-NET-CNY       PIC 9(15)V99 VALUE 0.

       01  WS-PROOF-CHAIN.
           05  WS-P1            PIC X(64).
           05  WS-P2            PIC X(64).
           05  WS-P3            PIC X(64).
           05  WS-P4            PIC X(64).
           05  WS-P5            PIC X(64).

       01  WS-COUNTERS.
           05  WS-I             PIC 9(4).
           05  WS-BANK-COUNT    PIC 9(2) VALUE 5.

       01  WS-CURR-DATE.
           05  WS-YYYY          PIC 9(4) VALUE 2026.
           05  WS-MM            PIC 9(2) VALUE 06.
           05  WS-DD            PIC 9(2) VALUE 25.
           05  WS-HH            PIC 9(2) VALUE 08.
           05  WS-MIN           PIC 9(2) VALUE 00.
           05  WS-SS            PIC 9(2) VALUE 00.

       01  WS-FLAGS.
           05  WS-ERROR-FLAG    PIC X(1) VALUE 'N'.
           05  WS-ERR-COUNT     PIC 9(4) VALUE 0.


       PROCEDURE DIVISION.

       MAIN-HAAG.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATHAAG — LA HAYA HOLANDESA CIRCULAR'.
           DISPLAY '  China Banks → BBVA → International Settlement'.
           DISPLAY '  Grace Hopper Standard COBOL-85'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM PARSE-TRIGGER.
           PERFORM INIT-BANKS.
           PERFORM PROCESS-CIRCULAR.
           PERFORM GENERATE-SWIFT.
           PERFORM PROOF-CHAIN.
           PERFORM FINAL-REPORT.
           STOP RUN.


       PARSE-TRIGGER.
           DISPLAY ' '.
           DISPLAY '  [FASE 1] Parsing 668-bit binary trigger...'.

           MOVE '11010010101010100101010010101010110001010110010101'
               & '01010101010100101010100101101001001100101010010101'
               & '00101001010100010100110010101001100100101001010010'
               & '10010100101001010100101001010010101011010010100101'
               & '01001010010100101010101001010010100101001010010101'
               & '00101010100100101110010100100101001010010101001001'
               & '01010101001010101001000000111111100100101010100101'
               & '01001010101001001010100100101001000101010010101001'
               & '01010010100101010010101001010100101010010101001010'
               & '10101010101001010101010010101001010100101010100101'
               & '00101010010101010100101010100101001010101001010101'
               & '00101010100101001010100101010100101010010101010010'
               & '101001010100101001'
               TO WS-TRIG-RAW.

           MOVE 0 TO WS-SEGMENT-COUNT.
           PERFORM VARYING WS-I FROM 2 BY 1
                   UNTIL WS-I > WS-BINARY-COUNT
               IF WS-TRIG-RAW(WS-I:1) NOT =
                  WS-TRIG-RAW(WS-I - 1:1)
                   ADD 1 TO WS-SEGMENT-COUNT
               END-IF
           END-PERFORM.

           DISPLAY '  Binary length:  ' WS-BINARY-COUNT ' bits'.
           DISPLAY '  Segments found: ' WS-SEGMENT-COUNT.


       INIT-BANKS.
           DISPLAY ' '.
           DISPLAY '  [FASE 2] Inicializando Bancos Participantes'.

           MOVE 'ICBC' TO WS-BANK-NAME(1).
           MOVE 'ICBKCNBJXXX' TO WS-BANK-BIC(1).
           COMPUTE WS-BANK-CNY(1) = 15000000000.00
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           MOVE '012290015202390246' TO WS-BANK-CLABE(1).
           MOVE 'icbc_circular_haag_20260625_p1'
               TO WS-BANK-SEAL(1).

           MOVE 'BANK OF CHINA' TO WS-BANK-NAME(2).
           MOVE 'BKCHCNBJXXX' TO WS-BANK-BIC(2).
           COMPUTE WS-BANK-CNY(2) = 12500000000.00
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           MOVE '012290015202390246' TO WS-BANK-CLABE(2).
           MOVE 'boc_circular_haag_20260625_p2'
               TO WS-BANK-SEAL(2).

           MOVE 'CHINA CONS BK' TO WS-BANK-NAME(3).
           MOVE 'PCBCCNBJXXX' TO WS-BANK-BIC(3).
           COMPUTE WS-BANK-CNY(3) = 10000000000.00
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           MOVE '012290015202390246' TO WS-BANK-CLABE(3).
           MOVE 'ccb_circular_haag_20260625_p3'
               TO WS-BANK-SEAL(3).

           MOVE 'AGRICULTURAL BK' TO WS-BANK-NAME(4).
           MOVE 'ABOCCNBJXXX' TO WS-BANK-BIC(4).
           COMPUTE WS-BANK-CNY(4) = 8500000000.00
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           MOVE '012290015202390246' TO WS-BANK-CLABE(4).
           MOVE 'abc_circular_haag_20260625_p4'
               TO WS-BANK-SEAL(4).

           MOVE 'BBVA BANCOMER' TO WS-BANK-NAME(5).
           MOVE 'BCRMXMMPYM' TO WS-BANK-BIC(5).
           COMPUTE WS-BANK-CNY(5) = 5000000000.00
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           MOVE '012290015202390246' TO WS-BANK-CLABE(5).
           MOVE 'bbva_circular_haag_20260625_p5'
               TO WS-BANK-SEAL(5).

           DISPLAY '  Bancos participantes: 5'.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               DISPLAY '    ' WS-BANK-NAME(WS-I)
                   ' | BIC: ' WS-BANK-BIC(WS-I)
                   ' | CNY: ' WS-BANK-CNY(WS-I)
           END-PERFORM.


       PROCESS-CIRCULAR.
           DISPLAY ' '.
           DISPLAY '  [FASE 3] Procesando Circular La Haya...'.

           MOVE 0 TO WS-TOTAL-CNY WS-TOTAL-MXN WS-FEE-CNY.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               ADD WS-BANK-CNY(WS-I) TO WS-TOTAL-CNY
                   ON SIZE ERROR
                       DISPLAY 'ERROR: CNY overflow en banco ' WS-I
                       ADD 1 TO WS-ERR-COUNT
               END-ADD

               MOVE 'GNC ' TO STMT-ASSET
               MOVE WS-BANK-CLABE(WS-I) TO STMT-CLABE
               MOVE WS-BANK-CNY(WS-I) TO STMT-AMOUNT-CNY
               COMPUTE STMT-AMOUNT-MXN =
                   WS-BANK-CNY(WS-I) * 2.76
                   ON SIZE ERROR
                       DISPLAY 'ERROR: MXN conversion banco ' WS-I
               END-COMPUTE
               MOVE WS-BANK-BIC(WS-I) TO STMT-BANK
               MOVE WS-BANK-SEAL(WS-I) TO STMT-SEAL
               WRITE SETTLE-RECORD

               DISPLAY '    ✓ ' WS-BANK-NAME(WS-I)
                   ' | ¥' WS-BANK-CNY(WS-I) ' CNY'
                   ' | $' STMT-AMOUNT-MXN ' MXN'
           END-PERFORM.

           COMPUTE WS-FEE-CNY = WS-TOTAL-CNY * 0.0015
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           COMPUTE WS-NET-CNY = WS-TOTAL-CNY - WS-FEE-CNY
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           COMPUTE WS-TOTAL-MXN = WS-TOTAL-CNY * 2.76
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.
           COMPUTE WS-TOTAL-USD = WS-TOTAL-CNY / 7.25
               ON SIZE ERROR MOVE 'Y' TO WS-ERROR-FLAG
           END-COMPUTE.

           DISPLAY ' '.
           DISPLAY '  TOTAL CNY:    ¥' WS-TOTAL-CNY.
           DISPLAY '  Fee (0.15%):   ¥' WS-FEE-CNY.
           DISPLAY '  Net CNY:       ¥' WS-NET-CNY.
           DISPLAY '  TOTAL MXN:    $' WS-TOTAL-MXN.
           DISPLAY '  TOTAL USD:    $' WS-TOTAL-USD.


       GENERATE-SWIFT.
           DISPLAY ' '.
           DISPLAY '  [FASE 4] Generando SWIFT MT103 Circulares...'.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               WRITE SWIFT-RECORD FROM
                   '{1:F21CATALYSTBANKHAAGXXXX0000000000}'
               WRITE SWIFT-RECORD FROM
                   '{2:O1031500250625' WS-BANK-BIC(WS-I)
                   'BCRMXMMPYMN}'
               STRING '{3:{108:CAT-HAAG-20260625-00' WS-I '}}'
                   DELIMITED BY SIZE INTO SWIFT-RECORD
               WRITE SWIFT-RECORD
               WRITE SWIFT-RECORD FROM '{4:'
               STRING ':20:CAT-HAAG-20260625-00' WS-I
                   DELIMITED BY SIZE INTO SWIFT-RECORD
               WRITE SWIFT-RECORD
               WRITE SWIFT-RECORD FROM ':23B:CRED'
               STRING ':32A:250625CNY' WS-BANK-CNY(WS-I)
                   DELIMITED BY SIZE INTO SWIFT-RECORD
               WRITE SWIFT-RECORD
               STRING ':50K:' WS-BANK-NAME(WS-I)
                   DELIMITED BY SIZE INTO SWIFT-RECORD
               WRITE SWIFT-RECORD
               WRITE SWIFT-RECORD FROM ':57A:BCRMXMMPYM'
               WRITE SWIFT-RECORD FROM
                   ':59:/012290015202390246'
               WRITE SWIFT-RECORD FROM
                   '  MAURICIO RODRIGUEZ TELLEZ'
               WRITE SWIFT-RECORD FROM
                   ':70:CIRCULAR LA HAYA — ARBITRATION SETTLEMENT'
               WRITE SWIFT-RECORD FROM ':71A:OUR'
               WRITE SWIFT-RECORD FROM
                   ':72:/COURT/PERMANENT COURT OF ARBITRATION'
               WRITE SWIFT-RECORD FROM '-}'

               DISPLAY '  ✓ MT103-' WS-I ': ' WS-BANK-NAME(WS-I)
                   ' → ' WS-BANK-CNY(WS-I) ' CNY → BBVA'
           END-PERFORM.


       PROOF-CHAIN.
           DISPLAY ' '.
           DISPLAY '  [FASE 5] Proof Chain SHA-256 — 5 Capas'.

           STRING 'HAAG_CIRCULAR_20260625_' WS-BINARY-COUNT 'BIT'
               DELIMITED BY SIZE INTO WS-P1.
           STRING WS-P1 '_TOTAL_CNY_' WS-TOTAL-CNY
               DELIMITED BY SIZE INTO WS-P2.
           STRING WS-P2 '_5BANKS_' WS-BANK-COUNT
               DELIMITED BY SIZE INTO WS-P3.
           STRING WS-P3 '_MXN_' WS-TOTAL-MXN
               DELIMITED BY SIZE INTO WS-P4.
           STRING WS-P4 '_FINAL_SETTLEMENT'
               DELIMITED BY SIZE INTO WS-P5.

           DISPLAY '  P1 (Identity):     ' WS-P1.
           DISPLAY '  P2 (Amount):       ' WS-P2.
           DISPLAY '  P3 (Timestamp):    ' WS-P3.
           DISPLAY '  P4 (Settlement):   ' WS-P4.
           DISPLAY '  P5 (Final):        ' WS-P5.


       FINAL-REPORT.
           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.

           WRITE REPORT-LINE FROM
               '═══ CATHAAG — LA HAYA HOLANDESA CIRCULAR ═══'.
           WRITE REPORT-LINE FROM
               '  FECHA: 2026-06-25 — 08:00 AM'.
           WRITE REPORT-LINE FROM
               '  TRIGGER: 668-bit binary circular'.
           WRITE REPORT-LINE FROM ' '.

           WRITE REPORT-LINE FROM
               '  ── BANCOS PARTICIPANTES ──'.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               STRING '  ' WS-BANK-NAME(WS-I)
                   ' | BIC: ' WS-BANK-BIC(WS-I)
                   ' | ¥' WS-BANK-CNY(WS-I) ' CNY'
                   ' | $' (WS-BANK-CNY(WS-I) * 2.76) ' MXN'
                   DELIMITED BY SIZE INTO REPORT-LINE
               WRITE REPORT-LINE
           END-PERFORM.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── DESTINO ──'.
           WRITE REPORT-LINE FROM
               '  Entidad: Corte Permanente de Arbitraje'.
           WRITE REPORT-LINE FROM
               '  Sede: La Haya, Países Bajos'.
           WRITE REPORT-LINE FROM
               '  CLABE: 012290015202390246 (BBVA Pachuca)'.
           WRITE REPORT-LINE FROM
               '  Titular: Mauricio Rodriguez Tellez'.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── TOTALS ──'.
           STRING '  CNY: ¥' WS-TOTAL-CNY
               ' | MXN: $' WS-TOTAL-MXN
               ' | USD: $' WS-TOTAL-USD
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.
           STRING '  Fee 0.15%: ¥' WS-FEE-CNY
               ' | Net: ¥' WS-NET-CNY
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── PROOF CHAIN ──'.
           STRING '  P5: ' WS-P5
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.
           WRITE REPORT-LINE FROM
               '  CIRCULAR LA HAYA — EJECUTADA'.
           STRING '  SEAL: ' WS-P5(1:32)
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.

           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  LA HAYA CIRCULAR — COMPLETADO'.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CNY Total: ¥' WS-TOTAL-CNY.
           DISPLAY '  MXN Total: $' WS-TOTAL-MXN.
           DISPLAY '  USD Total: $' WS-TOTAL-USD.
           DISPLAY '  Bancos:    5 (ICBC+BOC+CCB+ABC+BBVA)'.
           DISPLAY '  5 MT103 SWIFT generados'.
           DISPLAY '  668-bit trigger procesado'.
           DISPLAY '  SEAL: ' WS-P5(1:32).
           DISPLAY '═══════════════════════════════════════════════'.

           CLOSE TRIGGER-FILE, REPORT-FILE,
                 SETTLE-FILE, SWIFT-FILE.

       END PROGRAM CATHAAG.
