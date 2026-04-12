import { startObsidianWatcher } from './obsidian.js'
import { startImageWatchers } from './images.js'

export function startWatchers(): void {
  startObsidianWatcher()
  startImageWatchers()
}
