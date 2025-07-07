# Backend API

This directory contains a minimal Node.js based service that exposes audit data for third parties. The listener in `scripts/auditListener.js` stores events in `backend/database/events.json`. Simple Express routes could be implemented in `backend/api` to serve these records by wallet address or contract.

