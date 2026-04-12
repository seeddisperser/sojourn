interface Note {
  id: string
  title: string
  content: string
  created_by: string
  updated_by: string
  updated_at: string
}

interface NoteCardProps {
  note: Note
  selected?: boolean
  onSelect?: (id: string, e: React.MouseEvent) => void
  onOpen?: (id: string) => void
  onPrune?: (id: string) => void
  style?: React.CSSProperties
  onDragStart?: (e: React.MouseEvent, id: string) => void
}

export default function NoteCard({ note, selected, onSelect, onOpen, onPrune, style, onDragStart }: NoteCardProps) {
  const excerpt = (note.content ?? '').slice(0, 120).replace(/#+\s/g, '').trim()

  return (
    <div
      className={`absolute card p-3 w-52 cursor-pointer select-none group transition-shadow hover:shadow-md ${
        selected ? 'ring-2 ring-soil-400 shadow-md' : ''
      }`}
      style={style}
      onClick={e => { if (e.shiftKey) onSelect?.(note.id, e); else onOpen?.(note.id) }}
      onMouseDown={e => { if (e.button === 0) { e.stopPropagation(); onDragStart?.(e, note.id) } }}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <span className="font-medium text-sm text-soil-800 leading-snug line-clamp-2">{note.title || 'Untitled'}</span>
        <button
          className="opacity-0 group-hover:opacity-100 text-soil-300 hover:text-soil-500 text-xs shrink-0 transition-opacity"
          onClick={e => { e.stopPropagation(); onPrune?.(note.id) }}
          title="Prune"
        >
          ×
        </button>
      </div>
      {excerpt && <p className="text-xs text-soil-400 line-clamp-3 leading-relaxed">{excerpt}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-soil-300">{note.created_by}</span>
      </div>
    </div>
  )
}
