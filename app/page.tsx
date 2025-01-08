'use client'

import React, { useState, useEffect } from "react"
import axios from "axios"
import { Widget } from '@uploadcare/react-widget'

const Lipsync = () => {
  const [cloudinaryUrls, setCloudinaryUrls] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [videoUploadcareUrl, setVideoUploadcareUrl] = useState(null)
  const [audioUploadcareUrl, setAudioUploadcareUrl] = useState(null)

  const handleUpload = async () => {
    if (!audioUploadcareUrl || !videoUploadcareUrl) {
      alert("Please upload both audio and video files!")
      return
    }

    setIsLoading(true)

    try {
      const response = await axios.post("/api/upload-and-sync", {
        audio: audioUploadcareUrl,
        video: videoUploadcareUrl,
      })
      console.log(response.data)
      setCloudinaryUrls(response.data)

      alert("Upload and synchronization completed successfully!")
      fetchHistory()
    } catch (error) {
      console.error("Error uploading files:", error)
      alert("Files are uploading please wait!")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await axios.get("/api/history")
      setHistory(response.data)
    } catch (error) {
      console.error("Error fetching history:", error)
    }
  }

  const handleFileUpload = async (fileInfo, type) => {
    console.log(`Uploaded ${type} to Uploadcare:`, fileInfo)
    const cdnUrl = fileInfo.cdnUrl

    if (type === 'video') {
      setVideoUploadcareUrl(cdnUrl)
    } else if (type === 'audio') {
      setAudioUploadcareUrl(cdnUrl)
    }
  }

  const validateFileType = (fileInfo, type) => {
    const mimeType = fileInfo.mimeType
    if (type === 'video' && !mimeType.startsWith('video/')) {
      alert('Please upload a valid video file.')
      return false
    }
    if (type === 'audio' && !mimeType.startsWith('audio/')) {
      alert('Please upload a valid audio file.')
      return false
    }
    return true
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Upload and Synchronize Media</h1>

      <div className="mb-8">
        <div className="mb-4">
          <label className="block mb-2">Audio File:</label>
          <Widget
            publicKey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY}
            onChange={(fileInfo) => {
              if (validateFileType(fileInfo, 'audio')) {
                handleFileUpload(fileInfo, 'audio')
              }
            }}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">Video File:</label>
          <Widget
            publicKey={process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY}
            onChange={(fileInfo) => {
              if (validateFileType(fileInfo, 'video')) {
                handleFileUpload(fileInfo, 'video')
              }
            }}
          />
        </div>
        <button
          onClick={handleUpload}
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isLoading}
        >
          {isLoading ? "Uploading..." : "Upload and Sync"}
        </button>
      </div>

      {cloudinaryUrls.syncedVideoUrl && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Synchronization Complete!</h2>
          <p>
            Synced Video URL:{" "}
            <a href={cloudinaryUrls.syncedVideoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500">
              {cloudinaryUrls.syncedVideoUrl}
            </a>
          </p>
        </div>
      )}

      <HistorySection history={history} isLoading={isLoading} />
    </div>
  )
}

const HistorySection = ({ history, isLoading }) => {
  return (
    <div className="bg-gray-100 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">History</h2>
      {history.length > 0 ? (
        history.map((item, index) => (
          <div key={index} className="mb-4">
            {isLoading ? (
              "Processing..."
            ) : (
              <iframe src={item.syncedVideoUrl} className="w-full h-64 border-0"></iframe>
            )}
          </div>
        ))
      ) : (
        <p>No history available yet.</p>
      )}
    </div>
  )
}

export default Lipsync