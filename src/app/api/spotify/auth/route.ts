import { NextResponse } from "next/server";

export async function GET() {
  const SPOTIFY_CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  
  if (!SPOTIFY_CLIENT_ID) {
    return NextResponse.json(
      { error: "Spotify Client ID not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Use redirectToAuthCodeFlow from client-side",
    clientId: SPOTIFY_CLIENT_ID,
  });
}

