import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Star,
  BadgeCheck,
  MessageSquare,
  Pencil,
  Trash2,
  LoaderCircle,
  X,
  AlertCircle,
} from "lucide-react";

const API_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
}/reviews`;

const EMPTY_FORM = {
  rating: 0,
  title: "",
  comment: "",
};

function ReviewStars({ rating = 0, interactive = false, onChange, size = 18 }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="pr-stars" onMouseLeave={() => setHoverRating(0)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hoverRating || Math.round(rating));

        return interactive ? (
          <button
            key={star}
            type="button"
            className={`pr-star-button ${active ? "active" : ""}`}
            onMouseEnter={() => setHoverRating(star)}
            onClick={() => onChange(star)}
            aria-label={`Rate ${star} out of 5`}
            aria-pressed={rating === star}
          >
            <Star size={size} fill={active ? "currentColor" : "none"} />
          </button>
        ) : (
          <Star
            key={star}
            size={size}
            className={active ? "active" : ""}
            fill={active ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}

function ProductReviews({ productId, onRatingChange }) {
  const navigate = useNavigate();

  const token = localStorage.getItem("shopsphere-customer-token");

  const [reviewData, setReviewData] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: {},
    reviews: [],
  });

  const [eligibility, setEligibility] = useState(null);
  const [eligibilityError, setEligibilityError] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const [sort, setSort] = useState("newest");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // Fetch public reviews
  const fetchReviews = async (signal) => {
    const response = await axios.get(`${API_URL}/product/${productId}`, {
      signal,
    });

    const data = response.data;

    setReviewData(data);

    onRatingChange?.({
      averageRating: data.averageRating,
      totalReviews: data.totalReviews,
    });
  };

  // Check customer review eligibility
  const fetchEligibility = async (signal) => {
    setEligibilityError("");

    if (!token) {
      setEligibility(null);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/eligibility/${productId}`, {
        ...authConfig,
        signal,
      });

      setEligibility(response.data);
    } catch (err) {
      if (axios.isCancel(err)) return;

      setEligibility(null);

      setEligibilityError(
        err.response?.status === 401
          ? "Your session has expired. Please log in again."
          : "Unable to verify review eligibility.",
      );
    }
  };

  // Initial loading
  useEffect(() => {
    if (!productId) return;

    const controller = new AbortController();

    const loadReviews = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      setFormError("");
      setShowForm(false);
      setEditingId(null);
      setEligibility(null);
      setForm({ ...EMPTY_FORM });

      try {
        await Promise.all([
          fetchReviews(controller.signal),
          fetchEligibility(controller.signal),
        ]);
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError(
            err.response?.data?.message || "Unable to load customer reviews.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadReviews();

    return () => controller.abort();
  }, [productId, token]);

  // Open review creation form
  const handleWriteReview = () => {
    if (!token) {
      navigate("/login");
      return;
    }

    if (!eligibility?.canReview) return;

    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setSuccess("");
    setShowForm(true);
  };

  // Open review editing form
  const handleEditReview = (review) => {
    setEditingId(review._id);

    setForm({
      rating: review.rating,
      title: review.title,
      comment: review.comment,
    });

    setFormError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
  };

  // Create or update a review
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (form.rating < 1 || form.rating > 5) {
      setFormError("Please select a star rating.");
      return;
    }

    if (form.title.trim().length < 3) {
      setFormError("Review title must contain at least 3 characters.");
      return;
    }

    if (form.comment.trim().length < 10) {
      setFormError("Review must contain at least 10 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        rating: form.rating,
        title: form.title.trim(),
        comment: form.comment.trim(),
      };

      const response = editingId
        ? await axios.put(`${API_URL}/${editingId}`, payload, authConfig)
        : await axios.post(
            `${API_URL}/product/${productId}`,
            payload,
            authConfig,
          );

      setSuccess(response.data.message);
      closeForm();

      try {
        await Promise.all([fetchReviews(), fetchEligibility()]);
      } catch {
        setError("Review saved, but the review list could not refresh.");
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Unable to save your review.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete a review
  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your review?",
    );

    if (!confirmed) return;

    setDeletingId(reviewId);
    setError("");
    setSuccess("");

    try {
      const response = await axios.delete(`${API_URL}/${reviewId}`, authConfig);

      setSuccess(response.data.message);

      if (editingId === reviewId) {
        closeForm();
      }

      try {
        await Promise.all([fetchReviews(), fetchEligibility()]);
      } catch {
        setError("Review deleted, but the review list could not refresh.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete your review.");
    } finally {
      setDeletingId(null);
    }
  };

  // Sort reviews
  const sortedReviews = [...(reviewData.reviews || [])];

  sortedReviews.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.createdAt) - new Date(b.createdAt);

      case "highest":
        return b.rating - a.rating;

      case "lowest":
        return a.rating - b.rating;

      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const ownReviewId = eligibility?.existingReview?._id;

  if (loading) {
    return (
      <div className="pr-loading">
        <LoaderCircle size={28} className="pr-spinner" />
        <p>Loading customer reviews...</p>
      </div>
    );
  }

  return (
    <section className="pr-section">
      <div className="pr-heading">
        <div>
          <span className="pr-eyebrow">CUSTOMER FEEDBACK</span>

          <h2>Ratings &amp; Reviews</h2>

          <p>Discover what customers think about this product.</p>
        </div>
      </div>

      {error && (
        <div className="pr-message pr-error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="pr-message pr-success" role="status">
          <BadgeCheck size={18} />
          {success}
        </div>
      )}

      {/* Rating summary */}
      <div className="pr-summary">
        <div className="pr-average">
          <span className="pr-average-number">
            {Number(reviewData.averageRating || 0).toFixed(1)}
            <small>/5</small>
          </span>

          <ReviewStars rating={reviewData.averageRating} size={23} />

          <p>
            Based on {reviewData.totalReviews}{" "}
            {reviewData.totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        {/* Rating distribution */}
        <div className="pr-distribution">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = reviewData.ratingDistribution?.[rating] || 0;

            const percentage = reviewData.totalReviews
              ? (count / reviewData.totalReviews) * 100
              : 0;

            return (
              <div className="pr-distribution-row" key={rating}>
                <span className="pr-distribution-label">
                  {rating}
                  <Star size={14} fill="currentColor" />
                </span>

                <div
                  className="pr-progress-track"
                  role="progressbar"
                  aria-label={`${rating} star review percentage`}
                  aria-valuenow={Math.round(percentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="pr-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <span className="pr-distribution-count">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Review eligibility */}
        <div className="pr-write-panel">
          <h3>Share your experience</h3>

          {!token ? (
            <>
              <p>Log in to your account to write a review.</p>

              <button className="pr-primary-button" onClick={handleWriteReview}>
                <Star size={17} />
                Login to Review
              </button>
            </>
          ) : eligibilityError ? (
            <p>{eligibilityError}</p>
          ) : eligibility?.hasReviewed ? (
            <>
              <p>You have already reviewed this product.</p>

              <button
                className="pr-secondary-button"
                onClick={() => handleEditReview(eligibility.existingReview)}
              >
                <Pencil size={16} />
                Edit Your Review
              </button>
            </>
          ) : eligibility?.canReview ? (
            <>
              <p>Tell other shoppers about your purchase.</p>

              <button className="pr-primary-button" onClick={handleWriteReview}>
                <Star size={17} />
                Write a Review
              </button>
            </>
          ) : (
            <>
              <p>
                You can review this product after your order has been delivered.
              </p>

              <button className="pr-secondary-button" disabled>
                <Star size={17} />
                Write a Review
              </button>
            </>
          )}
        </div>
      </div>

      {/* Review form */}
      {showForm && (
        <form className="pr-form" onSubmit={handleSubmit}>
          <div className="pr-form-heading">
            <h3>{editingId ? "Edit Your Review" : "Write a Review"}</h3>

            <button
              type="button"
              className="pr-close-button"
              onClick={closeForm}
              disabled={submitting}
              aria-label="Close review form"
            >
              <X size={21} />
            </button>
          </div>

          {formError && (
            <div className="pr-message pr-error" role="alert">
              <AlertCircle size={18} />
              {formError}
            </div>
          )}

          <div className="pr-form-group">
            <label>Your Rating</label>

            <ReviewStars
              rating={form.rating}
              interactive
              size={32}
              onChange={(rating) =>
                setForm((previous) => ({
                  ...previous,
                  rating,
                }))
              }
            />

            <span className="pr-rating-hint">
              {
                [
                  "Select a rating",
                  "Poor",
                  "Fair",
                  "Average",
                  "Good",
                  "Excellent",
                ][form.rating]
              }
            </span>
          </div>

          <div className="pr-form-group">
            <label htmlFor="pr-review-title">Review Title</label>

            <input
              id="pr-review-title"
              type="text"
              placeholder="Summarize your experience"
              value={form.title}
              maxLength={100}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
            />

            <small>{form.title.length}/100 characters</small>
          </div>

          <div className="pr-form-group">
            <label htmlFor="pr-review-comment">Your Review</label>

            <textarea
              id="pr-review-comment"
              placeholder="Tell us about the quality, performance and your experience..."
              rows={5}
              value={form.comment}
              maxLength={1000}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  comment: event.target.value,
                }))
              }
            />

            <small>{form.comment.length}/1000 characters</small>
          </div>

          <div className="pr-form-actions">
            <button
              type="button"
              className="pr-secondary-button"
              onClick={closeForm}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="pr-primary-button"
              disabled={submitting}
            >
              {submitting && <LoaderCircle size={17} className="pr-spinner" />}

              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Review"
                  : "Submit Review"}
            </button>
          </div>
        </form>
      )}

      {/* Reviews toolbar */}
      <div className="pr-toolbar">
        <h3>Customer Reviews ({reviewData.totalReviews})</h3>

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort customer reviews"
        >
          <option value="newest">Most Recent</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </div>

      {/* Customer reviews */}
      {sortedReviews.length === 0 ? (
        <div className="pr-empty">
          <div className="pr-empty-icon">
            <MessageSquare size={30} />
          </div>

          <h3>No reviews yet</h3>

          <p>Be the first customer to share your experience.</p>
        </div>
      ) : (
        <div className="pr-review-list">
          {sortedReviews.map((review) => {
            const customerName = review.user?.name || "ShopSphere Customer";

            const isOwnReview = ownReviewId === review._id;

            return (
              <article className="pr-review-card" key={review._id}>
                <div className="pr-review-header">
                  <div className="pr-review-author">
                    <div className="pr-avatar">
                      {customerName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4>{customerName}</h4>

                      {review.verifiedPurchase && (
                        <span className="pr-verified">
                          <BadgeCheck size={15} />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="pr-review-date">
                    {formatDate(review.createdAt)}
                  </span>
                </div>

                <ReviewStars rating={review.rating} size={17} />

                <h3 className="pr-review-title">{review.title}</h3>

                <p className="pr-review-comment">{review.comment}</p>

                {isOwnReview && (
                  <div className="pr-review-actions">
                    <button
                      className="pr-edit-button"
                      onClick={() => handleEditReview(review)}
                      disabled={deletingId === review._id}
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      className="pr-delete-button"
                      onClick={() => handleDeleteReview(review._id)}
                      disabled={deletingId === review._id}
                    >
                      {deletingId === review._id ? (
                        <LoaderCircle size={15} className="pr-spinner" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                      Delete
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ProductReviews;
