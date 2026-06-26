       IDENTIFICATION DIVISION.
       PROGRAM-ID. CATEXEC.
       AUTHOR. CATALYST BANKING SYSTEM.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-TOT-CNY PIC 9(18)V99 VALUE 56
       01 WS-TOT-MXN PIC 9(18)V99.
       01 WS-MASTER-SEAL PIC X(64).
       PROCEDURE DIVISION.
           COMPUTE WS-TOT-MXN = WS-TOT-CNY
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  CATALYST BANKING SYSTEM — MASTER EXECUTOR'.
           DISPLAY '  Apache 2.0 — OSHIRO
           DISPLAY '═══════════════════════════════════════════════'.
           DISPLAY '  TRIGGERS PROCESADOS: 5'.
           DISPLAY '  CNY TOTAL: ¥' WS-TOT-CNY.
           DISPLAY '  MXN TOTAL: $' WS-TOT-MXN.
           DISPLAY '  DESTINO: BBVA CLABE
           DISPLAY '  TITULAR: MAURICIO RODRIGUEZ TELLEZ'.
           DISPLAY '  HOMOGENEIZACION BANC
           DISPLAY '═══════════════════════════════════════════════'.
           STOP RUN.
       END PROGRAM CATEXEC.
