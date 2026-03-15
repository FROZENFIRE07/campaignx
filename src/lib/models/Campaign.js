import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
    campaignId: { type: String },
    brief: { type: String, required: true },
    strategy: { type: mongoose.Schema.Types.Mixed },
    segments: [{ type: mongoose.Schema.Types.Mixed }],
    contentVariants: [{
        variantName: String,
        subject: String,
        body: String,
        targetSegment: String,
        sendTime: String,
        customerIds: [String],
        reasoning: String,
    }],
    status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'sent', 'analyzed', 'optimizing'], default: 'draft' },
    metrics: {
        openRate: Number,
        clickRate: Number,
        totalSent: Number,
        totalOpened: Number,
        totalClicked: Number,
        matrixScore: Number,
        matrixWeights: {
            clickRate: Number,
            openRate: Number,
        },
        matrixThreshold: Number,
        matrixQualified: Boolean,
        optimizationRequired: Boolean,
    },
    reportData: [{ type: mongoose.Schema.Types.Mixed }],
    optimizationHistory: [{ type: mongoose.Schema.Types.Mixed }],
    campaignId: { type: String, trim: true }, // The ID returned by the external campaign API simulator (legacy/first item)
    campaignIds: [{ type: String, trim: true }], // Array of IDs returned by external campaign API simulator when multiple batches/variants are sent
    parentCampaignId: String,
    iteration: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
