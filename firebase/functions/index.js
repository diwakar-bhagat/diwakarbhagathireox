import admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({
  region: process.env.FUNCTIONS_REGION || "us-central1",
  maxInstances: 10,
});

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const SUBSCRIBERS_COLLECTION = "newsletter_subscribers";
const CAMPAIGNS_COLLECTION = "newsletter_campaigns";
const ACTIVE_STATUS = "active";
const QUEUED_STATUS = "queued";

const sendJson = (res, code, body) => res.status(code).json(body);

const withCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Newsletter-Admin-Token");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
};

const sanitizeError = (error) => {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Unknown error";
};

const getIncomingAdminToken = (req) => {
  const headerToken = req.header("x-newsletter-admin-token");
  if (headerToken) return headerToken.trim();

  const authHeader = req.header("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return "";
};

const isAuthorizedRequest = (req) => {
  const expectedToken = process.env.NEWSLETTER_ADMIN_TOKEN;
  if (!expectedToken) return false;
  return getIncomingAdminToken(req) === expectedToken;
};

const validateCampaignPayload = (payload = {}) => {
  const subject = String(payload.subject || "").trim();
  const html = String(payload.html || "").trim();
  const text = String(payload.text || "").trim();
  const provider = String(
    payload.provider || process.env.EMAIL_PROVIDER || "resend"
  ).trim().toLowerCase();

  if (!subject) {
    return { ok: false, message: "subject is required." };
  }

  if (!html && !text) {
    return { ok: false, message: "Either html or text is required." };
  }

  return {
    ok: true,
    campaign: { subject, html, text, provider },
  };
};

const chunk = (arr, size) => {
  const parts = [];
  for (let i = 0; i < arr.length; i += size) {
    parts.push(arr.slice(i, i + size));
  }
  return parts;
};

const getActiveSubscribers = async () => {
  const snapshot = await db
    .collection(SUBSCRIBERS_COLLECTION)
    .where("status", "==", ACTIVE_STATUS)
    .get();

  return snapshot.docs
    .map((docSnap) => docSnap.get("emailLower"))
    .filter((email) => typeof email === "string" && email.length > 0);
};

const getFromEmail = () =>
  process.env.NEWSLETTER_FROM_EMAIL || "HireOX.AI <newsletter@hireox.ai>";

const getSendGridFrom = () => {
  const from = getFromEmail();
  const namedFormatMatch = from.match(/^(.*)<(.+)>$/);

  if (!namedFormatMatch) {
    return { email: from.trim() };
  }

  const name = namedFormatMatch[1].trim().replace(/^"|"$/g, "");
  const email = namedFormatMatch[2].trim();

  if (!name) return { email };
  return { email, name };
};

const sendWithResend = async ({ to, subject, html, text }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [to],
      subject,
      html: html || undefined,
      text: text || undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
};

const sendWithSendGrid = async ({ to, subject, html, text }) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is missing.");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getSendGridFrom(),
      personalizations: [{ to: [{ email: to }] }],
      subject,
      content: [
        ...(text ? [{ type: "text/plain", value: text }] : []),
        ...(html ? [{ type: "text/html", value: html }] : []),
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SendGrid failed (${response.status}): ${body}`);
  }
};

const sendWithMailgun = async ({ to, subject, html, text }) => {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;

  if (!apiKey) {
    throw new Error("MAILGUN_API_KEY is missing.");
  }
  if (!domain) {
    throw new Error("MAILGUN_DOMAIN is missing.");
  }

  const payload = new URLSearchParams({
    from: getFromEmail(),
    to,
    subject,
  });

  if (text) payload.append("text", text);
  if (html) payload.append("html", html);

  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mailgun failed (${response.status}): ${body}`);
  }
};

const sendEmail = async ({ to, subject, html, text, provider }) => {
  switch (provider) {
    case "sendgrid":
      await sendWithSendGrid({ to, subject, html, text });
      return;
    case "mailgun":
      await sendWithMailgun({ to, subject, html, text });
      return;
    case "resend":
    default:
      await sendWithResend({ to, subject, html, text });
  }
};

