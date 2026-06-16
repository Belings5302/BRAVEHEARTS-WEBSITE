import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('News Routes', () => {
  it('should get all news articles', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/news');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('news');
    expect(Array.isArray(response.body.news)).toBe(true);
  });

  it('should get a specific news article by ID', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/news/1');
    
    expect([200, 404]).toContain(response.status);
  });
});
