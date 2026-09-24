import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, inviteCode } = await request.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const allowedEmails = (process.env.TEAM_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const codeMatches = Boolean(process.env.TEAM_INVITE_CODE) && inviteCode === process.env.TEAM_INVITE_CODE;
  const emailMatches = allowedEmails.length === 0 || allowedEmails.includes(normalizedEmail);

  if (!normalizedEmail || !codeMatches || !emailMatches) {
    return NextResponse.json({ allowed: false, message: "That email or invite code is not authorized." }, { status: 403 });
  }

  return NextResponse.json({ allowed: true });
}