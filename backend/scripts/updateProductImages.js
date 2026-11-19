import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";

dotenv.config();

const productImages = [
  {
    name: "Frontech Monitor",
    image: "/images/products/frontech-monitor.jpg",
  },
  {
    name: "Canon EOS R50",
    image: "/images/products/canon-r50.jpg",
  },
  {
    name: "Apple Watch Series 10",
    image: "/images/products/apple-watch-series-10.jpg",
  },
  {
    name: "Samsung Galaxy S24",
    image: "/images/products/samsung-s24.jpg",
  },
  {
    name: "MacBook Air M3",
    image: "/images/products/macbook-air-m3.jpg",
  },
  {
    name: "Sony WH-1000XM5",
    image: "/images/products/sony-wh1000xm5.jpg",
  },
];

const updateProductImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully!\n");

    let updated = 0;

    for (const product of productImages) {
      const result = await Product.findOneAndUpdate(
        { name: product.name },
        {
          $set: {
            images: [product.image],
          },
        },
        {
          returnDocument: "after",
          runValidators: true,
        },
      );

      if (result) {
        console.log(`SUCCESS: ${product.name}`);
        console.log(`Image: ${product.image}\n`);
        updated++;
      } else {
        console.log(`NOT FOUND: ${product.name}\n`);
      }
    }

    console.log(
      `Completed: ${updated}/${productImages.length} products matched.`,
    );
  } catch (error) {
    console.error("Update failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
  }
};

updateProductImages();
