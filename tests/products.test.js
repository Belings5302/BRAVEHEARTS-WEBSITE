import { describe, it, expect } from 'vitest';
import request from 'supertest';

describe('Products Routes', () => {
  it('should get all products', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/products');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('products');
    expect(Array.isArray(response.body.products)).toBe(true);
  });

  it('should return products with required fields', async () => {
    const response = await request('http://localhost:3000')
      .get('/api/products');
    
    if (response.body.products && response.body.products.length > 0) {
      const product = response.body.products[0];
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('price_mwk');
      expect(product).toHaveProperty('price_usd');
    }
  });
});
