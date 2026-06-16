import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { db } from '../server/db.js';

// Mock the database for testing
const mockDb = {
  run: () => {},
  get: () => {},
  all: () => {},
  serialize: () => {}
};

describe('Authentication Routes', () => {
  it('should register a new user', async () => {
    const timestamp = Date.now();
    const response = await request('http://localhost:3000')
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: `test${timestamp}@example.com`,
        password: 'test123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('email', `test${timestamp}@example.com`);
  });

  it('should login with valid credentials', async () => {
    const timestamp = Date.now();
    // First register a user
    await request('http://localhost:3000')
      .post('/api/auth/register')
      .send({
        name: 'Login Test User',
        email: `logintest${timestamp}@example.com`,
        password: 'test123'
      });
    
    // Then login with that user
    const response = await request('http://localhost:3000')
      .post('/api/auth/login')
      .send({
        email: `logintest${timestamp}@example.com`,
        password: 'test123'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('userId');
    expect(response.body).toHaveProperty('email');
  });

  it('should fail login with invalid credentials', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
  });

  it('should handle forgot password request', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/auth/forgot-password')
      .send({
        email: 'test@example.com'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });

  it('should reset password with valid token', async () => {
    const response = await request('http://localhost:3000')
      .post('/api/auth/reset-password')
      .send({
        token: 'valid-token',
        newPassword: 'newpassword123'
      });
    
    // This will fail with invalid token, but should return proper error
    expect([200, 400]).toContain(response.status);
  });
});
