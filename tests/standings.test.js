import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Standings Routes', () => {
  it('should get all standings', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/standings');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('standings');
    expect(Array.isArray(response.body.standings)).toBe(true);
  });
});
