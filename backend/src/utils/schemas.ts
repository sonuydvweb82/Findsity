import { z } from 'zod';

export const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(80),
    email: z.string().email('Enter a valid email address').max(120),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72)
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string(),
    college: z.string().min(2, 'Enter your college or university name').max(120),
    studentId: z.string().max(60).optional().nullable().default(''),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address').max(120),
  password: z.string().min(1, 'Enter your password').max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address').max(120),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72)
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  college: z.string().min(2).max(120).optional(),
  studentId: z.string().max(60).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
});

export const createItemSchema = z.object({
  type: z.enum(['lost', 'found']),
  name: z.string().min(2, 'Item name must be at least 2 characters').max(100),
  categoryId: z.number().int().positive('Select a category'),
  description: z.string().max(3000).optional().nullable().default(''),
  brand: z.string().max(80).optional().nullable().default(''),
  model: z.string().max(80).optional().nullable().default(''),
  color: z.string().max(60).optional().nullable().default(''),
  dateIncident: z.string().max(20).optional().nullable().default(''),
  timeApprox: z.string().max(30).optional().nullable().default(''),
  location: z.string().max(150).optional().nullable().default(''),
  locationDetails: z.string().max(500).optional().nullable().default(''),
  currentLocation: z.string().max(150).optional().nullable().default(''),
  privateIdentifyingFeatures: z.string().max(2000).optional().nullable().default(''),
  reward: z.string().max(200).optional().nullable().default(''),
  notes: z.string().max(2000).optional().nullable().default(''),
});

export const updateItemSchema = createItemSchema.partial().extend({
  status: z.enum(['lost', 'found', 'return_pending', 'returned']).optional(),
});

export const itemListQuerySchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  status: z.enum(['lost', 'found', 'returned']).optional(),
  category: z.string().max(60).optional(),
  q: z.string().max(200).optional(),
  location: z.string().max(150).optional(),
  dateFrom: z.string().max(20).optional(),
  dateTo: z.string().max(20).optional(),
  sort: z.enum(['newest', 'oldest', 'recently_updated']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const claimSchema = z.object({
  lostLocation: z.string().min(2, 'Where did you lose the item?').max(200),
  lostDate: z.string().min(1, 'When did you lose the item?').max(20),
  brand: z.string().max(80).optional().nullable().default(''),
  model: z.string().max(80).optional().nullable().default(''),
  color: z.string().max(60).optional().nullable().default(''),
  uniqueFeature: z.string().min(3, 'Describe a unique feature that is not visible in the public listing').max(2000),
  proofOfOwnership: z.string().max(2000).optional().nullable().default(''),
  additionalInfo: z.string().max(2000).optional().nullable().default(''),
});

export const messageSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty').max(2000),
});

export const reportSchema = z.object({
  targetType: z.enum(['item', 'user', 'message']),
  targetId: z.string().min(1).max(100),
  reason: z.enum(['fake_listing', 'scam', 'spam', 'inappropriate', 'suspicious_user', 'incorrect_info', 'other']),
  details: z.string().max(2000).optional().default(''),
});

export const handoverSchema = z.object({
  pickupLocation: z.string().min(3, 'Enter a pickup location').max(200),
  scheduledDate: z
    .string()
    .min(1, 'Enter a handover date')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD)')
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), 'Enter a valid date'),
  scheduledTime: z.string().max(30).optional().nullable().default(''),
  notes: z.string().max(1000).optional().default(''),
});

export const notesSchema = z.object({
  notes: z.string().max(1000).optional().default(''),
});