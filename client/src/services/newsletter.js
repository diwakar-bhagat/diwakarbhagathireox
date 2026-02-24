import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";

const NEWSLETTER_COLLECTION = "newsletter_subscribers";
const EMAIL_REGEX = /\S+@\S+\.\S+/;

const normalizeEmail = (value) => value.trim().toLowerCase();

export const subscribeToNewsletter = async (email, source = "footer") => {
  const rawEmail = email ?? "";
  const normalizedEmail = normalizeEmail(rawEmail);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const subscriberRef = doc(db, NEWSLETTER_COLLECTION, normalizedEmail);
  const existingSubscriber = await getDoc(subscriberRef);

  if (existingSubscriber.exists()) {
    return { status: "exists" };
  }

  try {
    await setDoc(subscriberRef, {
      email: normalizedEmail,
      emailLower: normalizedEmail,
      source,
      status: "active",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Handles write races where another request subscribes first.
    if (error?.code === "permission-denied") {
      const latest = await getDoc(subscriberRef);
      if (latest.exists()) {
        return { status: "exists" };
      }
    }
    throw error;
  }

  return { status: "subscribed" };
};
