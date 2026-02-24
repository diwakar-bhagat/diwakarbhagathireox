import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import razorpay from "../services/razorpay.service.js";
import crypto from "crypto"

const PLAN_CONFIG = {
  basic: { amount: 100, credits: 150 },
  pro: { amount: 500, credits: 650 },
};

export const createOrder = async (req,res) => {
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


export const verifyPayment = async (req,res) => {
    try {
        const {razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature} = req.body ?? {}

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

      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ message: "Razorpay secret is not configured" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(razorpay_signature, "utf8");

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
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

    // Update payment record
    payment.status = "paid";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    // Add credits to user
    const updatedUser = await User.findByIdAndUpdate(payment.userId, {
      $inc: { credits: payment.credits }
    },{new:true});

    res.json({
      success: true,
      message: "Payment verified and credits added",
      user: updatedUser,
    });

    } catch (error) {
         console.error("failed to verify Razorpay payment", error);
         return res.status(500).json({ message: "failed to verify Razorpay payment" })
    }
}
