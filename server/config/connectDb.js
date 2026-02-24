import mongoose from "mongoose";

const connectDb = async () => {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    throw new Error("MONGODB_URL is not configured.");
  }

  await mongoose.connect(mongoUrl);
  console.log("DataBase Connected");
};

export default connectDb;
