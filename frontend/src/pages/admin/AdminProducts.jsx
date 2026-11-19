import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  LoaderCircle,
  X,
  UploadCloud,
  ImagePlus,
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";
import "../../App.css";

const API_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
}/products`;

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const initialForm = {
  name: "",
  description: "",
  brand: "",
  category: "",
  price: "",
  stock: "",
};

function ImagePreview({ image, index, onRemove, disabled }) {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!image.file) {
      setPreview(image.url);
      return;
    }

    const objectUrl = URL.createObjectURL(image.file);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image.file, image.url]);

  return (
    <div className="product-image-preview">
      {preview && <img src={preview} alt={`Product preview ${index + 1}`} />}

      <button
        type="button"
        className="product-image-remove"
        aria-label={`Remove image ${index + 1}`}
        onClick={onRemove}
        disabled={disabled}
      >
        <X size={15} />
      </button>

      <span className="product-image-label">
        {index === 0 ? "Cover image" : `Image ${index + 1}`}
      </span>
    </div>
  );
}

function AdminProducts() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState(initialForm);

  // Image upload states
  const [productImages, setProductImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}?limit=100`);

      setProducts(response.data.products);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Unable to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Search products
  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.brand} ${product.category}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  // Handle form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // Reset image states
  const resetImages = () => {
    setProductImages([]);
    setImageError("");
    setUploading(false);
    setUploadProgress(0);
    setDragging(false);
  };

  // Open Add Product modal
  const openAddModal = () => {
    setFormData(initialForm);
    resetImages();
    setEditingProductId(null);
    setFormError("");
    setSuccessMessage("");
    setModalMode("add");
  };

  // Open Edit Product modal
  const openEditModal = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      brand: product.brand,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
    });

    resetImages();

    // Preserve existing product images
    setProductImages(
      (product.images || []).map((url, index) => ({
        id: `existing-${index}`,
        url,
        file: null,
      })),
    );

    setEditingProductId(product._id);
    setFormError("");
    setSuccessMessage("");
    setModalMode("edit");
  };

  // Close modal
  const closeModal = () => {
    if (saving) return;

    setModalMode(null);
    setEditingProductId(null);
    setFormData(initialForm);
    setFormError("");
    resetImages();
  };

  // Validate and select product images
  const addImageFiles = (selectedFiles) => {
    if (saving) return;

    setImageError("");

    const files = Array.from(selectedFiles || []);

    if (files.length === 0) return;

    if (productImages.length + files.length > MAX_IMAGES) {
      setImageError("You can add a maximum of 5 images per product.");
      return;
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError(
          `${file.name}: Only JPG, JPEG, PNG and WebP images are allowed.`,
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setImageError(`${file.name}: Image size must be 5 MB or smaller.`);
        return;
      }

      if (file.size === 0) {
        setImageError(`${file.name}: This image is empty.`);
        return;
      }
    }

    const newImages = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: "",
    }));

    setProductImages((previousImages) => [...previousImages, ...newImages]);
  };

  // Handle file selection
  const handleFileSelection = (e) => {
    addImageFiles(e.target.files);
    e.target.value = "";
  };

  // Handle drag and drop
  const handleImageDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    if (saving) return;

    addImageFiles(e.dataTransfer.files);
  };

  // Remove selected or existing image
  const removeImage = (imageId) => {
    if (saving) return;

    setProductImages((previousImages) =>
      previousImages.filter((image) => image.id !== imageId),
    );

    setImageError("");
  };

  // Upload new images to Cloudinary
  const uploadNewImages = async (token) => {
    const newImages = productImages.filter((image) => image.file);

    if (newImages.length === 0) {
      return productImages.map((image) => image.url);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const imageFormData = new FormData();

      newImages.forEach((image) => {
        imageFormData.append("images", image.file);
      });

      const response = await axios.post(`${API_URL}/upload`, imageFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round((progressEvent.loaded * 100) / progressEvent.total),
            );
          }
        },
      });

      const uploadedUrls = response.data.images;

      if (
        !Array.isArray(uploadedUrls) ||
        uploadedUrls.length !== newImages.length
      ) {
        throw new Error("Invalid image upload response.");
      }

      // Maintain the original image order
      let uploadedIndex = 0;

      const resolvedImages = productImages.map((image) => {
        if (!image.file) return image;

        return {
          id: image.id,
          file: null,
          url: uploadedUrls[uploadedIndex++],
        };
      });

      // Retain uploaded URLs if saving the product fails
      setProductImages(resolvedImages);

      return resolvedImages.map((image) => image.url);
    } finally {
      setUploading(false);
    }
  };

  // Submit Add or Edit Product form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    try {
      setSaving(true);
      setFormError("");
      setImageError("");
      setSuccessMessage("");

      const token = localStorage.getItem("shopsphere-token");

      if (!token) {
        setFormError("Your session has expired. Please log in again.");
        return;
      }

      if (productImages.length > MAX_IMAGES) {
        setImageError("Maximum 5 images are allowed.");
        return;
      }

      // Upload selected images before saving the product
      const imageUrls = await uploadNewImages(token);

      const productData = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        images: imageUrls,
      };

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (modalMode === "add") {
        const response = await axios.post(API_URL, productData, config);

        setProducts((previousProducts) => [
          response.data.product,
          ...previousProducts,
        ]);

        setSuccessMessage("Product added successfully!");
      } else {
        const response = await axios.put(
          `${API_URL}/${editingProductId}`,
          productData,
          config,
        );

        const updatedProduct =
          response.data.product || response.data.updatedProduct;

        if (updatedProduct) {
          setProducts((previousProducts) =>
            previousProducts.map((product) =>
              product._id === editingProductId ? updatedProduct : product,
            ),
          );
        } else {
          await fetchProducts();
        }

        setSuccessMessage("Product updated successfully!");
      }

      setModalMode(null);
      setEditingProductId(null);
      setFormData(initialForm);
      resetImages();
    } catch (err) {
      console.error("Failed to save product:", err);

      setFormError(
        err.response?.data?.message ||
          "Failed to save product. Please try again.",
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setDeletingProductId(product._id);
      setDeleteError("");
      setSuccessMessage("");

      const token = localStorage.getItem("shopsphere-token");

      if (!token) {
        setDeleteError("Your session has expired. Please log in again.");
        return;
      }

      await axios.delete(`${API_URL}/${product._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProducts((previousProducts) =>
        previousProducts.filter((item) => item._id !== product._id),
      );

      setSuccessMessage(`${product.name} deleted successfully!`);
    } catch (err) {
      console.error("Failed to delete product:", err);

      setDeleteError(
        err.response?.data?.message ||
          "Failed to delete product. Please try again.",
      );
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="admin-layout admin-inventory">
      <AdminSidebar />

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">STORE MANAGEMENT</span>
            <h1>Products</h1>
          </div>

          <button
            className="admin-store-button"
            onClick={() => navigate("/admin")}
          >
            Back to Dashboard
            <ArrowLeft size={17} />
          </button>
        </header>

        <section className="admin-products-section">
          <div className="admin-products-heading">
            <div>
              <h2>Product Inventory</h2>
              <p>Manage and monitor your store products.</p>
            </div>

            <button className="admin-add-product" onClick={openAddModal}>
              <Plus size={18} />
              Add Product
            </button>
          </div>

          {successMessage && (
            <div className="admin-product-success">{successMessage}</div>
          )}

          {deleteError && (
            <div className="admin-login-error">{deleteError}</div>
          )}

          <div className="admin-products-toolbar">
            <div className="admin-product-search">
              <Search size={18} />

              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <span>{filteredProducts.length} products</span>
          </div>

          {loading ? (
            <div className="admin-products-message">
              <LoaderCircle size={25} className="inventory-spin" />
              <p>Loading products...</p>
            </div>
          ) : error ? (
            <div className="admin-products-message">
              <p>{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="admin-products-message">
              <Package size={30} />
              <p>No products found.</p>
            </div>
          ) : (
            <div className="admin-products-table-wrapper">
              <table className="admin-products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="inventory-product-cell">
                          <div className="inventory-thumbnail">
                            {product.images?.[0] && (
                              <img
                                key={product.images[0]}
                                src={product.images[0]}
                                alt=""
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}

                            <Package size={24} aria-hidden="true" />
                          </div>

                          <div className="admin-product-name">
                            <strong>{product.name}</strong>
                            <span>{product.brand}</span>
                          </div>
                        </div>
                      </td>

                      <td>{product.category}</td>

                      <td>₹{Number(product.price).toLocaleString("en-IN")}</td>

                      <td>
                        <span
                          className={
                            product.stock === 0
                              ? "admin-stock-out"
                              : product.stock <= 5
                                ? "admin-stock-low"
                                : "admin-stock-normal"
                          }
                        >
                          {product.stock === 0
                            ? "Out of stock"
                            : `${product.stock} units`}
                        </span>
                      </td>

                      <td>
                        {Number(product.totalReviews) > 0 ? (
                          <div className="admin-review-summary">
                            <strong className="admin-review-average">
                              ★{" "}
                              {Number(
                                product.averageRating ?? product.rating,
                              ).toFixed(1)}
                            </strong>
                            <span className="admin-review-count">
                              {product.totalReviews}{" "}
                              {Number(product.totalReviews) === 1
                                ? "review"
                                : "reviews"}
                            </span>
                          </div>
                        ) : (
                          <span className="admin-review-count">
                            No reviews yet
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="admin-product-actions">
                          <button
                            type="button"
                            className="inventory-edit"
                            aria-label="Edit product"
                            title="Edit product"
                            onClick={() => openEditModal(product)}
                            disabled={deletingProductId !== null}
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            className="inventory-delete"
                            aria-label="Delete product"
                            title="Delete product"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={deletingProductId !== null}
                          >
                            {deletingProductId === product._id ? (
                              <LoaderCircle
                                size={17}
                                className="inventory-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Add / Edit Product Modal */}
      {modalMode && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div
            className="admin-product-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2>
                  {modalMode === "add" ? "Add New Product" : "Edit Product"}
                </h2>

                <p>
                  {modalMode === "add"
                    ? "Enter the details of your new product."
                    : "Update the information for this product."}
                </p>
              </div>

              <button
                type="button"
                className="admin-modal-close"
                aria-label="Close modal"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <fieldset className="product-form-fields" disabled={saving}>
                <div className="admin-form-group">
                  <label>Product Name</label>

                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Sony WH-1000XM5"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Description</label>

                  <textarea
                    name="description"
                    placeholder="Enter product description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    required
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Brand</label>

                    <input
                      type="text"
                      name="brand"
                      placeholder="e.g. Sony"
                      value={formData.brand}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Category</label>

                    <input
                      type="text"
                      name="category"
                      placeholder="e.g. Audio"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label>Price (₹)</label>

                    <input
                      type="number"
                      name="price"
                      placeholder="Enter price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Stock Quantity</label>

                    <input
                      type="number"
                      name="stock"
                      placeholder="Enter quantity"
                      value={formData.stock}
                      onChange={handleInputChange}
                      min="0"
                      step="1"
                      required
                    />
                  </div>
                </div>

                {/* Product Image Upload Section */}
                <div className="product-image-section">
                  <div className="product-image-heading">
                    <label>Product Images</label>

                    <span>
                      {productImages.length} / {MAX_IMAGES}
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    onChange={handleFileSelection}
                  />

                  {productImages.length < MAX_IMAGES && (
                    <button
                      type="button"
                      className={`product-image-dropzone ${
                        dragging ? "dragging" : ""
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!saving) setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleImageDrop}
                      disabled={saving}
                    >
                      <UploadCloud size={32} />

                      <strong>Click to upload or drag and drop</strong>

                      <span>JPG, JPEG, PNG or WebP</span>
                      <span>Maximum 5 MB per image</span>
                    </button>
                  )}

                  {productImages.length > 0 && (
                    <div className="product-image-grid">
                      {productImages.map((image, index) => (
                        <ImagePreview
                          key={image.id}
                          image={image}
                          index={index}
                          onRemove={() => removeImage(image.id)}
                          disabled={saving}
                        />
                      ))}

                      {productImages.length < MAX_IMAGES && (
                        <button
                          type="button"
                          className="product-image-add"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={saving}
                        >
                          <ImagePlus size={25} />
                          <span>Add more</span>
                        </button>
                      )}
                    </div>
                  )}

                  <p className="product-image-help">
                    The first image will be used as the product cover.
                  </p>

                  {imageError && (
                    <div className="admin-login-error">{imageError}</div>
                  )}
                </div>
              </fieldset>

              {/* Upload progress */}
              {uploading && (
                <div className="product-upload-progress" aria-live="polite">
                  <div className="product-upload-status">
                    <span>
                      {uploadProgress === 100
                        ? "Processing images..."
                        : "Uploading images..."}
                    </span>

                    <strong>{uploadProgress}%</strong>
                  </div>

                  <div className="product-progress-track">
                    <div
                      className="product-progress-fill"
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {formError && (
                <div className="admin-login-error">{formError}</div>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-modal-cancel"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-add-product"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={18} className="inventory-spin" />

                      {uploading
                        ? "Uploading..."
                        : modalMode === "add"
                          ? "Adding..."
                          : "Saving..."}
                    </>
                  ) : (
                    <>
                      {modalMode === "add" ? (
                        <Plus size={18} />
                      ) : (
                        <Pencil size={18} />
                      )}

                      {modalMode === "add" ? "Add Product" : "Save Changes"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProducts;
