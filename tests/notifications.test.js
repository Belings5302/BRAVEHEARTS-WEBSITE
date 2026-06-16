import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Notifications Routes', () => {
  it('should get all notifications', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/notifications');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('notifications');
    expect(Array.isArray(response.body.notifications)).toBe(true);
  });

  it('should get notifications for a specific user', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/notifications?userId=1');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('notifications');
  });
});
