module Test where

-- Sample Haskell file for testing jump to definition

-- Basic function definitions
factorial :: Integer -> Integer
factorial 0 = 1
factorial n = n * factorial (n - 1)

-- Another function
fibonacci :: Integer -> Integer
fibonacci 0 = 0
fibonacci 1 = 1
fibonacci n = fibonacci (n - 1) + fibonacci (n - 2)

-- Function with multiple patterns
isEven :: Integer -> Bool
isEven 0 = True
isEven 1 = False
isEven n = isEven (n - 2)

-- Type definitions
type Point = (Double, Double)

-- Data type
data Shape = Circle Point Double | Rectangle Point Point

-- Function using the data type
area :: Shape -> Double
area (Circle _ radius) = pi * radius * radius
area (Rectangle (x1, y1) (x2, y2)) = abs (x2 - x1) * abs (y2 - y1)

-- Another function that uses factorial
combination :: Integer -> Integer -> Integer
combination n k = factorial n `div` (factorial k * factorial (n - k))

-- Module level function
main :: IO ()
main = do
  putStrLn "Hello, Haskell!"
  print (factorial 5)
  print (fibonacci 10) 