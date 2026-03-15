import mongoose from 'mongoose';

const CampaignSchema = new mongoose.Schema({
    campaignId: { type: String },
    brief: { type: String, required: true },
    strategy: { type: mongoose.Schema.Types.Mixed },
    segments: [{ type: mongoose.Schema.Types.Mixed }],
    contentVariants: [{
        subject: String,
        body: String,
        targetSegment: String,
        sendTime: String,
    }],
    status: { type: String, enum: ['draft', 'pending_approval', 'approved', 'sent', 'analyzed', 'optimizing'], default: 'draft' },
    metrics: {
        openRate: Number,
        clickRate: Number,
        totalSent: Number,
        totalOpened: Number,
        totalClicked: Number,
    },
    reportData: [{ type: mongoose.Schema.Types.Mixed }],
    optimizationHistory: [{ type: mongoose.Schema.Types.Mixed }],
    parentCampaignId: String,
    iteration: { type: Number, default: 1 },
}, { timestamps: true });

export default mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
