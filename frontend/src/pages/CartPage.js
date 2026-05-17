import { Link } from "react-router-dom";
import { ArrowRight, ShoppingCart, Trash2 } from "lucide-react";

import Navigation from "../components/Navigation";
import PriceTicker from "../components/PriceTicker";
import Footer from "../components/Footer";
import { Button } from "../components/ui/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useCart } from "../CartContext";
import { useProducts } from "../ProductDataContext";

function CartPage() {
  const { cart, setItemQuantity, clearCart, resolveUnitPrice } = useCart();
  const { products } = useProducts();

  const items = products
    .filter((product) => (cart[product.id] || 0) > 0)
    .map((product) => ({
      product,
      quantity: cart[product.id],
      unitPrice: resolveUnitPrice(product),
    }));

  const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  return (
    <div className="min-h-screen bg-[#f7f3e7]">
      <Navigation />
      <PriceTicker />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b6863a]">Cart</p>
          <h1 className="text-4xl font-bold text-[#0f5132]">Your farm order</h1>
          <p className="mx-auto max-w-2xl text-stone-600">
            Review your pre-order before checkout. Dominic will confirm timing, availability, pickup, delivery, or shipping details by email.
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="border-stone-200 shadow-md">
            <CardContent className="space-y-4 p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7eddc] text-[#0f5132]">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-semibold text-[#0f5132]">Your cart is empty</h2>
              <p className="text-sm text-stone-600">
                Add products from the farm page, then come back here to complete your order.
              </p>
              <Link to="/products">
                <Button className="bg-[#0f5132] hover:bg-[#0a3c24]">Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
            <div className="space-y-4">
              {items.map(({ product, quantity, unitPrice }) => (
                <Card key={product.id} className="border-stone-200 shadow-md">
                  <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-[#0f5132]">{product.name}</h2>
                      <p className="text-sm text-stone-600">{product.description}</p>
                      <p className="mt-2 text-sm text-stone-600">
                        ${unitPrice.toFixed(2)} per {product.unit || "unit"}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 md:items-end">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemQuantity(product.id, quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center text-sm font-medium">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setItemQuantity(product.id, quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-sm font-semibold text-[#8f6428]">
                        ${(quantity * unitPrice).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-stone-600"
                        onClick={() => setItemQuantity(product.id, 0)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-stone-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-[#0f5132]">Order summary</CardTitle>
                <CardDescription>Pre-order totals are estimates until Dominic confirms the order.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2 text-sm text-stone-600">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
                    <span>Estimated total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f3efdf] p-4 text-sm text-stone-600">
                  Orders are handled as farm pre-orders. Customers are updated by email when an order is confirmed, ready, shipped, or scheduled for pickup.
                </div>

                <div className="space-y-3">
                  <Link to="/checkout" className="block">
                    <Button className="w-full gap-2 bg-[#0f5132] hover:bg-[#0a3c24]">
                      Continue To Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full" onClick={clearCart}>
                    Clear Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

export default CartPage;
