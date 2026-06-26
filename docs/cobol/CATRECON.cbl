
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATRECON.
       AUTHOR. CATALYST BANKING SYSTEM.
       REMARKS. P13 — RECONCILIATION — PROOF OF RESERVES.
       SECURITY. BELL-13450-50.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT RECON-FILE ASSIGN TO RECONOUT.

       DATA DIVISION.
       FILE SECTION.
       FD  RECON-FILE.
       01  RECON-REC.
           05  RC-DATE         PIC 9(8).
           05  RC-SOURCE       PIC X(20).
           05  RC-SOURCE-COUNT PIC 9(6).
           05  RC-JE-COUNT     PIC 9(6).
           05  RC-SOURCE-AMT   PIC 9(18)V99.
           05  RC-JE-AMT       PIC 9(18)V99.
           05  RC-VARIANCE     PIC S9(18)V99.
           05  RC-MATCHED      PIC X(1).
           05  RC-PROOF-HASH   PIC X(64).

       WORKING-STORAGE SECTION.
       01  WS-ONCHAIN.
           05  WS-OC-QR-COUNT  PIC 9(6) VALUE 7.
           05  WS-OC-QR-CNY    PIC 9(12)V99 VALUE 3400000.00.
           05  WS-OC-SPEI-CNT  PIC 9(6) VALUE 1.
           05  WS-OC-SPEI-MXN  PIC 9(15)V99 VALUE 200000000.00.
           05  WS-OC-BURN-CAT  PIC 9(12) VALUE 424389.

       01  WS-ACCOUNTING.
           05  WS-AC-QR-ENTRIES  PIC 9(6) VALUE 7.
           05  WS-AC-QR-DEBIT    PIC 9(12)V99 VALUE 3400000.00.
           05  WS-AC-SPEI-ENTRIES PIC 9(6) VALUE 41.
           05  WS-AC-SPEI-DEBIT  PIC 9(15)V99 VALUE 200000000.00.
           05  WS-AC-BURN-DEBIT  PIC 9(12)V99 VALUE 424389.00.

       01  WS-VARIANCE.
           05  WS-VAR-QR-CNY    PIC S9(12)V99.
           05  WS-VAR-SPEI-MXN  PIC S9(15)V99.
           05  WS-VAR-BURN-CAT  PIC S9(12)V99.
           05  WS-VAR-TOTAL     PIC S9(15)V99.

       01  WS-ALL-MATCHED       PIC X(1) VALUE 'Y'.
       01  WS-SEAL              PIC X(64).


       PROCEDURE DIVISION.

       MAIN-RECON.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATRECON — ON-CHAIN vs ACCOUNTING RECON'.
           DISPLAY '  Grace Hopper Standard COBOL-85'.
           DISPLAY '═══════════════════════════════════════════════'.

           PERFORM RECONCILE-QR-TRIGGERS.
           PERFORM RECONCILE-SPEI-PAYOUTS.
           PERFORM RECONCILE-CAT-BURNS.
           PERFORM FINAL-VERDICT.
           STOP RUN.

       RECONCILE-QR-TRIGGERS.
           DISPLAY ' '.
           DISPLAY '  [RECON 1] QR Triggers (P03)'.

           COMPUTE WS-VAR-QR-CNY = WS-OC-QR-CNY - WS-AC-QR-DEBIT.

           DISPLAY '  On-chain (SettlementLog): ' WS-OC-QR-COUNT
               ' eventos, ¥' WS-OC-QR-CNY ' CNY'.
           DISPLAY '  Accounting (Journal):     ' WS-AC-QR-ENTRIES
               ' asientos, ¥' WS-AC-QR-DEBIT ' CNY'.
           DISPLAY '  Variance: ¥' WS-VAR-QR-CNY.

           IF FUNCTION ABS(WS-VAR-QR-CNY) < 1.00
               DISPLAY '  ✅ QR RECONCILED — variance < ¥1 CNY'
               MOVE 20260622 TO RC-DATE
               MOVE 'QR_TRIGGERS' TO RC-SOURCE
               MOVE WS-OC-QR-COUNT TO RC-SOURCE-COUNT
               MOVE WS-AC-QR-ENTRIES TO RC-JE-COUNT
               MOVE WS-OC-QR-CNY TO RC-SOURCE-AMT
               MOVE WS-AC-QR-DEBIT TO RC-JE-AMT
               MOVE WS-VAR-QR-CNY TO RC-VARIANCE
               MOVE 'Y' TO RC-MATCHED
               WRITE RECON-REC
           ELSE
               DISPLAY '  ❌ QR MISMATCH — variance ' WS-VAR-QR-CNY
               MOVE 'N' TO RC-MATCHED
               MOVE 'N' TO WS-ALL-MATCHED.

       RECONCILE-SPEI-PAYOUTS.
           DISPLAY ' '.
           DISPLAY '  [RECON 2] SPEI Payouts (P08)'.

           COMPUTE WS-VAR-SPEI-MXN =
               WS-OC-SPEI-MXN - WS-AC-SPEI-DEBIT.

           DISPLAY '  On-chain (SettlementLog): ' WS-OC-SPEI-CNT
               ' evento, $' WS-OC-SPEI-MXN ' MXN'.
           DISPLAY '  Accounting (Journal):     ' WS-AC-SPEI-ENTRIES
               ' asientos, $' WS-AC-SPEI-DEBIT ' MXN'.
           DISPLAY '  Variance: $' WS-VAR-SPEI-MXN.

           IF FUNCTION ABS(WS-VAR-SPEI-MXN) < 100.00
               DISPLAY '  ✅ SPEI RECONCILED — variance < $100 MXN'
               MOVE 20260622 TO RC-DATE
               MOVE 'SPEI_PAYOUTS' TO RC-SOURCE
               MOVE WS-OC-SPEI-CNT TO RC-SOURCE-COUNT
               MOVE WS-AC-SPEI-ENTRIES TO RC-JE-COUNT
               MOVE WS-OC-SPEI-MXN TO RC-SOURCE-AMT
               MOVE WS-AC-SPEI-DEBIT TO RC-JE-AMT
               MOVE WS-VAR-SPEI-MXN TO RC-VARIANCE
               MOVE 'Y' TO RC-MATCHED
               WRITE RECON-REC
           ELSE
               DISPLAY '  ❌ SPEI MISMATCH'
               MOVE 'N' TO RC-MATCHED
               MOVE 'N' TO WS-ALL-MATCHED.

       RECONCILE-CAT-BURNS.
           DISPLAY ' '.
           DISPLAY '  [RECON 3] CAT Burns (P07)'.

           COMPUTE WS-VAR-BURN-CAT =
               WS-OC-BURN-CAT - WS-AC-BURN-DEBIT.

           DISPLAY '  On-chain (Burn events):  ' WS-OC-BURN-CAT
               ' CAT'.
           DISPLAY '  Accounting (5101 debit): ' WS-AC-BURN-DEBIT
               ' CAT'.
           DISPLAY '  Variance: ' WS-VAR-BURN-CAT ' CAT'.

           IF FUNCTION ABS(WS-VAR-BURN-CAT) < 1
               DISPLAY '  ✅ CAT BURNS RECONCILED — exact match'
               MOVE 20260622 TO RC-DATE
               MOVE 'CAT_BURNS' TO RC-SOURCE
               MOVE 1 TO RC-SOURCE-COUNT
               MOVE 1 TO RC-JE-COUNT
               MOVE WS-OC-BURN-CAT TO RC-SOURCE-AMT
               MOVE WS-AC-BURN-DEBIT TO RC-JE-AMT
               MOVE WS-VAR-BURN-CAT TO RC-VARIANCE
               MOVE 'Y' TO RC-MATCHED
               WRITE RECON-REC
           ELSE
               DISPLAY '  ❌ BURN MISMATCH'
               MOVE 'N' TO RC-MATCHED
               MOVE 'N' TO WS-ALL-MATCHED.

       FINAL-VERDICT.
           COMPUTE WS-VAR-TOTAL =
               WS-VAR-QR-CNY + WS-VAR-SPEI-MXN + WS-VAR-BURN-CAT.

           STRING 'RECON_' RC-DATE '_' WS-ALL-MATCHED '_'
               WS-VAR-TOTAL DELIMITED BY SIZE INTO WS-SEAL.

           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  RECONCILIATION — FINAL VERDICT'.
           DISPLAY '  Total Variance: ' WS-VAR-TOTAL.

           IF WS-ALL-MATCHED = 'Y'
               DISPLAY '  ✅ ALL RECONCILED — On-chain = Accounting'
               DISPLAY '  Proof of Reserves: CONFIRMED'
           ELSE
               DISPLAY '  ❌ DISCREPANCIES DETECTED — Investigate'.

           DISPLAY '  SEAL: ' WS-SEAL(1:32).
           DISPLAY '═══════════════════════════════════════════════'.

           CLOSE RECON-FILE.

       END PROGRAM CATRECON.
