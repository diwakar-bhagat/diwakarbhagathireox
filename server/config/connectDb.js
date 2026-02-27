import mongoose from "mongoose";
import dns from "node:dns/promises";

const sanitizeMongoUri = (mongoUri) =>
  String(mongoUri).replace(/\/\/([^:@/]+)(:[^@/]+)?@/, "//***:***@");

const parseMongoUri = (mongoUri) => {
  if (typeof mongoUri !== "string" || !mongoUri.trim()) {
    throw new Error("MONGODB_URL is missing or malformed. Expected mongodb+srv://.../dbName");
  }

  const normalized = mongoUri.trim();
  const hasValidPrefix =
    normalized.startsWith("mongodb://") || normalized.startsWith("mongodb+srv://");
  if (!hasValidPrefix) {
    throw new Error("MONGODB_URL is missing or malformed. Expected mongodb+srv://.../dbName");
  }

  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("MONGODB_URL is missing or malformed. Expected mongodb+srv://.../dbName");
  }

  const databaseName = parsed.pathname?.replace(/^\//, "") || "default";
  return {
    uri: normalized,
    protocol: parsed.protocol,
    host: parsed.host,
    hostname: parsed.hostname,
    databaseName,
  };
};

const verifySrvLookupIfNeeded = async ({ protocol, hostname }) => {
  if (protocol !== "mongodb+srv:") return;

  const srvRecord = `_mongodb._tcp.${hostname}`;
  try {
    await dns.resolveSrv(srvRecord);
  } catch (error) {
    const reason = error?.code ? `${error.code}` : "unknown";
    throw new Error(
      `SRV lookup failed; try standard mongodb:// URI or check DNS/VPN (${srvRecord}, reason=${reason})`
    );
  }
};

const connectDb = async () => {
  const mongoUrl = process.env.MONGODB_URL;
  const details = parseMongoUri(mongoUrl);
  const safeUri = sanitizeMongoUri(details.uri);

  console.log(`[db] mongoUri=${safeUri}`);
  console.log(`[db] host=${details.host} db=${details.databaseName}`);

  await verifySrvLookupIfNeeded(details);

  await mongoose.connect(details.uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  console.log("DataBase Connected");
};

export default connectDb;
