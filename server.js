import express from 'express';
import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { readFileSync } from 'fs';

dotenv.config(); // Load environment variables

// Initialize Firebase Admin with Firestore
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Route to test Firestore connection
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

// Step 1: Sales rep inputs order number
app.post('/add-order-number', async (req, res) => {
    try {
        const { orderNumber } = req.body;
        if (!orderNumber) {
            return res.status(400).json({ success: false, error: 'Order number is required.' });
        }
        const docRef = db.collection('orderNumbers').doc(orderNumber);
        await docRef.set({
            orderNumber,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({ success: true, message: 'Order number added successfully.' });
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

        const docRef = db.collection('orderNumbers').doc(orderNumber);
        const docSnapshot = await docRef.get();

        if (docSnapshot.exists) {
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

        res.json({ success: true, message: 'Draw result recorded successfully.' });
    } catch (error) {
        console.error('Error recording draw result:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
