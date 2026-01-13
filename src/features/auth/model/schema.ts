import { z } from 'zod';

export const loginFormSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
});

export type loginFormValues = z.infer<typeof loginFormSchema>;
