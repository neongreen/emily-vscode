import { spawn } from 'node:child_process'

export type PatternKind =
  | 'function_signature_same_line'
  | 'function_signature_next_line'
  | 'assignment_definition'
  | 'data_definition'
  | 'type_definition'
  | 'newtype_definition'
  | 'class_definition'
  | 'constructor'
  | 'type_family'
  | 'data_family'
  | 'pattern_synonym'

// TODO: add tests that will catch that we aren't using \b properly

export function buildPatterns(identifier: string): { kind: PatternKind; pattern: string }[] {
  return [
    // name :: ...
    { kind: 'function_signature_same_line', pattern: `(?m)^${identifier}\\s*::` },
    // name\n  :: ...
    { kind: 'function_signature_next_line', pattern: `(?m)^${identifier}\\s*\\r?\\n\\s*::` },
    // name = ...
    { kind: 'assignment_definition', pattern: `(?m)^${identifier}\\s*=` },
    // data/type/newtype/class
    { kind: 'data_definition', pattern: `(?m)^data\\s+${identifier}\\s+` },
    { kind: 'type_definition', pattern: `(?m)^type\\s+${identifier}\\s+` },
    { kind: 'newtype_definition', pattern: `(?m)^newtype\\s+${identifier}\\s+` },
    { kind: 'class_definition', pattern: `(?m)^class\\s+${identifier}\\s+` },
    // constructor names:
    //   data ... = NAME
    //   data ... | NAME
    // we can skip arbitrary amount of lines as long as they are indented
    {
      kind: 'constructor',
      pattern: `(?mx)
          ^data\\b
          # now we might do nothing or 'skip this line, check next line is indented' a few times
          (?: .* \\n [\\x20\\t]+ )*?
          # whatever line we landed on, we will either find it here or it'll be like |<newline>(here)
          .*? [|=] \\s* ${identifier}\\b
      `,
    },
    // type family
    { kind: 'type_family', pattern: `(?m)^type\\s+family\\s+${identifier}\\s+` },
    // data family
    { kind: 'data_family', pattern: `(?m)^data\\s+family\\s+${identifier}\\s+` },
    // pattern synonym (only the signature line)
    { kind: 'pattern_synonym', pattern: `(?m)^pattern\\s+${identifier}\\s+::` },
  ]
}

export type Match = { kind: PatternKind; lineIndex: number; lineText: string; filePath: string }

export function parseRipgrepJson(
  jsonOutput: string,
  patternKind?: PatternKind
): { lineIndex: number; lineText: string; filePath: string }[] {
  return jsonOutput
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      try {
        const event = JSON.parse(line)
        if (event.type === 'match') {
          const filePath: string = event.data.path?.text ?? 'stdin'
          const lineNumber: number = event.data.line_number
          const rawText: string = (event.data.lines?.text as string) ?? ''

          // For constructors, we need the last line since the constructor name appears at the end
          // For everything else, take the first line
          const lines = rawText.replace(/\r?\n$/, '').split(/\r?\n/)

          let targetLine: string
          let targetLineIndex: number

          if (patternKind === 'constructor' && lines.length > 1) {
            // For constructors, take the last line
            targetLine = lines[lines.length - 1] ?? ''
            targetLineIndex = Math.max(0, lineNumber - 1 + lines.length - 1)
          } else {
            // For everything else, take the first line
            targetLine = lines[0] ?? ''
            targetLineIndex = Math.max(0, lineNumber - 1)
          }

          return {
            filePath,
            lineIndex: targetLineIndex,
            lineText: targetLine,
          }
        }
      } catch {
        // ignore invalid JSON lines
      }
      return undefined
    })
    .filter((x): x is { lineIndex: number; lineText: string; filePath: string } => !!x)
}

export async function searchTextWithRipgrep(identifier: string, content: string): Promise<Match[]> {
  if (!content) return []

  const patterns = buildPatterns(identifier)
  const allMatches: Match[] = []

  // Collect all matches from all patterns
  for (let i = 0; i < patterns.length; i++) {
    const { pattern, kind } = patterns[i]
    const args = [
      '--json',
      '--line-number',
      '--no-heading',
      '--with-filename',
      '--multiline',
      '--regexp',
      pattern,
      '-',
    ]
    const stdout = await execRg(args, content)
    if (stdout !== null) {
      const matches = parseRipgrepJson(stdout, kind)
      for (const m of matches) {
        allMatches.push({ kind, ...m })
      }
    }
  }

  // For single text buffer, just find the best match from all matches
  return allMatches.length > 0 ? [findBestMatch(allMatches)] : []
}

export async function searchFolderWithRipgrep(
  identifier: string,
  folderPath: string,
  fileFiltersCsv?: string
): Promise<Match[]> {
  const patterns = buildPatterns(identifier)
  const allMatches: Match[] = []

  // Collect all matches from all patterns
  for (let i = 0; i < patterns.length; i++) {
    const { pattern, kind } = patterns[i]
    const args = ['--json']
    if (fileFiltersCsv && fileFiltersCsv.trim().length > 0) {
      args.push('--glob', `*{${fileFiltersCsv}}`)
    }
    args.push(
      '--regexp',
      pattern,
      '--line-number',
      '--no-heading',
      '--with-filename',
      '--multiline',
      folderPath
    )

    const stdout = await execRg(args)
    if (stdout !== null) {
      const matches = parseRipgrepJson(stdout, kind)
      for (const m of matches) {
        allMatches.push({ kind, ...m })
      }
    }
  }

  // Group by file and find best match per file
  const fileGroups = new Map<string, Match[]>()
  for (const match of allMatches) {
    const key = match.filePath
    if (!fileGroups.has(key)) {
      fileGroups.set(key, [])
    }
    fileGroups.get(key)!.push(match)
  }

  const results: Match[] = []
  for (const [_, fileMatches] of fileGroups) {
    const bestMatch = findBestMatch(fileMatches)
    if (bestMatch) {
      results.push(bestMatch)
    }
  }

  return results
}

export function findBestMatch(matches: Match[]): Match {
  // For functions, if we have the signature and the definition, we want the signature.
  if (
    matches.map((m) => m.kind).includes('function_signature_same_line') ||
    matches.map((m) => m.kind).includes('function_signature_next_line')
  ) {
    matches = matches.filter((m) => m.kind !== 'assignment_definition')
  }
  return matches[0]
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
