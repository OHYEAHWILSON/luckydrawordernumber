import express from 'express'; // Import Express
import admin from 'firebase-admin'; // Import Firebase Admin
import path from 'path'; // Import path module to resolve file paths
import dotenv from 'dotenv'; // Import dotenv for environment variables
import cors from 'cors'; // Import CORS for handling cross-origin requests
import { readFileSync } from 'fs'; // Import fs to read files

dotenv.config(); // Load environment variables

// Initialize Firebase Admin with Firestore
import { fileURLToPath } from 'url'; // Import the 'url' module to handle the file path correctly
const __filename = fileURLToPath(import.meta.url); // Get the current file path
const __dirname = path.dirname(__filename); // Get the directory name of the current file

// Read the service account JSON file using fs.readFileSync from the environment variable path
const serviceAccountPath = path.join(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8')); // Read and parse the JSON file

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

// Route to handle adding order numbers to Firestore
app.post('/add-order-number', async (req, res) => {
    try {
        const { orderNumber } = req.body;
        if (!orderNumber) {
            return res.status(400).json({ success: false, error: 'Order number is required.' });
        }

        // Add the order number to Firestore
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

