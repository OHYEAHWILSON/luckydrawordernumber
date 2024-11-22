 import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import cors from 'cors';

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

// Step 2: Customer checks if order number exists and if it has been used
app.post('/check-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Order number does not exist. Please contact your sales representative.' });
    }

    const orderData = docSnapshot.data();
    if (orderData.hasPlayed) {
      return res.status(400).json({ success: false, message: 'This order number has already been used.' });
    }

    return res.json({ success: true, message: 'Order number is valid. Proceed with the draw.' });
  } catch (error) {
    console.error('Error checking order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Step 4: Record draw result and update the order number's status to 'hasPlayed'
app.post('/record-draw-result', async (req, res) => {
  try {
    const { orderNumber, drawResult } = req.body;
    if (!orderNumber || !drawResult) {
      return res.status(400).json({ success: false, error: 'Order number and draw result are required.' });
    }

    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Order number does not exist.' });
    }

    const orderData = docSnapshot.data();
    if (orderData.hasPlayed) {
      return res.status(400).json({ success: false, message: 'You have already used your chance.' });
    }

    // Update the order's status and record the draw result
    await docRef.update({
      hasPlayed: true,
      drawResult: drawResult,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: 'Draw result recorded successfully.' });
  } catch (error) {
    console.error('Error recording draw result:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015;  // Ensure using dynamic port assignment
app.listen(PORT, () => {
  console.log(Server is running on port ${PORT});
});

// Fetch draw results
app.get('/get-draw-results', async (req, res) => {
  try {
    const querySnapshot = await db.collection('drawResults').get();
    const results = [];
    
    querySnapshot.forEach(doc => {
      results.push(doc.data()); // Push each document's data to the results array
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching draw results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
