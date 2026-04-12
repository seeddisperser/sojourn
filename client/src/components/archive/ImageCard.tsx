import { api } from '../../api'

interface Image {
  id: string
  file_path: string
  thumbnail_path: string | null
  caption: string | null
  created_by: string
}

interface ImageCardProps {
  image: Image
  selected?: boolean
  onSelect?: (id: string, e: React.MouseEvent) => void
  onOpen?: (id: string) => void
  style?: React.CSSProperties
  onDragStart?: (e: React.MouseEvent, id: string) => void
}

export default function ImageCard({ image, selected, onSelect, onOpen, style, onDragStart }: ImageCardProps) {
  return (
    <div
      className={`absolute card overflow-hidden w-44 cursor-pointer select-none group hover:shadow-md transition-shadow ${
        selected ? 'ring-2 ring-soil-400 shadow-md' : ''
      }`}
      style={style}
      onClick={e => { if (e.shiftKey) onSelect?.(image.id, e); else onOpen?.(image.id) }}
      onMouseDown={e => { if (e.button === 0) { e.stopPropagation(); onDragStart?.(e, image.id) } }}
    >
      <div className="bg-soil-100 h-32 flex items-center justify-center overflow-hidden">
        <img
          src={api.images.thumbnailUrl(image.id)}
          alt={image.caption ?? 'Image'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
      {image.caption && (
        <div className="p-2">
          <p className="text-xs text-soil-500 line-clamp-2">{image.caption}</p>
        </div>
      )}
      <div className="px-2 pb-2">
        <span className="text-xs text-soil-300">{image.created_by}</span>
      </div>
    </div>
  )
}
