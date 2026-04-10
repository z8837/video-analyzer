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

const MAX_CONCURRENT_LOADS = 2

type QueueItem = {
  run: () => void
  cancelled: boolean
}

let activeLoads = 0
const waitingQueue: QueueItem[] = []

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
  const [isInView, setIsInView] = useState(false)
  const [hasLoadSlot, setHasLoadSlot] = useState(false)
  const slotStateRef = useRef<'none' | 'waiting' | 'held' | 'released'>('none')

  const handleLoadedMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    if (element.duration > 0 && element.currentTime === 0) {
      try {
        element.currentTime = Math.min(0.05, element.duration)
      } catch {
        // Keep the default first frame if seeking is blocked.
      }
    }
  }

  const handleFrameReady = (event: SyntheticEvent<HTMLVideoElement>) => {
    event.currentTarget.pause()
    if (slotStateRef.current === 'held') {
      slotStateRef.current = 'released'
      releaseLoadSlot()
    }
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!isInView) return
    if (sampleImageUrl || !videoUrl) return
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
    }
  }, [isInView, sampleImageUrl, videoUrl])

  return (
    <div
      ref={containerRef}
      className={`video-thumb ${sampleImageUrl ? 'has-image' : 'has-video'}`}
      style={isInView && sampleImageUrl ? { backgroundImage: `url("${sampleImageUrl}")` } : undefined}
      aria-label={title}
    >
      {badgeText && (
        <span className={`video-thumb-badge ${badgeVariant ?? 'preview'}`}>{badgeText}</span>
      )}
      {durationText && <span className="video-thumb-duration">{durationText}</span>}
      {hasLoadSlot && !sampleImageUrl && videoUrl && (
        <video
          key={videoUrl}
          className="video-thumb-player"
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleFrameReady}
          onSeeked={handleFrameReady}
        />
      )}
    </div>
  )
}
