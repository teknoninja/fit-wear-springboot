// client/src/sanityClient.js
import { createClient } from "@sanity/client";

export default createClient({
  projectId: "y4feni72", // Find this at manage.sanity.io
  dataset: "production",
  apiVersion: "2024-03-11",
  useCdn: true,
});