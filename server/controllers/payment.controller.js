import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import razorpay from "../services/razorpay.service.js";
import crypto from "crypto"

const PLAN_CONFIG = {
  basic: { amount: 39, credits: 150 },
  pro: { amount: 69, credits: 350 },
};

const RAZORPAY_ORDER_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

const PAID_WEBHOOK_EVENTS = new Set(["payment.captured", "order.paid"]);
const FAILED_WEBHOOK_EVENTS = new Set(["payment.failed", "order.failed"]);

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

const buildHmacSignature = (payload, secret) =>
  crypto.createHmac("sha256", secret).update(payload).digest("hex");

const safeSignatureMatch = (expected, actual) => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};

const getRawRequestBodyBuffer = (body) => {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return Buffer.from(body, "utf8");
  return Buffer.from(JSON.stringify(body ?? {}), "utf8");
};

const grantCreditsForPayment = async ({ payment, razorpayPaymentId, webhookEventId }) => {
  const setPayload = {
    status: "paid",
    creditsGranted: true,
    lastWebhookAt: new Date(),
  };
  if (isNonEmptyString(razorpayPaymentId)) {
    setPayload.razorpayPaymentId = razorpayPaymentId;
  }

  const updatePayload = { $set: setPayload };
  if (isNonEmptyString(webhookEventId)) {
    updatePayload.$addToSet = { webhookEventIds: webhookEventId };
  }

  const claimedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, creditsGranted: { $ne: true } },
    updatePayload,
    { new: true }
  );

  if (!claimedPayment) {
    return { alreadyProcessed: true, user: null };
  }

  const updatedUser = await User.findByIdAndUpdate(
    payment.userId,
    { $inc: { credits: payment.credits } },
    { new: true }
  );

  if (!updatedUser) {
    await Payment.findByIdAndUpdate(payment._id, {
      $set: { creditsGranted: false },
    });
    throw new Error("User not found while crediting payment.");
  }

  return { alreadyProcessed: false, user: updatedUser };
};

export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body ?? {};

    if (!planId || typeof planId !== "string") {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    const plan = PLAN_CONFIG[planId];
    if (!plan) {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    const amount = Number(plan.amount);
    const credits = Number(plan.credits);
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(credits) || credits <= 0) {
      return res.status(400).json({ message: "Invalid plan data" });
    }

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.userId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options)

    await Payment.create({
      userId: req.userId,
      planId,
      amount,
      credits,
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.json(order);
  }
  catch (error) {
    console.error("failed to create Razorpay order", error);
    return res.status(500).json({ message: "failed to create Razorpay order" })
  }
}


export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature } = req.body ?? {}

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({ message: "Invalid payment payload" });
    }

    if (!RAZORPAY_ORDER_SECRET) {
      return res.status(500).json({ message: "Razorpay secret is not configured" });
    }

    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = buildHmacSignature(signaturePayload, RAZORPAY_ORDER_SECRET);
    if (!safeSignatureMatch(expectedSignature, razorpay_signature)) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status === "paid") {
      return res.json({ success: true, message: "Already processed" });
    }

    if (String(payment.userId) !== String(req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { alreadyProcessed, user } = await grantCreditsForPayment({
      payment,
      razorpayPaymentId: razorpay_payment_id,
      webhookEventId: null,
    });

    if (alreadyProcessed) {
      const latestUser = await User.findById(payment.userId);
      return res.json({
        success: true,
        message: "Already processed",
        user: latestUser,
      });
    }

    res.json({
      success: true,
      message: "Payment verified and credits added",
      user,
    });

  } catch (error) {
    console.error("failed to verify Razorpay payment", error);
    return res.status(500).json({ message: "failed to verify Razorpay payment" })
  }
}

export const handleRazorpayWebhook = async (req, res) => {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      return res.status(500).json({ message: "Razorpay webhook secret is not configured" });
    }

    const receivedSignature = req.get("x-razorpay-signature");
    if (!isNonEmptyString(receivedSignature)) {
      return res.status(400).json({ message: "Missing webhook signature" });
    }

    const rawBodyBuffer = getRawRequestBodyBuffer(req.body);
    const expectedSignature = buildHmacSignature(rawBodyBuffer, RAZORPAY_WEBHOOK_SECRET);
    if (!safeSignatureMatch(expectedSignature, receivedSignature)) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    let payload;
    try {
      payload = JSON.parse(rawBodyBuffer.toString("utf8"));
    } catch {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    const event = payload?.event;
    if (!isNonEmptyString(event)) {
      return res.status(400).json({ message: "Invalid webhook event" });
    }

    const webhookEventId = req.get("x-razorpay-event-id") || "";
    const paymentEntity = payload?.payload?.payment?.entity ?? null;
    const orderEntity = payload?.payload?.order?.entity ?? null;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id || "";
    const razorpayPaymentId = paymentEntity?.id || "";

    if (!isNonEmptyString(razorpayOrderId)) {
      return res.status(200).json({ received: true, ignored: true, reason: "missing_order_id" });
    }

    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(200).json({ received: true, ignored: true, reason: "payment_not_found" });
    }

    if (isNonEmptyString(webhookEventId) && payment.webhookEventIds.includes(webhookEventId)) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (PAID_WEBHOOK_EVENTS.has(event)) {
      const { alreadyProcessed } = await grantCreditsForPayment({
        payment,
        razorpayPaymentId,
        webhookEventId,
      });
      return res.status(200).json({
        received: true,
        processed: !alreadyProcessed,
      });
    }

    if (FAILED_WEBHOOK_EVENTS.has(event)) {
      const failureUpdate = {
        $set: { status: "failed", lastWebhookAt: new Date() },
      };
      if (isNonEmptyString(webhookEventId)) {
        failureUpdate.$addToSet = { webhookEventIds: webhookEventId };
      }

      await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: "paid" } },
        failureUpdate
      );

      return res.status(200).json({ received: true, processed: true });
    }

    const genericUpdate = { $set: { lastWebhookAt: new Date() } };
    if (isNonEmptyString(webhookEventId)) {
      genericUpdate.$addToSet = { webhookEventIds: webhookEventId };
    }
    await Payment.findByIdAndUpdate(payment._id, genericUpdate);

    return res.status(200).json({ received: true, ignored: true, reason: "unsupported_event" });
  } catch (error) {
    console.error("failed to process Razorpay webhook", error);
    return res.status(500).json({ message: "failed to process Razorpay webhook" });
  }
};
