import dayjs from 'dayjs';
import 'dayjs/locale/ru'; // импорт русского языка
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Подключаем плагины
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Устанавливаем русский язык по умолчанию
dayjs.locale('ru');

dayjs.tz.setDefault(dayjs.tz.guess());

export default dayjs;
