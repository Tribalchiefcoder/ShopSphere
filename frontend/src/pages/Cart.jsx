import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
} from "lucide-react";

import { useCart } from "../context/CartContext";

function Cart() {
  const navigate = useNavigate();

  const { cartItems, removeFromCart, updateQuantity, cartCount, cartTotal } =
    useCart();

  const formatPrice = (price) => {
    return `₹${price.toLocaleString("en-IN")}`;
  };

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <main className="cart-page">
        <div className="empty-cart">
          <div className="empty-cart-icon">
            <ShoppingCart size={65} />
          </div>

          <h1>Your cart is empty</h1>

          <p>
            Looks like you haven't added anything to your shopping cart yet.
          </p>

          <button
            className="continue-shopping-button"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={18} />
            Start Shopping
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      {/* CART HEADER */}
      <div className="cart-header">
        <div>
          <span className="cart-eyebrow">YOUR SHOPPING BAG</span>

          <h1>Shopping Cart</h1>

          <p>{cartCount} items in your cart</p>
        </div>

        <button className="cart-continue-button" onClick={() => navigate("/")}>
          <ArrowLeft size={17} />
          Continue Shopping
        </button>
      </div>

      <div className="cart-layout">
        {/* CART PRODUCTS */}
        <section className="cart-items-section">
          {cartItems.map((item) => (
            <article className="cart-item" key={item._id}>
              <div className="cart-item-image">
                {item.images?.[0] ? (
                  <img src={item.images[0]} alt={item.name} />
                ) : (
                  <ShoppingBag size={42} />
                )}
              </div>

              <div className="cart-item-info">
                <span className="cart-item-category">{item.category}</span>

                <h3>{item.name}</h3>

                <p className="cart-item-brand">Brand: {item.brand}</p>

                <p className="cart-item-price">{formatPrice(item.price)}</p>

                <div className="cart-item-actions">
                  {/* QUANTITY CONTROLS */}
                  <div className="cart-quantity">
                    <button
                      onClick={() =>
                        updateQuantity(item._id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      <Minus size={15} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() =>
                        updateQuantity(item._id, item.quantity + 1)
                      }
                      disabled={item.quantity >= item.stock}
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {/* REMOVE PRODUCT */}
                  <button
                    className="remove-cart-item"
                    onClick={() => removeFromCart(item._id)}
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              </div>

              <div className="cart-item-subtotal">
                {formatPrice(item.price * item.quantity)}
              </div>
            </article>
          ))}
        </section>

        {/* ORDER SUMMARY */}
        <aside className="cart-summary">
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Items ({cartCount})</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>

          <div className="summary-row">
            <span>Delivery</span>
            <span className="free-delivery">FREE</span>
          </div>

          <div className="summary-divider"></div>

          <div className="summary-total">
            <span>Total Amount</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>

          {/* CHECKOUT BUTTON */}
          <button
            className="checkout-button"
            onClick={() => navigate("/checkout")}
          >
            Proceed to Checkout
          </button>

          <p className="cart-security-note">
            Secure shopping experience with ShopSphere.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default Cart;
