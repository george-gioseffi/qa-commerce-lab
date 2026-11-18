import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import { apiFetch } from "./lib/api";
import type { CartItem, Order, Product, User } from "./lib/types";

type AuthResponse = {
  token: string;
  user: User;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>(["All"]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  async function loadProducts(currentSearch = search, currentCategory = selectedCategory) {
    setProductsLoading(true);
    setProductsError("");
    const query = new URLSearchParams();
    if (currentSearch) query.set("search", currentSearch);
    if (currentCategory !== "All") query.set("category", currentCategory);

    try {
      const data = await apiFetch<Product[]>(`/api/products?${query.toString()}`);
      setProducts(data);
      if (!currentSearch && currentCategory === "All") {
        setAllCategories(["All", ...new Set(data.map((product) => product.category))]);
      }
    } catch (error) {
      setProductsError(error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadCart(token: string) {
    const data = await apiFetch<CartItem[]>("/api/cart", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCart(data);
  }

  async function loadOrders(token: string) {
    const data = await apiFetch<Order[]>("/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrders(data);
  }

  useEffect(() => {
    void loadProducts(search, selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory]);

  useEffect(() => {
    const stored = localStorage.getItem("qa-commerce-auth");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as AuthResponse;
      setAuth(parsed);
      void Promise.all([loadCart(parsed.token), loadOrders(parsed.token)]).catch(() => {
        localStorage.removeItem("qa-commerce-auth");
        setAuth(null);
        setCart([]);
        setOrders([]);
        setAuthError("Session expired. Please log in again.");
      });
    } catch {
      localStorage.removeItem("qa-commerce-auth");
    }
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const form = new FormData(event.currentTarget);
    const payload =
      authMode === "register"
        ? {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          }
        : {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          };

    try {
      const data = await apiFetch<AuthResponse>(`/api/auth/${authMode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      localStorage.setItem("qa-commerce-auth", JSON.stringify(data));
      setAuth(data);
      await Promise.all([loadCart(data.token), loadOrders(data.token)]);
      event.currentTarget.reset();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  async function addToCart(product: Product, quantity = 1) {
    if (!auth) {
      setAuthError("Please log in before adding products to the cart.");
      return;
    }

    setAuthError("");
    try {
      await apiFetch("/api/cart/items", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ productId: product.id, quantity }),
      });
      await loadCart(auth.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to add to cart.");
    }
  }

  async function updateCart(productId: string, quantity: number) {
    if (!auth) return;
    if (!Number.isInteger(quantity) || quantity < 1) {
      setAuthError("Quantity must be at least 1.");
      return;
    }
    setAuthError("");
    try {
      await apiFetch(`/api/cart/items/${productId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ quantity }),
      });
      await loadCart(auth.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to update cart.");
    }
  }

  async function removeCart(productId: string) {
    if (!auth) return;
    setAuthError("");
    try {
      await apiFetch(`/api/cart/items/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      await loadCart(auth.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to remove item.");
    }
  }

  async function handleCheckout() {
    if (!auth) {
      setAuthError("Login is required to complete checkout.");
      return;
    }
    if (isCheckingOut) return;

    setAuthError("");
    setIsCheckingOut(true);
    try {
      const order = await apiFetch<Order & { items: unknown[] }>("/api/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setSuccessOrder(order);
      setCart([]);
      await Promise.all([loadProducts(search, selectedCategory), loadOrders(auth.token)]);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  function logout() {
    localStorage.removeItem("qa-commerce-auth");
    setAuth(null);
    setCart([]);
    setOrders([]);
    setSuccessOrder(null);
    setAuthError("");
  }

  const total = cart.reduce((sum, item) => sum + item.quantity * item.product.priceInCents, 0);

  return (
    <div className="page-shell">
      <header className="hero" data-testid="home-page">
        <div>
          <p className="eyebrow">QA Commerce Lab</p>
          <h1>Fake commerce, real QA engineering depth.</h1>
          <p className="hero-copy">
            Portfolio project focused on automation, traceability, reliable selectors and realistic test coverage.
          </p>
        </div>
        <div className="hero-panel">
          <span className="hero-chip">Dockerized</span>
          <span className="hero-chip">API + E2E + A11y + Load</span>
          <span className="hero-chip">Seeded for predictable tests</span>
        </div>
      </header>

      <main className="layout">
        <section className="catalog" aria-label="Product catalog">
          <div className="toolbar">
            <input
              aria-label="Search products"
              data-testid="search-input"
              placeholder="Search products"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filter by category"
              data-testid="category-filter"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {productsLoading && <p data-testid="catalog-loading">Loading products...</p>}

          {productsError && (
            <p className="error-banner" data-testid="catalog-error" role="alert">
              {productsError}
            </p>
          )}

          {!productsLoading && !productsError && products.length === 0 && (
            <p data-testid="catalog-empty">No products found matching your criteria.</p>
          )}

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id} data-testid="product-card">
                <img src={product.imageUrl} alt={product.name} />
                <div className="product-card__content">
                  <p className="product-card__category">{product.category}</p>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                  <div className="product-card__meta">
                    <strong>{currency(product.priceInCents)}</strong>
                    <span data-testid="stock-badge">Stock: {product.stock}</span>
                  </div>
                  <button
                    data-testid={`add-to-cart-${product.name}`}
                    onClick={() => void addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? "Out of stock" : "Add to cart"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <section className="card">
            <div className="card-header">
              <h2>{auth ? `Welcome, ${auth.user.name}` : "Account"}</h2>
              {auth && (
                <button data-testid="logout-button" className="text-button" onClick={logout}>
                  Logout
                </button>
              )}
            </div>

            {!auth && (
              <form className="auth-form" onSubmit={(event) => void handleAuthSubmit(event)}>
                {authMode === "register" && (
                  <input
                    aria-label="Name"
                    data-testid="name-input"
                    name="name"
                    placeholder="Name"
                    required
                  />
                )}
                <input
                  aria-label="Email"
                  name="email"
                  placeholder="Email"
                  type="email"
                  required
                  data-testid="email-input"
                />
                <input
                  aria-label="Password"
                  name="password"
                  placeholder="Password"
                  type="password"
                  required
                  data-testid="password-input"
                />
                <button data-testid="auth-submit" type="submit">
                  {authMode === "login" ? "Login" : "Create account"}
                </button>
                <button
                  type="button"
                  data-testid="auth-mode-toggle"
                  className="text-button"
                  onClick={() => {
                    setAuthError("");
                    setAuthMode(authMode === "login" ? "register" : "login");
                  }}
                >
                  {authMode === "login" ? "Need an account?" : "Already registered?"}
                </button>
              </form>
            )}

            {authError && (
              <p className="error-banner" data-testid="auth-error" role="alert">
                {authError}
              </p>
            )}
          </section>

          <section className="card" data-testid="cart-panel">
            <div className="card-header">
              <h2>Cart</h2>
              <span data-testid="cart-total">{currency(total)}</span>
            </div>

            {cart.length === 0 && <p data-testid="cart-empty">Your cart is empty.</p>}

            {cart.map((item) => (
              <div className="cart-item" key={item.id} data-testid={`cart-item-${item.product.name}`}>
                <div>
                  <strong>{item.product.name}</strong>
                  <p>{currency(item.product.priceInCents)}</p>
                </div>
                <div className="cart-item__actions">
                  <input
                    aria-label={`Quantity for ${item.product.name}`}
                    data-testid={`quantity-input-${item.product.name}`}
                    type="number"
                    min={1}
                    max={item.product.stock}
                    value={item.quantity}
                    onChange={(event) => void updateCart(item.product.id, Number(event.target.value))}
                  />
                  <button
                    data-testid={`remove-item-${item.product.name}`}
                    onClick={() => void removeCart(item.product.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              data-testid="checkout-button"
              disabled={isCheckingOut}
              onClick={() => void handleCheckout()}
            >
              {isCheckingOut ? "Processing..." : "Complete fake checkout"}
            </button>
          </section>

          {successOrder && (
            <section className="card success-card" data-testid="checkout-success">
              <h2>Order placed</h2>
              <p>Order ID: {successOrder.id}</p>
              <p>Total: {currency(successOrder.totalInCents)}</p>
            </section>
          )}

          {auth && (
            <section className="card" data-testid="orders-panel">
              <div className="card-header">
                <h2>Orders</h2>
                <span>{orders.length}</span>
              </div>
              {orders.length === 0 ? (
                <p data-testid="orders-empty">No orders placed yet.</p>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div className="cart-item" key={order.id} data-testid="order-card">
                    <div>
                      <strong>#{order.id.slice(-6)}</strong>
                      <p>{currency(order.totalInCents)}</p>
                    </div>
                  </div>
                ))
              )}
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
