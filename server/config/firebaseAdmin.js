import axios from "axios";

const resolveFirebaseWebApiKey = () => {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_APIKEY ||
    process.env.VITE_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("Firebase Web API key is not configured.");
  }

  return apiKey;
};

export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== "string") {
    const error = new Error("idToken is required");
    error.statusCode = 400;
    throw error;
  }

  const apiKey = resolveFirebaseWebApiKey();

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      { idToken },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      }
    );

    const user = response?.data?.users?.[0];
    if (!user?.email) {
      const error = new Error("Invalid Firebase token");
      error.statusCode = 401;
      throw error;
    }

    return {
      uid: user.localId,
      email: user.email.trim().toLowerCase(),
      name: user.displayName?.trim() || "",
    };
  } catch (error) {
    const firebaseMessage =
      error?.response?.data?.error?.message || error?.message || "Invalid Firebase token";

    const mappedError = new Error(firebaseMessage);
    mappedError.statusCode = error?.response?.status === 400 ? 401 : 500;
    throw mappedError;
  }
};
