export const verifyEnv = <T extends string>(keys: T[]): Record<T, string> => {
  const result: Partial<Record<T, string>> = {};
  keys.forEach(key => {
    if (!process.env[key]) {
      console.error(`Environment variable ${key} is not set.`);
      // eslint-disable-next-line n/no-process-exit
      process.exit(1);
    }
    result[key] = process.env[key];
  });
  return result as Record<T, string>;
};
