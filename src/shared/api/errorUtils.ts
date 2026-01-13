// errorUtils.ts

import { AxiosError } from 'axios';

/**
 * Общий тип для всех "ожидаемых" ошибок в приложении.
 * Включает стандартный Error и Axios-специфичные ошибки.
 */
export type AppError = Error | AxiosError;

/**
 * Проверяет, является ли значение экземпляром Error (включая AxiosError).
 * Безопасно использовать после catch, где error: unknown.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error;
}

/**
 * Проверяет, является ли ошибка AxiosError.
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return error instanceof AxiosError;
}

/**
 * Извлекает человекочитаемое сообщение об ошибке.
 * Подходит для отображения пользователю или логирования.
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    // Пример: сервер вернул 404 — покажем тело ответа или статус
    const serverMessage =
      (error.response?.data as Record<string, unknown>)?.message || error.response?.statusText;
    if (serverMessage) {
      return typeof serverMessage === 'string' ? serverMessage : JSON.stringify(serverMessage);
    }
    return getErrorMessage(error) || 'Ошибка сети';
  }

  if (error instanceof Error) {
    return getErrorMessage(error);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Произошла неизвестная ошибка';
}

/**
 * Утилита для логирования ошибок в консоль (можно заменить на Sentry, logrocket и т.д.)
 */
export function logError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  const prefix = context ? `[${context}] ` : '';

  if (isAxiosError(error)) {
    console.error(prefix + 'Axios Error:', message, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });
  } else if (error instanceof Error) {
    console.error(prefix + 'Error:', message, error.stack);
  } else {
    console.error(prefix + 'Unknown Error:', error);
  }
}
