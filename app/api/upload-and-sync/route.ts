import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { fal } from "@fal-ai/client"
import { connectDB } from '@/lib/db'
import History from '@/models/History'

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
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });

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

    } catch (error: any) {
      console.error("Detailed error:", error);
      
      // Check if error is from FAL API authentication
      if (error.status === 403 || (error.body && error.body.status === 403)) {
        return NextResponse.json({ 
          error: "Authentication failed with FAL AI service. Please check your API credentials.",
          details: error.message
        }, { status: 403 });
      }
      
      // Handle other errors
      return NextResponse.json({ 
        error: "Failed to upload files or synchronize lipsync", 
        details: error.message,
        status: error.status || 500
      }, { status: error.status || 500 });
    }
  } catch (error: any) {
    console.error("Error during upload:", error);
    return NextResponse.json({ 
      error: "Failed to upload files to Cloudinary",
      details: error.message 
    }, { status: 500 });
  }
}