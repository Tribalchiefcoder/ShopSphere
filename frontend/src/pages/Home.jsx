import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Search,
  ShoppingBag,
  ShoppingCart,
  Menu,
  X,
  Home,
  LayoutGrid,
  Package,
  LogIn,
  ArrowRight,
  Headphones,
  Watch,
  Laptop,
  Smartphone,
  Camera,
  Sparkles,
  LoaderCircle,
  PackageSearch,
  LogOut,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import "../App.css";
import "./HomeResponsive.css";

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/products`;

function App() {
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showcase, setShowcase] = useState([]);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(API_URL, { params: { limit: 12 }, signal: controller.signal })
      .then(({ data }) =>
        setShowcase((data.products || []).filter((p) => p.images?.[0])),
      )
      .catch((err) => {
        if (!axios.isCancel(err)) console.error("Showcase unavailable", err);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event) => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 769px)");
    const closeDesktop = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    desktop.addEventListener("change", closeDesktop);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
      desktop.removeEventListener("change", closeDesktop);
    };
  }, [menuOpen]);

  // Customer authentication state
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("shopsphere-customer-user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Customer logout
  const handleCustomerLogout = () => {
    localStorage.removeItem("shopsphere-customer-token");
    localStorage.removeItem("shopsphere-customer-user");
    setCustomerUser(null);
    setMenuOpen(false);
  };

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const PRODUCTS_PER_PAGE = 6;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const categories = [
    { name: "Electronics", icon: Smartphone },
    { name: "Laptops", icon: Laptop },
    { name: "Audio", icon: Headphones },
    { name: "Watches", icon: Watch },
    { name: "Cameras", icon: Camera },
  ];

  const priceRangeInvalid =
    (minPrice !== "" && Number(minPrice) < 0) ||
    (maxPrice !== "" && Number(maxPrice) < 0) ||
    (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice));

  useEffect(() => {
    const fetchProducts = async () => {
      if (priceRangeInvalid) {
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
        setLoading(false);
        setError("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const params = {
          search,
          category,
          sort,
          page: currentPage,
          limit: PRODUCTS_PER_PAGE,
        };

        if (minPrice !== "") {
          params.minPrice = minPrice;
        }

        if (maxPrice !== "") {
          params.maxPrice = maxPrice;
        }

        const response = await axios.get(API_URL, {
          params,
        });

        setProducts(response.data.products);
        setTotalPages(response.data.totalPages);
        setTotalProducts(response.data.totalProducts);
        setCurrentPage(response.data.currentPage);
      } catch (err) {
        console.error("Product fetching error:", err);
        setError("Unable to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    const delaySearch = setTimeout(() => {
      fetchProducts();
    }, 400);

    return () => clearTimeout(delaySearch);
  }, [
    search,
    category,
    minPrice,
    maxPrice,
    sort,
    currentPage,
    refreshKey,
    priceRangeInvalid,
  ]);

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setSort("newest");
    setCurrentPage(1);
  };

  const retryFetching = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const firstProduct =
    totalProducts === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;

  const lastProduct = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);

  return (
    <div className="app ss-home">
      {/* NAVBAR */}
      <header className="navbar" ref={navRef}>
        <div className="nav-container">
          <a href="/" className="logo">
            <span className="logo-icon">
              <ShoppingBag size={22} />
            </span>
            ShopSphere
          </a>

          <nav className="nav-links">
            <a href="#home">Home</a>
            <a href="#categories">Categories</a>
            <a href="#products">Products</a>
          </nav>

          <div className="nav-actions">
            <button
              className="icon-button cart-nav-button"
              aria-label={`Shopping cart, ${cartCount} items`}
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart size={21} />

              {cartCount > 0 && (
                <span className="cart-count-badge">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* CUSTOMER AUTHENTICATION */}
            {customerUser ? (
              <>
                <span className="customer-nav-greeting">
                  Hi, {customerUser.name?.split(" ")[0] || "Customer"}
                </span>

                <button
                  className="login-button"
                  onClick={() => navigate("/my-orders")}
                >
                  My Orders
                </button>

                <button
                  className="customer-logout-button"
                  onClick={handleCustomerLogout}
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                className="login-button"
                onClick={() => navigate("/login")}
              >
                Sign in
              </button>
            )}

            <button
              type="button"
              ref={menuButtonRef}
              className="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="ss-mobile-navigation"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        <nav
          id="ss-mobile-navigation"
          className="ss-mobile-nav"
          hidden={!menuOpen}
          aria-label="Mobile navigation"
        >
          <a href="#home" onClick={() => setMenuOpen(false)}>
            <Home size={19} /> Home
          </a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>
            <LayoutGrid size={19} /> Categories
          </a>
          <a href="#products" onClick={() => setMenuOpen(false)}>
            <Package size={19} /> Products
          </a>
          {customerUser ? (
            <>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/my-orders");
                }}
              >
                <ShoppingBag size={19} /> My Orders
              </button>
              <button onClick={handleCustomerLogout}>
                <LogOut size={19} /> Log out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setMenuOpen(false);
                navigate("/login");
              }}
            >
              <LogIn size={19} /> Sign in
            </button>
          )}
        </nav>
      </header>

      <main>
        {showcase.length > 0 && (
          <section
            className="ss-showcase"
            aria-label="Featured product collection"
          >
            <p>THE SHOPSPHERE COLLECTION</p>
            <div className="ss-showcase-window">
              <div className="ss-showcase-track">
                {[0, 1].map((copy) => (
                  <div
                    className="ss-showcase-group"
                    key={copy}
                    aria-hidden={copy === 1 ? true : undefined}
                  >
                    {Array.from(
                      { length: Math.max(8, showcase.length) },
                      (_, i) => showcase[i % showcase.length],
                    ).map((item, i) => (
                      <div
                        className="ss-showcase-item"
                        key={`${item._id}-${i}`}
                      >
                        <img
                          src={item.images[0]}
                          alt={
                            copy === 0 && i < showcase.length ? item.name : ""
                          }
                        />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        {/* HERO SECTION */}
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={15} />
              <span>Discover something extraordinary</span>
            </div>

            <h1>
              Find what you love.
              <br />
              <span>Shop what inspires.</span>
            </h1>

            <p className="hero-description">
              Explore a world of carefully selected products. Discover quality,
              compare prices, and find exactly what you're looking for.
            </p>

            <form
              className="hero-search"
              onSubmit={(e) => {
                e.preventDefault();
                scrollToProducts();
              }}
            >
              <Search size={21} />

              <input
                type="text"
                placeholder="Search for products, brands..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <button type="submit">Search</button>
            </form>

            <div className="hero-note">
              <span className="note-dot"></span>
              Discover products across multiple categories
            </div>
          </div>

          <div className="hero-decoration">
            <button
              type="button"
              className="floating-card explore-more-button"
              onClick={() =>
                document
                  .getElementById("categories")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              <div className="floating-icon">
                <ShoppingBag size={27} />
              </div>

              <div>
                <strong>Explore more</strong>
                <span>Your next favorite is here.</span>
              </div>

              <ArrowRight size={20} />
            </button>
          </div>
        </section>

        {/* CATEGORIES SECTION */}
        <section className="categories-section" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">BROWSE COLLECTIONS</span>
              <h2>Explore categories</h2>
              <p>Find the products that match your interests.</p>
            </div>

            <button className="view-all" onClick={clearFilters}>
              View all <ArrowRight size={17} />
            </button>
          </div>

          <div className="categories-grid">
            {categories.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className={`category-card ${
                    category === item.name ? "active-category" : ""
                  }`}
                  key={item.name}
                  onClick={() => {
                    setCategory(category === item.name ? "" : item.name);
                    setCurrentPage(1);
                    scrollToProducts();
                  }}
                >
                  <span className="category-icon">
                    <Icon size={27} />
                  </span>

                  <span>{item.name}</span>

                  <ArrowRight className="category-arrow" size={17} />
                </button>
              );
            })}
          </div>
        </section>

        {/* PRODUCTS SECTION */}
        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">OUR COLLECTION</span>
              <h2>Discover our products</h2>
              <p>Explore our growing collection of quality products.</p>
            </div>
          </div>

          {/* SORTING */}
          <div className="sorting-container">
            <label htmlFor="sortProducts">Sort products:</label>

            <select
              id="sortProducts"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>

          {/* PRICE FILTERS */}
          <div className="price-filter">
            <div className="price-filter-heading">
              <h3>Filter by price</h3>
              <span>Choose your budget</span>
            </div>

            <div className="price-inputs">
              <div className="price-input-group">
                <label htmlFor="minPrice">Minimum price (₹)</label>

                <input
                  id="minPrice"
                  type="number"
                  min="0"
                  placeholder="Min price"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="price-input-group">
                <label htmlFor="maxPrice">Maximum price (₹)</label>

                <input
                  id="maxPrice"
                  type="number"
                  min="0"
                  placeholder="Max price"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            {priceRangeInvalid && (
              <p className="price-error">
                {Number(minPrice) < 0 || Number(maxPrice) < 0
                  ? "Price cannot be negative."
                  : "Minimum price cannot exceed maximum price."}
              </p>
            )}
          </div>

          {/* ACTIVE FILTERS */}
          {(search || category || minPrice !== "" || maxPrice !== "") && (
            <div className="active-filters">
              {search && <span>Search: "{search}"</span>}

              {category && <span>Category: {category}</span>}

              {minPrice !== "" && (
                <span>Min: ₹{Number(minPrice).toLocaleString("en-IN")}</span>
              )}

              {maxPrice !== "" && (
                <span>Max: ₹{Number(maxPrice).toLocaleString("en-IN")}</span>
              )}

              <button onClick={clearFilters}>Clear filters ×</button>
            </div>
          )}

          {/* PRODUCT COUNT */}
          {!loading && !error && !priceRangeInvalid && totalProducts > 0 && (
            <div className="product-count">
              Showing {firstProduct}–{lastProduct} of {totalProducts} products
            </div>
          )}

          {/* PRODUCT RESULTS */}
          {loading ? (
            <div className="products-placeholder">
              <LoaderCircle className="loading-icon" size={35} />
              <h3>Loading products...</h3>
              <p>Please wait while we fetch our collection.</p>
            </div>
          ) : error ? (
            <div className="products-placeholder">
              <PackageSearch size={35} />
              <h3>Something went wrong</h3>
              <p>{error}</p>

              <button className="retry-button" onClick={retryFetching}>
                Try again
              </button>
            </div>
          ) : priceRangeInvalid ? (
            <div className="products-placeholder">
              <PackageSearch size={35} />
              <h3>Check your price range</h3>
              <p>Enter a valid minimum and maximum price.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="products-placeholder">
              <PackageSearch size={35} />
              <h3>No products found</h3>
              <p>Try different keywords, categories, or price ranges.</p>

              <button className="retry-button" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* PRODUCT GRID */}
              <div className="products-grid">
                {products.map((product) => (
                  <article
                    className="product-card"
                    key={product._id}
                    onClick={() => navigate(`/product/${product._id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="product-image">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} />
                      ) : (
                        <div className="product-image-placeholder">
                          <ShoppingBag size={40} />
                        </div>
                      )}
                    </div>

                    <div className="product-info">
                      <span className="product-category">
                        {product.category}
                      </span>

                      <h3>{product.name}</h3>

                      <p className="product-brand">{product.brand}</p>

                      <div className="product-bottom">
                        <strong>
                          ₹{product.price.toLocaleString("en-IN")}
                        </strong>

                        <span className="product-rating home-review-rating">
                          {product.totalReviews > 0 ? (
                            <>
                              ★{" "}
                              {Number(
                                product.averageRating ?? product.rating,
                              ).toFixed(1)}
                              <span className="home-review-count">
                                ({product.totalReviews}{" "}
                                {product.totalReviews === 1
                                  ? "review"
                                  : "reviews"}
                                )
                              </span>
                            </>
                          ) : (
                            <span className="home-review-count">
                              ☆ No reviews yet
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-arrow"
                    disabled={currentPage === 1 || loading}
                    onClick={() => {
                      setCurrentPage((previous) => previous - 1);
                    }}
                  >
                    Previous
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      key={page}
                      className={`pagination-number ${
                        currentPage === page ? "active-page" : ""
                      }`}
                      disabled={loading}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="pagination-arrow"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => {
                      setCurrentPage((previous) => previous + 1);
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-content">
          <a href="/" className="logo footer-logo">
            <span className="logo-icon">
              <ShoppingBag size={20} />
            </span>
            ShopSphere
          </a>

          <p>Discover more. Shop smarter.</p>

          <span>© 2026 ShopSphere. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
