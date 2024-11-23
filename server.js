import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import cors from 'cors';
import { Parser } from 'json2csv'; // Import json2csv library

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

// Route to check and validate the order number
app.post('/check-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body; // Only receive the order number

    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order number is required.' });
    }

    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      // If the order number already exists in the database, block further attempts
      return res.status(400).json({ success: false, message: 'This order number has already been used. Please contact support.' });
    }

    // Add the new order number to the database
    await docRef.set({
      hasPlayed: false, // Default status for first use
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // Save the timestamp
    });

    // Respond with a success message
    res.json({ success: true, message: 'Order number successfully recorded. Proceed to the draw.' });

  } catch (error) {
    console.error('Error checking order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to add a new order number (added this route)
app.post('/add-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body; // Get the order number from the request body

    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order number is required.' });
    }

    // Check if the order number already exists in Firestore
    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      return res.status(400).json({ success: false, message: 'Order number already exists.' });
    }

    // If it doesn't exist, add it to Firestore
    await docRef.set({
      hasPlayed: false, // Set initial status
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // Add timestamp
    });

    res.json({ success: true, message: 'Order number added successfully.' });
  } catch (error) {
    console.error('Error adding order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015; // Ensure using dynamic port assignment
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Route to export order numbers as CSV
app.get('/export-order-numbers', async (req, res) => {
  try {
    // Fetch all documents from the 'orderNumbers' collection
    const snapshot = await db.collection('orderNumbers').get();
    const orderNumbers = [];

    snapshot.forEach((doc) => {
      orderNumbers.push(doc.data()); // Push each document's data to the array
    });

    // If no order numbers are found, send a 404 response
    if (orderNumbers.length === 0) {
      return res.status(404).send('No order numbers found.');
    }

    // Convert the JSON data to CSV format using json2csv
    const csvParser = new Parser();
    const csvData = csvParser.parse(orderNumbers);

    // Set the response headers to indicate a CSV file download
    res.header('Content-Type', 'text/csv');
    res.attachment('orderNumbers.csv');
    res.send(csvData); // Send the CSV data as the response
  } catch (error) {
    console.error('Error exporting data to CSV:', error);
    res.status(500).send('Error exporting data to CSV.');
  }
});

// Wake-up ping route to prevent server from sleeping
app.get('/keep-alive', (req, res) => {
  console.log('Received a keep-alive ping');
  res.send('Server is alive');
});
