import mongoose from "mongoose";

declare global {
  var _mongooseConnection: Promise<typeof mongoose> | undefined;
}

export async function connectDb(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env"
    );
  }
  if (global._mongooseConnection) {
    return global._mongooseConnection;
  }
  global._mongooseConnection = mongoose.connect(MONGODB_URI);
  try {
    await global._mongooseConnection;
  } catch (error) {
    global._mongooseConnection = undefined;
    throw error;
  }
  return global._mongooseConnection;
}
