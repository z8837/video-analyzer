import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

type VideoThumbnailProps = {
  videoUrl: string
  sampleImageUrl?: string
  title: string
  badgeText?: string
  badgeVariant?: 'preview' | 'filename'
  durationText?: string
}

const MAX_CONCURRENT_LOADS = 1
const VISIBLE_DEBOUNCE_MS = 200
const FRAME_CACHE_LIMIT = 500

type QueueItem = {
  run: () => void
  cancelled: boolean
}

let activeLoads = 0
const waitingQueue: QueueItem[] = []
const frameCache = new Map<string, string>()

function getCachedFrame(videoUrl: string): string | undefined {
  const hit = frameCache.get(videoUrl)
  if (hit) {
    frameCache.delete(videoUrl)
    frameCache.set(videoUrl, hit)
  }
  return hit
}

function setCachedFrame(videoUrl: string, dataUrl: string) {
  if (frameCache.has(videoUrl)) frameCache.delete(videoUrl)
  frameCache.set(videoUrl, dataUrl)
  while (frameCache.size > FRAME_CACHE_LIMIT) {
    const oldestKey = frameCache.keys().next().value
    if (oldestKey === undefined) break
    frameCache.delete(oldestKey)
  }
}

function captureVideoFrame(video: HTMLVideoElement): string | null {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return null
  try {
    const maxSide = 360
    const scale = Math.min(1, maxSide / Math.max(width, height))
    const targetW = Math.max(1, Math.round(width * scale))
    const targetH = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, targetW, targetH)
    return canvas.toDataURL('image/jpeg', 0.78)
  } catch {
    return null
  }
}

function pumpQueue() {
  while (activeLoads < MAX_CONCURRENT_LOADS && waitingQueue.length > 0) {
    const next = waitingQueue.shift()!
    if (next.cancelled) continue
    activeLoads++
    next.run()
  }
}

function requestLoadSlot(run: () => void): () => void {
  const item: QueueItem = { run, cancelled: false }
  waitingQueue.push(item)
  pumpQueue()
  return () => {
    item.cancelled = true
  }
}

function releaseLoadSlot() {
  activeLoads = Math.max(0, activeLoads - 1)
  pumpQueue()
}

export function VideoThumbnail({
  videoUrl,
  sampleImageUrl,
  title,
  badgeText,
  badgeVariant,
  durationText,
}: VideoThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isStableVisible, setIsStableVisible] = useState(false)
  const [hasLoadSlot, setHasLoadSlot] = useState(false)
  const [cachedFrame, setCachedFrameState] = useState<string | undefined>(() =>
    videoUrl && !sampleImageUrl ? getCachedFrame(videoUrl) : undefined,
  )
  const slotStateRef = useRef<'none' | 'waiting' | 'held' | 'released'>('none')
  const awaitingSeekRef = useRef(false)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setCachedFrameState(!videoUrl || sampleImageUrl ? undefined : getCachedFrame(videoUrl))
    }, 0)

    return () => {
      window.clearTimeout(handle)
    }
  }, [videoUrl, sampleImageUrl])

  const finalizeFrame = (video: HTMLVideoElement) => {
    video.pause()
    if (videoUrl) {
      const snapshot = captureVideoFrame(video)
      if (snapshot) {
        setCachedFrame(videoUrl, snapshot)
        setCachedFrameState(snapshot)
      }
    }
    if (slotStateRef.current === 'held') {
      slotStateRef.current = 'released'
      releaseLoadSlot()
    }
  }

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    if (element.duration > 0 && element.currentTime === 0) {
      try {
        element.currentTime = Math.min(0.05, element.duration)
        awaitingSeekRef.current = true
      } catch {
        awaitingSeekRef.current = false
      }
    }
  }

  const handleLoadedData = (event: SyntheticEvent<HTMLVideoElement>) => {
    if (awaitingSeekRef.current) return
    finalizeFrame(event.currentTarget)
  }

  const handleSeeked = (event: SyntheticEvent<HTMLVideoElement>) => {
    awaitingSeekRef.current = false
    finalizeFrame(event.currentTarget)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(
      () => {
        setIsStableVisible(isVisible)
      },
      isVisible ? VISIBLE_DEBOUNCE_MS : 0,
    )
    return () => {
      window.clearTimeout(handle)
    }
  }, [isVisible])

  useEffect(() => {
    if (!isStableVisible) return
    if (sampleImageUrl || !videoUrl) return
    if (cachedFrame) return
    if (slotStateRef.current !== 'none') return

    slotStateRef.current = 'waiting'
    const cancel = requestLoadSlot(() => {
      slotStateRef.current = 'held'
      setHasLoadSlot(true)
    })

    return () => {
      if (slotStateRef.current === 'waiting') {
        cancel()
      } else if (slotStateRef.current === 'held') {
        releaseLoadSlot()
      }
      slotStateRef.current = 'none'
      setHasLoadSlot(false)
    }
  }, [isStableVisible, sampleImageUrl, videoUrl, cachedFrame])

  const backgroundUrl = sampleImageUrl
    ? ((isVisible || isStableVisible) ? sampleImageUrl : undefined)
    : cachedFrame
  const showVideoElement = hasLoadSlot && !sampleImageUrl && !cachedFrame && !!videoUrl

  return (
    <div
      ref={containerRef}
      className={`video-thumb ${sampleImageUrl ? 'has-image' : 'has-video'}`}
      style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
      aria-label={title}
    >
      {badgeText && (
        <span className={`video-thumb-badge ${badgeVariant ?? 'preview'}`}>{badgeText}</span>
      )}
      {durationText && <span className="video-thumb-duration">{durationText}</span>}
      {showVideoElement && (
        <video
          key={videoUrl}
          className="video-thumb-player"
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedData}
          onSeeked={handleSeeked}
        />
      )}
    </div>
  )
}
