import dedent from 'dedent'
import { describe, expect, it } from 'vitest'
import { searchTextWithRipgrep } from '../../src/haskellDefinitionProvider/ripgrepCore'

describe('function definitions', () => {
  const sample = dedent(`
    module Sample where

    oneLineSignature :: Int -> Int
    oneLineSignature x = x + 1

    colonsSameLine ::
      Int -> Int
    colonsSameLine x = x + 1

    colonsNextLine
      :: Int -> Int
    colonsNextLine x = x + 1

    aligned :: Int
            -> Int
    aligned x = x + 1

    multiline1 ::
      (Show a) =>
      a -> String
    multiline1 = undefined

    multiline2 ::
      (Show a) =>
      => a 
      -> String
    multiline2 = undefined

    multiline3
      :: (Show a)
      => a -> String
    multiline3 = undefined

    indent1
     :: Int -> Int
    indent1 = undefined

    indent2
      :: Int -> Int
    indent2 = undefined

    indent3
       :: Int -> Int
    indent3 = undefined
  `)

  it('should find function with one-line type signature', async () => {
    const results = await searchTextWithRipgrep('oneLineSignature', sample)
    expect(results).toMatchObject([{ lineText: 'oneLineSignature :: Int -> Int' }])
  })

  it('should find function with colons on same line', async () => {
    const results = await searchTextWithRipgrep('colonsSameLine', sample)
    expect(results).toMatchObject([{ lineText: 'colonsSameLine ::' }])
  })

  it('should find function with colons on next line', async () => {
    const results = await searchTextWithRipgrep('colonsNextLine', sample)
    expect(results).toMatchObject([{ lineText: 'colonsNextLine' }])
  })

  it('should find function with aligned type signature', async () => {
    const results = await searchTextWithRipgrep('aligned', sample)
    expect(results).toMatchObject([{ lineText: 'aligned :: Int' }])
  })

  it('should find function with multiline type signature (style 1)', async () => {
    const results = await searchTextWithRipgrep('multiline1', sample)
    expect(results).toMatchObject([{ lineText: 'multiline1 ::' }])
  })

  it('should find function with multiline type signature (style 2)', async () => {
    const results = await searchTextWithRipgrep('multiline2', sample)
    expect(results).toMatchObject([{ lineText: 'multiline2 ::' }])
  })

  it('should find function with multiline type signature (style 3)', async () => {
    const results = await searchTextWithRipgrep('multiline3', sample)
    expect(results).toMatchObject([{ lineText: 'multiline3' }])
  })

  it('should find function with single space indented type signature', async () => {
    const results = await searchTextWithRipgrep('indent1', sample)
    expect(results).toMatchObject([{ lineText: 'indent1' }])
  })

  it('should find function with double space indented type signature', async () => {
    const results = await searchTextWithRipgrep('indent2', sample)
    expect(results).toMatchObject([{ lineText: 'indent2' }])
  })

  it('should find function with triple space indented type signature', async () => {
    const results = await searchTextWithRipgrep('indent3', sample)
    expect(results).toMatchObject([{ lineText: 'indent3' }])
  })

  it('should ignore substring matches', async () => {
    const results = await searchTextWithRipgrep('indent', sample)
    expect(results).toHaveLength(0)
  })
})
