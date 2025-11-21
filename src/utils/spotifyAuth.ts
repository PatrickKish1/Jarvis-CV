// PKCE (Proof Key for Code Exchange) utilities for Spotify OAuth

export function generateCodeVerifier(length: number): string {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function generateCodeChallenge(
  codeVerifier: string
): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function redirectToAuthCodeFlow(clientId: string): Promise<void> {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier in sessionStorage (cleared when tab closes)
  sessionStorage.setItem("spotify_code_verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append(
    "redirect_uri",
    process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
      "http://localhost:3000/api/spotify/callback"
  );
  params.append(
    "scope",
    "user-read-playback-state user-modify-playback-state user-read-currently-playing streaming user-read-private user-read-email"
  );
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

