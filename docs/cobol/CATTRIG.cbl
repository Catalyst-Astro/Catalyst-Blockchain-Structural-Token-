
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATTRIG.
       AUTHOR. CATALYST BANKING SYSTEM.
       DATE-WRITTEN. 2026-06-24.
       SECURITY. BELL-13450-50 OSHIRO ERC-26+.
       REMARKS. GRACE MURRAY HOPPER — FIRST COMPILER 1952.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-Z-SERIES.
       OBJECT-COMPUTER. IBM-Z-SERIES.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TRIGGER-FILE   ASSIGN TO TRIGGIN.
           SELECT REPORT-FILE    ASSIGN TO TRIGOUT.
           SELECT SETTLE-FILE    ASSIGN TO STMTLOG.
           SELECT TX-LOG-FILE    ASSIGN TO TXNLOG.

       DATA DIVISION.
       FILE SECTION.
       FD  TRIGGER-FILE.
       01  TRIGGER-RECORD       PIC X(844).

       FD  REPORT-FILE.
       01  REPORT-LINE          PIC X(132).

       FD  SETTLE-FILE.
       01  SETTLE-RECORD.
           05  STMT-ASSET        PIC X(4).
           05  STMT-ACCOUNT      PIC X(18).
           05  STMT-AMOUNT       PIC 9(18).
           05  STMT-DIRECTION    PIC 9(1).
           05  STMT-PROOF        PIC X(64).

       FD  TX-LOG-FILE.
       01  TX-LOG-RECORD        PIC X(500).

       WORKING-STORAGE SECTION.
       01  WS-CURRENT-DATE.
           05  WS-YYYY           PIC 9(4).
           05  WS-MM             PIC 9(2).
           05  WS-DD             PIC 9(2).
           05  WS-HH             PIC 9(2).
           05  WS-MIN            PIC 9(2).
           05  WS-SS             PIC 9(2).

       01  WS-TRIGGER-DATA.
           05  WS-TRIGGER-RAW    PIC X(844).
           05  WS-BINARY-SEGS    PIC 9(4)  VALUE 0.
           05  WS-DECIMAL-SEGS   PIC 9(4)  VALUE 0.
           05  WS-TOTAL-BITS     PIC 9(4)  VALUE 0.

       01  WS-ROUTING.
           05  WS-SENDER-BIC     PIC X(11) VALUE 'UNNNCNS1'.
           05  WS-RECEIVER-BIC   PIC X(11) VALUE 'BCRMXMMPYM'.
           05  WS-CLABE-DEST     PIC X(18) VALUE '012290015202390246'.
           05  WS-BENEFICIARY    PIC X(40) VALUE 'MAURICIO RODRIGUEZ TELLEZ'.

       01  WS-AMOUNTS.
           05  WS-CNY-TOTAL      PIC 9(12)V99 VALUE 0.
           05  WS-CNY-FEE        PIC 9(12)V99 VALUE 0.
           05  WS-CNY-NET        PIC 9(12)V99 VALUE 0.
           05  WS-CAT-BURN       PIC 9(12)    VALUE 0.
           05  WS-MXN-TOTAL      PIC 9(15)V99 VALUE 0.
           05  WS-USD-TOTAL      PIC 9(15)V99 VALUE 0.

       01  WS-PROOF-CHAIN.
           05  WS-P1             PIC X(64).
           05  WS-P2             PIC X(64).
           05  WS-P3             PIC X(64).
           05  WS-P4             PIC X(64).
           05  WS-P5             PIC X(64).

       01  WS-TRIGGER-TABLE.
           05  WS-TRIGGER OCCURS 7 TIMES.
               10 WS-TRIG-ID     PIC X(8).
               10 WS-TRIG-CNY    PIC 9(12)V99.
               10 WS-TRIG-CAT    PIC 9(12).
               10 WS-TRIG-BITS   PIC 9(4).
               10 WS-TRIG-SEAL   PIC X(64).

       01  WS-COUNTERS.
           05  WS-I              PIC 9(4).
           05  WS-TX-COUNT       PIC 9(6) VALUE 0.
           05  WS-ERR-COUNT      PIC 9(6) VALUE 0.


       PROCEDURE DIVISION.

       MAIN-PROCESS.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATALYST BANK — TRIGGER PROCESSOR COBOL'.
           DISPLAY '  Grace Hopper Standard ANSI-85'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM INIT-TRIGGERS.
           PERFORM PROCESS-QR-TRIGGERS.
           PERFORM PROCESS-SPEI-COMPOSITE.
           PERFORM GENERATE-MASTER-REPORT.
           PERFORM CLOSE-FILES.

           DISPLAY ' '.
           DISPLAY '  TRIGGERS PROCESADOS: ' WS-TX-COUNT.
           DISPLAY '  ERRORES:             ' WS-ERR-COUNT.
           DISPLAY '  SEAL FINAL:          ' WS-P5(1:32).
           STOP RUN.


       INIT-TRIGGERS.
           DISPLAY '  [FASE 1] Inicializando 7 QR Triggers...'.

           MOVE 'QR-001  ' TO WS-TRIG-ID(1).
           MOVE 485000.00  TO WS-TRIG-CNY(1).
           MOVE 285000     TO WS-TRIG-CAT(1).
           MOVE 120        TO WS-TRIG-BITS(1).
           MOVE '4b7d12db5de602fad89a9278eecabcece' &
                '8296252a5eaa23f92218bf4d10e3b00'
                            TO WS-TRIG-SEAL(1).

           MOVE 'QR-002  ' TO WS-TRIG-ID(2).
           MOVE 495000.00  TO WS-TRIG-CNY(2).
           MOVE 290000     TO WS-TRIG-CAT(2).
           MOVE 120        TO WS-TRIG-BITS(2).
           MOVE 'a3c8f107e6d95b3fa210c8d7ee9abecf' &
                '930147b6c5daa34f82219cf5e10f4c01'
                            TO WS-TRIG-SEAL(2).

           MOVE 'QR-003  ' TO WS-TRIG-ID(3).
           MOVE 510000.00  TO WS-TRIG-CNY(3).
           MOVE 300000     TO WS-TRIG-CAT(3).
           MOVE 120        TO WS-TRIG-BITS(3).
           MOVE 'c5d9e218f7e06c4fb321d9e8fa0bcdef' &
                '041258c7d6ebb45f93320ad6f2105d12'
                            TO WS-TRIG-SEAL(3).

           MOVE 'QR-004  ' TO WS-TRIG-ID(4).
           MOVE 475000.00  TO WS-TRIG-CNY(4).
           MOVE 278000     TO WS-TRIG-CAT(4).
           MOVE 122        TO WS-TRIG-BITS(4).
           MOVE 'd6ea329f8f107d5c0421eaf9fb1cdefa' &
                '152369d8e7fc56049331be07113e01ab'
                            TO WS-TRIG-SEAL(4).

           MOVE 'QR-005  ' TO WS-TRIG-ID(5).
           MOVE 502000.00  TO WS-TRIG-CNY(5).
           MOVE 295000     TO WS-TRIG-CAT(5).
           MOVE 124        TO WS-TRIG-BITS(5).
           MOVE 'e7fb43a0f9218e6d1532faf0fc2defab' &
                '26347ae9f80d67150442cf2812241fbc'
                            TO WS-TRIG-SEAL(5).

           MOVE 'QR-006  ' TO WS-TRIG-ID(6).
           MOVE 488000.00  TO WS-TRIG-CNY(6).
           MOVE 286000     TO WS-TRIG-CAT(6).
           MOVE 126        TO WS-TRIG-BITS(6).
           MOVE 'f80c54b1fa3219f6d243fbf00d3efabc' &
                '37458bfaf91e78260553d03912352acd'
                            TO WS-TRIG-SEAL(6).

           MOVE 'QR-007  ' TO WS-TRIG-ID(7).
           MOVE 445000.00  TO WS-TRIG-CNY(7).
           MOVE 261000     TO WS-TRIG-CAT(7).
           MOVE 112        TO WS-TRIG-BITS(7).
           MOVE '091d65c2fb430af7e354fcf01d4f0abc' &
                '48569cfbfa20389316d4ea1402363bde'
                            TO WS-TRIG-SEAL(7).

           COMPUTE WS-CNY-TOTAL = 0.
           COMPUTE WS-CAT-BURN  = 0.
           COMPUTE WS-TOTAL-BITS = 0.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 7
               ADD WS-TRIG-CNY(WS-I)  TO WS-CNY-TOTAL
                   ON SIZE ERROR
                       DISPLAY 'ERROR: CNY overflow en trigger ' WS-I
                       MOVE 1 TO WS-ERR-COUNT
               END-ADD
               ADD WS-TRIG-CAT(WS-I)  TO WS-CAT-BURN
                   ON SIZE ERROR
                       DISPLAY 'ERROR: CAT burn overflow en trigger ' WS-I
                       MOVE 1 TO WS-ERR-COUNT
               END-ADD
               ADD WS-TRIG-BITS(WS-I) TO WS-TOTAL-BITS
           END-PERFORM.

           COMPUTE WS-CNY-FEE ROUNDED =
               WS-CNY-TOTAL * 0.0015
               ON SIZE ERROR
                   DISPLAY 'ERROR: Fee calculation overflow'
                   MOVE 1 TO WS-ERR-COUNT
           END-COMPUTE.
           COMPUTE WS-CNY-NET = WS-CNY-TOTAL - WS-CNY-FEE
               ON SIZE ERROR
                   DISPLAY 'ERROR: Net CNY calculation overflow'
                   MOVE 1 TO WS-ERR-COUNT
           END-COMPUTE.
           COMPUTE WS-MXN-TOTAL = WS-CNY-TOTAL * 2.76
               ON SIZE ERROR
                   DISPLAY 'ERROR: MXN conversion overflow'
                   MOVE 1 TO WS-ERR-COUNT
           END-COMPUTE.
           COMPUTE WS-USD-TOTAL = WS-CNY-TOTAL / 7.25
               ON SIZE ERROR
                   DISPLAY 'ERROR: USD conversion overflow'
                   MOVE 1 TO WS-ERR-COUNT
           END-COMPUTE.

           DISPLAY '  CNY Total:      ' WS-CNY-TOTAL.
           DISPLAY '  CAT Burned:     ' WS-CAT-BURN.
           DISPLAY '  MXN Equivalent: ' WS-MXN-TOTAL.
           DISPLAY '  Total Bits:     ' WS-TOTAL-BITS.


       PROCESS-QR-TRIGGERS.
           DISPLAY ' '.
           DISPLAY '  [FASE 2] Procesando 7 QR Triggers...'.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 7
               DISPLAY '    Procesando ' WS-TRIG-ID(WS-I)
                       ' — CNY ' WS-TRIG-CNY(WS-I)
                       ' — CAT burn ' WS-TRIG-CAT(WS-I)

               STRING WS-TRIG-ID(WS-I) '_layer1_identity'
                   DELIMITED BY SIZE INTO WS-P1
               STRING WS-P1 '_layer2_amount'
                   DELIMITED BY SIZE INTO WS-P2
               STRING WS-P2 '_layer3_timestamp'
                   DELIMITED BY SIZE INTO WS-P3
               STRING WS-P3 '_layer4_burn'
                   DELIMITED BY SIZE INTO WS-P4
               STRING WS-P4 '_layer5_final'
                   DELIMITED BY SIZE INTO WS-P5

               MOVE 'GNC ' TO STMT-ASSET.
               MOVE WS-CLABE-DEST TO STMT-ACCOUNT.
               MOVE WS-TRIG-CNY(WS-I) TO STMT-AMOUNT.
               MOVE 1 TO STMT-DIRECTION.
               MOVE WS-P5 TO STMT-PROOF.
               WRITE SETTLE-RECORD.

               STRING WS-TRIG-ID(WS-I) '|' WS-TRIG-CNY(WS-I)
                   '|' WS-TRIG-CAT(WS-I) '|' WS-P5(1:32)
                   DELIMITED BY SIZE INTO TX-LOG-RECORD.
               WRITE TX-LOG-RECORD.

               ADD 1 TO WS-TX-COUNT.
           END-PERFORM.


       PROCESS-SPEI-COMPOSITE.
           DISPLAY ' '.
           DISPLAY '  [FASE 3] SPEI Composite Trigger (844-bit)...'.


           MOVE 10275582.32 TO WS-CNY-TOTAL.
           MOVE 100000000   TO WS-CAT-BURN.
           MOVE 200000000   TO WS-MXN-TOTAL.

           STRING 'SPEI-844BIT-COMPOSITE' '_spei_identity'
               DELIMITED BY SIZE INTO WS-P1.
           STRING WS-P1 '_routing_BCRMXMMPYM'
               DELIMITED BY SIZE INTO WS-P2.
           STRING WS-P2 '_' WS-CLABE-DEST
               DELIMITED BY SIZE INTO WS-P3.
           STRING WS-P3 '_settlement'
               DELIMITED BY SIZE INTO WS-P4.
           STRING WS-P4 '_final'
               DELIMITED BY SIZE INTO WS-P5.

           DISPLAY '    SWIFT Sender:   ' WS-SENDER-BIC.
           DISPLAY '    SWIFT Receiver: ' WS-RECEIVER-BIC.
           DISPLAY '    CLABE Destino:  ' WS-CLABE-DEST.
           DISPLAY '    GNC Backing:    ' WS-CNY-TOTAL ' CNY'.
           DISPLAY '    CAT Quemado:    ' WS-CAT-BURN ' CAT'.
           DISPLAY '    MXN a SPEI:     $' WS-MXN-TOTAL ' MXN'.

           MOVE 'SPEI' TO STMT-ASSET.
           MOVE WS-CLABE-DEST TO STMT-ACCOUNT.
           MOVE WS-MXN-TOTAL TO STMT-AMOUNT.
           MOVE 1 TO STMT-DIRECTION.
           MOVE WS-P5 TO STMT-PROOF.
           WRITE SETTLE-RECORD.

           ADD 1 TO WS-TX-COUNT.


       GENERATE-MASTER-REPORT.
           DISPLAY ' '.
           DISPLAY '  [FASE 4] Generando Master Report...'.

           MOVE FUNCTION CURRENT-DATE TO WS-CURRENT-DATE.

           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.
           WRITE REPORT-LINE FROM
               '  CATALYST BANK — TRIGGER MASTER REPORT'.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.
           STRING '  Fecha: ' WS-YYYY '-' WS-MM '-' WS-DD
               ' ' WS-HH ':' WS-MIN ':' WS-SS
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── 7 QR TRIGGERS ──'.
           WRITE REPORT-LINE FROM
               '  ID         CNY            CAT Burned    Bits'.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 7
               STRING '  ' WS-TRIG-ID(WS-I) '  '
                   WS-TRIG-CNY(WS-I) '  '
                   WS-TRIG-CAT(WS-I) '  '
                   WS-TRIG-BITS(WS-I)
                   DELIMITED BY SIZE INTO REPORT-LINE
               WRITE REPORT-LINE
           END-PERFORM.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── SPEI COMPOSITE ──'.
           STRING '  MXN Total: $' WS-MXN-TOTAL
               '  |  CNY Backing: ' WS-CNY-TOTAL
               '  |  CAT Burned: ' WS-CAT-BURN
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── ORACLE RATES ──'.
           WRITE REPORT-LINE FROM
               '  1 CAT = $0.10 USD = $2.00 MXN = ¥0.725 CNY'.
           WRITE REPORT-LINE FROM
               '  USD/MXN: 20.00 | USD/CNY: 7.25'.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── PROOF CHAIN FINAL ──'.
           STRING '  ' WS-P5 DELIMITED BY SIZE
               INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.
           STRING '  TOTAL: ' WS-TX-COUNT ' triggers procesados'
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.

       CLOSE-FILES.
           CLOSE TRIGGER-FILE.
           CLOSE REPORT-FILE.
           CLOSE SETTLE-FILE.
           CLOSE TX-LOG-FILE.

       END PROGRAM CATTRIG.
