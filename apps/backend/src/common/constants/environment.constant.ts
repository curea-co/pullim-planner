export const Environment = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
  LOCALHOST: "localhost",
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

export const ENVIRONMENTS = Object.values(Environment);

export const DEFAULT_ENVIRONMENT = Environment.DEVELOPMENT;
