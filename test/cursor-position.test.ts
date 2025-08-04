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

// Test cases
console.log('Testing cursor position calculations...\n')

// Test 1: Emoji added
console.log('Test 1: Emoji added')
const test1 = calculateCursorPosition(10, '##', '', '🚀', 'My Header')
console.log(`Input: position=10, currentEmoji='', nextEmoji='🚀'`)
console.log(`Output: ${test1}`)
console.log(`Expected: 13 (headerPrefix(3) + emoji(2) + space(1) + offset(7))`)
console.log(`Result: ${test1 === 13 ? 'PASS' : 'FAIL'}\n`)

// Test 2: Emoji removed
console.log('Test 2: Emoji removed')
const test2 = calculateCursorPosition(8, '##', '🚀', '', 'My Header')
console.log(`Input: position=8, currentEmoji='🚀', nextEmoji=''`)
console.log(`Output: ${test2}`)
console.log(`Expected: 5 (headerPrefix(3) + offset(2))`)
console.log(`Result: ${test2 === 5 ? 'PASS' : 'FAIL'}\n`)

// Test 3: Emoji changed (same length)
console.log('Test 3: Emoji changed (same length)')
const test3 = calculateCursorPosition(8, '##', '🚀', '⭐', 'My Header')
console.log(`Input: position=8, currentEmoji='🚀', nextEmoji='⭐'`)
console.log(`Output: ${test3}`)
console.log(`Expected: 7 (headerPrefix(3) + emoji(2) + space(1) + offset(1))`)
console.log(`Result: ${test3 === 7 ? 'PASS' : 'FAIL'}\n`)

// Test 4: Cursor at beginning of content
console.log('Test 4: Cursor at beginning of content')
const test4 = calculateCursorPosition(5, '##', '🚀', '⭐', 'My Header')
console.log(`Input: position=5, currentEmoji='🚀', nextEmoji='⭐'`)
console.log(`Output: ${test4}`)
console.log(`Expected: 5 (headerPrefix(3) + emoji(2) + space(1) + offset(-1) clamped to 0)`)
console.log(`Result: ${test4 === 5 ? 'PASS' : 'FAIL'}\n`)

// Debug: Let's see what's happening in the emoji change case
console.log('Debug: Emoji change calculation')
const headerPrefix = '##'
const currentEmoji = '🚀'
const nextEmoji = '⭐'
const position = 8

const headerPrefixLength = headerPrefix.length + 1 // 3
const cursorInContent = position - headerPrefixLength // 5
const emojiLength = currentEmoji.length + 1 // 3
const cursorInRemainingContent = Math.max(0, cursorInContent - emojiLength) // 2
const emojiLengthDiff = nextEmoji.length - currentEmoji.length // 0
const newCursorPosition =
  headerPrefixLength + Math.max(0, cursorInRemainingContent + emojiLengthDiff) // 5

console.log(`headerPrefixLength: ${headerPrefixLength}`)
console.log(`cursorInContent: ${cursorInContent}`)
console.log(`emojiLength: ${emojiLength}`)
console.log(`cursorInRemainingContent: ${cursorInRemainingContent}`)
console.log(`emojiLengthDiff: ${emojiLengthDiff}`)
console.log(`newCursorPosition: ${newCursorPosition}`)
