
/**
 * Генерирует случайное целое число в заданном диапазоне.
 * @param min - Минимальное значение (включительно).
 * @param max - Максимальное значение (включительно).
 * @returns Случайное целое число.
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Перемешивает массив в случайном порядке (алгоритм Фишера-Йетса).
 * @param array - Массив для перемешивания.
 * @returns Новый массив с перемешанными элементами.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
