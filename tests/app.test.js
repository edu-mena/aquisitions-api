import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Token helpers ─────────────────────────────────────────────────────────────
// Matches the default in src/utils/jwt.js when JWT_SECRET is not set
const TEST_SECRET = 'chave-secreta-jwt-mudar-em-produção';
const makeToken = payload =>
  jwt.sign(payload, TEST_SECRET, { expiresIn: '1d' });

// ── Arcjet mock (allow every request) ────────────────────────────────────────
const allowedDecision = {
  isDenied: () => false,
  reason: {
    isRateLimit: () => false,
    isBot: () => false,
    isShield: () => false,
  },
  ip: { isHosting: () => false },
  results: [],
};

jest.unstable_mockModule('#config/arcjet.js', () => ({
  default: {
    protect: jest.fn().mockResolvedValue(allowedDecision),
    withRule: jest.fn().mockReturnValue({
      protect: jest.fn().mockResolvedValue(allowedDecision),
    }),
  },
}));

// ── Auth service mock ─────────────────────────────────────────────────────────
const mockCreateUser = jest.fn();
const mockAuthenticateUser = jest.fn();

jest.unstable_mockModule('#services/auth.service.js', () => ({
  createUser: mockCreateUser,
  authenticateUser: mockAuthenticateUser,
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

// ── Users service mock ────────────────────────────────────────────────────────
const mockGetAllUsers = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUser = jest.fn();
const mockDeleteUser = jest.fn();

jest.unstable_mockModule('#services/users.service.js', () => ({
  getAllUsers: mockGetAllUsers,
  getUserById: mockGetUserById,
  updateUser: mockUpdateUser,
  deleteUser: mockDeleteUser,
}));

// ── App (imported after mocks are registered) ─────────────────────────────────
let app;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.default;
});

// ── Fixtures ──────────────────────────────────────────────────────────────────
const user = {
  id: 1,
  name: 'Test User',
  email: 'user@example.com',
  role: 'user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const admin = {
  id: 2,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const userToken = makeToken({ id: user.id, email: user.email, role: user.role });
const adminToken = makeToken({ id: admin.id, email: admin.email, role: admin.role });
const bearer = token => ({ Authorization: `Bearer ${token}` });

// ─────────────────────────────────────────────────────────────────────────────
// Health / API
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });
});

describe('GET /api', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Aquisitions API is running');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth — sign-up
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/sign-up', () => {
  const validBody = {
    name: 'New User',
    email: 'new@example.com',
    password: 'password123',
  };

  it('returns 201 and sets the token cookie', async () => {
    mockCreateUser.mockResolvedValue({ id: 3, ...validBody, role: 'user' });

    const res = await request(app).post('/api/auth/sign-up').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User Registered');
    expect(res.body.user).toMatchObject({ email: validBody.email, role: 'user' });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 400 for an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up')
      .send({ ...validBody, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Failed');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up')
      .send({ email: validBody.email });

    expect(res.status).toBe(400);
  });

  it('returns 409 when email is already registered', async () => {
    mockCreateUser.mockRejectedValue(
      new Error('User with this email already exists')
    );

    const res = await request(app).post('/api/auth/sign-up').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already exist');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth — sign-in
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/sign-in', () => {
  const credentials = { email: 'user@example.com', password: 'password123' };

  it('returns 200 and sets the token cookie', async () => {
    mockAuthenticateUser.mockResolvedValue(user);

    const res = await request(app).post('/api/auth/sign-in').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.user.email).toBe(user.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/sign-in')
      .send({ email: credentials.email });

    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong credentials', async () => {
    mockAuthenticateUser.mockRejectedValue(new Error('Invalid credentials'));

    const res = await request(app).post('/api/auth/sign-in').send(credentials);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 when user is not found', async () => {
    mockAuthenticateUser.mockRejectedValue(new Error('User not found'));

    const res = await request(app).post('/api/auth/sign-in').send(credentials);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth — sign-out
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/sign-out', () => {
  it('returns 200 and clears the token cookie', async () => {
    const res = await request(app).post('/api/auth/sign-out');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logout successful');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Users — GET /api/users
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/users', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 200 with the full user list', async () => {
    mockGetAllUsers.mockResolvedValue([user, admin]);

    const res = await request(app)
      .get('/api/users')
      .set(bearer(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.users).toHaveLength(2);
  });

  it('returns 200 with an empty list when no users exist', async () => {
    mockGetAllUsers.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/users')
      .set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Users — GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/users/:id', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/users/1');
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app)
      .get('/api/users/abc')
      .set(bearer(userToken));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Failed');
  });

  it('returns 404 when user does not exist', async () => {
    mockGetUserById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/users/99')
      .set(bearer(userToken));

    expect(res.status).toBe(404);
  });

  it('returns 200 with the user data', async () => {
    mockGetUserById.mockResolvedValue(user);

    const res = await request(app)
      .get(`/api/users/${user.id}`)
      .set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(res.body.user.email).toBe(user.email);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Users — PUT /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/users/:id', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).put('/api/users/1').send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app)
      .put('/api/users/abc')
      .set(bearer(userToken))
      .send({ name: 'x' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the body is empty', async () => {
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set(bearer(userToken))
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 403 when a user tries to update someone else', async () => {
    const res = await request(app)
      .put('/api/users/99')
      .set(bearer(userToken))
      .send({ name: 'Hacker' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/own/i);
  });

  it('returns 403 when a non-admin tries to change role', async () => {
    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set(bearer(userToken))
      .send({ role: 'admin' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  it('returns 200 when a user updates their own name', async () => {
    const updated = { ...user, name: 'Updated Name' };
    mockUpdateUser.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set(bearer(userToken))
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Name');
  });

  it('returns 200 when an admin changes another users role', async () => {
    const updated = { ...user, role: 'admin' };
    mockUpdateUser.mockResolvedValue(updated);

    const res = await request(app)
      .put(`/api/users/${user.id}`)
      .set(bearer(adminToken))
      .send({ role: 'admin' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  it('returns 404 when updating a non-existent user', async () => {
    mockUpdateUser.mockRejectedValue(new Error('User not found'));

    const res = await request(app)
      .put('/api/users/99')
      .set(bearer(adminToken))
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Users — DELETE /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).delete('/api/users/1');
    expect(res.status).toBe(401);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app)
      .delete('/api/users/abc')
      .set(bearer(userToken));

    expect(res.status).toBe(400);
  });

  it('returns 403 when a user tries to delete someone else', async () => {
    const res = await request(app)
      .delete('/api/users/99')
      .set(bearer(userToken));

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/own/i);
  });

  it('returns 404 when deleting a non-existent user', async () => {
    mockDeleteUser.mockRejectedValue(new Error('User not found'));

    const res = await request(app)
      .delete('/api/users/99')
      .set(bearer(adminToken));

    expect(res.status).toBe(404);
  });

  it('returns 200 when a user deletes their own account', async () => {
    mockDeleteUser.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/users/${user.id}`)
      .set(bearer(userToken));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User deleted successfully');
  });

  it('returns 200 when an admin deletes any account', async () => {
    mockDeleteUser.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/users/${user.id}`)
      .set(bearer(adminToken));

    expect(res.status).toBe(200);
  });
});
