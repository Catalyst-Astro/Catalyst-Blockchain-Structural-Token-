"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const callbackUrl = params.get("callbackUrl") || "/";

  // Already logged in → redirect
  if (status === "authenticated") {
    router.replace(callbackUrl);
    return null;
  }

  const handleSocial = async (provider: "google" | "github") => {
    setLoading(provider);
    setError("");
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError(`Could not connect to ${provider}.`);
      setLoading(null);
    }
  };

  const errorMsg = params.get("error");

  // Check which providers are available (inferred from env)
  const hasGoogle = true; // Always show — fails gracefully if not configured
  const hasGitHub = true;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 text-[#00ff88]">◆</div>
          <h1 className="text-2xl font-bold text-white mb-1">Catalyst AI</h1>
          <p className="text-sm text-gray-500">
            BELL 13450.50 · Pentetraktys 4D
          </p>
        </div>

        {/* Error display */}
        {(error || errorMsg) && (
          <div className="mb-4 p-3 rounded-lg bg-[#ff004422] border border-[#ff004444] text-[#ff4444] text-sm text-center">
            {error ||
              (errorMsg === "OAuthAccountNotLinked" &&
                "This email is already linked to another sign-in method.") ||
              (errorMsg === "AccessDenied" &&
                "Sign in was cancelled or failed.") ||
              (errorMsg === "Configuration" &&
                "Authentication is not configured. Check server environment variables.") ||
              "An error occurred during sign in."}
          </div>
        )}

        {/* Setup notice */}
        {errorMsg === "Configuration" && (
          <div className="mb-4 p-3 rounded-lg bg-[#ffaa0011] border border-[#ffaa0033] text-[#ffaa00] text-xs text-center">
            <strong>Setup needed:</strong> Add <code className="bg-[#ffffff11] px-1 rounded">AUTH_GOOGLE_ID</code> and{" "}
            <code className="bg-[#ffffff11] px-1 rounded">AUTH_GOOGLE_SECRET</code>{" "}
            (or GitHub equivalents) to your{" "}
            <code className="bg-[#ffffff11] px-1 rounded">.env.local</code> file.
            <div className="mt-2">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener"
                className="underline hover:text-white"
              >
                Google Cloud Console →
              </a>
              {" · "}
              <a
                href="https://github.com/settings/developers"
                target="_blank"
                rel="noopener"
                className="underline hover:text-white"
              >
                GitHub OAuth Apps →
              </a>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Google */}
          {hasGoogle && (
            <button
              onClick={() => handleSocial("google")}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#ffffff15] bg-white text-gray-900 font-medium hover:bg-gray-100 transition disabled:opacity-50 text-sm"
            >
              {loading === "google" ? (
                <Spinner />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </button>
          )}

          {/* GitHub */}
          {hasGitHub && (
            <button
              onClick={() => handleSocial("github")}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#ffffff15] bg-[#24292e] text-white font-medium hover:bg-[#2f363d] transition disabled:opacity-50 text-sm"
            >
              {loading === "github" ? (
                <Spinner />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              Continue with GitHub
            </button>
          )}

          {/* Email magic link — disabled until EMAIL_SERVER is configured */}
        </div>

        <div className="mt-6 p-3 rounded-lg bg-[#ffffff05] border border-[#ffffff10]">
          <p className="text-xs text-gray-500 text-center">
            <strong className="text-gray-400">Setup required</strong>
            <br />
            Add OAuth credentials to <code className="bg-[#ffffff11] px-1 rounded">apps/catalyst-chat/.env.local</code>
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By signing in, you agree to the Catalyst AI Terms of Service.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
