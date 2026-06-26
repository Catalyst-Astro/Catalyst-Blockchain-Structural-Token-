      *****************************************************************
      * CATCOPY — CATALYST BANKING SYSTEM COPYBOOK
      * Grace Murray Hopper Standard — ANSI COBOL-85
      * Catalogo de Cuentas NIF + Tokens + CLABEs + Rates
      * Fecha: 24 Junio 2026
      * Version: CAT-COBOL-3.0
      *****************************************************************

      *── CATALOGO DE CUENTAS NIF (58 cuentas) ────────────────────

       01  ACCOUNT-CATALOG.
           05  FILLER PIC X(80) VALUE
               '1000 ACTIVO               A D 0          GRUPO'.
           05  FILLER PIC X(80) VALUE
               '1100 Efectivo Equivalentes A D 1 1000     GRUPO'.
           05  ACCT-1101.
               10 ACCT-CODE    PIC X(4)  VALUE '1101'.
               10 ACCT-NAME    PIC X(30) VALUE 'Caja'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
               10 ACCT-LEVEL   PIC 9(1)  VALUE 3.
           05  ACCT-1102.
               10 ACCT-CODE    PIC X(4)  VALUE '1102'.
               10 ACCT-NAME    PIC X(30) VALUE 'BBVA CLABE Principal 012290015202390246'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
               10 ACCT-LEVEL   PIC 9(1)  VALUE 3.
               10 ACCT-CLABE   PIC X(18) VALUE '012290015202390246'.
               10 ACCT-BANK    PIC X(10) VALUE 'BBVA BANCOMER'.
               10 ACCT-SWIFT   PIC X(11) VALUE 'BCRMXMMPYM'.
           05  ACCT-1103.
               10 ACCT-CODE    PIC X(4)  VALUE '1103'.
               10 ACCT-NAME    PIC X(30) VALUE 'BBVA CLABE Secundaria 012180015123243964'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
               10 ACCT-CLABE   PIC X(18) VALUE '012180015123243964'.
           05  ACCT-1104.
               10 ACCT-CODE    PIC X(4)  VALUE '1104'.
               10 ACCT-NAME    PIC X(30) VALUE 'Bitso SPEI Custody'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
           05  ACCT-1201.
               10 ACCT-CODE    PIC X(4)  VALUE '1201'.
               10 ACCT-NAME    PIC X(30) VALUE 'CAT Token Treasury Holdings'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
               10 ACCT-TOKEN   PIC X(3)  VALUE 'CAT'.
           05  ACCT-1202.
               10 ACCT-CODE    PIC X(4)  VALUE '1202'.
               10 ACCT-NAME    PIC X(30) VALUE 'GNC Token Ganancia 1:1 CNY'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
           05  ACCT-1203.
               10 ACCT-CODE    PIC X(4)  VALUE '1203'.
               10 ACCT-NAME    PIC X(30) VALUE 'FLT Token Fractal Compliance'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'A'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.
           05  ACCT-2101.
               10 ACCT-CODE    PIC X(4)  VALUE '2101'.
               10 ACCT-NAME    PIC X(30) VALUE 'Customer MXN Deposits'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'L'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'C'.
           05  ACCT-2203.
               10 ACCT-CODE    PIC X(4)  VALUE '2203'.
               10 ACCT-NAME    PIC X(30) VALUE 'GNC Redemption Liability 1:1 CNY'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'L'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'C'.
           05  ACCT-3101.
               10 ACCT-CODE    PIC X(4)  VALUE '3101'.
               10 ACCT-NAME    PIC X(30) VALUE 'Capital Social Fijo'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'E'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'C'.
           05  ACCT-3202.
               10 ACCT-CODE    PIC X(4)  VALUE '3202'.
               10 ACCT-NAME    PIC X(30) VALUE 'GNC Backing Reserve'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'E'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'C'.
           05  ACCT-4101.
               10 ACCT-CODE    PIC X(4)  VALUE '4101'.
               10 ACCT-NAME    PIC X(30) VALUE 'QR Processing Fee Income'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'I'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'C'.
           05  ACCT-5101.
               10 ACCT-CODE    PIC X(4)  VALUE '5101'.
               10 ACCT-NAME    PIC X(30) VALUE 'CAT Token Burn Cost 5% Deflacionario'.
               10 ACCT-TYPE    PIC X(1)  VALUE 'X'.
               10 ACCT-BALANCE PIC X(1)  VALUE 'D'.

      *── TOKEN ECOSYSTEM ────────────────────────────────────────

       01  TOKEN-ECOSYSTEM.
           05  TOKEN-CAT.
               10 CAT-NAME       PIC X(20) VALUE 'Catalyst Token'.
               10 CAT-SYMBOL     PIC X(3)  VALUE 'CAT'.
               10 CAT-SUPPLY     PIC 9(12) VALUE 1000000000.
               10 CAT-TREASURY   PIC 9(12) VALUE 99830000.
               10 CAT-ORACLE-USD PIC 9(2)V9(2) VALUE 0.10.
               10 CAT-ORACLE-MXN PIC 9(2)V9(2) VALUE 2.00.
               10 CAT-BURN-RATE  PIC 9(2)V9(2) VALUE 0.05.
           05  TOKEN-GNC.
               10 GNC-NAME       PIC X(20) VALUE 'Ganancia Token'.
               10 GNC-SYMBOL     PIC X(3)  VALUE 'GNC'.
               10 GNC-SUPPLY     PIC 9(12) VALUE 4390000.
               10 GNC-BACKING    PIC X(7)  VALUE '1:1 CNY'.
           05  TOKEN-CTV.
               10 CTV-NAME       PIC X(20) VALUE 'Token Cautivo'.
               10 CTV-SYMBOL     PIC X(3)  VALUE 'CTV'.
               10 CTV-SUPPLY     PIC 9(6)  VALUE 10.
               10 CTV-RATIO      PIC 9(4)  VALUE 1000.
           05  TOKEN-FLT.
               10 FLT-NAME       PIC X(20) VALUE 'Fractal Token'.
               10 FLT-SYMBOL     PIC X(3)  VALUE 'FLT'.
               10 FLT-SUPPLY     PIC 9(12) VALUE 1000000000.

      *── ORACLE RATES (4-Pillar MXNPriceOracle) ─────────────────

       01  ORACLE-RATES.
           05  CAT-USD-RATE      PIC 9(2)V9(6) VALUE 0.100000.
           05  USD-MXN-RATE      PIC 9(2)V9(6) VALUE 20.000000.
           05  USD-CNY-RATE      PIC 9(2)V9(6) VALUE 7.250000.
           05  CAT-MXN-RATE      PIC 9(2)V9(6) VALUE 2.000000.
           05  CAT-CNY-RATE      PIC 9(2)V9(6) VALUE 0.725000.

      *── TRIGGER CONFIGURATION ──────────────────────────────────

       01  TRIGGER-CONFIG.
           05  TRIGGER-QR-COUNT  PIC 9(2)  VALUE 7.
           05  TRIGGER-BITS      PIC 9(4)  VALUE 844.
           05  TRIGGER-TELEGRAPH  PIC 9(4) VALUE 278.
           05  TRIGGER-R1-MED    PIC 9(2)  VALUE 76.
           05  TRIGGER-GNC-CTV   PIC 9(2)  VALUE 43.

      *── CLABE VALIDATION TABLE ──────────────────────────────────

       01  CLABE-TABLE.
           05  CLABE-ENTRY OCCURS 8 TIMES.
               10 CLABE-NUM    PIC X(18).
               10 CLABE-BANK   PIC X(15).
               10 CLABE-LABEL  PIC X(20).

      *── DAILY CLOSURE RECORD ────────────────────────────────────

       01  DAILY-CLOSURE.
           05  CLOSE-DATE       PIC 9(8).
           05  CLOSE-TOTAL-A    PIC S9(15)V99.
           05  CLOSE-TOTAL-L    PIC S9(15)V99.
           05  CLOSE-TOTAL-E    PIC S9(15)V99.
           05  CLOSE-TOTAL-I    PIC S9(15)V99.
           05  CLOSE-TOTAL-X    PIC S9(15)V99.
           05  CLOSE-NET-INCOME PIC S9(15)V99.
           05  CLOSE-BALANCED   PIC X(1).
           05  CLOSE-HASH       PIC X(64).

      *── TRANSACTION RECORD ──────────────────────────────────────

       01  TRANSACTION-RECORD.
           05  TX-ID            PIC X(30).
           05  TX-TIMESTAMP     PIC 9(14).
           05  TX-TYPE          PIC X(10).
           05  TX-AMOUNT-CAT    PIC 9(12).
           05  TX-AMOUNT-CNY    PIC 9(12)V99.
           05  TX-AMOUNT-MXN    PIC 9(15)V99.
           05  TX-CLABE         PIC X(18).
           05  TX-RECIPIENT     PIC X(40).
           05  TX-PROOF-P1      PIC X(64).
           05  TX-PROOF-P2      PIC X(64).
           05  TX-PROOF-P3      PIC X(64).
           05  TX-PROOF-P4      PIC X(64).
           05  TX-PROOF-P5      PIC X(64).
           05  TX-STATUS        PIC X(10).
           05  TX-SETTLEMENT    PIC X(66).

      *── JOURNAL ENTRY ───────────────────────────────────────────

       01  JOURNAL-ENTRY.
           05  JE-ID            PIC X(20).
           05  JE-DATE          PIC 9(8).
           05  JE-DESC          PIC X(80).
           05  JE-SOURCE        PIC X(15).
           05  JE-TOTAL-DEBIT   PIC S9(18)V99.
           05  JE-TOTAL-CREDIT  PIC S9(18)V99.
           05  JE-LINE-COUNT    PIC 9(4).
           05  JE-LINES OCCURS 20 TIMES.
               10 JL-ACCOUNT    PIC X(4).
               10 JL-DESC       PIC X(50).
               10 JL-DEBIT      PIC S9(18)V99.
               10 JL-CREDIT     PIC S9(18)V99.
               10 JL-CURRENCY   PIC X(3).
               10 JL-ASSET-TYPE PIC X(4).
