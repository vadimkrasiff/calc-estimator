/**
 * Генерирует цвет фона для Avatar на основе строки (например, имени пользователя)
 * Использует хеширование строки для получения индекса в массиве цветов
 * @param name - имя пользователя (или email)
 * @returns строка с цветом из Ant Design (например, 'blue', 'volcano', 'green')
 */
export const getAvatarColor = (name: string): string => {
  if (!name) return 'blue'; // цвет по умолчанию

  // Простой алгоритм хеширования строки
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash); // hash * 31 + char
  }

  // Массив цветов из Ant Design
  const colors = [
    'blue',
    'volcano',
    'gold',
    'magenta',
    'green',
    'cyan',
    'geekblue',
    'purple',
    'lime',
    'orange',
    'red',
    'yellow',
    'pink',
    'cyan',
    'magenta',
  ];

  // Берём остаток от деления хеша на длину массива
  const index = Math.abs(hash) % colors.length;

  return colors[index];
};
