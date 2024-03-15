const express = require('express')
const app = express()
const cors = require('cors')
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser')
require('dotenv').config()
const port = process.env.PORT || 5000;


// Middlewares
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser());



// Custom middlewares
const logger = async (req, res, next) => {
    console.log(req.method, req.originalUrl, req.host)
    next();
}
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' })
    }
    jwt.verify(token, process.env.API_ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized' })
        }
        req.user = decoded;
        next();
    })
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@salehinrifat1.7tmx0zj.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // Token Related Api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.API_ACCESS_TOKEN, { expiresIn: '1h' });

            res.cookie('token', token, {
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                secure: true,
                maxAge: 60 * 60 * 100
            }).send({ message: 'success' })
        })
        app.post('/logOut', async (req, res) => {
            const user = req.body;

            res.clearCookie('token', { maxAge: 0, secure: true, sameSite: 'none' }).send({ message: 'success' })
        })


        const blogsCollectoin = client.db("blogDB").collection("allblogs");
        const commentsCollectoin = client.db("blogDB").collection("comments");
        const wishlistCollectoin = client.db("blogDB").collection("wishlist");
        app.get('/blogs', async (req, res) => {
            const cursor = blogsCollectoin.find();
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get('/recent', async (req, res) => {
            const cursor = blogsCollectoin.find().sort({ date: -1 }).limit(6);
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await blogsCollectoin.findOne(query);
            res.send(result)
        })
        app.get('/comments/:blogId', async (req, res) => {
            const id = req.params.blogId;
            const query = { blogId: id };
            const cursor = commentsCollectoin.find(query)
            const result = await cursor.toArray();
            res.send(result)
        })
        app.get('/wishlist', verifyToken, async (req, res) => {
            const query = { email: req.query.email }
            const cursor = wishlistCollectoin.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
        app.post('/blogs', async (req, res) => {
            const blog = req.body;
            const result = await blogsCollectoin.insertOne(blog);
            res.send(result);
        })
        app.post('/comments', async (req, res) => {
            const comment = req.body;
            const result = await commentsCollectoin.insertOne(comment);
            res.send(result);
        })
        app.post('/wishlist', async (req, res) => {
            const wishlist = req.body;
            const result = await wishlistCollectoin.insertOne(wishlist);
            res.send(result);

        })
        app.put('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    title: req.body.title,
                    image: req.body.image,
                    short_description: req.body.short_description
                    , category: req.body.category
                    , long_description: req.body.long_description
                    ,
                    date: req.body.date
                },
            };
            const result = await blogsCollectoin.updateOne(filter, updateDoc, options);
            res.send(result)
        })
        app.delete('/wishlist/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await wishlistCollectoin.deleteOne(query);
            res.send(result)
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})