import mongoose, { Schema, Document } from "mongoose";

export type WithdrawalStatus = "pending" | "completed" | "rejected";

export interface IWithdrawalRequest extends Document {
  userId: number;
  amount: number;
  bankName: string;
  bankAccount: string;
  fullName?: string;
  status: WithdrawalStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    userId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    bankName: { type: String, required: true },
    bankAccount: { type: String, required: true },
    fullName: String,
    status: {
      type: String,
      enum: ["pending", "completed", "rejected"],
      default: "pending",
    },
    completedAt: Date,
  },
  { timestamps: true }
);

export const WithdrawalRequest =
  (mongoose.models.WithdrawalRequest as mongoose.Model<IWithdrawalRequest>) ??
  mongoose.model<IWithdrawalRequest>(
    "WithdrawalRequest",
    WithdrawalRequestSchema
  );
