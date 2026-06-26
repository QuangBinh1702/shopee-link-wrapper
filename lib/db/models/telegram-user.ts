import mongoose, { Schema, Document } from "mongoose";

export interface ITelegramUser extends Document {
  userId: number;
  username?: string;
  fullName?: string;
  bankName?: string;
  bankAccount?: string;
  balance: number;
  pendingBalance: number;
  holdBalance: number;
  totalEarned: number;
  lastPayoutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TelegramUserSchema = new Schema<ITelegramUser>(
  {
    userId: { type: Number, required: true, unique: true },
    username: String,
    fullName: String,
    bankName: String,
    bankAccount: String,
    balance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    holdBalance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    lastPayoutAt: Date,
  },
  { timestamps: true }
);

export const TelegramUser =
  (mongoose.models.TelegramUser as mongoose.Model<ITelegramUser>) ??
  mongoose.model<ITelegramUser>("TelegramUser", TelegramUserSchema);
