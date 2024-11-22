import express from 'express'; // Import Express
import admin from 'firebase-admin'; // Import Firebase Admin
import path from 'path'; // Import path module to resolve file paths
import dotenv from 'dotenv'; // Import dotenv for environment variables
import cors from 'cors'; // Import CORS for handling cross-origin requests
import { readFileSync } from 'fs'; // Import fs to read files

dotenv.config(); // Load environment variables

// Get the Firebase service account JSON from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY); // Parse the JSON directly from the environment variable

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // Firestore database instance

const app = express(); // Create an Express app

// Middleware to handle JSON requests
app.use(express.json());
app.use(cors()); // Use CORS to allow cross-origin requests

// Route to test Firestore connection
app.get('/test-firestore', async (req, res) => {
    try {
        // Add a test document to Firestore
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

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});