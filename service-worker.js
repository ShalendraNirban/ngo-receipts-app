<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Divyajyoti NGO - Receipts & Payments</title>
    <!-- Tailwind CSS CDN for styling -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Inter font from Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <!-- Web App Manifest -->
    <link rel="manifest" href="manifest.json">
    <!-- Theme color for browser UI -->
    <meta name="theme-color" content="#4CAF50">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f0fdf4; /* Light green background */
        }
        /* Custom scrollbar for table */
        .table-container::-webkit-scrollbar {
            height: 8px;
        }
        .table-container::-webkit-scrollbar-track {
            background: #e0e0e0;
            border-radius: 10px;
        }
        .table-container::-webkit-scrollbar-thumb {
            background: #a7f3d0; /* Tailwind green-200 */
            border-radius: 10px;
        }
        .table-container::-webkit-scrollbar-thumb:hover {
            background: #6ee7b7; /* Tailwind green-300 */
        }

        /* Styles for printing */
        @media print {
            body * {
                visibility: hidden;
            }
            #voucher-section, #voucher-section * {
                visibility: visible;
            }
            #voucher-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                padding: 20px;
                box-sizing: border-box;
                color: #000; /* Ensure text is black for printing */
            }
            .no-print {
                display: none !important;
            }
        }
    </style>
    <!-- Firebase SDKs -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, addDoc, onSnapshot, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Global Firebase variables
        window.firebaseApp = null;
        window.db = null;
        window.auth = null;
        window.currentUserId = null;
        window.isAuthReady = false;

        // Initialize Firebase
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

        if (Object.keys(firebaseConfig).length > 0) {
            window.firebaseApp = initializeApp(firebaseConfig);
            window.db = getFirestore(window.firebaseApp);
            window.auth = getAuth(window.firebaseApp);

            // Authenticate user
            onAuthStateChanged(window.auth, async (user) => {
                if (user) {
                    window.currentUserId = user.uid;
                    console.log('User signed in:', window.currentUserId);
                } else {
                    // Sign in anonymously if no user is logged in
                    try {
                        if (typeof __initial_auth_token !== 'undefined') {
                            await signInWithCustomToken(window.auth, __initial_auth_token);
                        } else {
                            await signInAnonymously(window.auth);
                        }
                        window.currentUserId = window.auth.currentUser?.uid || crypto.randomUUID();
                        console.log('Signed in anonymously or with custom token:', window.currentUserId);
                    } catch (error) {
                        console.error("Firebase authentication failed:", error);
                        // Fallback to a random UUID if authentication fails completely
                        window.currentUserId = crypto.randomUUID();
                    }
                }
                window.isAuthReady = true;
                document.getElementById('userIdDisplay').textContent = `User ID: ${window.currentUserId}`;
                // Now that auth is ready, load transactions
                loadTransactions();
            });
        } else {
            console.error("Firebase config is missing. Data will not be persisted.");
            window.isAuthReady = true; // Mark as ready even without Firebase for basic functionality
            window.currentUserId = crypto.randomUUID(); // Assign a random ID if Firebase isn't configured
            document.getElementById('userIdDisplay').textContent = `User ID: ${window.currentUserId} (No Persistence)`;
            // Load transactions (will be empty without persistence)
            loadTransactions();
        }

        // Function to load transactions from Firestore
        async function loadTransactions() {
            if (!window.db || !window.isAuthReady || !window.currentUserId) {
                console.log("Firestore not ready or user not authenticated. Cannot load transactions.");
                return;
            }

            const transactionsCollectionRef = collection(window.db, `artifacts/${appId}/users/${window.currentUserId}/transactions`);
            const q = query(transactionsCollectionRef); // No orderBy to avoid index issues

            onSnapshot(q, (snapshot) => {
                const transactions = [];
                let calculatedBalance = 0;
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    transactions.push({ id: doc.id, ...data });
                });

                // Sort transactions by date in memory (Firestore orderBy avoided)
                transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

                // Clear existing table rows except the header
                // We keep the first row which is the static header row in the HTML
                while (transactionTableBody.rows.length > 1) {
                    transactionTableBody.deleteRow(1);
                }

                // Add opening balance row
                addTransactionToTable('DD/MM/YYYY', 'Opening Balance', '-', '-', 0, 0, 0, 'Start of financial year', false);

                // Populate table with fetched transactions and recalculate balance
                transactions.forEach(transaction => {
                    calculatedBalance += (transaction.receipts || 0) - (transaction.payments || 0);
                    addTransactionToTable(
                        transaction.date,
                        transaction.particulars,
                        transaction.transactionType,
                        transaction.mode,
                        transaction.receipts,
                        transaction.payments,
                        calculatedBalance, // Use calculated balance
                        transaction.remarks,
                        false // Don't save again
                    );
                });
                window.currentBalance = calculatedBalance; // Update global balance
            }, (error) => {
                console.error("Error fetching transactions:", error);
            });
        }

        // Make loadTransactions accessible globally
        window.loadTransactions = loadTransactions;
    </script>
