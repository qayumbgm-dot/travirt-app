import { pool } from '../database/pool';

export interface DbUser {
  id: string;
  user_id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: string;
  is_verified: boolean;
  created_at: Date;
  last_login_at: Date | null;
}

export const findUserByEmail = async (email: string): Promise<DbUser | null> => {
  const result = await pool.query<DbUser>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase().trim()],
  );
  return result.rows[0] ?? null;
};

export const findUserByUserId = async (userId: string): Promise<DbUser | null> => {
  const result = await pool.query<DbUser>(
    'SELECT * FROM users WHERE user_id = $1',
    [userId.toUpperCase().trim()],
  );
  return result.rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<DbUser | null> => {
  const result = await pool.query<DbUser>(
    'SELECT * FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
};

export const createUser = async (params: {
  userId: string;
  email: string;
  passwordHash: string;
  displayName?: string;
}): Promise<DbUser> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query<DbUser>(
      `INSERT INTO users (user_id, email, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        params.userId.toUpperCase().trim(),
        params.email.toLowerCase().trim(),
        params.passwordHash,
        params.displayName ?? null,
      ],
    );
    const user = userResult.rows[0];

    // Seed portfolio balances (empty wallet to start)
    await client.query(
      'INSERT INTO portfolio_balances (user_id) VALUES ($1)',
      [user.id],
    );

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const updateLastLogin = async (id: string): Promise<void> => {
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
};

export const isUserIdTaken = async (userId: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE user_id = $1',
    [userId.toUpperCase().trim()],
  );
  return (result.rowCount ?? 0) > 0;
};

export const isEmailTaken = async (email: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM users WHERE email = $1',
    [email.toLowerCase().trim()],
  );
  return (result.rowCount ?? 0) > 0;
};

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface DbUserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  ifsc: string | null;
  pan: string | null;
  updated_at: Date;
}

export const getUserProfile = async (userId: string): Promise<DbUserProfile | null> => {
  const { rows } = await pool.query<DbUserProfile>(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [userId],
  );
  return rows[0] ?? null;
};

export const upsertUserProfile = async (
  userId: string,
  data: Partial<Omit<DbUserProfile, 'user_id' | 'updated_at'>>,
): Promise<DbUserProfile> => {
  const fields = [
    'first_name', 'last_name', 'phone', 'gender', 'address',
    'city', 'state', 'pincode', 'country',
    'bank_name', 'account_holder', 'account_number', 'ifsc', 'pan',
  ] as const;

  const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const values = fields.map((f) => (data as any)[f] ?? null);

  const { rows } = await pool.query<DbUserProfile>(
    `INSERT INTO user_profiles (user_id, ${fields.join(', ')}, updated_at)
     VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')}, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET ${setClauses}, updated_at = NOW()
     RETURNING *`,
    [userId, ...values],
  );
  return rows[0];
};
