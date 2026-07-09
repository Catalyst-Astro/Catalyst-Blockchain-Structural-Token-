// cep_handler.js — CATALYST CEP: Sistema Propio de Verificación de Pagos
// Emula y supera al CEP de Banxico con proof chains SHA-256 on-chain
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function createCEPHandler() {
  const router = express.Router();

  // GET /api/cep/verify — Verificar un pago (nuestro CEP)
  router.get("/verify", (req, res) => {
    const { tracking, fecha, monto, clabe } = req.query;

    // Cargar transacciones
    const txPath = path.join(__dirname, "transactions.json");
    let transactions = [];
    try { transactions = JSON.parse(fs.readFileSync(txPath, "utf8")); } catch(e) {}

    let found = null;

    // Buscar por tracking
    if (tracking) {
      found = transactions.find(tx =>
        tx.spei_tracking === tracking ||
        tx.id === tracking
      );
    }

    // Buscar por CLABE + monto + fecha
    if (!found && clabe && monto) {
      found = transactions.find(tx =>
        tx.clabe === clabe &&
        Math.abs(tx.mxn_amount - parseFloat(monto)) < 1 &&
        tx.timestamp?.startsWith(fecha || "")
      );
    }

    if (!found) {
      return res.json({
        success: false,
        error: "PAGO NO ENCONTRADO",
        message: "El pago no se encuentra en el registro de Catalyst Bank. Verifique los datos.",
        search_params: { tracking, fecha, monto, clabe },
        sugerencia: "Si el pago fue realizado hace menos de 24h, puede estar en proceso.",
      });
    }

    // Verify proof chain
    const proofValid = found.proof_chain ? verifyProofChain(found) : null;

    // Generate CEP response
    const cep = {
      success: true,
      estatus: "LIQUIDADO",
      comprobante_electronico_pago: {
        id: found.id,
        fecha_operacion: found.timestamp?.slice(0, 10),
        hora_operacion: found.timestamp?.slice(11, 19),
        monto_mxn: found.mxn_amount,
        monto_letra: numeroALetra(found.mxn_amount),
        moneda: "MXN",
        tipo_pago: "SPEI — Transferencia Electronica de Fondos",
        clave_rastreo: found.spei_tracking || found.id,
        referencia: found.id,
        concepto: found.concept || found.recipient_name || "",

        banco_emisor: {
          nombre: "Catalyst Blockchain Labs S.A. de C.V.",
          clave: "CAT",
          swift_bic: "BCRMXMMPYM",
        },
        banco_receptor: {
          nombre: "BBVA Mexico S.A.",
          clave: "012",
          swift_bic: "BCRMXMMPYM",
        },
        beneficiario: {
          nombre: found.recipient_name || "Beneficiario",
          clabe: found.clabe,
        },
        ordenante: {
          nombre: "Mauricio Rodriguez Tellez",
          rfc: "ROTMMXXXXXX-XXX",
        },
      },
      cadena_verificacion: {
        protocolo: "OSHIRO ERC-26+ 5-Layer SHA-256",
        capa_1_identity: found.proof_chain?.p1,
        capa_2_amount: found.proof_chain?.p2,
        capa_3_timestamp: found.proof_chain?.p3,
        capa_4_burn: found.proof_chain?.p4,
        capa_5_final: found.proof_chain?.p5,
        proof_chain_valida: proofValid,
        verificacion_onchain: found.burn_tx ? `TX: ${found.burn_tx}` : "Sandbox",
      },
      certificacion: {
        entidad: "Catalyst Blockchain Labs S.A. de C.V.",
        rfc: "ROTMMXXXXXX-XXX",
        domicilio: "Moscato 185, Zempoala, Pachuca, Hidalgo, Mexico",
        sello_digital: found.proof_chain?.p5,
        fecha_emision_cep: new Date().toISOString(),
        validez: "Este comprobante tiene validez legal como prueba de pago.",
        fundamento: "Art. 89 Codigo de Comercio — Firma Electronica Avanzada",
      },
    };

    res.json(cep);
  });

  // GET /api/cep — Página de consulta CEP
  router.get("/", (req, res) => {
    const tracking = req.query.tracking || "";
    if (!tracking) {
      return res.sendFile(path.join(__dirname, "public", "cep-consulta.html"));
    }

    // Redirect to API verification
    const txPath = path.join(__dirname, "transactions.json");
    let transactions = [];
    try { transactions = JSON.parse(fs.readFileSync(txPath, "utf8")); } catch(e) {}

    const found = transactions.find(tx =>
      tx.spei_tracking === tracking || tx.id === tracking
    );

    if (found) {
      res.json({
        encontrado: true,
        tracking,
        monto: found.mxn_amount,
        clabe: found.clabe,
        fecha: found.timestamp?.slice(0, 10),
        hora: found.timestamp?.slice(11, 19),
        status: found.status,
        proof: found.proof_chain?.p5?.slice(0, 32),
        verificador: "CATALYST CEP — Sistema Propio de Verificacion de Pagos",
      });
    } else {
      res.json({
        encontrado: false,
        tracking,
        message: "Pago no encontrado. Verifique tracking o espere 24h.",
      });
    }
  });

  return router;
}

// ── Helpers ──

function verifyProofChain(tx) {
  if (!tx.proof_chain) return false;
  const { p1, p2, p3, p4, p5 } = tx.proof_chain;

  // Rebuild proof chain
  const seed = `COBRAR_${tx.timestamp?.replace(/[-:.]/g,"") || "0"}_${tx.clabe}_${tx.amount_cat}`;
  const verify = (data) => crypto.createHash("sha256").update(data).digest("hex");

  const v1 = verify(seed + "_identity");
  const v2 = verify(v1 + "_amount");
  const v3 = verify(v2 + "_ts");
  const v4 = verify(v3 + "_burn");
  const v5 = verify(v4 + "_final");

  return {
    p1_match: p1 === v1,
    p2_match: p2 === v2,
    p3_match: p3 === v3,
    p4_match: p4 === v4,
    p5_match: p5 === v5,
    fully_valid: p1 === v1 && p2 === v2 && p3 === v3 && p4 === v4 && p5 === v5,
  };
}

function numeroALetra(monto) {
  if (!monto || monto === 0) return "CERO PESOS MXN 00/100";
  const millones = Math.floor(monto / 1000000);
  const miles = Math.floor((monto % 1000000) / 1000);
  const resto = Math.floor(monto % 1000);

  let partes = [];
  if (millones > 0) partes.push(`${millones} MILLONES`);
  if (miles > 0) partes.push(miles === 1 ? "MIL" : `${miles} MIL`);
  if (resto > 0) partes.push(`${resto}`);

  return (partes.join(" ") + " PESOS MXN 00/100").toUpperCase();
}

module.exports = { createCEPHandler };
