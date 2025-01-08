import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import History from '@/models/History'

export async function GET() {
  await connectDB()

  try {
    const history = await History.find({})
    return NextResponse.json(history)
  } catch (error) {
    console.error("Error fetching history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}