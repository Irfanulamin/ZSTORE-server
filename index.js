const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(cors());
app.use(express.json());

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const formatDate = (date) => {
  const options = { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
};

async function run() {
  try {
    const collection = client.db("ZSTORE").collection("auth");
    // Connect the client to the server
    // await client.connect();
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password

      // Insert user into the database
      await collection.insertOne({
        name,
        email,
        password,
        photo: "https://i.ibb.co.com/rpPdQZK/Pizza-Man.jpg",
        type: "User",
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      res.json({
        success: true,
        message: "Login successful",
      });
    });

    //
    app.put("/api/v1/users/email/:email", async (req, res) => {
      const { email } = req.params;
      const filter = { email: email };
      const { name, photo } = req.body;

      // Ensure name and photo exist
      if (!name && !photo) {
        return res.status(400).json({
          success: false,
          message: "No fields to update provided.",
        });
      }

      const updatedDetails = {
        $set: {},
      };

      if (name) updatedDetails.$set.name = name;
      if (photo) updatedDetails.$set.photo = photo;

      try {
        // Attempt to update the user document
        const result = await collection.updateOne(
          filter, // filter to find the document based on email
          updatedDetails // using $set to update only the specified fields
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({
            success: false,
            message: "User not found or no changes made.",
          });
        }

        res.status(200).json({
          success: true,
          message: "User updated successfully.",
          data: result,
        });
      } catch (error) {
        console.error("Error updating user:", error.message);
        res.status(500).json({
          success: false,
          message: error.message || "Server error",
        });
      }
    });

    //
    app.get("/api/v1/users/email/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const user = await collection.findOne({ email });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const { password, ...userInfo } = user;
        res.status(200).json({
          success: true,
          user: userInfo,
        });
      } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({
          success: false,
          message: "Server error",
        });
      }
    });

    const menCollection = client.db("ZSTORE").collection("mencollection");
    app.post("/create-product", async (req, res) => {
      const addedProduct = req.body;
      const result = await menCollection.insertOne(addedProduct);
      res.status(200).send(result);
    });

    app.put("/update-product/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedProduct = req.body;
        console.log(updatedProduct);
        const updatedDetails = {
          $set: {
            product_name: updatedProduct.product_name,
            category: updatedProduct.category,
            product_image: updatedProduct.product_image,
            flash_sale: updatedProduct.flash_sale,
            amount: updatedProduct.amount,
            description: updatedProduct.description,
            keypoints: updatedProduct.keypoints,
          },
        };
        const result = await menCollection.updateOne(filter, updatedDetails);

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Product not found" });
        }
        if (result.modifiedCount === 0) {
          return res.status(400).send({ message: "No changes made" });
        }

        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.delete("/delete-product/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await menCollection.deleteOne(query);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/men-clothing", async (req, res) => {
      try {
        const category = req.query.category;
        const minAmount = parseFloat(req.query.minAmount);
        const maxAmount = parseFloat(req.query.maxAmount);
        const rating = req.query.rating;

        let query = {};

        if (category) {
          query.category = category;
        }
        if (!isNaN(minAmount) && !isNaN(maxAmount)) {
          query.amount = {};
          query.amount.$gte = minAmount;
          query.amount.$lte = maxAmount;
        }

        if (rating) {
          query.rating = parseFloat(rating); // Parsing rating as float
        }

        const result = await menCollection.find(query).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/men-clothing/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await menCollection.findOne(query);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/flash-sale", async (req, res) => {
      try {
        const result = await menCollection.find({ flash_sale: true }).toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/trending-products", async (req, res) => {
      try {
        const result = await menCollection
          .find()
          .sort({ rating: -1 })
          .toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    const ordersCollection = client.db("ZSTORE").collection("orders");

    app.get("/orders", async (req, res) => {
      try {
        const result = await ordersCollection.find().toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.post("/create-order", async (req, res) => {
      const orderedProductInfo = req.body;
      const result = await ordersCollection.insertOne(orderedProductInfo);
      res.status(200).send(result);
    });

    app.post("/checkout", async (req, res) => {
      try {
        const cart = req.body; // Ensure the body contains the cart array
        if (!Array.isArray(cart)) {
          return res.status(400).json({ error: "Cart must be an array" });
        }

        const lineItems = cart.map((product) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: product.name,
              images: [product.image], // Matches the `image` field in your data
            },
            unit_amount: Math.round(product.amount * 100), // Converts `amount` to cents
          },
          quantity: product.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: lineItems,
          mode: "payment",
          success_url: "https://zstore-client.vercel.app/success", // Replace with your success URL
          cancel_url: "https://zstore-client.vercel.app/cancel", // Replace with your cancel URL
        });

        res.json({ id: session.id });
      } catch (error) {
        console.error("Error creating checkout session:", error.message);
        res
          .status(500)
          .json({ error: "An error occurred while creating the session" });
      }
    });

    app.put("/orders/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDetails = {
          $set: {
            status: "Delivered",
          },
        };
        const result = await ordersCollection.updateOne(filter, updatedDetails);
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    const reviewCollection = client.db("ZSTORE").collection("reviews");

    app.post("/create-review", async (req, res) => {
      const reviewDetails = req.body;
      const result = await reviewCollection.insertOne({
        ...reviewDetails,
        date: formatDate(new Date()),
      });
      res.status(200).send(result);
    });

    app.get("/reviews", async (req, res) => {
      try {
        const result = await reviewCollection.find().toArray();
        res.status(200).send(result);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  return res
    .status(200)
    .send({ response: "world", success: true, timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