const dispatchCampaign = async ({ subject, html, text, provider }) => {
  const subscribers = await getActiveSubscribers();
  if (!subscribers.length) {
    return {
      totalSubscribers: 0,
      sentCount: 0,
      failedCount: 0,
      failures: [],
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  const failures = [];

  const batches = chunk(subscribers, 25);
  for (const batch of batches) {
    const results = await Promise.allSettled(
      batch.map((email) =>
        sendEmail({ to: email, subject, html, text, provider })
      )
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        sentCount += 1;
        return;
      }

      failedCount += 1;
      failures.push({
        email: batch[index],
        error: sanitizeError(result.reason),
      });
    });
  }

  return {
    totalSubscribers: subscribers.length,
    sentCount,
    failedCount,
    failures,
  };
};

export const queueNewsletterCampaign = onRequest(async (req, res) => {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!isAuthorizedRequest(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  const validation = validateCampaignPayload(req.body);
  if (!validation.ok) {
    sendJson(res, 400, { error: validation.message });
    return;
  }

  const campaignDoc = {
    ...validation.campaign,
    status: QUEUED_STATUS,
    createdAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(CAMPAIGNS_COLLECTION).add(campaignDoc);
  sendJson(res, 201, {
    message: "Campaign queued.",
    campaignId: ref.id,
  });
});

export const sendNewsletterCampaign = onRequest(async (req, res) => {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!isAuthorizedRequest(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  const validation = validateCampaignPayload(req.body);
  if (!validation.ok) {
    sendJson(res, 400, { error: validation.message });
    return;
  }

  const campaign = validation.campaign;

  try {
    const result = await dispatchCampaign(campaign);

    await db.collection(CAMPAIGNS_COLLECTION).add({
      ...campaign,
      status: "sent",
      sentAt: FieldValue.serverTimestamp(),
      ...result,
    });

    sendJson(res, 200, {
      message: "Campaign sent.",
      ...result,
    });
  } catch (error) {
    logger.error("sendNewsletterCampaign failed", error);
    sendJson(res, 500, {
      error: "Failed to send campaign.",
      details: sanitizeError(error),
    });
  }
});

export const processQueuedNewsletterCampaigns = onSchedule(
  "every 30 minutes",
  async () => {
    const queueSnapshot = await db
      .collection(CAMPAIGNS_COLLECTION)
      .where("status", "==", QUEUED_STATUS)
      .limit(5)
      .get();

    if (queueSnapshot.empty) {
      logger.info("No queued newsletter campaigns.");
      return;
    }

    for (const campaignDoc of queueSnapshot.docs) {
      const data = campaignDoc.data();
      const campaign = {
        subject: data.subject || "",
        html: data.html || "",
        text: data.text || "",
        provider: data.provider || process.env.EMAIL_PROVIDER || "resend",
      };

      try {
        const locked = await db.runTransaction(async (tx) => {
          const latest = await tx.get(campaignDoc.ref);
          if (!latest.exists) return false;
          if (latest.get("status") !== QUEUED_STATUS) return false;

          tx.update(campaignDoc.ref, {
            status: "processing",
            processingStartedAt: FieldValue.serverTimestamp(),
          });
          return true;
        });

        if (!locked) {
          continue;
        }

        const result = await dispatchCampaign(campaign);
        await campaignDoc.ref.update({
          status: "sent",
          sentAt: FieldValue.serverTimestamp(),
          ...result,
          failures: result.failures.slice(0, 100),
        });
      } catch (error) {
        logger.error("processQueuedNewsletterCampaigns failed", {
          campaignId: campaignDoc.id,
          error: sanitizeError(error),
        });

        await campaignDoc.ref.update({
          status: "failed",
          failedAt: FieldValue.serverTimestamp(),
          errorMessage: sanitizeError(error),
        });
      }
    }
  }
);
