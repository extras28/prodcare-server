const message = "ABCDEFACBDAECFBEDFACBFDEAFDBCE"; // Try edit me

function countCharacterOccurrences(str) {
  const countMap = {};

  for (let char of str) {
    countMap[char] = (countMap[char] || 0) + 1;
  }

  return countMap;
}

// Ví dụ sử dụng
const result = countCharacterOccurrences(message);
console.log(result);
