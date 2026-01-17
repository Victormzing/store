import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ProductCard } from '../../components/products/ProductCard';
import { productAPI } from '../../lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          productAPI.getAll({
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            search: searchQuery || undefined,
          }),
          productAPI.getCategories(),
        ]);
        
        let sortedProducts = [...productsRes.data];
        
        // Sort products
        switch (sortBy) {
          case 'price-low':
            sortedProducts.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
            break;
          case 'price-high':
            sortedProducts.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
            break;
          case 'name':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
          default:
            // newest - keep original order
            break;
        }
        
        setProducts(sortedProducts);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedCategory, searchQuery, sortBy]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    const params = new URLSearchParams(searchParams);
    if (category !== 'all') {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('newest');
    setSearchParams({});
  };

  const hasFilters = searchQuery || selectedCategory !== 'all';

  return (
    <div className="min-h-screen bg-gray-50" data-testid="products-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {selectedCategory && selectedCategory !== 'all' 
              ? categories.find(c => c.slug === selectedCategory)?.name || 'Products'
              : 'All Products'
            }
          </h1>
          <p className="text-gray-600">
            {products.length} product{products.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                  data-testid="search-input"
                />
              </div>
            </form>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full md:w-48 h-11" data-testid="category-filter">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id || cat.slug} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48 h-11" data-testid="sort-filter">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="h-11"
                data-testid="clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-2">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              data-testid="category-all"
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id || cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`category-pill ${selectedCategory === cat.slug ? 'active' : ''}`}
                data-testid={`category-pill-${cat.slug}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="product-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-product bg-gray-200 rounded-2xl mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-5 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-4">No products found</p>
            <Button onClick={clearFilters} variant="outline">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
