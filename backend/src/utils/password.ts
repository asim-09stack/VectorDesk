import bcrypt from 'bcryptjs';

/** Cost factor for bcrypt hashing. 10 is a good default balance. */
const SALT_ROUNDS = 10;

/** Hash a plaintext password for storage. */
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

/** Compare a plaintext password against a stored bcrypt hash. */
export const comparePassword = (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);
