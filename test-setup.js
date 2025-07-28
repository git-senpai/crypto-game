const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testSetup() {
    console.log('🧪 Testing Crypto Crash Game Setup...\n');

    try {
        // Test 1: Check if server is running
        console.log('1. Testing server connectivity...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Server is running:', healthResponse.data);
        console.log('');

        // Test 2: Test crypto API
        console.log('2. Testing crypto API...');
        const cryptoResponse = await axios.get(`${BASE_URL}/api/crypto/prices`);
        console.log('✅ Crypto prices fetched:', cryptoResponse.data.prices);
        console.log('');

        // Test 3: Test game state
        console.log('3. Testing game state...');
        const gameStateResponse = await axios.get(`${BASE_URL}/api/game/state`);
        console.log('✅ Game state:', gameStateResponse.data.status);
        console.log('');

        // Test 4: Test wallet endpoints
        console.log('4. Testing wallet endpoints...');
        const walletResponse = await axios.get(`${BASE_URL}/api/wallet/balance/player1`);
        console.log('✅ Wallet balance fetched for player1');
        console.log('');

        // Test 5: Test database connection
        console.log('5. Testing database connection...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-crash', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Database connected successfully');
        await mongoose.connection.close();
        console.log('');

        // Test 6: Test WebSocket connection
        console.log('6. Testing WebSocket connection...');
        const io = require('socket.io-client');
        const socket = io(BASE_URL);
        
        await new Promise((resolve, reject) => {
            socket.on('connect', () => {
                console.log('✅ WebSocket connected successfully');
                socket.disconnect();
                resolve();
            });
            
            socket.on('connect_error', (error) => {
                console.log('❌ WebSocket connection failed:', error.message);
                reject(error);
            });
            
            setTimeout(() => {
                reject(new Error('WebSocket connection timeout'));
            }, 5000);
        });
        console.log('');

        console.log('🎉 All tests passed! The Crypto Crash Game is ready to use.');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Open http://localhost:3000 in your browser');
        console.log('2. Enter a username and player ID to join the game');
        console.log('3. Start playing!');
        console.log('');
        console.log('📚 For API testing, import the Postman collection:');
        console.log('   Crypto_Crash_API.postman_collection.json');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('');
        console.log('🔧 Troubleshooting:');
        console.log('1. Make sure the server is running: npm run dev');
        console.log('2. Check if MongoDB is running');
        console.log('3. Verify the .env file is configured correctly');
        console.log('4. Check the server logs for detailed error messages');
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    testSetup();
}

module.exports = testSetup; 