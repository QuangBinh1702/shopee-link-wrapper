import mongoose, { Schema, Document } from "mongoose";

export interface LinkMapDocument extends Document {
  slug: string;
  shopId: string;
  itemId: string;
  canonicalUrl: string;
  affiliateUrl: string;
  source: "web";
  sub1: string;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
  lastClickedAt?: Date;
}

const linkMapSchema = new Schema<LinkMapDocument>(
  {
    slug: { type: String, required: true, unique: true },
    shopId: { type: String, required: true },
    itemId: { type: String, required: true },
    canonicalUrl: { type: String, required: true },
    affiliateUrl: { type: String, required: true },
    source: { type: String, enum: ["web"], required: true, default: "web" },
    sub1: { type: String, required: true, default: "web_anonymous" },
    clicks: { type: Number, required: true, default: 0 },
    lastClickedAt: { type: Date },
  },
  { timestamps: true }
);

linkMapSchema.index({ createdAt: -1 });
linkMapSchema.index({ shopId: 1, itemId: 1 });

export const LinkMap =
  (mongoose.models.LinkMap as mongoose.Model<LinkMapDocument>) ??
  mongoose.model<LinkMapDocument>("LinkMap", linkMapSchema);
