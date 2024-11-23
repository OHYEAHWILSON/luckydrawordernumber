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

// Step 1: Check if order number exists in Firestore and its status
app.post('/check-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Order number is required.' });
    }

    // Query Firestore using 'orderNumber' as a field
    const querySnapshot = await db.collection('orderNumbers').where('orderNumber', '==', orderNumber).get();

    if (querySnapshot.empty) {
      // Add the order number if it doesn't exist
      const docRef = db.collection('orderNumbers').doc(orderNumber);
      await docRef.set({
        orderNumber, // Explicitly include the order number as a field
        hasPlayed: false, // Default status
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({ success: true, message: 'Order number is valid. Proceed with the draw.' });
    }

    // Retrieve the first matching document
    const docSnapshot = querySnapshot.docs[0];
    const orderData = docSnapshot.data();

    // Check if the order number has already been used
    if (orderData.hasPlayed) {
      return res.status(400).json({ success: false, message: 'You have used your chance.' });
    }

    return res.json({ success: true, message: 'Order number is valid. Proceed with the draw.' });
  } catch (error) {
    console.error('Error checking order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Keep-Alive route to prevent server from sleeping
app.get('/keep-alive', (req, res) => {
  console.log('Received a keep-alive ping');
  res.send('Server is alive');
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015; // Ensure using dynamic port assignment
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
