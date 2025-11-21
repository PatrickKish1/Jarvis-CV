import { NextResponse } from "next/server";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(`${baseUrl}?spotify_error=${error}`);
  }

  if (code) {
    return NextResponse.redirect(`${baseUrl}?code=${code}`);
  }

  return NextResponse.redirect(`${baseUrl}?spotify_error=no_code`);
}

