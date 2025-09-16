# Audit Compliance Guide

This document summarizes legal and computational considerations for the automated audit system.

## OECD Blockchain Toolkit

The OECD Blockchain Policy Centre provides best practices for transparency, accountability and auditability in distributed ledgers. Our AuditManager contract records critical events and allows provable linkage with off-chain reports. Event logs are indexed and accessible to auditors following the OECD recommendation to ensure open access to verifiable data.

## EU Smart Contract Audit Guidelines

According to the European Union directives on trusted smart contracts, audit trails must be immutable and tamper-resistant. The registerAuditReport function enables anchoring the hash of each signed report on-chain, providing non-repudiable proof of compliance. External auditors can verify historical data via the provided API in alignment with these guidelines.

