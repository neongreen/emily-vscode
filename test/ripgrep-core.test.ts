import { describe, expect, it } from 'vitest'
import { searchTextWithRipgrep } from '../src/haskellDefinitionProvider/ripgrepCore'

describe('ripgrep core', () => {
  it('should find function definitions in string content', async () => {
    const content = [
      'module Sample where',
      '',
      'data Foo = FooCon Int',
      'type FooAlias = Int',
      'newtype FooNew = FooNew Int',
      'class FooClass a where',
      '',
      'foo :: Int -> Int',
      'foo x = x + 1',
    ].join('\n')

    const results = await searchTextWithRipgrep('foo', content)

    expect(results).toHaveLength(1)
    expect(results[0].lineIndex).toBe(7)
    expect(results[0].lineText).toBe('foo :: Int -> Int')
  })

  it('should find data type definitions in string content', async () => {
    const content = [
      'module Sample where',
      '',
      'data Foo = FooCon Int',
      'type FooAlias = Int',
      'newtype FooNew = FooNew Int',
      'class FooClass a where',
      '',
      'foo :: Int -> Int',
      'foo x = x + 1',
    ].join('\n')

    const results = await searchTextWithRipgrep('Foo', content)

    expect(results).toHaveLength(1)
    expect(results[0].lineIndex).toBe(2)
    expect(results[0].lineText).toBe('data Foo = FooCon Int')
  })
})
