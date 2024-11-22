import express from 'express'; // Import Express
import admin from 'firebase-admin'; // Import Firebase Admin
import dotenv from 'dotenv'; // Import dotenv for environment variables
import cors from 'cors'; // Import CORS for handling cross-origin requests

dotenv.config(); // Load environment variables

// Initialize Firebase Admin SDK with the service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // Firestore database instance
const app = express(); // Create an Express app

// Middleware to handle JSON requests
app.use(express.json());
app.use(cors()); // Use CORS to allow cross-origin requests

// Step 1: Sales rep submits the order number
app.post('/submit-order-number', async (req, res) => {
    try {
        const { orderNumber } = req.body; // Get the order number from the request body

        // Validate input
        if (!orderNumber) {
            return res.status(400).json({ success: false, message: 'Order number is required' });
        }

        // Check if order number already exists (this ensures it is only entered once)
        const orderRef = db.collection('orders').doc(orderNumber); // Reference to the order in Firestore
        const doc = await orderRef.get(); // Get the document

        if (doc.exists) {
            // Order number already exists (meaning it's already submitted)
            return res.status(400).json({ success: false, message: 'Order number already exists' });
        }

        // Save the order number to Firestore as "unused"
        await orderRef.set({ used: false });

        res.json({ success: true, message: 'Order number saved successfully' });
    } catch (error) {
        console.error('Error processing order number:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Step 2 & 3: Customer enters order number to check if it's valid and play the lucky draw
app.post('/play-lucky-draw', async (req, res) => {
    try {
        const { orderNumber } = req.body; // Get the order number from the request body

        // Validate input
        if (!orderNumber) {
            return res.status(400).json({ success: false, message: 'Order number is required' });
        }

        // Check if the order number exists in Firestore
        const orderRef = db.collection('orders').doc(orderNumber);
        const doc = await orderRef.get();

        if (!doc.exists) {
            // Order number doesn't exist
            return res.status(400).json({ success: false, message: 'Invalid order number' });
        }

        if (doc.data().used) {
            // Order number has already been used (Step 2 check)
            return res.status(400).json({ success: false, message: 'Order number already used' });
        }

        // Step 3: Simulate lucky draw (you can replace this with your actual logic for the draw)
        const results = ['Prize 1', 'Prize 2', 'Prize 3', 'Prize 4'];
        const result = results[Math.floor(Math.random() * results.length)];

        // Step 4: Mark order as used and record the draw result
        await orderRef.update({ used: true, drawResult: result, timestamp: admin.firestore.FieldValue.serverTimestamp() });

        res.json({ success: true, message: 'Lucky draw completed', drawResult: result });
    } catch (error) {
        console.error('Error processing lucky draw:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Set up the port for the server to listen on
const PORT = process.env.PORT || 5015;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
