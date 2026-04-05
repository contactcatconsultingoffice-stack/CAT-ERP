import { z } from 'zod';

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (Prisma connection string)'),
  
  // Authentication
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required for token signing'),
  
  // SMTP Configuration
  SMTP_HOST: z.string().default('smtp-relay.brevo.com'),
  SMTP_PORT: z.string().transform(Number).default(587),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required for sending emails'),
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required for sending emails'),
  
  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;

export const validateEnv = () => {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  
  return result.data;
};
