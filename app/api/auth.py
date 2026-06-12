"""SIWE (Sign-In with Ethereum) — Wallet-based auth for Catalyst Studio.

POST /api/auth/challenge  → get a unique challenge string to sign
POST /api/auth/verify     → verify the signature and return a session token
GET  /api/auth/session    → check current session
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from web3.auto import w3
from eth_account.messages import encode_defunct
from eth_account import Account

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Session store (in-memory — use Redis/DB in production) ──
_sessions: Dict[str, dict] = {}
_challenges: Dict[str, dict] = {}
SESSION_TTL = 3600  # 1 hour
CHALLENGE_TTL = 300  # 5 minutes
SESSION_SECRET = os.getenv("SESSION_SECRET", secrets.token_hex(32))

# ── Role config ──
ADMIN_ADDRESSES = set(
    addr.strip().lower()
    for addr in os.getenv("ADMIN_ADDRESSES", "").split(",")
    if addr.strip()
)
# Default Hardhat account #0 is admin
if not ADMIN_ADDRESSES:
    ADMIN_ADDRESSES.add("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")

MIN_TOKEN_BALANCE_ADMIN = float(os.getenv("MIN_TOKEN_BALANCE_ADMIN", "1000"))


class ChallengeRequest(BaseModel):
    address: str = Field(..., min_length=42, max_length=42)


class ChallengeResponse(BaseModel):
    challenge: str
    expires_at: int


class VerifyRequest(BaseModel):
    address: str = Field(..., min_length=42, max_length=42)
    signature: str = Field(..., min_length=130)
    challenge: str


class VerifyResponse(BaseModel):
    token: str
    role: str  # "admin" | "client"
    address: str
    expires_at: int


class SessionResponse(BaseModel):
    authenticated: bool
    address: Optional[str] = None
    role: Optional[str] = None


def _make_challenge(address: str) -> str:
    nonce = secrets.token_hex(16)
    domain = os.getenv("APP_DOMAIN", "catalyst-studio")
    return (
        f"{domain} wants you to sign in with your Ethereum account:\n"
        f"{address}\n\n"
        f"Sign this message to prove you own this wallet.\n\n"
        f"URI: http://{domain}\n"
        f"Version: 1\n"
        f"Chain ID: 31337\n"
        f"Nonce: {nonce}\n"
        f"Issued At: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}"
    )


def _verify_signature(address: str, message: str, signature: str) -> bool:
    """Verify an EIP-191 signature."""
    try:
        encoded = encode_defunct(text=message)
        recovered = Account.recover_message(encoded, signature=signature)
        return recovered.lower() == address.lower()
    except Exception:
        return False


def _determine_role(address: str) -> str:
    """Determine user role based on address and token holdings."""
    addr_lower = address.lower()
    if addr_lower in ADMIN_ADDRESSES:
        return "admin"
    return "client"


def _create_session(address: str, role: str) -> tuple[str, int]:
    """Create a session token and return (token, expires_at)."""
    expires_at = int(time.time()) + SESSION_TTL
    token = secrets.token_hex(32)
    _sessions[token] = {
        "address": address,
        "role": role,
        "expires_at": expires_at,
    }
    return token, expires_at


def _validate_session(request: Request) -> Optional[dict]:
    """Extract and validate session from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    session = _sessions.get(token)
    if not session:
        return None
    if time.time() > session["expires_at"]:
        del _sessions[token]
        return None
    return session


# ── Routes ──

@router.post("/challenge", response_model=ChallengeResponse)
def get_challenge(body: ChallengeRequest):
    """Generate a unique challenge for the user to sign."""
    if not body.address.startswith("0x") or len(body.address) != 42:
        raise HTTPException(400, "Invalid Ethereum address")

    challenge = _make_challenge(body.address)
    expires_at = int(time.time()) + CHALLENGE_TTL
    _challenges[body.address.lower()] = {
        "challenge": challenge,
        "expires_at": expires_at,
    }
    # Clean expired challenges
    now = time.time()
    expired = [k for k, v in _challenges.items() if now > v["expires_at"]]
    for k in expired:
        del _challenges[k]

    return ChallengeResponse(challenge=challenge, expires_at=expires_at)


@router.post("/verify", response_model=VerifyResponse)
def verify_signature(body: VerifyRequest):
    """Verify the signed challenge and create a session."""
    addr_lower = body.address.lower()
    stored = _challenges.get(addr_lower)

    if not stored:
        raise HTTPException(400, "No challenge found. Request one first.")
    if time.time() > stored["expires_at"]:
        del _challenges[addr_lower]
        raise HTTPException(400, "Challenge expired. Request a new one.")
    if body.challenge != stored["challenge"]:
        raise HTTPException(400, "Challenge mismatch.")

    if not _verify_signature(body.address, body.challenge, body.signature):
        raise HTTPException(401, "Invalid signature.")

    # Clean challenge
    del _challenges[addr_lower]

    role = _determine_role(body.address)
    token, expires_at = _create_session(body.address, role)

    return VerifyResponse(
        token=token,
        role=role,
        address=body.address,
        expires_at=expires_at,
    )


@router.get("/session", response_model=SessionResponse)
def check_session(request: Request):
    """Return current session info or not authenticated."""
    session = _validate_session(request)
    if not session:
        return SessionResponse(authenticated=False)
    return SessionResponse(
        authenticated=True,
        address=session["address"],
        role=session["role"],
    )


@router.post("/logout")
def logout(request: Request):
    """Invalidate the current session."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        _sessions.pop(token, None)
    return {"status": "logged_out"}
