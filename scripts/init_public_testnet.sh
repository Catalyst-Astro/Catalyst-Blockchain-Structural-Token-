#!/bin/bash
set -euo pipefail

# This script starts geth connected to the Sepolia public testnet.
# Requires geth installed and an optional Infura/Alchemy endpoint.

DATA_DIR="./sepolia-node"

if [ ! -d "$DATA_DIR" ]; then
    mkdir -p "$DATA_DIR"
fi

# Start geth synced to Sepolia
geth --sepolia --datadir "$DATA_DIR" \
     --http --http.addr 0.0.0.0 --http.api eth,net,web3 \
     --syncmode light
