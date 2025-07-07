import json
import hashlib
import time
from dataclasses import dataclass, field
from typing import List
from ecdsa import VerifyingKey, BadSignatureError, SECP256k1

@dataclass
class Transaction:
    sender: str
    recipient: str
    amount: float
    signature: str

    def to_json(self) -> str:
        return json.dumps({
            'sender': self.sender,
            'recipient': self.recipient,
            'amount': self.amount,
            'signature': self.signature
        }, sort_keys=True)

    @staticmethod
    def from_json(data: str) -> 'Transaction':
        obj = json.loads(data)
        return Transaction(obj['sender'], obj['recipient'], obj['amount'], obj['signature'])

    def hash_payload(self) -> bytes:
        return hashlib.sha256(f'{self.sender}{self.recipient}{self.amount}'.encode()).digest()

    def verify(self) -> bool:
        try:
            vk = VerifyingKey.from_string(bytes.fromhex(self.sender), curve=SECP256k1)
            vk.verify(bytes.fromhex(self.signature), self.hash_payload(), hashfunc=hashlib.sha256)
            return True
        except (BadSignatureError, ValueError):
            return False


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def block_hash(index: int, previous_hash: str, timestamp: float, transactions: List[Transaction], nonce: int) -> str:
    tx_data = ''.join(t.to_json() for t in transactions)
    block_string = f'{index}{previous_hash}{timestamp}{tx_data}{nonce}'.encode()
    return sha256(block_string)


@dataclass
class Block:
    index: int
    previous_hash: str
    timestamp: float
    transactions: List[Transaction]
    nonce: int = 0
    hash: str = field(init=False)

    def __post_init__(self):
        self.hash = block_hash(self.index, self.previous_hash, self.timestamp, self.transactions, self.nonce)


class Blockchain:
    def __init__(self, difficulty: int = 4):
        self.chain: List[Block] = []
        self.current_transactions: List[Transaction] = []
        self.difficulty = difficulty
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis = Block(0, '0', time.time(), [])
        self.chain.append(genesis)

    @property
    def last_block(self) -> Block:
        return self.chain[-1]

    def new_transaction(self, transaction: Transaction):
        if transaction.verify():
            self.current_transactions.append(transaction)
            return True
        return False

    def proof_of_work(self, block: Block) -> str:
        while not block.hash.startswith('0' * self.difficulty):
            block.nonce += 1
            block.hash = block_hash(block.index, block.previous_hash, block.timestamp, block.transactions, block.nonce)
        return block.hash

    def new_block(self) -> Block:
        block = Block(
            index=len(self.chain),
            previous_hash=self.last_block.hash,
            timestamp=time.time(),
            transactions=self.current_transactions
        )
        self.proof_of_work(block)
        self.current_transactions = []
        self.chain.append(block)
        return block

    def is_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            prev = self.chain[i - 1]
            curr = self.chain[i]
            if curr.previous_hash != prev.hash:
                return False
            if not curr.hash.startswith('0' * self.difficulty):
                return False
            if curr.hash != block_hash(curr.index, curr.previous_hash, curr.timestamp, curr.transactions, curr.nonce):
                return False
            for tx in curr.transactions:
                if not tx.verify():
                    return False
        return True
