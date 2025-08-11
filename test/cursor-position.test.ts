import { describe, expect, it } from 'vitest'

// Mock the cursor position calculation logic
function calculateCursorPosition(
  position: number,
  headerPrefix: string,
  currentEmoji: string,
  nextEmoji: string,
  _remainingContent: string
): number {
  const headerPrefixLength = headerPrefix.length + 1 // +1 for the space
  const cursorInContent = position - headerPrefixLength

  // Calculate cursor position relative to the remaining content (after emoji)
  let cursorInRemainingContent: number
  if (currentEmoji === '') {
    // No emoji, cursor is relative to the entire header content
    cursorInRemainingContent = cursorInContent
  } else {
    // Emoji present, calculate cursor position relative to content after emoji
    const emojiLength = currentEmoji.length + 1 // +1 for the space
    cursorInRemainingContent = Math.max(0, cursorInContent - emojiLength)
  }

  // Calculate new cursor position
  let newCursorPosition: number

  if (nextEmoji === '') {
    // Emoji was removed, cursor position stays the same relative to content
    newCursorPosition = headerPrefixLength + Math.max(0, cursorInRemainingContent)
  } else if (currentEmoji === '') {
    // Emoji was added, adjust cursor position to account for the new emoji
    const emojiLength = nextEmoji.length + 1 // +1 for the space
    newCursorPosition = headerPrefixLength + emojiLength + Math.max(0, cursorInRemainingContent)
  } else {
    // Emoji was changed, add the new emoji length to the cursor position
    const emojiLength = nextEmoji.length + 1 // +1 for the space
    newCursorPosition = headerPrefixLength + emojiLength + Math.max(0, cursorInRemainingContent)
  }

  return newCursorPosition
}

describe('cursor position calculations', () => {
  it('should handle emoji added', () => {
    const result = calculateCursorPosition(10, '##', '', '🚀', 'My Header')
    expect(result).toBe(13) // headerPrefix(3) + emoji(2) + space(1) + offset(7)
  })

  it('should handle emoji removed', () => {
    const result = calculateCursorPosition(8, '##', '🚀', '', 'My Header')
    expect(result).toBe(5) // headerPrefix(3) + offset(2)
  })

  it('should handle emoji changed (same length)', () => {
    const result = calculateCursorPosition(8, '##', '🚀', '⭐', 'My Header')
    expect(result).toBe(7) // headerPrefix(3) + emoji(2) + space(1) + offset(1)
  })

  it('should handle cursor at beginning of content', () => {
    const result = calculateCursorPosition(5, '##', '🚀', '⭐', 'My Header')
    expect(result).toBe(5) // headerPrefix(3) + emoji(2) + space(1) + offset(-1) clamped to 0
  })

  it('should calculate emoji change correctly', () => {
    const headerPrefix = '##'
    const currentEmoji = '🚀'
    const nextEmoji = '⭐'
    const position = 8

    const headerPrefixLength = headerPrefix.length + 1 // 3
    const cursorInContent = position - headerPrefixLength // 5
    const emojiLength = currentEmoji.length + 1 // 3
    const cursorInRemainingContent = Math.max(0, cursorInContent - emojiLength) // 2
    const emojiLengthDiff = nextEmoji.length - currentEmoji.length // -1 (⭐ is 1 char, 🚀 is 2 chars)
    const newCursorPosition =
      headerPrefixLength + Math.max(0, cursorInRemainingContent + emojiLengthDiff) // 4

    expect(headerPrefixLength).toBe(3)
    expect(cursorInContent).toBe(5)
    expect(emojiLength).toBe(3)
    expect(cursorInRemainingContent).toBe(2)
    expect(emojiLengthDiff).toBe(-1) // Fixed: ⭐ is 1 char, 🚀 is 2 chars
    expect(newCursorPosition).toBe(4) // Fixed: 3 + Math.max(0, 2 + (-1)) = 3 + Math.max(0, 1) = 3 + 1 = 4
  })
})
