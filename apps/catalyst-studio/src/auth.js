// =============================================================================
// auth.js — SIWE (Sign-In with Ethereum) para Catalyst Studio
// =============================================================================

import { ethers } from 'ethers';

const API = '';

async function fetchAPI(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

function getToken() {
  return localStorage.getItem('catalyst_session');
}

function setToken(token) {
  localStorage.setItem('catalyst_session', token);
}

function clearToken() {
  localStorage.removeItem('catalyst_session');
}

function getRole() {
  return localStorage.getItem('catalyst_role');
}

function setRole(role) {
  localStorage.setItem('catalyst_role', role);
}

/**
 * Step 1: Get a challenge from the backend.
 */
export async function getChallenge(address) {
  const data = await fetchAPI('/api/auth/challenge', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
  return data.challenge;
}

/**
 * Step 2: Sign the challenge with the wallet.
 */
export async function signChallenge(challenge) {
  if (!window.ethereum && !localStorage.getItem('dev_key_set')) {
    const key = import.meta.env.VITE_PRIVATE_KEY;
    if (!key) {
      throw new Error(
        'No wallet available. Install MetaMask or set VITE_PRIVATE_KEY in .env for local development.'
      );
    }
    localStorage.setItem('dev_key_set', '1');
    const wallet = new ethers.Wallet(key);
    return wallet.signMessage(challenge);
  }
  // Browser wallet (MetaMask)
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return signer.signMessage(challenge);
}

/**
 * Step 3: Verify the signature and get a session token.
 */
export async function verifyLogin(address, signature, challenge) {
  const data = await fetchAPI('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ address, signature, challenge }),
  });
  setToken(data.token);
  setRole(data.role);
  return data;
}

/**
 * Complete SIWE login flow.
 */
export async function login() {
  // 1. Connect wallet
  let address;
  if (!window.ethereum) {
    const key = import.meta.env.VITE_PRIVATE_KEY;
    if (!key) {
      throw new Error(
        'No wallet available. Install MetaMask or set VITE_PRIVATE_KEY in .env for local development.'
      );
    }
    const wallet = new ethers.Wallet(key);
    address = wallet.address;
  } else {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    address = await signer.getAddress();
  }

  // 2. Get challenge
  const challenge = await getChallenge(address);

  // 3. Sign
  const signature = await signChallenge(challenge);

  // 4. Verify
  const result = await verifyLogin(address, signature, challenge);
  return result;
}

/**
 * Check if user is logged in.
 */
export function isLoggedIn() {
  return !!getToken();
}

/**
 * Get current user info from local storage.
 */
export function getUser() {
  const token = getToken();
  const role = getRole();
  if (!token) return null;
  return { token, role };
}

/**
 * Verify session is still valid on server.
 */
export async function checkSession() {
  try {
    const token = getToken();
    if (!token) return null;
    const data = await fetchAPI('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (data.authenticated) {
      setRole(data.role);
      return { role: data.role, address: data.address };
    }
    clearToken();
    return null;
  } catch {
    return null;
  }
}

/**
 * Logout.
 */
export async function logout() {
  const token = getToken();
  if (token) {
    await fetchAPI('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
}
