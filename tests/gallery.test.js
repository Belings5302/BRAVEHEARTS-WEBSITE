import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Gallery Routes', () => {
  it('should get all gallery items', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/gallery');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('gallery');
    expect(Array.isArray(response.body.gallery)).toBe(true);
  });
});
