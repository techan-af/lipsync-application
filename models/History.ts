import mongoose from 'mongoose'

const historySchema = new mongoose.Schema({
  syncedVideoUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.History || mongoose.model('History', historySchema)