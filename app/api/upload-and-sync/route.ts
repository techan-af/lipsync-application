import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { fal } from "@fal-ai/client"
import { connectDB } from '@/lib/db'
import History from '@/models/History'

/* eslint-disable @typescript-eslint/no-explicit-any */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

fal.config({
  credentials: process.env.FAL_KEY,
})

const uploadFromUrl = async (fileUrl: string) => {
  try {
    const result = await cloudinary.uploader.upload(fileUrl, {
      resource_type: 'auto',
    })
    console.log('Uploaded to Cloudinary:', result)
    return result.secure_url
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error)
    throw error
  }
}

interface FalResponse {
  data: {
    video: {
      url: string
    }
  }
}

interface FalError extends Error {
  status?: number
  body?: {
    status: number
  }
}

export async function POST(request: Request) {
  await connectDB();

  const { audio, video } = await request.json();
  console.log(request);

  try {
    console.log("Received request:", { audio, video });

    const [audioUrl, videoUrl] = await Promise.all([
      uploadFromUrl(audio),
      uploadFromUrl(video),
    ]);

    console.log("Uploaded to Cloudinary:", { audioUrl, videoUrl });
    console.log(audioUrl);
    console.log(videoUrl);

    try {
      const result = await fal.subscribe("fal-ai/sync-lipsync", {
        input: {
          video_url: videoUrl,
          audio_url: audioUrl
        },
        logs: true,
        onQueueUpdate: (update: { status: string; logs: { message: string }[] }) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      }) as FalResponse;

      console.log("FAL AI result:", result);

      const syncedVideoUrl = result.data.video.url;

      const historyEntry = new History({ syncedVideoUrl });
      await historyEntry.save();

      console.log("History entry saved:", historyEntry);

      return NextResponse.json({
        audioUrl,
        videoUrl, 
        syncedVideoUrl,
      });

    } catch (error) {
      console.error("Detailed error:", error);
      const falError = error as FalError;
      
      // Check if error is from FAL API authentication
      if (falError.status === 403 || (falError.body && falError.body.status === 403)) {
        return NextResponse.json({ 
          error: "Authentication failed with FAL AI service. Please check your API credentials.",
          details: falError.message
        }, { status: 403 });
      }
      
      // Handle other errors
      return NextResponse.json({ 
        error: "Failed to upload files or synchronize lipsync", 
        details: falError.message,
        status: falError.status || 500
      }, { status: falError.status || 500 });
    }
  } catch (error) {
    console.error("Error during upload:", error);
    const uploadError = error as Error;
    return NextResponse.json({ 
      error: "Failed to upload files to Cloudinary",
      details: uploadError.message 
    }, { status: 500 });
  }
}