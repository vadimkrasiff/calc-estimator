import { z } from 'zod';

const actionSchema = z.union([
  z.object({
    type: z.literal('navigate'),
    path: z.string(),
  }),
  z.object({
    type: z.literal('callback'),
    fn: z.function(),
  }),
]);

const headerButtonSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  action: actionSchema,
  danger: z.boolean().optional().default(false),
  disabled: z.boolean().optional().default(false),
});

const headerTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  path: z.string().optional(),
  active: z.boolean().optional().default(false),
});

export const headerConfigSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  buttons: z.array(headerButtonSchema).optional().default([]),
  tabs: z.array(headerTabSchema).optional().default([]),
  showBackButton: z.boolean().optional().default(false),
  onBack: z.function().optional(),
  onChangeTab: z.any().optional(),
  loading: z.boolean().optional().default(false),
});

export type HeaderConfig = z.infer<typeof headerConfigSchema>;
