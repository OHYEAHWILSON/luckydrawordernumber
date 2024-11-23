import express from 'express';      // Import express
import admin from 'firebase-admin';  // Import firebase-admin
import dotenv from 'dotenv';        // Import dotenv for environment variables
import cors from 'cors';            // Import cors for cross-origin resource sharing

// Load environment variables
dotenv.config();

// Check for the FIREBASE_SERVICE_ACCOUNT_KEY environment variable
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountBase64) {
  console.error('Firebase service account key not found in environment variables.');
  process.exit(1); // Exit if the environment variable is not set
}

// Decode the Base64 string and parse the JSON
const serviceAccountJson = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf-8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountJson),
});

const db = admin.firestore();

// Initialize the Express application
const app = express();

// Middleware to handle JSON requests
app.use(express.json());
app.use(cors());

// Route to add an order number
app.post('/add-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      // If the order number already exists, return a message
      return res.status(400).json({ success: false, message: 'Order number already exists.' });
    }

    // Add the new order number to the database
    await docRef.set({
      orderNumber: orderNumber, // Explicitly store the order number
      hasPlayed: false, // Default status
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send the response including the order number
    res.json({
      success: true,
      message: 'Order number successfully recorded.',
      orderNumber: orderNumber, // Include the order number in the response
      hasPlayed: false,
      timestamp: new Date().toISOString(), // Optionally include the timestamp in ISO format
    });
  } catch (error) {
    console.error('Error adding order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