</head>
<body class="min-h-screen flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-emerald-100">
    <div class="w-full max-w-6xl bg-white p-6 md:p-8 rounded-xl shadow-2xl border border-green-200">
        <header class="text-center mb-8">
            <h1 class="text-4xl md:text-5xl font-extrabold text-emerald-700 mb-2">Divyajyoti Diristhihin Sewa Sansthan</h1>
            <p class="text-xl md:text-2xl text-green-600">Receipts & Payments Record</p>
            <p class="text-md text-gray-600 mt-2">Track all incoming and outgoing financial transactions.</p>
            <p id="userIdDisplay" class="text-xs text-gray-400 mt-1"></p>
        </header>

        <section class="mb-8 no-print">
            <h2 class="text-2xl font-bold text-green-700 mb-4">Enter New Transaction:</h2>
            <form id="transactionForm" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="date" class="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" id="date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2" required>
                </div>
                <div>
                    <label for="particulars" class="block text-sm font-medium text-gray-700">Particulars/Description</label>
                    <input type="text" id="particulars" placeholder="e.g., Donation from Mr. Sharma" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2" required>
                </div>
                <div>
                    <label for="transactionType" class="block text-sm font-medium text-gray-700">Transaction Type</label>
                    <select id="transactionType" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2" required>
                        <option value="">Select Type</option>
                        <option value="Donation">Donation</option>
                        <option value="Grant">Grant</option>
                        <option value="Membership Fee">Membership Fee</option>
                        <option value="Salary">Salary</option>
                        <option value="Rent">Rent</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Program Expense">Program Expense</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label for="mode" class="block text-sm font-medium text-gray-700">Mode</label>
                    <select id="mode" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2" required>
                        <option value="">Select Mode</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online Payment">Online Payment</option>
                    </select>
                </div>
                <div>
                    <label for="receipts" class="block text-sm font-medium text-gray-700">Receipts (INR)</label>
                    <input type="number" id="receipts" value="0" min="0" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2">
                </div>
                <div>
                    <label for="payments" class="block text-sm font-medium text-gray-700">Payments (INR)</label>
                    <input type="number" id="payments" value="0" min="0" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2">
                </div>
                <div class="md:col-span-2">
                    <label for="remarks" class="block text-sm font-medium text-gray-700">Remarks</label>
                    <textarea id="remarks" rows="2" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2"></textarea>
                </div>
                <div class="md:col-span-2 flex justify-center space-x-4 mt-4">
                    <button type="button" id="generateVoucherBtn" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200">
                        Generate Voucher
                    </button>
                    <button type="button" id="clearFormBtn" class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all duration-200">
                        Clear Form
                    </button>
                </div>
            </form>
        </section>

        <!-- Voucher Display Section -->
        <section id="voucher-section" class="hidden mb-8 p-6 border border-green-300 rounded-lg shadow-lg bg-white">
            <div class="text-center mb-6">
                <h2 class="text-3xl font-bold text-emerald-800 mb-1">Divyajyoti Diristhihin Sewa Sansthan</h2>
                <p class="text-lg text-gray-700">Receipt/Payment Voucher</p>
                <div class="border-b-2 border-green-400 my-4"></div>
            </div>

            <div class="grid grid-cols-2 gap-4 text-gray-800 text-base mb-6">
                <div>
                    <p><strong>Voucher ID:</strong> <span id="voucherId"></span></p>
                    <p><strong>Date:</strong> <span id="voucherDate"></span></p>
                </div>
                <div class="text-right">
                    <p><strong>Type:</strong> <span id="voucherType"></span></p>
                    <p><strong>Mode:</strong> <span id="voucherMode"></span></p>
                </div>
            </div>

            <div class="mb-6">
                <p class="text-gray-800 text-base"><strong>Particulars/Description:</strong> <span id="voucherParticulars" class="font-semibold"></span></p>
            </div>

            <div class="grid grid-cols-2 gap-4 text-gray-800 text-base mb-8">
                <div>
                    <p><strong>Receipts (INR):</strong> <span id="voucherReceipts" class="text-green-700 font-bold text-xl"></span></p>
                </div>
                <div class="text-right">
                    <p><strong>Payments (INR):</strong> <span id="voucherPayments" class="text-red-700 font-bold text-xl"></span></p>
                </div>
            </div>

            <div class="mb-8">
                <p class="text-gray-800 text-base"><strong>Remarks:</strong> <span id="voucherRemarks"></span></p>
            </div>

            <div class="flex justify-between text-gray-800 text-base mt-12">
                <div class="text-center">
                    <p>_________________________</p>
                    <p>Prepared By</p>
                </div>
                <div class="text-center">
                    <p>_________________________</p>
                    <p>Authorized Signatory</p>
                </div>
            </div>
        </section>

        <div class="flex justify-center mt-4 mb-8 no-print">
            <button id="printVoucherBtn" class="hidden inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200">
                Print Voucher
            </button>
        </div>

        <div class="overflow-x-auto rounded-lg shadow-inner border border-green-100 table-container no-print">
            <h2 class="text-2xl font-bold text-green-700 mb-4 p-4">Transaction History:</h2>
            <table class="min-w-full divide-y divide-green-200">
                <thead class="bg-green-100">
                    <tr>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider rounded-tl-lg">Date</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Particulars/Description</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Transaction Type</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Mode</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Receipts (INR)</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Payments (INR)</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider">Balance (INR)</th>
                        <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider rounded-tr-lg">Remarks</th>
                    </tr>
                </thead>
                <tbody id="transactionTableBody" class="bg-white divide-y divide-gray-200">
                    <!-- Data will be dynamically added here by JavaScript -->
                </tbody>
            </table>
        </div>
        <footer class="mt-8 text-center text-gray-500 text-sm no-print">
            &copy; 2025 Divyajyoti Diristhihin Sewa Sansthan. All rights reserved.
        </footer>
    </div>

    <script type="module">
        // Import Firebase modules (already imported in head, but good practice to show here too if needed elsewhere)
        import { getFirestore, addDoc, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // IMPORTANT: This URL is now pre-filled with your deployed Google Apps Script Web App URL.
        const GOOGLE_APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwQZXulQaZHZIFR1zT6k-Fxs-nBW0PDTVAgtpAhUoojjmv2gsKato13PaLlRhJwj1Ut/exec';

        const transactionForm = document.getElementById('transactionForm');
        const generateVoucherBtn = document.getElementById('generateVoucherBtn');
        const clearFormBtn = document.getElementById('clearFormBtn');
        const printVoucherBtn = document.getElementById('printVoucherBtn');
        const voucherSection = document.getElementById('voucher-section');
        const transactionTableBody = document.getElementById('transactionTableBody');

        // currentBalance will be managed by Firestore data now, initialized to 0 for display until data loads
        window.currentBalance = 0;

        // Function to generate a unique voucher ID
        function generateVoucherId() {
            const timestamp = Date.now().toString(36);
            const randomString = Math.random().toString(36).substring(2, 7);
            return `VOUCHER-${timestamp}-${randomString.toUpperCase()}`;
        }

        // Function to format date for display
        function formatDate(dateString) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        }

        // Function to add a transaction to Firestore
        async function addTransactionToFirestore(transactionData) {
            if (!window.db || !window.isAuthReady || !window.currentUserId) {
                console.error("Firestore not ready or user not authenticated. Cannot save transaction.");
                displayMessage("Error: Cannot save transaction to Firestore. Firebase not configured or user not authenticated.", "error");
                return;
            }
            try {
                const transactionsCollectionRef = collection(window.db, `artifacts/${window.__app_id}/users/${window.currentUserId}/transactions`);
                await addDoc(transactionsCollectionRef, transactionData);
                console.log("Transaction added to Firestore!");
                displayMessage("Transaction saved to Firestore successfully!", "success");
            } catch (e) {
                console.error("Error adding document to Firestore: ", e);
                displayMessage(`Error saving transaction to Firestore: ${e.message}`, "error");
            }
        }

        // Function to send transaction data to Google Apps Script for backup
        async function backupToGoogleSheet(transactionData) {
            if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL) {
                console.warn("Google Apps Script Web App URL is not configured. Skipping Google Sheet backup.");
                displayMessage("Warning: Google Sheet backup URL is not set. Data will only be saved to the app.", "info");
                return;
            }

            try {
                const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(transactionData),
                });

                const result = await response.json();
                if (result.status === 'SUCCESS') {
                    console.log("Data backed up to Google Sheet:", result.message);
                    displayMessage("Data backed up to Google Sheet successfully!", "success");
                } else {
                    console.error("Error backing up to Google Sheet:", result.message);
                    displayMessage(`Error backing up to Google Sheet: ${result.message}`, "error");
                }
            } catch (error) {
                console.error("Network or other error during Google Sheet backup:", error);
                displayMessage(`Network error during Google Sheet backup: ${error.message}`, "error");
            }
        }

        // Function to display messages (replaces alert)
        function displayMessage(message, type = "info") {
            const messageBox = document.createElement('div');
            messageBox.textContent = message;
            messageBox.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg text-white z-50`;
            if (type === "error") {
                messageBox.classList.add('bg-red-500');
            } else if (type === "success") {
                messageBox.classList.add('bg-green-500');
            } else {
                messageBox.classList.add('bg-blue-500');
            }
            document.body.appendChild(messageBox);
            setTimeout(() => {
                messageBox.remove();
            }, 5000); // Message disappears after 5 seconds
        }


        // Function to generate the voucher and save to Firestore and Google Sheet
        generateVoucherBtn.addEventListener('click', async () => {
            const date = document.getElementById('date').value;
            const particulars = document.getElementById('particulars').value;
            const transactionType = document.getElementById('transactionType').value;
            const mode = document.getElementById('mode').value;
            const receipts = parseFloat(document.getElementById('receipts').value) || 0;
            const payments = parseFloat(document.getElementById('payments').value) || 0;
            const remarks = document.getElementById('remarks').value;

            // Basic validation
            if (!date || !particulars || !transactionType || !mode || (receipts === 0 && payments === 0)) {
                displayMessage('Please fill in all required fields (Date, Particulars, Type, Mode, and at least one of Receipts/Payments).', 'error');
                return;
            }

            const transactionData = {
                date: date,
                particulars: particulars,
                transactionType: transactionType,
                mode: mode,
                receipts: receipts,
                payments: payments,
                remarks: remarks,
                timestamp: new Date().toISOString() // Add a timestamp for consistent ordering
            };

            // Save to Firestore (main persistence)
            await addTransactionToFirestore(transactionData);

            // Backup to Google Sheet (secondary backup)
            await backupToGoogleSheet(transactionData);

            // Populate voucher details (these will be based on the form data just submitted)
            document.getElementById('voucherId').textContent = generateVoucherId();
            document.getElementById('voucherDate').textContent = formatDate(date);
            document.getElementById('voucherType').textContent = transactionType;
            document.getElementById('voucherMode').textContent = mode;
            document.getElementById('voucherParticulars').textContent = particulars;
            document.getElementById('voucherReceipts').textContent = receipts.toFixed(2);
            document.getElementById('voucherPayments').textContent = payments.toFixed(2);
            document.getElementById('voucherRemarks').textContent = remarks || 'N/A';

            // Show voucher section and print button
            voucherSection.classList.remove('hidden');
            printVoucherBtn.classList.remove('hidden');
        });

        // Function to clear the form
        clearFormBtn.addEventListener('click', () => {
            transactionForm.reset();
            voucherSection.classList.add('hidden'); // Hide voucher section
            printVoucherBtn.classList.add('hidden'); // Hide print button
        });

        // Function to print the voucher
        printVoucherBtn.addEventListener('click', () => {
            window.print();
        });

        // Function to add a transaction to the history table (from Firestore or new entry)
        function addTransactionToTable(date, particulars, type, mode, receipts, payments, balance, remarks, isNewEntry = true) {
            const newRow = transactionTableBody.insertRow(-1); // Add to the end of the table

            newRow.classList.add('hover:bg-green-50');

            newRow.insertCell(0).textContent = date;
            newRow.insertCell(1).textContent = particulars;
            newRow.insertCell(2).textContent = type;
            newRow.insertCell(3).textContent = mode;
            newRow.insertCell(4).textContent = receipts.toFixed(2);
            newRow.insertCell(5).textContent = payments.toFixed(2);
            newRow.insertCell(6).textContent = balance.toFixed(2);
            newRow.insertCell(7).textContent = remarks || '';
        }

        // Service Worker registration (kept here for completeness, already in head)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }
    </script>
</body>
</html>

<!-- manifest.json -->
```json
{
    "name": "Divyajyoti NGO Records",
    "short_name": "NGO Records",
    "description": "Receipts and Payments Record for Divyajyoti Diristhihin Sewa Sansthan",
    "start_url": "./index.html",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#4CAF50",
    "icons": [
        {
            "src": "[https://placehold.co/192x192/4CAF50/ffffff?text=NGO](https://placehold.co/192x192/4CAF50/ffffff?text=NGO)",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "[https://placehold.co/512x512/4CAF50/ffffff?text=NGO](https://placehold.co/512x512/4CAF50/ffffff?text=NGO)",
            "sizes": "512x512",
            "type": "image/png"
        }
    ]
}
```javascript
// service-worker.js
const CACHE_NAME = 'ngo-records-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMwM.woff2' // Example font file
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // No cache hit - fetch from network
                return fetch(event.request).catch(() => {
                    // If network fails and it's a navigation request, show an offline page if available
                    if (event.request.mode === 'navigate') {
                        // You could return a specific offline.html here if you had one
                        // return caches.match('/offline.html');
                    }
                    return new Response('<h1>Offline</h1><p>You are offline and this content is not cached.</p>', {
                        headers: { 'Content-Type': 'text/html' }
                    });
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                    return null; // Keep the cache if it's in the whitelist
                })
            );
        })
    );
});
