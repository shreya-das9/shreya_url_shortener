const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const path = require('path');
require('dotenv').config(); // Load variables from .env

const app = express();
app.use(express.json());

// MongoDB connection using MONGO_URI from .env
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });

// Schema
const urlSchema = new mongoose.Schema({
  fullUrl: { type: String, required: true },
  shortUrl: { type: String, required: true, unique: true },
});

const Url = mongoose.model('Url', urlSchema);

// Shorten endpoint
app.post('/api/shorten', async (req, res) => {
  const { fullUrl, customShort } = req.body;

  try {
    if (!fullUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Invalid URL format. Must start with "https://"' });
    }

    const shortUrl = customShort || shortid.generate();

    // Check for duplicate custom short name
    const existingShort = await Url.findOne({ shortUrl });
    if (existingShort) {
      return res.status(400).json({ error: 'Custom short name already in use. Please choose another.' });
    }

    // Reuse existing full URL if no custom short is provided
    if (!customShort) {
      const existingFull = await Url.findOne({ fullUrl });
      if (existingFull) return res.json(existingFull);
    }

    const newUrl = new Url({ fullUrl, shortUrl });
    await newUrl.save();
    res.json(newUrl);
  } catch (error) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all URLs
app.get('/api/urls', async (req, res) => {
  try {
    const urls = await Url.find();
    res.json({ urls });
  } catch (error) {
    console.error('Error fetching database contents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Redirect short URL
app.get('/:shortUrl', async (req, res) => {
  const { shortUrl } = req.params;
  try {
    const url = await Url.findOne({ shortUrl });
    if (url) {
      return res.redirect(url.fullUrl);
    } else {
      return res.status(404).json({ error: 'Short URL not found' });
    }
  } catch (error) {
    console.error('Error retrieving URL:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
