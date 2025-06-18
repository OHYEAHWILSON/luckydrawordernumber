import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import cors from 'cors';
import { Parser } from 'json2csv'; // Import json2csv library
import { DateTime } from 'luxon'; // Import Luxon for timezone handling

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
app.use(cors({
  origin: 'https://aibasetechnology.com',
  credentials: true
}));

// Route to check and validate the order number
app.post('/check-order-number', async (req, res) => {
  try {
    const { orderNumber } = req.body;

    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order number is required.' });
    }

    const docRef = db.collection('orderNumbers').doc(orderNumber);
    const docSnapshot = await docRef.get();

    if (docSnapshot.exists) {
      // If the order number already exists in the database, block further attempts
      return res.status(400).json({ success: false, message: 'This order number has already been used. Please contact support.' });
    }

    // Add the new order number to the database with Toronto time
    const torontoTimestamp = DateTime.now().setZone('America/Toronto').toISO(); // Get Toronto time
    await docRef.set({
      hasPlayed: false, // Default status for first use
      timestamp: torontoTimestamp, // Save the Toronto-adjusted timestamp
    });

    // Respond with a success message
    res.json({ success: true, message: 'Order number successfully recorded. Proceed to the draw.' });

  } catch (error) {
    console.error('Error checking order number:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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

    // Add the new order number to the database with Toronto time
    const torontoTimestamp = DateTime.now().setZone('America/Toronto').toISO(); // Get Toronto time
    await docRef.set({
      orderNumber: orderNumber, // Explicitly store the order number
      hasPlayed: false, // Default status
      timestamp: torontoTimestamp, // Save the Toronto-adjusted timestamp
    });

    // Log document data after it is saved
    const savedDoc = await docRef.get();
    console.log('Saved document data:', savedDoc.data());

    // Send the response including the order number and Toronto timestamp
    res.json({
      success: true,
      message: 'Order number successfully recorded.',
      orderNumber: savedDoc.data().orderNumber, // Explicitly return the order number from Firestore
      hasPlayed: savedDoc.data().hasPlayed,
      timestamp: torontoTimestamp, // Use the Toronto time you set
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

// Route to get order numbers
app.get('/get-order-numbers', async (req, res) => {
  try {
    const snapshot = await db.collection('orderNumbers').get();
    const orderNumbers = [];

    snapshot.forEach((doc) => {
      orderNumbers.push(doc.data());
    });

    if (orderNumbers.length === 0) {
      return res.status(404).json({ success: false, message: 'No order numbers found.' });
    }

    res.json({ success: true, data: orderNumbers });
  } catch (error) {
    console.error('Error fetching order numbers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Wake-up ping route to prevent server from sleeping
app.get('/keep-alive', (req, res) => {
  console.log('Received a keep-alive ping');
  res.send('Server is alive');
});
