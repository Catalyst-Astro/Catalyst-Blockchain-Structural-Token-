export const symbolicEventLogAddress = '0xSymbolicEventLogAddress';

export const symbolicEventLogAbi = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
      { "internalType": "string", "name": "evento", "type": "string" },
      { "internalType": "address", "name": "validador", "type": "address" },
      { "internalType": "string", "name": "hashSimb", "type": "string" },
      { "internalType": "string", "name": "firma", "type": "string" },
      { "internalType": "string", "name": "glifoHash", "type": "string" },
      { "internalType": "string", "name": "ipfs", "type": "string" }
    ],
    "name": "SymbolicEvent",
    "type": "event"
  }
];
