export type GameStatus = 'idle' | 'running' | 'finished'

export interface GameState {
  status: GameStatus
  startedAt?: number
  finishedAt?: number
  winnerFamilyId?: string
  winnerNickname?: string
}

export interface InitialReveal {
  position: number
  char: string
}

export interface Family {
  id: string
  nickname: string
  color: string
  treasuresFound: string[]
  initialsRevealed: InitialReveal[]
  diaryPagesRead: number
  attemptsUsed: number
  specialHintsSeen: number[]
  pushedHints: string[]
  createdAt: number
}

export interface Treasure {
  uuid: string
  claimedByFamilyId?: string
  claimedAt?: number
}

export interface FamilyProgressRow {
  nickname: string
  color: string
  count: number
  isMe: boolean
}
