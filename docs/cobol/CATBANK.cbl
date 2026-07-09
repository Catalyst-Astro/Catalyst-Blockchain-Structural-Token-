       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATBANK.
       AUTHOR. CATALYST BANKING SYSTEM.
       DATE-WRITTEN. 2026-06-25.
       SECURITY. BELL-13450-50 APACHE-2.0 OSHIRO ERC-26+.
       REMARKS. BANCA PERFECTA — HOMOGENEIZACION MUNDIAL.

       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-Z-SERIES.
       OBJECT-COMPUTER. IBM-Z-SERIES.
       SPECIAL-NAMES. DECIMAL-POINT IS COMMA.

       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT REPORT-FILE ASSIGN TO CATBKRPT.

       DATA DIVISION.
       FILE SECTION.
       FD  REPORT-FILE.
       01  REPORT-LINE PIC X(132).

       WORKING-STORAGE SECTION.

      *─── ORACLE (P04) ────────────────────────────────────────────
       01  ORACLE.
           05  CAT-USD    PIC 9V9(6) VALUE 0,100000.
           05  USD-MXN    PIC 99V9(6) VALUE 20,000000.
           05  USD-CNY    PIC 9V9(6) VALUE 7,250000.

      *─── CLABE + SWIFT ───────────────────────────────────────────
       01  DESTINO.
           05  CLABE      PIC X(18) VALUE '012290015202390246'.
           05  SWIFT-BIC  PIC X(11) VALUE 'BCRMXMMPYM'.
           05  TITULAR    PIC X(40) VALUE 'MAURICIO RODRIGUEZ TELLEZ'.
           05  BANCO      PIC X(15) VALUE 'BBVA BANCOMER'.

      *─── 5 TRIGGERS ──────────────────────────────────────────────
       01  TRIGGERS.
           05  TRIG OCCURS 5 TIMES.
               10  TRIG-ID    PIC X(10).
               10  TRIG-BITS  PIC 9(4).
               10  TRIG-CNY   PIC 9(15)V99.
               10  TRIG-MXN   PIC 9(18)V99.
               10  TRIG-SEAL  PIC X(64).

      *─── 8 PROTOCOLOS ────────────────────────────────────────────
       01  PROTOCOLS.
           05  PROT OCCURS 8 TIMES.
               10  PROT-ID    PIC X(4).
               10  PROT-NAME  PIC X(30).
               10  PROT-CNY   PIC 9(15)V99.
               10  PROT-MXN   PIC 9(18)V99.

      *─── TOTALES ─────────────────────────────────────────────────
       01  TOTALS.
           05  GT-CNY    PIC 9(18)V99 VALUE 0.
           05  GT-MXN    PIC 9(18)V99 VALUE 0.
           05  GT-USD    PIC 9(18)V99 VALUE 0.
           05  FEE       PIC 9(18)V99 VALUE 0.
           05  NET-MXN   PIC 9(18)V99 VALUE 0.

       01  WS-I        PIC 9(2).
       01  WS-SEAL     PIC X(64).
       01  WS-LINE     PIC X(80).

       PROCEDURE DIVISION.

       MAIN.
           PERFORM INIT-DATA.
           PERFORM PROCESS-TRIGGERS.
           PERFORM PROCESS-PROTOCOLS.
           PERFORM CALCULATE-TOTALS.
           PERFORM PRINT-REPORT.
           STOP RUN.

       INIT-DATA.
           MOVE 'HAAG-CIRC' TO TRIG-ID(1).
           MOVE 614 TO TRIG-BITS(1).
           MOVE 51000000000,00 TO TRIG-CNY(1).

           MOVE 'UNION-QR ' TO TRIG-ID(2).
           MOVE 479 TO TRIG-BITS(2).
           MOVE 111200000000,00 TO TRIG-CNY(2).

           MOVE 'COMP-512 ' TO TRIG-ID(3).
           MOVE 512 TO TRIG-BITS(3).
           MOVE 193000000000,00 TO TRIG-CNY(3).

           MOVE 'COMP-784 ' TO TRIG-ID(4).
           MOVE 783 TO TRIG-BITS(4).
           MOVE 208000000000,00 TO TRIG-CNY(4).

           MOVE 'BBVA-10M ' TO TRIG-ID(5).
           MOVE 702 TO TRIG-BITS(5).
           MOVE 11000000,00 TO TRIG-CNY(5).

           MOVE 'P01 ' TO PROT-ID(1).
           MOVE 'REGISTRO FINANCIERO' TO PROT-NAME(1).
           MOVE 45000000000,00 TO PROT-CNY(1).

           MOVE 'P02 ' TO PROT-ID(2).
           MOVE 'KYC/AML IDENTITY SBT' TO PROT-NAME(2).
           MOVE 38000000000,00 TO PROT-CNY(2).

           MOVE 'P03 ' TO PROT-ID(3).
           MOVE 'UNIONPAY QR 95516' TO PROT-NAME(3).
           MOVE 52000000000,00 TO PROT-CNY(3).

           MOVE 'P04 ' TO PROT-ID(4).
           MOVE 'ORACLE 4-PILLAR RATES' TO PROT-NAME(4).
           MOVE 28000000000,00 TO PROT-CNY(4).

           MOVE 'P05 ' TO PROT-ID(5).
           MOVE 'SWIFT MT103 BCRMXMMPYM' TO PROT-NAME(5).
           MOVE 42000000000,00 TO PROT-CNY(5).

           MOVE 'P06 ' TO PROT-ID(6).
           MOVE 'TREASURY 50/50 BBVA' TO PROT-NAME(6).
           MOVE 35000000000,00 TO PROT-CNY(6).

           MOVE 'P08 ' TO PROT-ID(7).
           MOVE 'SETTLEMENT + PROOF' TO PROT-NAME(7).
           MOVE 31000000000,00 TO PROT-CNY(7).

           MOVE 'P13 ' TO PROT-ID(8).
           MOVE 'CIERRE CONTABLE DIARIO' TO PROT-NAME(8).
           MOVE 20000000000,00 TO PROT-CNY(8).

       PROCESS-TRIGGERS.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               COMPUTE TRIG-MXN(WS-I) = TRIG-CNY(WS-I) * 2,76
               ADD TRIG-CNY(WS-I) TO GT-CNY
               ADD TRIG-MXN(WS-I) TO GT-MXN
           END-PERFORM.

       PROCESS-PROTOCOLS.
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 8
               COMPUTE PROT-MXN(WS-I) = PROT-CNY(WS-I) * 2,76
           END-PERFORM.

       CALCULATE-TOTALS.
           COMPUTE GT-MXN = GT-CNY * 2,76.
           COMPUTE GT-USD = GT-CNY / 7,25.
           COMPUTE FEE = GT-CNY * 0,0015.
           COMPUTE NET-MXN = GT-MXN - FEE.

       PRINT-REPORT.
           OPEN OUTPUT REPORT-FILE.

           MOVE '═══════════════════════════════════════════════'
               TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '  CATALYST BANK — SISTEMA BANCARIO COBOL'
               TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '  Apache 2.0 — OSHIRO ERC-26+ Quantum Autopoiesis'
               TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '═══════════════════════════════════════════════'
               TO REPORT-LINE.
           WRITE REPORT-LINE.

           MOVE ' ' TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '  ── TRIGGERS ──' TO REPORT-LINE.
           WRITE REPORT-LINE.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 5
               STRING '  ' TRIG-ID(WS-I) ' | '
                   TRIG-BITS(WS-I) 'b | CNY ' TRIG-CNY(WS-I)
                   ' | MXN ' TRIG-MXN(WS-I)
                   DELIMITED BY SIZE INTO WS-LINE
               MOVE WS-LINE TO REPORT-LINE
               WRITE REPORT-LINE
           END-PERFORM.

           MOVE ' ' TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '  ── PROTOCOLOS ──' TO REPORT-LINE.
           WRITE REPORT-LINE.

           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > 8
               STRING '  ' PROT-ID(WS-I) ' '
                   PROT-NAME(WS-I) ' | CNY '
                   PROT-CNY(WS-I) ' | MXN ' PROT-MXN(WS-I)
                   DELIMITED BY SIZE INTO WS-LINE
               MOVE WS-LINE TO REPORT-LINE
               WRITE REPORT-LINE
           END-PERFORM.

           MOVE ' ' TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '  ── TOTALES ──' TO REPORT-LINE.
           WRITE REPORT-LINE.

           STRING '  CNY TOTAL: ' GT-CNY DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           STRING '  MXN TOTAL: ' GT-MXN DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           STRING '  USD TOTAL: ' GT-USD DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           STRING '  FEE 0,15%: ' FEE DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           STRING '  NET BBVA:  ' NET-MXN DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           MOVE ' ' TO REPORT-LINE.
           WRITE REPORT-LINE.
           STRING '  DESTINO: BBVA CLABE ' CLABE
               DELIMITED BY SIZE INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           STRING '  TITULAR: ' TITULAR DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           STRING '  SWIFT:   ' SWIFT-BIC DELIMITED BY SIZE
               INTO WS-LINE.
           MOVE WS-LINE TO REPORT-LINE. WRITE REPORT-LINE.

           MOVE ' ' TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '═══════════════════════════════════════════════'
               TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '  COBOL SISTEMA BANCARIO — EJECUTADO'
               TO REPORT-LINE.
           WRITE REPORT-LINE.
           MOVE '═══════════════════════════════════════════════'
               TO REPORT-LINE.
           WRITE REPORT-LINE.

           CLOSE REPORT-FILE.

           DISPLAY ' '.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATALYST BANK — SISTEMA BANCARIO COBOL'.
           DISPLAY '  Apache 2.0 — OSHIRO ERC-26+'.
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CNY: ' GT-CNY.
           DISPLAY '  MXN: ' GT-MXN.
           DISPLAY '  USD: ' GT-USD.
           DISPLAY '  NET: ' NET-MXN ' → BBVA ' CLABE.
           DISPLAY '═══════════════════════════════════════════════'.

       END PROGRAM CATBANK.
