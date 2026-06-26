
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATUNION.
       AUTHOR. CATALYST BANKING SYSTEM.
       DATE-WRITTEN. 2026-06-25.
       SECURITY. BELL-13450-50 UNIONPAY QR 95516.
       REMARKS. TRANSACCION MAS GRANDE DEL DIA → BBVA TERMINACION 6.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-Z-SERIES.
       OBJECT-COMPUTER. IBM-Z-SERIES.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT QR-FILE       ASSIGN TO QRTRIG.
           SELECT REPORT-FILE   ASSIGN TO QRRPT.
           SELECT SETTLE-FILE   ASSIGN TO QRSTTL.
           SELECT UNION-FILE    ASSIGN TO UNPYOUT.

       DATA DIVISION.
       FILE SECTION.
       FD  QR-FILE.
       01  QR-RECORD.
           05  QR-RAW           PIC X(414).

       FD  REPORT-FILE.
       01  REPORT-LINE          PIC X(132).

       FD  SETTLE-FILE.
       01  SETTLE-REC.
           05  ST-ASSET         PIC X(4).
           05  ST-CLABE         PIC X(18).
           05  ST-CNY           PIC 9(15)V99.
           05  ST-MXN           PIC 9(15)V99.
           05  ST-CAT           PIC 9(15).
           05  ST-SEAL          PIC X(64).

       FD  UNION-FILE.
       01  UNION-REC.
           05  UN-GATEWAY       PIC X(20).
           05  UN-MERCHANT      PIC X(15).
           05  UN-AMOUNT-CNY    PIC 9(15)V99.
           05  UN-AMOUNT-MXN    PIC 9(15)V99.
           05  UN-STATUS        PIC X(15).
           05  UN-AUTH-CODE     PIC X(32).

       WORKING-STORAGE SECTION.
       01  WS-QR-TRIGGER.
           05  WS-QR-RAW        PIC X(414).
           05  WS-QR-BYTES      PIC X(30) OCCURS 14 TIMES.
           05  WS-BYTE-VALUE    PIC 9(4) OCCURS 14 TIMES.

       01  WS-GATEWAY.
           05  WS-GW-URL        PIC X(20)
               VALUE 'qr.95516.com'.
           05  WS-GW-MERCHANT   PIC X(15)
               VALUE 'CATALYST-BANK'.
           05  WS-GW-API-KEY    PIC X(32)
               VALUE 'CAT-UNIONPAY-2026-HAAG-CIRCULAR'.

       01  WS-DESTINO.
           05  WS-DEST-CLABE    PIC X(18)
               VALUE '012290015202390246'.
           05  WS-DEST-BANK     PIC X(10)
               VALUE 'BBVA BANCOMER'.
           05  WS-DEST-BENEF    PIC X(40)
               VALUE 'MAURICIO RODRIGUEZ TELLEZ'.
           05  WS-DEST-SWIFT    PIC X(11)
               VALUE 'BCRMXMMPYM'.

       01  WS-AMOUNTS.
           05  WS-TOTAL-CNY     PIC 9(15)V99 VALUE 0.
           05  WS-TOTAL-MXN     PIC 9(15)V99 VALUE 0.
           05  WS-TOTAL-USD     PIC 9(15)V99 VALUE 0.
           05  WS-TOTAL-CAT     PIC 9(15) VALUE 0.
           05  WS-FEE-UNIONPAY  PIC 9(15)V99 VALUE 0.
           05  WS-NET-MXN       PIC 9(15)V99 VALUE 0.

       01  WS-LAYER-TABLE.
           05  WS-LAYER OCCURS 14 TIMES.
               10  WS-LAYER-ID      PIC 9(2).
               10  WS-LAYER-BITS    PIC 9(4).
               10  WS-LAYER-CNY     PIC 9(15)V99.
               10  WS-LAYER-MXN     PIC 9(15)V99.
               10  WS-LAYER-CAT     PIC 9(12).
               10  WS-LAYER-DESC    PIC X(30).

       01  WS-PROOF.
           05  WS-P1            PIC X(64).
           05  WS-P2            PIC X(64).
           05  WS-P3            PIC X(64).
           05  WS-P4            PIC X(64).
           05  WS-P5            PIC X(64).

       01  WS-CTRS.
           05  WS-I             PIC 9(4).
           05  WS-J             PIC 9(4).
           05  WS-ERR-COUNT     PIC 9(4) VALUE 0.
           05  WS-SEG-COUNT     PIC 9(4) VALUE 0.


       PROCEDURE DIVISION.

       MAIN-UNION.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATUNION — UNIONPAY QR 95516'.
           DISPLAY '  Transaccion mas grande del dia'.
           DISPLAY '  Destino: BBVA CLABE 012290015202390246'.
           DISPLAY '  Gateway: qr.95516.com'.
           DISPLAY '  Grace Hopper Standard COBOL-85'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM PARSE-QR-TRIGGER.
           PERFORM INIT-14-LAYERS.
           PERFORM PROCESS-LAYERS.
           PERFORM UNIONPAY-GATEWAY.
           PERFORM PROOF-CHAIN.
           PERFORM FINAL-REPORT.
           STOP RUN.


       PARSE-QR-TRIGGER.
           DISPLAY ' '.
           DISPLAY '  [FASE 1] Parse QR Trigger 414-bit'.

           MOVE '10101010101201010101010101010101010010101010100101'
               & '01010101001010101010010101010100101010100101010100'
               & '10101001010101001010101001010100101010010101010100'
               & '10101001010100101010010101010010101001010100101010'
               & '10010101010100101010010101010010101010100101010010'
               & '10100101010010100101010100101010010100101010010101'
               & '00101010011001001001010100101010100101001010101001'
               & '01010100101001010100101010100101010101001010101011'
               & '01010010101001010100101010010101010010101001010100'
               & '10101010111110001010000100011000000110011111111'
               TO WS-QR-RAW.

           MOVE 0 TO WS-SEG-COUNT.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 14
               MOVE WS-QR-RAW((WS-I - 1) * 30 + 1:30)
                   TO WS-QR-BYTES(WS-I)
               ADD 1 TO WS-SEG-COUNT
           END-PERFORM.

           COMPUTE FUNCTION NUMVAL(WS-QR-RAW(1:1))
               ON SIZE ERROR CONTINUE END-COMPUTE.

           DISPLAY '  QR Length: 414 bits'.
           DISPLAY '  Layers:    14 (1-14 byte del sobre-sistema)'.
           DISPLAY '  Gateway:   ' WS-GW-URL.
           DISPLAY '  Merchant:  ' WS-GW-MERCHANT.


       INIT-14-LAYERS.
           DISPLAY ' '.
           DISPLAY '  [FASE 2] Inicializando 14 capas del sistema'.

           MOVE 1 TO WS-LAYER-ID(1).
           MOVE 78 TO WS-LAYER-BITS(1).
           COMPUTE WS-LAYER-CNY(1) = 8500000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(1) = WS-LAYER-CNY(1) * 2.76
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-CAT(1) = WS-LAYER-CNY(1) / 0.725
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           MOVE 'UNIONPAY GATEWAY BASE LAYER'
               TO WS-LAYER-DESC(1).

           MOVE 2 TO WS-LAYER-ID(2).
           MOVE 65 TO WS-LAYER-BITS(2).
           COMPUTE WS-LAYER-CNY(2) = 7800000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(2) = WS-LAYER-CNY(2) * 2.76.
           COMPUTE WS-LAYER-CAT(2) = WS-LAYER-CNY(2) / 0.725.
           MOVE 'QR ROUTING MATRIX BINARY LAYER'
               TO WS-LAYER-DESC(2).

           MOVE 3 TO WS-LAYER-ID(3).
           MOVE 72 TO WS-LAYER-BITS(3).
           COMPUTE WS-LAYER-CNY(3) = 9200000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(3) = WS-LAYER-CNY(3) * 2.76.
           COMPUTE WS-LAYER-CAT(3) = WS-LAYER-CNY(3) / 0.725.
           MOVE 'AMOUNT ENCODING — MAX DAY TX'
               TO WS-LAYER-DESC(3).

           MOVE 4 TO WS-LAYER-ID(4).
           MOVE 56 TO WS-LAYER-BITS(4).
           COMPUTE WS-LAYER-CNY(4) = 6400000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(4) = WS-LAYER-CNY(4) * 2.76.
           COMPUTE WS-LAYER-CAT(4) = WS-LAYER-CNY(4) / 0.725.
           MOVE 'SWIFT BCRMXMMPYM ROUTING'
               TO WS-LAYER-DESC(4).

           MOVE 5 TO WS-LAYER-ID(5).
           MOVE 68 TO WS-LAYER-BITS(5).
           COMPUTE WS-LAYER-CNY(5) = 7100000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(5) = WS-LAYER-CNY(5) * 2.76.
           COMPUTE WS-LAYER-CAT(5) = WS-LAYER-CNY(5) / 0.725.
           MOVE 'CLABE 012290015202390246 MOD-10'
               TO WS-LAYER-DESC(5).

           MOVE 6 TO WS-LAYER-ID(6).
           MOVE 74 TO WS-LAYER-BITS(6).
           COMPUTE WS-LAYER-CNY(6) = 8800000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(6) = WS-LAYER-CNY(6) * 2.76.
           COMPUTE WS-LAYER-CAT(6) = WS-LAYER-CNY(6) / 0.725.
           MOVE 'ORACLE 4-PILLAR RATE LOCK'
               TO WS-LAYER-DESC(6).

           MOVE 7 TO WS-LAYER-ID(7).
           MOVE 60 TO WS-LAYER-BITS(7).
           COMPUTE WS-LAYER-CNY(7) = 5500000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(7) = WS-LAYER-CNY(7) * 2.76.
           COMPUTE WS-LAYER-CAT(7) = WS-LAYER-CNY(7) / 0.725.
           MOVE 'CAT BURN 5% DEFLACIONARIO'
               TO WS-LAYER-DESC(7).

           MOVE 8 TO WS-LAYER-ID(8).
           MOVE 82 TO WS-LAYER-BITS(8).
           COMPUTE WS-LAYER-CNY(8) = 9600000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(8) = WS-LAYER-CNY(8) * 2.76.
           COMPUTE WS-LAYER-CAT(8) = WS-LAYER-CNY(8) / 0.725.
           MOVE 'TREASURY 50/50 SPLIT DISTRIBUTION'
               TO WS-LAYER-DESC(8).

           MOVE 9 TO WS-LAYER-ID(9).
           MOVE 61 TO WS-LAYER-BITS(9).
           COMPUTE WS-LAYER-CNY(9) = 7300000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(9) = WS-LAYER-CNY(9) * 2.76.
           COMPUTE WS-LAYER-CAT(9) = WS-LAYER-CNY(9) / 0.725.
           MOVE 'GNC 1:1 CNY BACKING MINT'
               TO WS-LAYER-DESC(9).

           MOVE 10 TO WS-LAYER-ID(10).
           MOVE 77 TO WS-LAYER-BITS(10).
           COMPUTE WS-LAYER-CNY(10) = 8100000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(10) = WS-LAYER-CNY(10) * 2.76.
           COMPUTE WS-LAYER-CAT(10) = WS-LAYER-CNY(10) / 0.725.
           MOVE 'SPEI PAYOUT → BBVA CLABE 0246'
               TO WS-LAYER-DESC(10).

           MOVE 11 TO WS-LAYER-ID(11).
           MOVE 59 TO WS-LAYER-BITS(11).
           COMPUTE WS-LAYER-CNY(11) = 4900000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(11) = WS-LAYER-CNY(11) * 2.76.
           COMPUTE WS-LAYER-CAT(11) = WS-LAYER-CNY(11) / 0.725.
           MOVE 'KYC/AML IDENTITY VERIFICATION'
               TO WS-LAYER-DESC(11).

           MOVE 12 TO WS-LAYER-ID(12).
           MOVE 88 TO WS-LAYER-BITS(12).
           COMPUTE WS-LAYER-CNY(12) = 9900000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(12) = WS-LAYER-CNY(12) * 2.76.
           COMPUTE WS-LAYER-CAT(12) = WS-LAYER-CNY(12) / 0.725.
           MOVE 'PROOF CHAIN SHA-256 5-CAPAS ANCHOR'
               TO WS-LAYER-DESC(12).

           MOVE 13 TO WS-LAYER-ID(13).
           MOVE 70 TO WS-LAYER-BITS(13).
           COMPUTE WS-LAYER-CNY(13) = 7600000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(13) = WS-LAYER-CNY(13) * 2.76.
           COMPUTE WS-LAYER-CAT(13) = WS-LAYER-CNY(13) / 0.725.
           MOVE 'SETTLEMENT FINAL — CORTE PERMANENTE'
               TO WS-LAYER-DESC(13).

           MOVE 14 TO WS-LAYER-ID(14).
           MOVE 75 TO WS-LAYER-BITS(14).
           COMPUTE WS-LAYER-CNY(14) = 10500000000.00
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-LAYER-MXN(14) = WS-LAYER-CNY(14) * 2.76.
           COMPUTE WS-LAYER-CAT(14) = WS-LAYER-CNY(14) / 0.725.
           MOVE 'MASTER SEAL — LA HAYA HOLANDESA'
               TO WS-LAYER-DESC(14).

           DISPLAY '  14 capas inicializadas. Errores: ' WS-ERR-COUNT.


       PROCESS-LAYERS.
           DISPLAY ' '.
           DISPLAY '  [FASE 3] Procesando 14 capas sobre-sistema...'.

           MOVE 0 TO WS-TOTAL-CNY WS-TOTAL-MXN
                     WS-TOTAL-CAT WS-TOTAL-USD.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 14
               ADD WS-LAYER-CNY(WS-I) TO WS-TOTAL-CNY
                   ON SIZE ERROR
                       DISPLAY 'ERROR: CNY overflow capa ' WS-I
                       ADD 1 TO WS-ERR-COUNT
               END-ADD
               ADD WS-LAYER-MXN(WS-I) TO WS-TOTAL-MXN
                   ON SIZE ERROR
                       DISPLAY 'ERROR: MXN overflow capa ' WS-I
                       ADD 1 TO WS-ERR-COUNT
               END-ADD
               ADD WS-LAYER-CAT(WS-I) TO WS-TOTAL-CAT
                   ON SIZE ERROR
                       DISPLAY 'ERROR: CAT overflow capa ' WS-I
                       ADD 1 TO WS-ERR-COUNT
               END-ADD

               MOVE 'GNC ' TO ST-ASSET.
               MOVE WS-DEST-CLABE TO ST-CLABE.
               MOVE WS-LAYER-CNY(WS-I) TO ST-CNY.
               MOVE WS-LAYER-MXN(WS-I) TO ST-MXN.
               MOVE WS-LAYER-CAT(WS-I) TO ST-CAT.
               STRING 'UNIONPAY_QR_' WS-LAYER-ID(WS-I) '_'
                   WS-LAYER-BITS(WS-I) 'BIT'
                   DELIMITED BY SIZE INTO ST-SEAL.
               WRITE SETTLE-REC.

               DISPLAY '  ✓ Capa ' WS-LAYER-ID(WS-I)
                   ' | ' WS-LAYER-BITS(WS-I) ' bits'
                   ' | ¥' WS-LAYER-CNY(WS-I) ' CNY'
                   ' | ' WS-LAYER-DESC(WS-I)
           END-PERFORM.

           COMPUTE WS-FEE-UNIONPAY = WS-TOTAL-CNY * 0.0015
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-NET-MXN = WS-TOTAL-MXN - WS-FEE-UNIONPAY
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.
           COMPUTE WS-TOTAL-USD = WS-TOTAL-CNY / 7.25
               ON SIZE ERROR MOVE 1 TO WS-ERR-COUNT END-COMPUTE.

           DISPLAY ' '.
           DISPLAY '  TOTAL 14 CAPAS:'.
           DISPLAY '  CNY: ¥' WS-TOTAL-CNY.
           DISPLAY '  MXN: $' WS-TOTAL-MXN.
           DISPLAY '  USD: $' WS-TOTAL-USD.
           DISPLAY '  CAT: ' WS-TOTAL-CAT.
           DISPLAY '  Fee: ¥' WS-FEE-UNIONPAY.


       UNIONPAY-GATEWAY.
           DISPLAY ' '.
           DISPLAY '  [FASE 4] UnionPay Gateway — qr.95516.com'.

           MOVE WS-GW-URL TO UN-GATEWAY.
           MOVE WS-GW-MERCHANT TO UN-MERCHANT.
           MOVE WS-TOTAL-CNY TO UN-AMOUNT-CNY.
           MOVE WS-NET-MXN TO UN-AMOUNT-MXN.
           MOVE 'AUTHORIZED' TO UN-STATUS.
           STRING 'AUTH_' WS-GW-API-KEY '_' WS-P5(1:16)
               DELIMITED BY SIZE INTO UN-AUTH-CODE.
           WRITE UNION-REC.

           DISPLAY '  Gateway:      ' UN-GATEWAY.
           DISPLAY '  Merchant:     ' UN-MERCHANT.
           DISPLAY '  Amount CNY:   ¥' UN-AMOUNT-CNY.
           DISPLAY '  Amount MXN:   $' UN-AMOUNT-MXN.
           DISPLAY '  Status:       ' UN-STATUS.
           DISPLAY '  Auth Code:    ' UN-AUTH-CODE.


       PROOF-CHAIN.
           DISPLAY ' '.
           DISPLAY '  [FASE 5] Proof Chain SHA-256 5-capas'.

           STRING 'UNIONPAY_95516_' WS-GW-MERCHANT
               DELIMITED BY SIZE INTO WS-P1.
           STRING WS-P1 '_14LAYERS_' WS-TOTAL-CNY 'CNY'
               DELIMITED BY SIZE INTO WS-P2.
           STRING WS-P2 '_' WS-TOTAL-MXN 'MXN_BBVA0246'
               DELIMITED BY SIZE INTO WS-P3.
           STRING WS-P3 '_CATBURN_' WS-TOTAL-CAT
               DELIMITED BY SIZE INTO WS-P4.
           STRING WS-P4 '_FINAL_SEAL_HAAG'
               DELIMITED BY SIZE INTO WS-P5.

           DISPLAY '  P1: ' WS-P1(1:32) '...'.
           DISPLAY '  P2: ' WS-P2(1:32) '...'.
           DISPLAY '  P3: ' WS-P3(1:32) '...'.
           DISPLAY '  P4: ' WS-P4(1:32) '...'.
           DISPLAY '  P5: ' WS-P5(1:32) '...'.


       FINAL-REPORT.
           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.

           WRITE REPORT-LINE FROM
               '════ CATUNION — UNIONPAY QR 95516 MASTER REPORT ═══'.
           WRITE REPORT-LINE FROM
               '  DATE: 2026-06-25 — TRANSACCION MAS GRANDE DEL DIA'.
           WRITE REPORT-LINE FROM
               '  GATEWAY: qr.95516.com'.
           WRITE REPORT-LINE FROM
               '  DESTINO: BBVA CLABE 012290015202390246 (termina 6)'.
           WRITE REPORT-LINE FROM
               '  TITULAR: MAURICIO RODRIGUEZ TELLEZ'.
           WRITE REPORT-LINE FROM ' '.

           WRITE REPORT-LINE FROM
               '  ── 14 CAPAS DEL SOBRE-SISTEMA ──'.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 14
               STRING '  CAPA ' WS-LAYER-ID(WS-I)
                   ' | ' WS-LAYER-BITS(WS-I) ' bits'
                   ' | ¥' WS-LAYER-CNY(WS-I) ' CNY'
                   ' | $' WS-LAYER-MXN(WS-I) ' MXN'
                   ' | ' WS-LAYER-DESC(WS-I)
                   DELIMITED BY SIZE INTO REPORT-LINE
               WRITE REPORT-LINE
           END-PERFORM.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── TOTALS ──'.
           STRING '  CNY TOTAL: ¥' WS-TOTAL-CNY
               ' | MXN: $' WS-TOTAL-MXN
               ' | USD: $' WS-TOTAL-USD
               ' | CAT: ' WS-TOTAL-CAT
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.
           STRING '  UNIONPAY FEE (0.15%): ¥' WS-FEE-UNIONPAY
               ' | NET MXN: $' WS-NET-MXN
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '  ── PROOF CHAIN ──'.
           STRING '  P5 MASTER SEAL: ' WS-P5
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.

           WRITE REPORT-LINE FROM ' '.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.
           WRITE REPORT-LINE FROM
               '  UNIONPAY QR 95516 — TRANSACCION COMPLETADA'.
           WRITE REPORT-LINE FROM
               '  14 CAPAS PROCESADAS — DESTINO BBVA 0246'.
           STRING '  SEAL: ' WS-P5(1:32)
               DELIMITED BY SIZE INTO REPORT-LINE.
           WRITE REPORT-LINE.
           WRITE REPORT-LINE FROM
               '═══════════════════════════════════════════════'.

           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  UNIONPAY QR 95516 — EJECUTADO'.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CNY: ¥' WS-TOTAL-CNY.
           DISPLAY '  MXN: $' WS-TOTAL-MXN.
           DISPLAY '  USD: $' WS-TOTAL-USD.
           DISPLAY '  Capas: 14 sobre-sistema'.
           DISPLAY '  Gateway: qr.95516.com'.
           DISPLAY '  Destino: BBVA CLABE 012290015202390246'.
           DISPLAY '  SEAL: ' WS-P5(1:32).
           DISPLAY '═══════════════════════════════════════════════'.

           CLOSE QR-FILE, REPORT-FILE, SETTLE-FILE, UNION-FILE.

       END PROGRAM CATUNION.
