import dedent from 'dedent'
import { describe, expect, it } from 'vitest'
import { searchTextWithRipgrep } from '../../src/haskellDefinitionProvider/ripgrepCore'

describe('ADT constructors', () => {
  const sample = dedent(`
    module Sample where

    -- Simple one-line ADT
    data Simple = SimpleCon Int

    -- ADT with constructors on one line
    data Multi = MultiCon1 Int | MultiCon2 String | MultiCon3

    -- ADT with constructors on separate lines
    data MultiSeparateLines =
      MultiSeparateLinesCon1 Int
      | MultiSeparateLinesCon2 String
      | MultiSeparateLinesCon3 Bool

    -- ADT with aligned constructors
    data Aligned =
        AlignedCon1 Int
      | AlignedCon2 String
      | AlignedCon3 Bool

    -- ADT with different indentation levels
    data Indented =
     IndentedCon1 Int
       | IndentedCon2 String
         | IndentedCon3 Bool

    -- ADT with constructors having multiple fields
    data MultiField =
      MultiFieldCon1 Int String Bool
      | MultiFieldCon2 { field1 :: Int, field2 :: String }
      | MultiFieldCon3 (Maybe Int) (Either String Bool)

    -- ADT with multiline constructor fields
    data MultilineFields =
      MultilineFieldsCon1
        Int
        String
        Bool
      | MultilineFieldsCon2
        { field1 :: Int
        , field2 :: String
        , field3 :: Bool
        }
      | MultilineFieldsCon3
        (Maybe Int)
        (Either String Bool)

    -- ADT with GADT syntax
    data GADT a where
      GADTCon1 :: a -> GADT a
      GADTCon2 :: (Show a) => a -> String -> GADT a
      GADTCon3 ::
        (Show a, Eq a) =>
        a ->
        String ->
        GADT a

    -- ADT with type parameters and constraints
    data Constrained a b where
      ConstrainedCon1 :: (Show a, Eq b) => a -> b -> Constrained a b
      ConstrainedCon2 ::
        (Show a, Eq b, Ord a) =>
        a ->
        b ->
        Constrained a b

    -- ADT with record syntax
    data Record =
      RecordCon1 {
        field1 :: Int,
        field2 :: String
      }
      | RecordCon2 {
        field3 :: Bool,
        field4 :: Double,
        field5 :: Char
      }

    -- ADT with nested patterns
    data Nested =
      NestedCon1 (Maybe (Either Int String))
      | NestedCon2
        { nested1 :: Maybe Int
        , nested2 :: Either String Bool
        , nested3 :: [Int]
        }

    -- ADT with existential types
    data Existential where
      ExistentialCon1 :: (Show a) => a -> Existential
      ExistentialCon2 ::
        (Show a, Eq a) =>
        a ->
        String ->
        Existential
  `)

  it('should find simple one-line ADT constructor', async () => {
    const results = await searchTextWithRipgrep('SimpleCon', sample)
    expect(results).toMatchObject([{ lineText: 'data Simple = SimpleCon Int' }])
  })

  it('should find ADT type name', async () => {
    const results = await searchTextWithRipgrep('Simple', sample)
    expect(results).toMatchObject([{ lineText: 'data Simple = SimpleCon Int' }])
  })

  it('should find multiple constructors on one line (1)', async () => {
    const results = await searchTextWithRipgrep('MultiCon1', sample)
    expect(results).toMatchObject([
      { lineText: 'data Multi = MultiCon1 Int | MultiCon2 String | MultiCon3' },
    ])
  })

  it('should find multiple constructors on one line (2)', async () => {
    const results = await searchTextWithRipgrep('MultiCon2', sample)
    expect(results).toMatchObject([
      { lineText: 'data Multi = MultiCon1 Int | MultiCon2 String | MultiCon3' },
    ])
  })

  it('should find multiple constructors on one line (3)', async () => {
    const results = await searchTextWithRipgrep('MultiCon3', sample)
    expect(results).toMatchObject([
      { lineText: 'data Multi = MultiCon1 Int | MultiCon2 String | MultiCon3' },
    ])
  })
  it('should find constructors on separate lines', async () => {
    const results = await searchTextWithRipgrep('MultiSeparateLinesCon2', sample)
    expect(results).toMatchObject([{ lineText: '  | MultiSeparateLinesCon2 String' }])
  })

  it('should find aligned constructors', async () => {
    const results = await searchTextWithRipgrep('AlignedCon3', sample)
    expect(results).toMatchObject([{ lineText: '  | AlignedCon3 Bool' }])
  })

  it('should find constructors with different indentation', async () => {
    const results = await searchTextWithRipgrep('IndentedCon2', sample)
    // Should find the one in the Indented data type
    expect(results).toMatchObject([{ lineText: '   | IndentedCon2 String' }])
  })

  it('should find constructors with multiple fields', async () => {
    const results = await searchTextWithRipgrep('MultiFieldCon1', sample)
    // Should find the one in MultiField data type
    expect(results).toMatchObject([{ lineText: '  MultiFieldCon1 Int String Bool' }])
  })

  it('should find constructors with multiline fields', async () => {
    const results = await searchTextWithRipgrep('MultilineFieldsCon1', sample)
    // Should find the one in MultilineFields data type
    expect(results).toMatchObject([{ lineText: '  MultilineFieldsCon1' }])
  })

  // Skipping gadts because mu doesn't have them
  it.skip('should find GADT constructors', async () => {
    const results = await searchTextWithRipgrep('GADTCon1', sample)
    expect(results).toMatchObject([{ lineText: '  GADTCon1 :: a -> GADT a' }])
  })

  it.skip('should find GADT constructors with constraints', async () => {
    const results = await searchTextWithRipgrep('GADTCon2', sample)
    expect(results).toMatchObject([{ lineText: '  GADTCon2 :: (Show a) => a -> String -> GADT a' }])
  })

  it.skip('should find GADT constructors with multiline constraints', async () => {
    const results = await searchTextWithRipgrep('GADTCon3', sample)
    expect(results).toMatchObject([{ lineText: '  GADTCon3 ::' }])
  })

  // Skipping constrained constructors because mu doesn't have them
  it.skip('should find constrained constructors', async () => {
    const results = await searchTextWithRipgrep('ConstrainedCon1', sample)
    expect(results).toMatchObject([
      { lineText: '  ConstrainedCon1 :: (Show a, Eq b) => a -> b -> Constrained a b' },
    ])
  })

  it.skip('should find constrained constructors with multiline constraints', async () => {
    const results = await searchTextWithRipgrep('ConstrainedCon2', sample)
    expect(results).toMatchObject([{ lineText: '  ConstrainedCon2 ::' }])
  })

  it('should find record constructors', async () => {
    const results = await searchTextWithRipgrep('RecordCon1', sample)
    expect(results).toMatchObject([{ lineText: '  RecordCon1 {' }])
  })

  it('should find nested constructors', async () => {
    const results = await searchTextWithRipgrep('NestedCon1', sample)
    expect(results).toMatchObject([{ lineText: '  NestedCon1 (Maybe (Either Int String))' }])
  })

  it.skip('should find existential constructors', async () => {
    const results = await searchTextWithRipgrep('ExistentialCon1', sample)
    expect(results).toMatchObject([
      { lineText: '  ExistentialCon1 :: (Show a) => a -> Existential' },
    ])
  })
})
