#!/bin/bash
set -euo pipefail

# Validates that a geth node is running by querying its JSON-RPC endpoint.
RPC_URL="${RPC_URL:-http://localhost:8545}"

# Check if the node is syncing
curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' "$RPC_URL" | jq

# Check peer count
curl -s -X POST --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' "$RPC_URL" | jq
