import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Authentication Integration Tests', () => {
  it('should complete full user registration and login flow', async () => {
    const timestamp = Date.now();
    // Register a new user
    const registerResponse = await request('http://localhost:3000')
      .post('/api/auth/register')
      .send({
        name: 'Integration Test User',
        email: `integration-test-${timestamp}@example.com`,
        password: 'test123'
      });
    
    expect(registerResponse.status).toBe(200);
    expect(registerResponse.body).toHaveProperty('userId');
    
    // Login with the registered user
    const loginResponse = await request('http://localhost:3000')
      .post('/api/auth/login')
      .send({
        email: `integration-test-${timestamp}@example.com`,
        password: 'test123'
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('userId');
    expect(loginResponse.body).toHaveProperty('email');
  });

  it('should complete password reset flow', async () => {
    const timestamp = Date.now();
    // Request password reset
    const forgotResponse = await request('http://localhost:3000')
      .post('/api/auth/forgot-password')
      .send({
        email: `integration-test-${timestamp}@example.com`
      });
    
    expect(forgotResponse.status).toBe(200);
    expect(forgotResponse.body).toHaveProperty('success', true);
    
    // Note: Reset password requires a valid token from the database
    // This test validates the flow structure but won't complete without a real token
  });
});
