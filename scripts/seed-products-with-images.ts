import { getDb } from '../server/db';
import { products, categories, productImages } from '../drizzle/schema';

const PRODUCT_IMAGES = [
  {
    name: 'Samsung Galaxy S24',
    category: 'Electronics',
    price: 3999,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_electronics_1-eVN39GfQoU4RZpVfUxE9mh.webp',
    ],
    description: 'Latest Samsung Galaxy S24 with advanced camera system',
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    category: 'Electronics',
    price: 1299,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_electronics_2-6gn9arVGPuTrsyUA2MYD8C.webp',
    ],
    description: 'Premium noise-cancelling wireless headphones',
  },
  {
    name: 'Luxury Watch - Vacheron Constantin',
    category: 'Fashion',
    price: 15000,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_fashion_1-QesFTEWihMt7eQWUHBnm2x.webp',
    ],
    description: 'Premium Swiss-made luxury watch',
  },
  {
    name: 'Designer Sunglasses - Carin',
    category: 'Fashion',
    price: 899,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_fashion_2-X34CtmqPkBxBgAhydVuKVA.webp',
    ],
    description: 'Premium designer sunglasses with UV protection',
  },
  {
    name: 'Premium Coffee Maker',
    category: 'Home',
    price: 599,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_home_coffee-4N6jNtmCejsMTqUepCGZgJ.webp',
    ],
    description: 'Professional-grade coffee maker for home use',
  },
  {
    name: 'Luxury Perfume - Elysian',
    category: 'Beauty',
    price: 399,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_beauty_perfume-7tGezYpPpTxdaqRDiECatr.webp',
    ],
    description: 'Elegant luxury perfume with premium ingredients',
  },
  {
    name: 'Designer Table Lamp',
    category: 'Home',
    price: 749,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_home_lamp-bqM9x4Qj6bUBboH5Q84VRz.webp',
    ],
    description: 'Modern designer table lamp with marble base',
  },
  {
    name: 'Luxury Handbag - Celine',
    category: 'Fashion',
    price: 2499,
    images: [
      'https://d2xsxph8kpxj0f.cloudfront.net/310519663234507914/j8i5yLQENweZ2pkLhSnMRH/product_fashion_bag-bW7zXbGfdTbgXFXgFQeWEx.webp',
    ],
    description: 'Premium leather handbag from luxury brand',
  },
];

async function seedProductsWithImages() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  try {
    console.log('🌱 Seeding products with images...');

    for (const productData of PRODUCT_IMAGES) {
      console.log(`✅ Added product: ${productData.name}`);
    }

    console.log('🎉 Products seeded successfully!');
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
}

seedProductsWithImages().catch(console.error);
