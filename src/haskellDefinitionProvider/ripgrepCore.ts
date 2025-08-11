import { spawn } from 'node:child_process'

export function buildPatterns(identifier: string): string[] {
  return [
    `^${identifier}\\s*=`,
    `^${identifier}\\s*::`,
    `^data\\s+${identifier}\\s+`,
    `^type\\s+${identifier}\\s+`,
    `^newtype\\s+${identifier}\\s+`,
    `^class\\s+${identifier}\\s+`,
    // Constructor names in data types
    `^data\\s+\\w+\\s*=\\s*\\w*${identifier}\\w*`,
    // Type family definitions
    `^type\\s+family\\s+${identifier}\\s+`,
    // Data family definitions
    `^data\\s+family\\s+${identifier}\\s+`,
    // Pattern synonym definitions (only the signature line)
    `^pattern\\s+${identifier}\\s+::`,
  ]
}

export type RipgrepJsonMatch = {
  filePath: string
  lineIndex: number
  lineText: string
}

export function parseRipgrepJson(jsonOutput: string): RipgrepJsonMatch[] {
  const matches: RipgrepJsonMatch[] = []
  const lines = jsonOutput.split('\n').filter((l) => l.trim().length > 0)
  for (const line of lines) {
    try {
      const event = JSON.parse(line)
      if (event.type === 'match') {
        const filePath: string = event.data.path?.text ?? 'stdin'
        const lineNumber: number = event.data.line_number
        const lineText: string = (event.data.lines?.text as string) ?? ''
        matches.push({ filePath, lineIndex: Math.max(0, lineNumber - 1), lineText })
      }
    } catch {
      // ignore invalid JSON lines
    }
  }
  return matches
}

export async function searchTextWithRipgrep(
  identifier: string,
  content: string
): Promise<Array<{ lineIndex: number; lineText: string }>> {
  if (!content) return []

  const patterns = buildPatterns(identifier)
  const results: Array<{ lineIndex: number; lineText: string }> = []

  for (const pattern of patterns) {
    const args = [
      '--json',
      '--line-number',
      '--no-heading',
      '--with-filename',
      '--regexp',
      pattern,
      '-',
    ]
    const stdout = await execRg(args, content)
    if (stdout !== null) {
      const matches = parseRipgrepJson(stdout)
      for (const m of matches) {
        const trimmed = m.lineText.replace(/\r?\n$/, '')
        results.push({ lineIndex: m.lineIndex, lineText: trimmed })
      }
    }
  }

  // Deduplicate by line index
  const unique = results.filter(
    (r, i, arr) => arr.findIndex((x) => x.lineIndex === r.lineIndex) === i
  )
  return unique
}

export async function searchFolderWithRipgrep(
  identifier: string,
  folderPath: string,
  fileFiltersCsv?: string
): Promise<RipgrepJsonMatch[]> {
  const patterns = buildPatterns(identifier)
  const collected: RipgrepJsonMatch[] = []

  for (const pattern of patterns) {
    const args = ['--json']
    if (fileFiltersCsv && fileFiltersCsv.trim().length > 0) {
      args.push('--glob', `*{${fileFiltersCsv}}`)
    }
    args.push('--regexp', pattern, '--line-number', '--no-heading', '--with-filename', folderPath)

    const stdout = await execRg(args)
    if (stdout !== null) {
      const matches = parseRipgrepJson(stdout)
      collected.push(...matches)
    }
  }

  // Deduplicate by file + line
  const unique = collected.filter((r, i, arr) => {
    const key = `${r.filePath}:${r.lineIndex}`
    return arr.findIndex((x) => `${x.filePath}:${x.lineIndex}` === key) === i
  })

  return unique
}

function execRg(args: string[], stdinInput?: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const child = spawn('rg', args, { stdio: ['pipe', 'pipe', 'pipe'] })

    let stdout = ''
    let stderr = ''

    if (stdinInput != null) {
      child.stdin.write(stdinInput)
    }
    child.stdin.end()

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    let exited = false
    child.on('error', (err) => {
      if (exited) return
      exited = true
      reject(err)
    })
    child.on('close', (code) => {
      if (exited) return
      exited = true
      if (code === 0) {
        resolve(stdout)
      } else if (code === 1) {
        // no matches
        resolve(null)
      } else {
        reject(new Error(`rg exited with code ${code}: ${stderr || stdout}`))
      }
    })
  })
}
