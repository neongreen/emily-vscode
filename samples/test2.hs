-- Test file for cross-file jump to definition functionality
-- This file imports and uses definitions from Test module
emily-vscode/samples/test.hs:6
import Test

-- Function that uses factorial from Test module
factorialSum :: Integer -> Integer
factorialSum n = sum [factorial i | i <- [0..n]]

-- Function that uses fibonacci from Test module
fibonacciSum :: Integer -> Integer
fibonacciSum n = sum [fibonacci i | i <- [0..n]]

-- Function that uses the Shape data type from Test module
perimeter :: Shape -> Double
perimeter (Circle _ radius) = 2 * pi * radius
perimeter (Rectangle (x1, y1) (x2, y2)) = 2 * (abs (x2 - x1) + abs (y2 - y1))

-- Function that uses area from Test module
isLarger :: Shape -> Shape -> Bool
isLarger shape1 shape2 = area shape1 > area shape2

-- Function that uses combination from Test module
binomialProbability :: Integer -> Integer -> Double -> Double
binomialProbability n k p = fromIntegral (combination n k) * p^k * (1-p)^(n-k)

-- Function that uses multiple imported functions
complexCalculation :: Integer -> Integer -> Double
complexCalculation n k = fromIntegral (factorial n) / fromIntegral (combination n k)

-- Test function that uses multiple definitions from Test module
testCrossFileDefinitions :: IO ()
testCrossFileDefinitions = do
  putStrLn "Testing cross-file definitions:"
  putStrLn $ "Factorial of 5: " ++ show (factorial 5)
  putStrLn $ "Fibonacci of 10: " ++ show (fibonacci 10)
  putStrLn $ "Is 6 even? " ++ show (isEven 6)
  
  let circle = Circle (0, 0) 5
  let rect = Rectangle (0, 0) (3, 4)
  
  putStrLn $ "Circle area: " ++ show (area circle)
  putStrLn $ "Rectangle area: " ++ show (area rect)
  putStrLn $ "Circle perimeter: " ++ show (perimeter circle)
  putStrLn $ "Combination 5 choose 2: " ++ show (combination 5 2)

-- Main function for this file
main :: IO ()
main = do
  putStrLn "Hello from test2.hs!"
  testCrossFileDefinitions 