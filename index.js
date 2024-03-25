const express = require("express");
const app = express();
const cors = require("cors");

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  "mongodb+srv://event360admin:admin1234@cluster0.rqgddrc.mongodb.net/?retryWrites=true&w=majority";

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
    // Connect the client to the server
    // await client.connect();

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
  return res.status(200).send({ response: "world" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
