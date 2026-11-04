
import "server-only";
import { SignJWT, importPKCS8 } from "jose";

type PushEnvironment = "sandbox" | "production";

type PushMessage = {
  token: string;
  title: string;
  body: string;
  environment: PushEnvironment;
  notificationId?: string;
};

export async function sendApplePush(message: PushMessage) {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;

  if (!keyId || !teamId || !bundleId || !privateKey) {
    throw new Error("Missing APNs configuration.");
  }

  // Support private keys stored with actual or escaped newlines.
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  const signingKey = await importPKCS8(
    formattedPrivateKey,
    "ES256"
  );

  // Generate Apple's APNs authentication token.
  const jwt = await new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: keyId,
    })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(signingKey);

  // Select the correct Apple push environment.
  const host =
    message.environment === "sandbox"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";

  // Send the notification to Apple.
  const response = await fetch(
    `${host}/3/device/${encodeURIComponent(message.token)}`,
    {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        aps: {
          alert: {
            title: message.title,
            body: message.body,
          },
          sound: "default",
        },
        ...(message.notificationId
          ? { notification_id: message.notificationId }
          : {}),
      }),
      cache: "no-store",
    }
  );

  const result = await response.text();

  if (!response.ok) {
    throw new Error(
      `APNs rejected push (${response.status}): ${result}`
    );
  }

  return {
    success: true,
    apnsId: response.headers.get("apns-id"),
  };
}
