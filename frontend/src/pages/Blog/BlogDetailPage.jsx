import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Eye, User, Tag } from 'lucide-react';
import { blogAPI } from '../../lib/api';
import { Helmet } from 'react-helmet-async';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await blogAPI.getOne(slug);
        setPost(response.data);
      } catch (error) {
        console.error('Error fetching post:', error);
        navigate('/blog');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-64 bg-gray-200 rounded-xl mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <>
      <Helmet>
        <title>{post.title} | Wacka Accessories Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.featured_image} />
        <meta property="og:type" content="article" />
        <meta name="author" content={post.author_name} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": post.featured_image,
            "author": {
              "@type": "Person",
              "name": post.author_name
            },
            "datePublished": post.created_at,
            "dateModified": post.updated_at
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8" data-testid="blog-detail-page">
        <article className="max-w-3xl mx-auto px-4">
          {/* Back Button */}
          <Link
            to="/blog"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {post.author_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.created_at).toLocaleDateString('en-KE', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.views} views
              </span>
            </div>

            {/* Featured Image */}
            {post.featured_image && (
              <div className="aspect-video rounded-xl overflow-hidden mb-8">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </header>

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none prose-headings:font-semibold prose-a:text-emerald-600 prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-between">
              <Link
                to="/blog"
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                ← More Articles
              </Link>
              <Link
                to="/products"
                className="bg-emerald-500 text-white px-6 py-2 rounded-full hover:bg-emerald-600 transition-colors"
              >
                Shop Now
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </>
  );
}
