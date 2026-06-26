import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus = "pending" | "approved" | "rejected";

export interface ITelegramOrder extends Document {
  userId?: number;
  sub1?: string;
  transactionId: string;
  merchant?: string;
  itemName?: string;
  itemUrl?: string;
  transactionValue: number;
  commission: number;
  tax: number;
  ownerShare: number;
  userShare: number;
  accessTradeStatus: number;
  isConfirmed: number;
  status: OrderStatus;
  clickTime?: Date;
  transactionTime?: Date;
  confirmedTime?: Date;
  notified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TelegramOrderSchema = new Schema<ITelegramOrder>(
  {
    userId: { type: Number, index: true },
    sub1: { type: String, index: true },
    transactionId: { type: String, required: true, unique: true },
    merchant: String,
    itemName: String,
    itemUrl: String,
    transactionValue: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    ownerShare: { type: Number, default: 0 },
    userShare: { type: Number, default: 0 },
    accessTradeStatus: { type: Number, default: 0 },
    isConfirmed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    clickTime: Date,
    transactionTime: Date,
    confirmedTime: Date,
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const TelegramOrder =
  (mongoose.models.TelegramOrder as mongoose.Model<ITelegramOrder>) ??
  mongoose.model<ITelegramOrder>("TelegramOrder", TelegramOrderSchema);
