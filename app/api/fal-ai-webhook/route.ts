import { NextResponse } from 'next/server'
import History from '@/models/History'
import { connectDB } from '@/lib/db'

export async function POST(request: Request) {
  await connectDB()

  const data = await request.json()

  // Verify the webhook signature (implement this based on FAL AI's webhook documentation)
  // if (!verifyWebhookSignature(request)) {
  //   return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  // }

  try {
    // Assuming the webhook payload contains the syncedVideoUrl
    const { syncedVideoUrl } = data

    if (!syncedVideoUrl) {
      return NextResponse.json({ error: 'Missing syncedVideoUrl in webhook payload' }, { status: 400 })
    }

    // Update the corresponding history entry
    await History.findOneAndUpdate(
      { syncedVideoUrl: { $exists: false } },
      { $set: { syncedVideoUrl } },
      { sort: { createdAt: -1 } }
    )

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}