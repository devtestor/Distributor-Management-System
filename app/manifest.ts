import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Distributor Control",
    short_name: "DistControl",
    description: "Inventory, delivery, payment, and empty container tracking for beverage distributors.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f3",
    theme_color: "#0b6b50",
    categories: ["business", "productivity"]
  };
}
