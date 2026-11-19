import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  ShoppingCart,
  LoaderCircle,
  PackageSearch,
  Star,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Truck,
  ShieldCheck,
  Wallet,
  Package,
  ZoomIn,
  X,
  Home,
} from "lucide-react";

import ProductReviews from "../components/ProductReviews";

import { useCart } from "../context/CartContext";
import "../App.css";

const API_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
}/products`;

const REVIEWS_API_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
}/reviews`;

function RatingStars({ rating = 0 }) {
  return (
    <div className="pd-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={17}
          fill={index < Math.round(rating) ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  const [ratingSummary, setRatingSummary] = useState(null);
  const [ratingError, setRatingError] = useState(false);

  // Load genuine review statistics independently of the Reviews tab.
  useEffect(() => {
    const controller = new AbortController();
    setRatingSummary(null);
    setRatingError(false);

    axios
      .get(`${REVIEWS_API_URL}/product/${id}`, {
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setRatingSummary((previous) =>
            previous?.productId === id
              ? previous
              : {
                  productId: id,
                  averageRating: data.averageRating,
                  totalReviews: data.totalReviews,
                },
          );
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && !axios.isCancel(err)) {
          setRatingError(true);
        }
      });

    return () => controller.abort();
  }, [id]);

  // Fetch product details
  useEffect(() => {
    const controller = new AbortController();

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");
        setProduct(null);
        setRelatedProducts([]);
        setQuantity(1);
        setSelectedImage(0);
        setAddedToCart(false);
        setZoomOpen(false);
        setActiveTab("description");

        window.scrollTo(0, 0);

        const response = await axios.get(`${API_URL}/${id}`, {
          signal: controller.signal,
        });

        const currentProduct = response.data.product;

        setProduct(currentProduct);

        // Fetch related products from the same category
        try {
          const relatedResponse = await axios.get(API_URL, {
            params: {
              category: currentProduct.category,
              limit: 5,
            },
            signal: controller.signal,
          });

          let items = relatedResponse.data.products.filter(
            (item) => item._id !== currentProduct._id,
          );

          // Show other products if the category is empty
          if (items.length === 0) {
            const fallbackResponse = await axios.get(API_URL, {
              params: { limit: 5 },
              signal: controller.signal,
            });

            items = fallbackResponse.data.products.filter(
              (item) => item._id !== currentProduct._id,
            );
          }

          setRelatedProducts(items.slice(0, 4));
        } catch (relatedError) {
          if (!axios.isCancel(relatedError)) {
            console.error("Related products error:", relatedError);
          }
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Product details error:", err);

          setError(
            err.response?.data?.message || "Unable to load product details.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => controller.abort();
  }, [id]);

  // Close image zoom with Escape
  useEffect(() => {
    if (!zoomOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setZoomOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [zoomOpen]);

  const increaseQuantity = () => {
    if (!product) return;

    setQuantity((previous) => Math.min(previous + 1, product.stock));

    setAddedToCart(false);
  };

  const decreaseQuantity = () => {
    setQuantity((previous) => Math.max(previous - 1, 1));

    setAddedToCart(false);
  };

  const handleAddToCart = () => {
    if (!product || product.stock <= 0 || quantity > product.stock) {
      return;
    }

    addToCart(product, quantity);
    setAddedToCart(true);
  };

  const scrollToReviews = () => {
    setActiveTab("reviews");

    requestAnimationFrame(() => {
      document.getElementById("product-information")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="pd-state">
        <LoaderCircle className="pd-spin" size={38} />
        <h3>Loading product details...</h3>
        <p>Please wait a moment.</p>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="pd-state">
        <PackageSearch size={48} />

        <h3>Product not found</h3>

        <p>{error || "This product may no longer be available."}</p>

        <button className="pd-primary-button" onClick={() => navigate("/")}>
          <ArrowLeft size={18} />
          Back to products
        </button>
      </div>
    );
  }

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [];

  const currentImage = images[selectedImage];

  return (
    <div className="pd-page">
      {/* Navigation */}
      <header className="pd-navbar">
        <div className="pd-navbar-inner">
          <button className="pd-logo" onClick={() => navigate("/")}>
            <span className="pd-logo-icon">
              <ShoppingBag size={24} />
            </span>
            ShopSphere
          </button>

          <nav className="pd-nav-actions">
            <button onClick={() => navigate("/")}>
              <Home size={19} />
              <span>Home</span>
            </button>

            <button onClick={() => navigate("/cart")}>
              <ShoppingCart size={21} />
              <span>Cart</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="pd-main">
        {/* Breadcrumb */}
        <div className="pd-breadcrumb">
          <button onClick={() => navigate("/")}>Home</button>

          <ChevronRight size={14} />

          <button onClick={() => navigate("/")}>Products</button>

          <ChevronRight size={14} />

          <span>{product.category}</span>

          <ChevronRight size={14} />

          <strong>{product.name}</strong>
        </div>

        <button className="pd-back-link" onClick={() => navigate("/")}>
          <ArrowLeft size={17} />
          Back to products
        </button>

        {/* Product showcase */}
        <section className="pd-showcase">
          {/* Product images */}
          <div className="pd-gallery">
            <div className="pd-main-image">
              {currentImage ? (
                <>
                  <img
                    key={currentImage}
                    src={currentImage}
                    alt={product.name}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />

                  <button
                    className="pd-zoom-button"
                    onClick={() => setZoomOpen(true)}
                    aria-label="Enlarge product image"
                  >
                    <ZoomIn size={21} />
                  </button>
                </>
              ) : (
                <div className="pd-image-placeholder">
                  <ShoppingBag size={80} />
                  <span>No image available</span>
                </div>
              )}
            </div>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div className="pd-thumbnails">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    className={`pd-thumbnail ${
                      selectedImage === index ? "active" : ""
                    }`}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                    aria-pressed={selectedImage === index}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}

            <p className="pd-gallery-caption">
              {images.length > 0
                ? `Image ${selectedImage + 1} of ${images.length}`
                : "Product photography unavailable"}
            </p>
          </div>

          {/* Product information */}
          <div className="pd-info">
            <div className="pd-brand-category">
              <span>{product.brand}</span>
              <span className="pd-category-pill">{product.category}</span>
            </div>

            <h1>{product.name}</h1>

            <div className="pd-rating-row">
              {ratingSummary?.productId === id ? (
                <>
                  <RatingStars rating={ratingSummary.averageRating} />
                  {ratingSummary.totalReviews > 0 && (
                    <strong>
                      {Number(ratingSummary.averageRating).toFixed(1)}
                    </strong>
                  )}
                  <span className="pd-rating-divider">|</span>
                  <button onClick={scrollToReviews}>
                    {ratingSummary.totalReviews === 0
                      ? "No reviews yet"
                      : `${ratingSummary.totalReviews} ${ratingSummary.totalReviews === 1 ? "review" : "reviews"}`}
                  </button>
                </>
              ) : (
                <button onClick={scrollToReviews}>
                  {ratingError
                    ? "Ratings unavailable · View reviews"
                    : "Loading ratings..."}
                </button>
              )}
            </div>

            <div className="pd-price-section">
              <h2>₹{Number(product.price).toLocaleString("en-IN")}</h2>

              <p>Cash on delivery available</p>
            </div>

            {/* Stock status */}
            <div
              className={`pd-stock ${
                product.stock === 0
                  ? "unavailable"
                  : product.stock <= 5
                    ? "low-stock"
                    : "available"
              }`}
            >
              <span className="pd-stock-dot" />

              {product.stock === 0
                ? "Out of stock"
                : product.stock <= 5
                  ? `Only ${product.stock} left in stock`
                  : `In stock · ${product.stock} available`}
            </div>

            <div className="pd-description-summary">
              <p>{product.description}</p>
            </div>

            <div className="pd-purchase-section">
              {product.stock > 0 && (
                <div className="pd-quantity-row">
                  <span>Quantity</span>

                  <div className="pd-quantity-control">
                    <button
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={17} />
                    </button>

                    <span>{quantity}</span>

                    <button
                      onClick={increaseQuantity}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
              )}

              {product.stock > 0 && (
                <div className="pd-subtotal">
                  <span>Subtotal</span>

                  <strong>
                    ₹
                    {(Number(product.price) * quantity).toLocaleString("en-IN")}
                  </strong>
                </div>
              )}

              <div className="pd-purchase-buttons">
                <button
                  className="pd-primary-button"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0 || addedToCart}
                >
                  {addedToCart ? (
                    <Check size={21} />
                  ) : (
                    <ShoppingCart size={21} />
                  )}

                  {product.stock <= 0
                    ? "Out of Stock"
                    : addedToCart
                      ? "Added to Cart"
                      : "Add to Cart"}
                </button>

                <button
                  className="pd-secondary-button"
                  onClick={() => navigate("/cart")}
                >
                  View Cart
                  <ArrowRight size={18} />
                </button>
              </div>

              {addedToCart && (
                <div className="pd-cart-success" role="status">
                  <Check size={17} />
                  Item added to your shopping cart.
                </div>
              )}
            </div>

            {/* Shopping information */}
            <div className="pd-benefits">
              <div>
                <Truck size={23} />
                <span>Order Delivery</span>
              </div>

              <div>
                <ShieldCheck size={23} />
                <span>Secure Checkout</span>
              </div>

              <div>
                <Wallet size={23} />
                <span>Cash on Delivery</span>
              </div>
            </div>
          </div>
        </section>

        {/* Product information tabs */}
        <section className="pd-information-card" id="product-information">
          <div className="pd-tabs">
            <button
              className={activeTab === "description" ? "active" : ""}
              onClick={() => setActiveTab("description")}
            >
              Description
            </button>

            <button
              className={activeTab === "specifications" ? "active" : ""}
              onClick={() => setActiveTab("specifications")}
            >
              Specifications
            </button>

            <button
              className={activeTab === "reviews" ? "active" : ""}
              onClick={() => setActiveTab("reviews")}
            >
              Customer Reviews
            </button>
          </div>

          <div className="pd-tab-content">
            {activeTab === "description" && (
              <div className="pd-description-content">
                <span className="pd-section-eyebrow">PRODUCT OVERVIEW</span>

                <h2>About this product</h2>

                <p>{product.description}</p>
              </div>
            )}

            {activeTab === "specifications" && (
              <div>
                <span className="pd-section-eyebrow">PRODUCT INFORMATION</span>

                <h2>Specifications</h2>

                <div className="pd-specifications">
                  <div>
                    <span>Product Name</span>
                    <strong>{product.name}</strong>
                  </div>

                  <div>
                    <span>Brand</span>
                    <strong>{product.brand}</strong>
                  </div>

                  <div>
                    <span>Category</span>
                    <strong>{product.category}</strong>
                  </div>

                  <div>
                    <span>Availability</span>
                    <strong>
                      {product.stock > 0 ? "In stock" : "Out of stock"}
                    </strong>
                  </div>

                  <div>
                    <span>Payment Method</span>
                    <strong>Cash on Delivery</strong>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <ProductReviews
                key={product._id}
                productId={product._id}
                onRatingChange={(summary) => {
                  setRatingSummary({ ...summary, productId: id });
                  setRatingError(false);
                }}
              />
            )}
          </div>
        </section>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="pd-related-section">
            <div className="pd-related-heading">
              <div>
                <span className="pd-section-eyebrow">DISCOVER MORE</span>

                <h2>You May Also Like</h2>

                <p>Explore more products from ShopSphere.</p>
              </div>

              <button onClick={() => navigate("/")}>
                View all products
                <ArrowRight size={18} />
              </button>
            </div>

            <div className="pd-related-grid">
              {relatedProducts.map((item) => (
                <button
                  key={item._id}
                  className="pd-related-card"
                  onClick={() => navigate(`/product/${item._id}`)}
                >
                  <div className="pd-related-image">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        loading="lazy"
                      />
                    ) : (
                      <Package size={45} />
                    )}
                  </div>

                  <div className="pd-related-info">
                    <span className="pd-section-eyebrow">{item.brand}</span>

                    <h3>{item.name}</h3>

                    <div className="pd-related-rating">
                      {Number(item.totalReviews) > 0 ? (
                        <>
                          <Star size={15} fill="currentColor" />
                          {Number(
                            item.averageRating ?? item.rating ?? 0,
                          ).toFixed(1)}
                          <span className="pd-related-review-count">
                            ({item.totalReviews}{" "}
                            {Number(item.totalReviews) === 1
                              ? "review"
                              : "reviews"}
                            )
                          </span>
                        </>
                      ) : (
                        <span className="pd-related-no-reviews">
                          <Star size={15} />
                          No reviews yet
                        </span>
                      )}
                    </div>

                    <div className="pd-related-price">
                      <strong>
                        ₹{Number(item.price).toLocaleString("en-IN")}
                      </strong>

                      <span>
                        <ArrowRight size={17} />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="pd-footer">
        <ShoppingBag size={20} />
        <strong>ShopSphere</strong>
        <span>Discover. Shop. Enjoy.</span>
      </footer>

      {/* Image zoom modal */}
      {zoomOpen && currentImage && (
        <div
          className="pd-zoom-overlay"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
        >
          <button
            className="pd-zoom-close"
            onClick={() => setZoomOpen(false)}
            aria-label="Close image preview"
          >
            <X size={26} />
          </button>

          <img
            src={currentImage}
            alt={product.name}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default ProductDetails;
