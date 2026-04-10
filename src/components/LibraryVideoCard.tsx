import { memo } from 'react'
import type { DragEvent } from 'react'
import { VideoThumbnail } from './VideoThumbnail'
import type { AnalysisVideo } from '../types'

type LibraryVideoCardProps = {
  video: AnalysisVideo
  isActive: boolean
  durationText: string
  onSelect: (absolutePath: string) => void
  onDragStart: (event: DragEvent<HTMLButtonElement>, filePath: string, iconPath?: string) => void
}

function LibraryVideoCardBase({
  video,
  isActive,
  durationText,
  onSelect,
  onDragStart,
}: LibraryVideoCardProps) {
  const handleClick = () => onSelect(video.absolutePath)
  const handleDragStart = (event: DragEvent<HTMLButtonElement>) =>
    onDragStart(event, video.absolutePath, video.sampleImagePath)

  const folderMeta = video.relativePath.includes('/')
    ? `${video.relativePath.substring(0, video.relativePath.lastIndexOf('/'))}/`
    : './'

  return (
    <button
      className={`lib-card ${isActive ? 'active' : ''}`}
      type="button"
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
    >
      <VideoThumbnail
        videoUrl={video.videoUrl}
        sampleImageUrl={video.sampleImageUrl}
        title={video.title}
        badgeText={video.fileName}
        badgeVariant="filename"
        durationText={durationText}
      />
      <div className="lib-card-body">
        <strong>{video.title}</strong>
        <span className="lib-card-meta">{folderMeta}</span>
        {video.keywords.length > 0 ? (
          <div className="pill-row">
            {video.keywords.slice(0, 4).map((keyword) => (
              <span key={`${video.absolutePath}-${keyword}`} className="mini-pill">
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <span className="lib-card-empty-keywords">키워드 없음</span>
        )}
      </div>
    </button>
  )
}

export const LibraryVideoCard = memo(LibraryVideoCardBase)
