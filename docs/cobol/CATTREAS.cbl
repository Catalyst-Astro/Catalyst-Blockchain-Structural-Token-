
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATTREAS.
       AUTHOR. CATALYST BANKING SYSTEM.
       REMARKS. P06 — TREASURY SPLIT 50/50 — OSHIRO PROTOCOLS.
       SECURITY. BELL-13450-50.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT TREASURY-FILE ASSIGN TO TREASOUT.
           SELECT BBVA-FILE     ASSIGN TO BBVAOUT.

       DATA DIVISION.
       FILE SECTION.
       FD  TREASURY-FILE.
       01  TREAS-REC.
           05  TR-DATE        PIC 9(8).
           05  TR-ASSET       PIC X(4).
           05  TR-AMOUNT      PIC 9(18)V99.
           05  TR-CURRENCY    PIC X(3).
           05  TR-PROOF       PIC X(64).
           05  TR-SEAL        PIC X(64).

       FD  BBVA-FILE.
       01  BBVA-REC.
           05  BBVA-DATE      PIC 9(8).
           05  BBVA-CLABE     PIC X(18).
           05  BBVA-AMOUNT    PIC 9(18)V99.
           05  BBVA-CURRENCY  PIC X(3).
           05  BBVA-SWIFT-REF PIC X(16).
           05  BBVA-SEAL      PIC X(64).

       WORKING-STORAGE SECTION.
       01  WS-TOTAL-CNY       PIC 9(18)V99.
       01  WS-TREASURY-CNY    PIC 9(18)V99.
       01  WS-BBVA-CNY        PIC 9(18)V99.
       01  WS-BBVA-MXN        PIC 9(18)V99.
       01  WS-BBVA-MXN-NET    PIC 9(18)V99.
       01  WS-RATE-CNY-MXN    PIC 9(2)V9(6) VALUE 2.760000.
       01  WS-TREASURY-RATIO  PIC 9(2)V9(2) VALUE 0.50.
       01  WS-BBVA-RATIO      PIC 9(2)V9(2) VALUE 0.50.
       01  WS-CAT-RESERVE     PIC 9(18)V99.
       01  WS-GNC-RESERVE     PIC 9(18)V99.
       01  WS-SWIFT-UETR      PIC X(16).
       01  WS-SEAL            PIC X(64).


       PROCEDURE DIVISION.

       MAIN-TREASURY.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATTREAS — TREASURY 50/50 SPLIT'.
           DISPLAY '  OSHIRO PROTOCOLS — P06 Treasury Management'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM DISTRIBUTE-R1-CAPITAL.
           PERFORM DISTRIBUTE-QR-REVENUE.
           PERFORM TREASURY-REPORT.
           STOP RUN.


       DISTRIBUTE-R1-CAPITAL.
           DISPLAY ' '.
           DISPLAY '  [R1] Economic Medicine — Mexico Pilot'.
           DISPLAY '  Capital Total: 50,000,000,000 CNY'.

           MOVE 50000000000.00 TO WS-TOTAL-CNY.
           COMPUTE WS-TREASURY-CNY = WS-TOTAL-CNY * 0.50.
           COMPUTE WS-BBVA-CNY     = WS-TOTAL-CNY * 0.50.
           COMPUTE WS-BBVA-MXN     = WS-BBVA-CNY * WS-RATE-CNY-MXN.
           COMPUTE WS-BBVA-MXN-NET = WS-BBVA-MXN * 0.99.

           DISPLAY '  ── TREASURY (50%) ──'.
           DISPLAY '  CNY: ' WS-TREASURY-CNY.
           DISPLAY '  MXN: ' (WS-TREASURY-CNY * WS-RATE-CNY-MXN).
           DISPLAY '  CAT Reserve:  99,830,000 CAT'.
           DISPLAY '  GNC Backing:  4,390,000 GNC (1:1 CNY)'.

           DISPLAY ' '.
           DISPLAY '  ── BBVA (50%) ──'.
           DISPLAY '  CLABE:   012290015202390246'.
           DISPLAY '  SWIFT:   BCRMXMMPYM'.
           DISPLAY '  CNY:     ' WS-BBVA-CNY.
           DISPLAY '  MXN:     $' WS-BBVA-MXN.
           DISPLAY '  Neto:    $' WS-BBVA-MXN-NET ' (1% fee)'.

           MOVE 20260624 TO TR-DATE.
           MOVE 'CAT ' TO TR-ASSET.
           MOVE WS-TREASURY-CNY TO TR-AMOUNT.
           MOVE 'CNY' TO TR-CURRENCY.
           STRING 'TREASURY_R1_' WS-TREASURY-CNY
               DELIMITED BY SIZE INTO TR-SEAL.
           MOVE TR-SEAL TO TR-PROOF.
           WRITE TREAS-REC.

           MOVE 20260624 TO BBVA-DATE.
           MOVE '012290015202390246' TO BBVA-CLABE.
           MOVE WS-BBVA-MXN-NET TO BBVA-AMOUNT.
           MOVE 'MXN' TO BBVA-CURRENCY.
           MOVE '6CA32583DD049EC3' TO BBVA-SWIFT-REF.
           WRITE BBVA-REC.


       DISTRIBUTE-QR-REVENUE.
           DISPLAY ' '.
           DISPLAY '  [QR] UnionPay Revenue Split 50/50'.

           COMPUTE WS-TOTAL-CNY     = 3400000.00.
           COMPUTE WS-TREASURY-CNY  = WS-TOTAL-CNY * 0.50.
           COMPUTE WS-BBVA-CNY      = WS-TOTAL-CNY * 0.50.
           COMPUTE WS-BBVA-MXN      = WS-BBVA-CNY * WS-RATE-CNY-MXN.

           DISPLAY '  QR Revenue (7 triggers): ' WS-TOTAL-CNY ' CNY'.
           DISPLAY '  → Treasury (50%): ' WS-TREASURY-CNY ' CNY'.
           DISPLAY '  → BBVA (50%):     ' WS-BBVA-CNY
               ' CNY = $' WS-BBVA-MXN ' MXN'.

           MOVE 20260624 TO TR-DATE.
           MOVE 'GNC ' TO TR-ASSET.
           MOVE WS-TREASURY-CNY TO TR-AMOUNT.
           MOVE 'CNY' TO TR-CURRENCY.
           STRING 'QR_REVENUE_' WS-TOTAL-CNY DELIMITED BY SIZE
               INTO TR-SEAL.
           WRITE TREAS-REC.


       TREASURY-REPORT.
           DISPLAY ' '.
           DISPLAY '  ── TREASURY SUMMARY ──'.

           COMPUTE WS-CAT-RESERVE = 99830000 * 2.00.
           COMPUTE WS-GNC-RESERVE = 4390000 * 2.76.

           DISPLAY '  CAT Reserve:  99,830,000 CAT'.
           DISPLAY '       Value:   $' WS-CAT-RESERVE ' MXN'.
           DISPLAY '       USD:     $' (WS-CAT-RESERVE / 20) ' USD'.
           DISPLAY '  GNC Reserve:   4,390,000 GNC'.
           DISPLAY '       Value:   $' WS-GNC-RESERVE ' MXN'.
           DISPLAY '       CNY:     ' (4390000.00) ' CNY (1:1)'.
           DISPLAY '  CTV Libre:     10 CTV (1 CTV = 1,000 GNC)'.
           DISPLAY '  FLT:           250,000,000 FLT (compliance)'.

           COMPUTE WS-TOTAL-VALUE =
               WS-CAT-RESERVE + WS-GNC-RESERVE.

           DISPLAY ' '.
           DISPLAY '  ═══ TOTAL TREASURY ═══'.
           DISPLAY '  MXN: $' WS-TOTAL-VALUE.
           DISPLAY '  USD: $' (WS-TOTAL-VALUE / 20).
           DISPLAY '  Split: 50% BBVA / 50% Reserve'.

           STRING 'TREASURY_FINAL_' WS-TOTAL-VALUE
               DELIMITED BY SIZE INTO WS-SEAL.

           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  TREASURY 50/50 SPLIT — COMPLETADO'.
           DISPLAY '  SEAL: ' WS-SEAL(1:32).
           DISPLAY '═══════════════════════════════════════════════'.

           CLOSE TREASURY-FILE, BBVA-FILE.

       END PROGRAM CATTREAS.
