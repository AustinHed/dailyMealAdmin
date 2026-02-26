import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readVar(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function isPresent(name: string): boolean {
  return readVar(name).length > 0;
}

function checkVar(name: string) {
  const value = readVar(name);

  return {
    present: value.length > 0,
    length: value.length,
  };
}

export async function GET() {
  const projectId = readVar("FIREBASE_PROJECT_ID");
  const clientEmail = readVar("FIREBASE_CLIENT_EMAIL");
  const privateKey = readVar("FIREBASE_PRIVATE_KEY");

  return NextResponse.json(
    {
      vars: {
        FIREBASE_PROJECT_ID: checkVar("FIREBASE_PROJECT_ID"),
        FIREBASE_CLIENT_EMAIL: checkVar("FIREBASE_CLIENT_EMAIL"),
        FIREBASE_PRIVATE_KEY: {
          ...checkVar("FIREBASE_PRIVATE_KEY"),
          hasBeginMarker: privateKey.includes("BEGIN PRIVATE KEY"),
          hasEscapedNewlines: privateKey.includes("\\n"),
          hasLiteralNewlines: privateKey.includes("\n"),
        },
      },
      formatChecks: {
        clientEmailHasAtSymbol: clientEmail.includes("@"),
        projectIdLooksLikeFirebaseId:
          projectId.length > 0 && !projectId.includes(" "),
      },
      possibleMisnamedKeys: {
        quotedDoubleProjectId: isPresent("\"FIREBASE_PROJECT_ID\""),
        quotedSingleProjectId: isPresent("'FIREBASE_PROJECT_ID'"),
        lowercaseProjectId: isPresent("firebase_project_id"),
        quotedDoubleClientEmail: isPresent("\"FIREBASE_CLIENT_EMAIL\""),
        quotedSingleClientEmail: isPresent("'FIREBASE_CLIENT_EMAIL'"),
        lowercaseClientEmail: isPresent("firebase_client_email"),
        quotedDoublePrivateKey: isPresent("\"FIREBASE_PRIVATE_KEY\""),
        quotedSinglePrivateKey: isPresent("'FIREBASE_PRIVATE_KEY'"),
        lowercasePrivateKey: isPresent("firebase_private_key"),
      },
      runtimeInfo: {
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      },
      note: "Temporary debug endpoint. Remove after env verification.",
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
