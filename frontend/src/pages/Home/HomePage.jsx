import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Truck, Shield, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ProductCard } from '../../components/products/ProductCard';
import { productAPI, seedData } from '../../lib/api';
import logo from '../../assets/images/Wackawht.jpeg';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Seed data if needed
        await seedData().catch(() => {});
        
        const response = await productAPI.getAll({ limit: 4 });
        setFeaturedProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  const categories = [
    { name: 'Watches', slug: 'watches', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=872' },
    { name: 'HeadPhones', slug: 'headphones', image: 'https://images.unsplash.com/photo-1628116709703-c1c9ad550d36?q=80&w=871' },
    { name: 'Powerbanks', slug: 'powerbanks', image: 'https://images.unsplash.com/photo-1665525548105-48ded049e730?q=80&w=870' },
    { name: 'Chargers', slug: 'chargers', image: 'https://images.unsplash.com/photo-1731616103600-3fe7ccdc5a59?q=80&w=774' },
  ];

  return (
    <>
      <Helmet>
        <title>Wacka Accessories - Premium Gadgets, Electronics & Accessories in Kenya | Shop Online with M-Pesa</title>
        <meta name="description" content="Shop premium gadgets, electronics, smartwatches, wireless earbuds, phone accessories, bags and more at Wacka Accessories Kenya. Secure M-Pesa payments, fast delivery, and quality products. Order online today!" />
        <meta name="keywords" content="gadgets Kenya, electronics Kenya, smartwatches, wireless earbuds, phone accessories, bags, fashion accessories, M-Pesa payment, online shopping Kenya, Wacka Accessories, tech gadgets, smart devices, Bluetooth speakers, power banks, phone cases" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://wacka.co.ke/" />
        <meta property="og:title" content="Wacka Accessories - Premium Gadgets & Electronics Kenya" />
        <meta property="og:description" content="Shop premium gadgets, electronics, and accessories with secure M-Pesa payments. Fast delivery across Kenya." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1571854003494-ab1b14c21249?q=80&w=1470" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://wacka.co.ke/" />
        <meta property="twitter:title" content="Wacka Accessories - Premium Gadgets & Electronics Kenya" />
        <meta property="twitter:description" content="Shop premium gadgets, electronics, and accessories with secure M-Pesa payments." />
        <meta property="twitter:image" content="https://images.unsplash.com/photo-1571854003494-ab1b14c21249?q=80&w=1470" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            "name": "Wacka Accessories",
            "description": "Premium gadgets, electronics, and accessories store in Kenya",
            "url": "https://wacka.co.ke",
            "logo": {logo},
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "KE"
            },
            "paymentAccepted": ["M-Pesa", "Cash on Delivery"],
            "priceRange": "KES 1000 - 50000"
          })}
        </script>
      </Helmet> 
      
      <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-section relative h-[70vh] min-h-[500px] flex items-center">
        <img 
          src="https://images.unsplash.com/photo-1571854003494-ab1b14c21249?q=80&w=1470"
          alt="Wacka Accessories"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="hero-overlay" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 w-full">
          <div className="max-w-xl animate-slide-up">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Elevate Your Style
            </h1>
            <p className="text-lg md:text-xl text-gray-200 mb-8">
              Discover premium accessories crafted for the modern you. 
              
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button className="btn-primary text-lg px-8 py-6" data-testid="shop-now-btn">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/products?category=powerbanks">
                <Button variant="outline" className="rounded-full px-8 py-6 text-lg border-white text-white hover:bg-white/20">
                  View Powerbanks
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Truck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
                <p className="text-sm text-gray-600">Countrywide delivery in 2-5 days</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure Payments</h3>
                <p className="text-sm text-gray-600">Safe and instant payments</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <RefreshCw className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Easy Returns</h3>
                <p className="text-sm text-gray-600">7-day return policy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Shop by Category
            </h2>
            <Link to="/products" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="group relative aspect-square rounded-2xl overflow-hidden"
                data-testid={`category-${category.slug}`}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Featured Products
            </h2>
            <Link to="/products" className="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="product-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-product bg-gray-200 rounded-2xl mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Start shoping for today's best deals
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Add to Cart and Buy now. 
            Best Price Guaranteed. Enjoy Fast Delivery Time.
          </p>
          <Link to="/products">
            <Button className="btn-primary text-lg px-8 py-6">
              Start Shopping
            </Button>
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}
