// api/webhook.js
//
// Stripe calls this after a payment. It is the ONLY thing that may mark an
// order paid — the browser never writes to the orders table (see the RLS
// policies in supabase/schema.sql), so a user cannot fake a purchase.
import Stripe from "stripe";
import { createClient } from "@sanity/client";
import { supabaseAdmin } from "./_supabase.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Built on demand, not at module scope. createClient() throws when projectId is
// missing, and at module scope that would crash the whole function on import —
// so an unset Sanity variable would stop orders reaching Supabase too, even
// though Supabase is the part that actually matters.
const sanityClient = () =>
  createClient({
    projectId: process.env.VITE_SANITY_PROJECT_ID,
    dataset: process.env.VITE_SANITY_DATASET || "production",
    token: process.env.SANITY_API_WRITE_TOKEN,
    apiVersion: "2024-03-11",
    useCdn: false,
  });

// Stripe signs the RAW request body. Vercel parses JSON by default, and a
// re-serialised body produces different bytes, which makes every signature
// check fail — so parsing has to be turned off here.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Save the order against the Supabase user, using the service-role key so this
// write bypasses RLS.
const saveOrderToSupabase = async (session, lineItems) => {
  const supabase = supabaseAdmin();

  // Empty string is what checkout.js sends for a guest.
  const userId = session.metadata?.userId || null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .upsert(
      {
        user_id: userId,
        email: session.customer_details?.email ?? null,
        stripe_session_id: session.id,
        status: "paid",
        total: session.amount_total / 100,
        currency: session.currency ?? "usd",
        shipping_address:
          session.shipping_details?.address ??
          session.customer_details?.address ??
          null,
      },
      // stripe_session_id is unique, so a retried webhook updates the existing
      // row instead of creating a duplicate order.
      { onConflict: "stripe_session_id" }
    )
    .select()
    .single();

  if (orderError) throw orderError;

  // Replace the items rather than appending, so a retry cannot double them up.
  await supabase.from("order_items").delete().eq("order_id", order.id);

  const items = lineItems.data.map((item) => ({
    order_id: order.id,
    product_id: item.price?.product?.metadata?.productId ?? null,
    title: item.description,
    price: item.price.unit_amount / 100,
    quantity: item.quantity,
    img: item.price?.product?.images?.[0] ?? null,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(items);
  if (itemsError) throw itemsError;

  // The purchase is done, so clear the saved cart for that user.
  if (userId) {
    await supabase.from("carts").update({ items: [] }).eq("user_id", userId);
  }
};

// Keep writing orders into Sanity as before, for the studio's order view.
// Entirely optional — skipped when Sanity is not configured.
const saveOrderToSanity = async (session, lineItems) => {
  if (!process.env.VITE_SANITY_PROJECT_ID || !process.env.SANITY_API_WRITE_TOKEN) {
    return;
  }

  await sanityClient().create({
    _type: "order",
    name: session.customer_details?.name,
    email: session.customer_details?.email,
    stripeId: session.id,
    total: session.amount_total / 100, // Convert from cents
    paid: true,
    orderItems: lineItems.data.map((item) => ({
      _key: item.id,
      name: item.description,
      price: item.price.unit_amount / 100,
      quantity: item.quantity,
    })),
  });
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  // --- Verify the request really came from Stripe ---
  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.log(`❌ Error message: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // --- End of security verification ---

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Expanding the product gives us back the metadata.productId that
    // checkout.js attached, so order items can link to the Sanity product.
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
    });

    // Supabase drives the customer-facing order history, so a failure there is
    // worth a 500: Stripe will retry the webhook and we get the order back.
    try {
      await saveOrderToSupabase(session, lineItems);
    } catch (err) {
      console.error("Failed to save order to Supabase:", err.message);
      return res.status(500).json({ error: "Failed to record order" });
    }

    // Sanity is a secondary copy for the studio. Log and carry on if it fails,
    // so a Sanity outage cannot trigger endless Stripe retries.
    try {
      await saveOrderToSanity(session, lineItems);
    } catch (err) {
      console.error("Failed to save order to Sanity:", err.message);
    }
  }

  return res.status(200).json({ received: true });
}

// Helper function to read the request body
const buffer = (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
};
