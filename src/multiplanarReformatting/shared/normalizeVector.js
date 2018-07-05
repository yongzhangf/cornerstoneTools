function sumOfSquares (accumulator, currentValue) {
  return accumulator + currentValue * currentValue;
}


/**
 * NormalizeVector - Normalizes the values in an array, by dividing each
 * element by the norm. The vector can have any length. This function
 * mutates the array.
 *
 * @param  {Array} values = [] The array with values to be normalized.
 * @return {Array}             The same array.
 */
export default function normalizeVector (values = []) {
  const vectorLengthSquared = values.reduce(sumOfSquares, 0);
  let vectorLength = Math.sqrt(vectorLengthSquared);

  // To avoid a division by 0 (resulting in NaN), if the length is zero, we
  // Just set it to 1
  if (vectorLength === 0) {
    vectorLength = 1;
  }

  return values.map((v) => v / vectorLength);
}
