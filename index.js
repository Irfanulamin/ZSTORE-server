const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://zstore-client.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGODB_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

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
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({
        name,
        email,
        password: hashedPassword,
        type: "user",
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    const menCollection = client.db("ZSTORE").collection("mencollection");

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
