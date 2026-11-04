
import "server-only";

import { SignJWT, importPKCS8 } from "jose";
import { connect, constants } from "node:http2";

export const runtime = "nodejs";

type PushEnvironment = "sandbox" | "production";

type PushMessage = {
  token: string;
  title: string;
  body: string;
  environment: PushEnvironment;
  notificationId?: string;
};

type APNsResult = {
  success: boolean;
  apnsId: string | null;
};

export async function sendApplePush(
  message: PushMessage
): Promise<APNsResult> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;

  if (!keyId || !teamId || !bundleId || !privateKey) {
    throw new Error("Missing APNs configuration.");
  }

  // Support both escaped and actual newlines.
  const formattedPrivateKey = privateKey
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  const signingKey = await importPKCS8(
    formattedPrivateKey,
    "ES256"
  );

  const jwt = await new SignJWT({})
    .setProtectedHeader({
      alg: "ES256",
      kid: keyId,
    })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(signingKey);

  const host =
    message.environment === "sandbox"
      ? "https://api.sandbox.push.apple.com"
      : "https://api.push.apple.com";

  const payload = JSON.stringify({
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
  });

  return new Promise<APNsResult>((resolve, reject) => {
    const client = connect(host);

    let settled = false;

    const finish = (
      error?: Error,
      result?: APNsResult
    ) => {
      if (settled) return;
      settled = true;

      clearTimeout(timeout);
      client.close();

      if (error) {
        reject(error);
      } else if (result) {
        resolve(result);
      }
    };

    const timeout = setTimeout(() => {
      client.destroy();
      finish(new Error("APNs request timed out."));
    }, 15000);

    client.on("error", (error) => {
      finish(error);
    });

    const request = client.request({
      [constants.HTTP2_HEADER_METHOD]: "POST",
      [constants.HTTP2_HEADER_PATH]:
        `/3/device/${encodeURIComponent(message.token)}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let status = 0;
    let apnsId: string | null = null;
    let responseBody = "";

    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);

      const headerId = headers["apns-id"];
      apnsId =
        typeof headerId === "string"
          ? headerId
          : null;
    });

    request.setEncoding("utf8");

    request.on("data", (chunk: string) => {
      responseBody += chunk;
    });

    request.on("end", () => {
      if (status === 200) {
        finish(undefined, {
          success: true,
          apnsId,
        });
      } else {
        finish(
          new Error(
            `APNs rejected push (${status}): ${responseBody}`
          )
        );
      }
    });

    request.on("error", (error) => {
      finish(error);
    });

    request.end(payload);
  });
}
