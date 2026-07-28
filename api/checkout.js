// api/checkout.js
import Stripe from "stripe";
import { getUserFromRequest, supabaseAdmin } from "./_supabase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { products } = req.body ?? {};

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    // Verify the caller against Supabase. A null user just means guest
    // checkout — not an error. What matters is that the identity is *checked*:
    // the id below comes from a signed JWT, not from the request body.
    const user = await getUserFromRequest(req);

    // Re-price every line from the database. The browser can send any price it
    // likes, so the cart is treated purely as a list of ids and quantities.
    const ids = products.map((p) => p._id);
    const { data: catalog, error: catalogError } = await supabaseAdmin()
      .from("products")
      .select("id, title, price, images, stock")
      .in("id", ids);

    if (catalogError) throw catalogError;
    const catalogById = new Map(catalog.map((p) => [p.id, p]));

    const line_items = [];
    for (const item of products) {
      const trusted = catalogById.get(item._id);
      if (!trusted) {
        return res
          .status(400)
          .json({ error: `Product no longer available: ${item._id}` });
      }

      // Clamp quantity to a sane integer so a negative or absurd value cannot
      // produce a negative total or an accidental bulk order.
      const quantity = Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 99);

      if (trusted.stock != null && trusted.stock < quantity) {
        return res.status(400).json({
          error: `Only ${trusted.stock} left of "${trusted.title}".`,
        });
      }

      const image = trusted.images?.[0];

      line_items.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: trusted.title,
            ...(image ? { images: [image] } : {}),
            // Carried through to the webhook so each saved order item can keep
            // its product id.
            metadata: { productId: trusted.id },
          },
          unit_amount: Math.round(Number(trusted.price) * 100), // cents
        },
        quantity,
      });
    }

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      // The webhook reads this back to decide whose order history it belongs to.
      metadata: { userId: user?.id ?? "" },
      ...(user?.email ? { customer_email: user.email } : {}),
      shipping_address_collection: {
        allowed_countries: ["US", "IN", "GB", "CA", "AU"],
      },
      success_url: `${req.headers.origin}/orders?success=true`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
    });

    return res.status(200).json(session);
  } catch (err) {
    console.error("Checkout failed:", err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}
