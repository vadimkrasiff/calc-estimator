// shared/lib/api/withApiCall.ts

import { message } from 'antd';
import { getErrorMessage } from './errorUtils'; // путь подстрой под свой проект

interface ApiCallOptions {
  successMessage?: string;
  errorMessage?: string;
}

export const withApiCall = async <T>(
  apiCall: Promise<T>,
  options: ApiCallOptions = {},
): Promise<T> => {
  const { successMessage, errorMessage = 'Произошла ошибка' } = options;

  try {
    const result = await apiCall;

    if (successMessage) {
      message.success(successMessage);
    }

    return result;
  } catch (error) {
    const displayMessage = getErrorMessage(error);
    message.error(displayMessage || errorMessage);
    throw error; // важно: пробрасываем ошибку, чтобы вызывающий код мог реагировать
  }
};
