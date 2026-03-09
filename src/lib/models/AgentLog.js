import mongoose from 'mongoose';

const AgentLogSchema = new mongoose.Schema({
    campaignId: String,
    agent: { type: String, required: true },
    step: String,
    input: { type: mongoose.Schema.Types.Mixed },
    output: { type: mongoose.Schema.Types.Mixed },
    reasoning: String,
    duration: Number,
}, { timestamps: true });

export default mongoose.models.AgentLog || mongoose.model('AgentLog', AgentLogSchema);
