import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import cors from 'cors';
import { readFileSync } from 'fs';

// Load environment variables at the very beginning
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

const app = express();

// Middleware to handle JSON requests
app.use(express.json());
app.use(cors());

// Test route for Firestore connection
app.get('/test-firestore', async (req, res) => {
  try {
    const docRef = db.collection('testCollection').doc('testDoc');
    await docRef.set({
      message: 'Hello from Firestore!',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'Firestore is connected!' });
  } catch (error) {
    console.error('Error testing Firestore:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to add order numbers to Firestore with "hasPlayed" status
app.post('/add-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    // Check if order number already exists in the database
    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      return res.status(400).json({ success: false, message: 'This order number has already been used.' });
    } else {
      // Add the order number with "hasPlayed" status as false
      await docRef.set({
        orderNumber,
        hasPlayed: false,  // Mark as not played initially
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true, message: 'Order number added successfully with "hasPlayed" status set to false.' });
    }
  } catch (error) {
    console.error('Error adding order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 2: Customer checks if order number is used
app.post('/check-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    // Validate order number format (optional: you can adjust this regex as per your needs)
    const orderNumberPattern = /^[a-zA-Z0-9\-]+$/;  // Example: alphanumeric with hyphen
    if (!orderNumberPattern.test(orderNumber)) {
      return res.status(400).json({ success: false, error: 'Invalid order number format.' });
    }

    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      // Mark the order number as used (set "hasPlayed" to true)
      await docRef.update({ hasPlayed: true });

      return res.status(400).json({ success: false, message: 'This order number has already been used.' });
    } else {
      return res.json({ success: true, message: 'Order number is valid. Proceed with the draw.' });
    }
  } catch (error) {
    console.error('Error checking order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 4: Record draw result
app.post('/record-draw-result', async (req, res) => {
  try {
    const { orderNumber, drawResult } = req.body;
    if (!orderNumber || !drawResult) {
      return res.status(400).json({ success: false, error: 'Order number and draw result are required.' });
    }

    const docRef = db.collection('drawResults').doc(orderNumber);
    await docRef.set({
      orderNumber,
      drawResult,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark the order number as "used" after recording the draw result
    const orderRef = db.collection('orderNumbers').doc(orderNumber);
    await orderRef.update({ hasPlayed: true });

    res.json({ success: true, message: 'Draw result recorded successfully.' });
  } catch (error) {
    console.error('Error recording draw result:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015;  // Ensure using dynamic port assignment
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});