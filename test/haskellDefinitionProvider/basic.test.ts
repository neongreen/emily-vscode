import dedent from 'dedent'
import { describe, expect, it } from 'vitest'
import { searchTextWithRipgrep } from '../../src/haskellDefinitionProvider/ripgrepCore'

describe('basic', () => {
  // Single comprehensive sample that covers all definition types
  const comprehensiveSample = dedent(`
    module Sample where

    -- Data type definition
    data Foo = FooCon Int

    -- Type alias definition
    type FooAlias = Int

    -- Newtype definition
    newtype FooNew = FooNew Int

    -- Class definition
    class FooClass a where
      method1 :: a -> a
      method2 :: a -> Bool

    -- Function with type signature
    foo :: Int -> Int
    foo x = x + 1

    -- Function with value definition (no type signature)
    bar = 42

    -- Another function with type signature
    baz :: String -> String
    baz s = "Hello " ++ s

    -- Record type
    data Person = Person {
      name :: String,
      age :: Int
    }

    -- Instance definition
    instance Show Person where
      show (Person n a) = n ++ " (" ++ show a ++ ")"

    -- Type family
    type family FooFamily a :: *

    -- Data family
    data family FooDataFamily a

    -- GADT
    data FooGADT a where
      FooGADTCon :: a -> FooGADT a

    -- Pattern synonym
    pattern FooPattern :: Int -> Foo
    pattern FooPattern x = FooCon x

    -- Type synonym with constraints
    type FooWithConstraints a = (Show a, Eq a) => a -> String

    -- Function with multiple patterns
    quux :: Int -> String
    quux 0 = "zero"
    quux 1 = "one"
    quux _ = "other"

    -- Let binding
    letBinding = let x = 5 in x * 2

    -- Where clause
    whereBinding = result
      where
        result = 10

    -- Import statement
    import Data.Text (Text)

    -- Export statement
    module Exports (
      Foo(..),
      foo,
    )
  `)

  it('should find function definitions with type signatures', async () => {
    const results = await searchTextWithRipgrep('foo', comprehensiveSample)
    expect(results).toHaveLength(1)
    expect(results).toMatchObject([{ lineText: 'foo :: Int -> Int' }])
  })

  it('should find function definitions without type signatures', async () => {
    const results = await searchTextWithRipgrep('bar', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'bar = 42' }])
  })

  it('should find data type definitions by type name', async () => {
    const results = await searchTextWithRipgrep('Foo', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'data Foo = FooCon Int' }])
  })

  it('should find data type definitions by constructor name', async () => {
    const results = await searchTextWithRipgrep('FooCon', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'data Foo = FooCon Int' }])
  })

  it('should find type alias definitions by type name', async () => {
    const results = await searchTextWithRipgrep('FooAlias', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'type FooAlias = Int' }])
  })

  it('should find newtype definitions', async () => {
    const results = await searchTextWithRipgrep('FooNew', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'newtype FooNew = FooNew Int' }])
  })

  it('should find class definitions', async () => {
    const results = await searchTextWithRipgrep('FooClass', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'class FooClass a where' }])
  })

  it('should find function with type signature (baz)', async () => {
    const results = await searchTextWithRipgrep('baz', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'baz :: String -> String' }])
  })

  it('should find function with multiple patterns (quux)', async () => {
    const results = await searchTextWithRipgrep('quux', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'quux :: Int -> String' }])
  })

  // todo: this is wrong, it should test finding things *defined* by the let, not things containing let

  it('should find let binding definitions', async () => {
    const results = await searchTextWithRipgrep('letBinding', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'letBinding = let x = 5 in x * 2' }])
  })

  it('should find where clause definitions', async () => {
    const results = await searchTextWithRipgrep('whereBinding', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'whereBinding = result' }])
  })

  it('should find type family definitions', async () => {
    const results = await searchTextWithRipgrep('FooFamily', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'type family FooFamily a :: *' }])
  })

  it('should find data family definitions', async () => {
    const results = await searchTextWithRipgrep('FooDataFamily', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'data family FooDataFamily a' }])
  })

  it('should find GADT definitions', async () => {
    const results = await searchTextWithRipgrep('FooGADT', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'data FooGADT a where' }])
  })

  it('should find pattern synonym definitions', async () => {
    const results = await searchTextWithRipgrep('FooPattern', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'pattern FooPattern :: Int -> Foo' }])
  })

  it('should find type synonyms with constraints', async () => {
    const results = await searchTextWithRipgrep('FooWithConstraints', comprehensiveSample)
    expect(results).toMatchObject([
      { lineText: 'type FooWithConstraints a = (Show a, Eq a) => a -> String' },
    ])
  })

  it('should find record type definitions', async () => {
    const results = await searchTextWithRipgrep('Person', comprehensiveSample)
    expect(results).toMatchObject([{ lineText: 'data Person = Person {' }])
  })

  it('should return empty array for non-existent identifiers', async () => {
    const results = await searchTextWithRipgrep('NonExistent', comprehensiveSample)
    expect(results).toHaveLength(0)
  })

  it('should handle empty content', async () => {
    const results = await searchTextWithRipgrep('foo', '')
    expect(results).toHaveLength(0)
  })

  it('should handle content with only whitespace', async () => {
    const results = await searchTextWithRipgrep('foo', '   \n  \t  ')
    expect(results).toHaveLength(0)
  })
})
