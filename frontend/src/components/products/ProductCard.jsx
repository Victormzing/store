import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { useCart } from '../../context/CartContext';

export const ProductCard = ({ product }) => {
  const { addToCart, loading } = useCart();
  
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const displayPrice = hasDiscount ? product.discount_price : product.price;
  const isOutOfStock = product.stock_quantity === 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id);
  };

  return (
    <div className="product-card group" data-testid={`product-card-${product.id}`}>
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-product overflow-hidden rounded-2xl bg-gray-100">
          <img
            src={product.images?.[0] || 'https://placehold.co/400x400/f3f4f6/9ca3af?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {hasDiscount && (
            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
              Sale
            </span>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {product.category}
          </p>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="price-current text-lg">
                KES {displayPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="price-original">
                  KES {product.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {!isOutOfStock && (
        <div className="px-4 pb-4">
          <Button
            onClick={handleAddToCart}
            disabled={loading}
            className="w-full rounded-full bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid={`add-to-cart-${product.id}`}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </div>
      )}
    </div>
  );
};
