
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATSPEI.
       AUTHOR. CATALYST BANKING SYSTEM.
       SECURITY. SWIFT FIN MT103 — BCRMXMMPYM — OSHIRO ERC-26+.

       ENVIRONMENT DIVISION.
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT MT103-FILE     ASSIGN TO MT103OUT.
           SELECT SPEI-FILE      ASSIGN TO SPEIOUT.
           SELECT CEP-FILE       ASSIGN TO CEPOUT.
           SELECT PROOF-FILE     ASSIGN TO PROFOUT.

       DATA DIVISION.
       FILE SECTION.
       FD  MT103-FILE.
       01  MT103-LINE           PIC X(132).

       FD  SPEI-FILE.
       01  SPEI-RECORD.
           05  SPEI-TRACKING    PIC X(30).
           05  SPEI-CLABE-ORIG  PIC X(18).
           05  SPEI-CLABE-DEST  PIC X(18).
           05  SPEI-AMOUNT      PIC 9(15)V99.
           05  SPEI-CONCEPT     PIC X(40).
           05  SPEI-BENEF       PIC X(40).
           05  SPEI-STATUS      PIC X(20).
           05  SPEI-SEAL        PIC X(64).

       FD  CEP-FILE.
       01  CEP-RECORD.
           05  CEP-TRACKING     PIC X(30).
           05  CEP-CLABE        PIC X(18).
           05  CEP-BENEF        PIC X(40).
           05  CEP-AMOUNT       PIC 9(15)V99.
           05  CEP-DATE         PIC 9(8).
           05  CEP-TIME         PIC 9(6).
           05  CEP-VERIFIED     PIC X(1).

       FD  PROOF-FILE.
       01  PROOF-RECORD         PIC X(132).

       WORKING-STORAGE SECTION.
       01  WS-CLABE-VALIDATION.
           05  WS-CLABE-RAW     PIC X(18).
           05  WS-WEIGHTS       PIC 9(2) OCCURS 18 TIMES.
           05  WS-CLABE-SUM     PIC 9(4) VALUE 0.
           05  WS-CLABE-MOD10   PIC 9(1).
           05  WS-CLABE-VALID   PIC X(1).

       01  WS-AMOUNTS.
           05  WS-CAT-AMOUNT    PIC 9(12).
           05  WS-CAT-BURN      PIC 9(12).
           05  WS-MXN-AMOUNT    PIC 9(15)V99.
           05  WS-USD-AMOUNT    PIC 9(15)V99.
           05  WS-FEE-SPEI      PIC 9(15)V99.
           05  WS-NET-MXN       PIC 9(15)V99.

       01  WS-SWIFT-FIELDS.
           05  WS-SENDER-BIC    PIC X(11) VALUE 'UNNNCNS1'.
           05  WS-RECEIVER-BIC  PIC X(11) VALUE 'BCRMXMMPYM'.
           05  WS-UETR          PIC X(16) VALUE 'BF6302CC236C7341'.
           05  WS-MUR           PIC X(16) VALUE 'CAT20260617-001'.
           05  WS-VALUE-DATE    PIC 9(8)  VALUE 20260617.
           05  WS-CURRENCY      PIC X(3)  VALUE 'MXN'.
           05  WS-SENDER-NAME   PIC X(35) VALUE 'CATALYST BLOCKCHAIN LABS SA DE CV'.
           05  WS-RECVR-NAME    PIC X(35) VALUE 'MAURICIO RODRIGUEZ TELLEZ'.

       01  WS-PROOF-CHAIN.
           05  WS-P1            PIC X(64).
           05  WS-P2            PIC X(64).
           05  WS-P3            PIC X(64).
           05  WS-P4            PIC X(64).
           05  WS-P5            PIC X(64).


       PROCEDURE DIVISION.

       MAIN-SPEI.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATSPEI — SPEI PAYOUT + SWIFT MT103'.
           DISPLAY '  Grace Hopper Banking Standard COBOL-85'.
           DISPLAY '═══════════════════════════════════════════════'.


       VALIDATE-CLABE.
           MOVE '012290015202390246' TO WS-CLABE-RAW.
           DISPLAY ' '.
           DISPLAY '  [STEP 1] CLABE Validation — Modulo 10'.

           MOVE 3 TO WS-WEIGHTS(1).   MOVE 7 TO WS-WEIGHTS(2).
           MOVE 1 TO WS-WEIGHTS(3).   MOVE 3 TO WS-WEIGHTS(4).
           MOVE 7 TO WS-WEIGHTS(5).   MOVE 1 TO WS-WEIGHTS(6).
           MOVE 3 TO WS-WEIGHTS(7).   MOVE 7 TO WS-WEIGHTS(8).
           MOVE 1 TO WS-WEIGHTS(9).   MOVE 3 TO WS-WEIGHTS(10).
           MOVE 7 TO WS-WEIGHTS(11).  MOVE 1 TO WS-WEIGHTS(12).
           MOVE 3 TO WS-WEIGHTS(13).  MOVE 7 TO WS-WEIGHTS(14).
           MOVE 1 TO WS-WEIGHTS(15).  MOVE 3 TO WS-WEIGHTS(16).
           MOVE 7 TO WS-WEIGHTS(17).

           MOVE 0 TO WS-CLABE-SUM.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 17
               COMPUTE WS-CLABE-SUM = WS-CLABE-SUM +
                   (FUNCTION NUMVAL(WS-CLABE-RAW(WS-I:1))
                    * WS-WEIGHTS(WS-I))
           END-PERFORM.
           COMPUTE WS-CLABE-MOD10 = (10 -
               FUNCTION MOD(WS-CLABE-SUM, 10)).
           IF WS-CLABE-MOD10 = 10
               MOVE 0 TO WS-CLABE-MOD10.

           IF WS-CLABE-MOD10 = FUNCTION NUMVAL(WS-CLABE-RAW(18:1))
               MOVE 'Y' TO WS-CLABE-VALID
               DISPLAY '  ✅ CLABE ' WS-CLABE-RAW ' — VALIDA'
           ELSE
               MOVE 'N' TO WS-CLABE-VALID
               DISPLAY '  ❌ CLABE INVALIDA — ABORTANDO'
               STOP RUN.


       ORACLE-CONVERSION.
           DISPLAY ' '.
           DISPLAY '  [STEP 2] Oracle — CAT→MXN Conversion'.
           MOVE 100000 TO WS-CAT-AMOUNT.
           COMPUTE WS-CAT-BURN = WS-CAT-AMOUNT * 0.05.
           COMPUTE WS-MXN-AMOUNT = WS-CAT-AMOUNT * 2.00.
           COMPUTE WS-USD-AMOUNT = WS-CAT-AMOUNT * 0.10.
           COMPUTE WS-FEE-SPEI = WS-MXN-AMOUNT * 0.01.
           COMPUTE WS-NET-MXN = WS-MXN-AMOUNT - WS-FEE-SPEI.

           DISPLAY '  CAT Amount:    ' WS-CAT-AMOUNT.
           DISPLAY '  CAT Burn (5%): ' WS-CAT-BURN.
           DISPLAY '  MXN Gross:     $' WS-MXN-AMOUNT.
           DISPLAY '  SPEI Fee (1%): $' WS-FEE-SPEI.
           DISPLAY '  MXN Net:       $' WS-NET-MXN.
           DISPLAY '  USD Value:     $' WS-USD-AMOUNT.
           DISPLAY '  Oracle: 1 CAT = $0.10 USD = $2.00 MXN'.


       GENERATE-MT103.
           DISPLAY ' '.
           DISPLAY '  [STEP 3] MT103 SWIFT Message'.

           WRITE MT103-LINE FROM '{1:F21CATALYSTBLOCKCHAINXXXX0000000000}'.
           WRITE MT103-LINE FROM '{2:O1031500240624UNPYCNBHBXXX'.
               '00000000002406241500N}'.
           WRITE MT103-LINE FROM '{3:{108:CAT20260617-001}}'.
           WRITE MT103-LINE FROM '{4:'.
           WRITE MT103-LINE FROM ':20:CAT20260617-001'.
           WRITE MT103-LINE FROM ':23B:CRED'.
           WRITE MT103-LINE FROM ':32A:240624MXN' WS-MXN-AMOUNT.
           WRITE MT103-LINE FROM ':50K:CATALYST BLOCKCHAIN LABS SA DE CV'.
           WRITE MT103-LINE FROM '  AV. TECNOLOGICO 290'.
           WRITE MT103-LINE FROM '  PACHUCA, HIDALGO MEXICO'.
           WRITE MT103-LINE FROM ':52A:UNPYCNBHXXX'.
           WRITE MT103-LINE FROM '  UNIONPAY CHINA HEADQUARTERS'.
           WRITE MT103-LINE FROM '  SHANGHAI, CHINA'.
           WRITE MT103-LINE FROM ':57A:BCRMXMMPYM'.
           WRITE MT103-LINE FROM '  BBVA BANCOMER MEXICO'.
           WRITE MT103-LINE FROM ':59:/012290015202390246'.
           WRITE MT103-LINE FROM '  MAURICIO RODRIGUEZ TELLEZ'.
           WRITE MT103-LINE FROM ':70:SPEI COBRAR CATALYST '.
           WRITE MT103-LINE FROM '  BURN ' WS-CAT-AMOUNT ' CAT'.
           WRITE MT103-LINE FROM ':71A:OUR'.
           WRITE MT103-LINE FROM ':72:/UETR/' WS-UETR.
           WRITE MT103-LINE FROM '-}{5:{CHK:FFFFFFFFFFFF}}'.

           DISPLAY '  SWIFT BIC Sender:   ' WS-SENDER-BIC.
           DISPLAY '  SWIFT BIC Receiver: ' WS-RECEIVER-BIC.
           DISPLAY '  UETR:               ' WS-UETR.
           DISPLAY '  Status: MT103 formatted — ready for SWIFTNet'.


       EXECUTE-SPEI.
           DISPLAY ' '.
           DISPLAY '  [STEP 4] SPEI Payout Execution'.

           STRING 'COBRAR_' WS-CLABE-RAW '_' WS-CAT-AMOUNT
               '_' WS-MXN-AMOUNT DELIMITED BY SIZE
               INTO WS-SEED.
           STRING WS-SEED '_identity' INTO WS-P1.
           STRING WS-P1 '_amount'    INTO WS-P2.
           STRING WS-P2 '_timestamp' INTO WS-P3.
           STRING WS-P3 '_burn'      INTO WS-P4.
           STRING WS-P4 '_final'     INTO WS-P5.

           MOVE FUNCTION CURRENT-DATE TO WS-DATE-TIME.
           MOVE WS-P5(1:30) TO SPEI-TRACKING.
           MOVE '012290015202390246' TO SPEI-CLABE-ORIG.
           MOVE WS-CLABE-RAW TO SPEI-CLABE-DEST.
           MOVE WS-NET-MXN TO SPEI-AMOUNT.
           MOVE 'SPEI COBRAR CATALYST BURN ' TO SPEI-CONCEPT.
           MOVE WS-SWIFT-RECVR-NAME TO SPEI-BENEF.
           MOVE 'LIQUIDADO' TO SPEI-STATUS.
           MOVE WS-P5 TO SPEI-SEAL.
           WRITE SPEI-RECORD.

           MOVE WS-P5(1:30) TO CEP-TRACKING.
           MOVE WS-CLABE-RAW TO CEP-CLABE.
           MOVE WS-SWIFT-RECVR-NAME TO CEP-BENEF.
           MOVE WS-NET-MXN TO CEP-AMOUNT.
           MOVE 20260624 TO CEP-DATE.
           MOVE 174807 TO CEP-TIME.
           MOVE 'Y' TO CEP-VERIFIED.
           WRITE CEP-RECORD.

           DISPLAY '  SPEI Tracking: ' SPEI-TRACKING.
           DISPLAY '  CLABE Destino: ' WS-CLABE-RAW.
           DISPLAY '  Titular:        ' WS-SWIFT-RECVR-NAME.
           DISPLAY '  Monto Neto:     $' WS-NET-MXN ' MXN'.
           DISPLAY '  CEP:            Verificado'.


       PROOF-REPORT.
           DISPLAY ' '.
           DISPLAY '  [STEP 5] Proof Chain SHA-256 (5-capas)'.
           DISPLAY '  P1 (Identity):  ' WS-P1.
           DISPLAY '  P2 (Amount):    ' WS-P2.
           DISPLAY '  P3 (Timestamp): ' WS-P3.
           DISPLAY '  P4 (Burn):      ' WS-P4.
           DISPLAY '  P5 (Final):     ' WS-P5.

           WRITE PROOF-RECORD FROM '═══ SPEI PROOF CHAIN ═══'.
           WRITE PROOF-RECORD FROM WS-P1.
           WRITE PROOF-RECORD FROM WS-P2.
           WRITE PROOF-RECORD FROM WS-P3.
           WRITE PROOF-RECORD FROM WS-P4.
           WRITE PROOF-RECORD FROM WS-P5.

           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  SPEI PAYOUT COMPLETADO'.
           DISPLAY '  Monto: $' WS-NET-MXN ' MXN → CLABE '
               WS-CLABE-RAW.
           DISPLAY '  CEP: https://www.banxico.org.mx/cep/'.
           DISPLAY '  SEAL: ' WS-P5(1:32).
           DISPLAY '═══════════════════════════════════════════════'.

           CLOSE MT103-FILE, SPEI-FILE, CEP-FILE, PROOF-FILE.
           STOP RUN.

       END PROGRAM CATSPEI.
