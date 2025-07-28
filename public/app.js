// Global variables
let socket;
let playerData = null;
let gameState = {
    status: 'waiting',
    currentRound: null,
    multiplier: 1.0,
    hasActiveBet: false
};
let cryptoPrices = { btc: 0, eth: 0 };
let chartData = [];
let chart = null;

// DOM elements
const elements = {
    // Game elements
    gameStatus: document.getElementById('gameStatus'),
    multiplierValue: document.getElementById('multiplierValue'),
    multiplierDisplay: document.getElementById('multiplierDisplay'),
    gameChart: document.getElementById('gameChart'),
    bettingInterface: document.getElementById('bettingInterface'),
    cashoutInterface: document.getElementById('cashoutInterface'),
    gameArea: document.getElementById('gameArea'),
    
    // Form elements
    betAmount: document.getElementById('betAmount'),
    betCurrency: document.getElementById('betCurrency'),
    placeBetBtn: document.getElementById('placeBetBtn'),
    cashoutBtn: document.getElementById('cashoutBtn'),
    currentMultiplier: document.getElementById('currentMultiplier'),
    potentialWin: document.getElementById('potentialWin'),
    
    // Player elements
    playerName: document.getElementById('playerName'),
    usdBalance: document.getElementById('usdBalance'),
    btcBalance: document.getElementById('btcBalance'),
    ethBalance: document.getElementById('ethBalance'),
    
    // Header elements
    connectedPlayers: document.getElementById('connectedPlayers'),
    btcPrice: document.getElementById('btcPrice'),
    ethPrice: document.getElementById('ethPrice'),
    
    // Activity elements
    activityList: document.getElementById('activityList'),
    historyList: document.getElementById('historyList'),
    
    // Modal elements
    authModal: document.getElementById('authModal'),
    username: document.getElementById('username'),
    playerId: document.getElementById('playerId'),
    joinGameBtn: document.getElementById('joinGameBtn'),
    
    // Toast elements
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    toastClose: document.getElementById('toastClose')
};

// Initialize the application
function init() {
    setupEventListeners();
    showAuthModal();
    initializeChart();
}

// Setup event listeners
function setupEventListeners() {
    // Betting
    elements.placeBetBtn.addEventListener('click', placeBet);
    elements.cashoutBtn.addEventListener('click', cashout);
    
    // Authentication
    elements.joinGameBtn.addEventListener('click', joinGame);
    
    // Toast
    elements.toastClose.addEventListener('click', hideToast);
    
    // Form inputs
    elements.betAmount.addEventListener('input', updatePotentialWin);
    elements.betCurrency.addEventListener('change', updatePotentialWin);
}

// Show authentication modal
function showAuthModal() {
    elements.authModal.style.display = 'flex';
    elements.username.focus();
}

// Hide authentication modal
function hideAuthModal() {
    elements.authModal.style.display = 'none';
}

// Join game
function joinGame() {
    const username = elements.username.value.trim();
    const playerId = elements.playerId.value.trim();
    
    if (!username || !playerId) {
        showToast('Please enter both username and player ID', 'error');
        return;
    }
    
    playerData = { username, playerId };
    elements.playerName.textContent = username;
    
    // Connect to WebSocket
    connectWebSocket();
    hideAuthModal();
    
    showToast(`Welcome, ${username}!`, 'success');
}

// Connect to WebSocket
function connectWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
        // Authenticate with server
        socket.emit('authenticate', playerData);
    });
    
    socket.on('authenticated', (data) => {
        console.log('Authenticated:', data);
        updateConnectedPlayers(data.connectedPlayers);
        loadPlayerBalance();
    });
    
    socket.on('gameState', (state) => {
        console.log('Game state received:', state);
        updateGameState(state);
    });
    
    socket.on('roundStart', (data) => {
        console.log('Round started:', data);
        handleRoundStart(data);
    });
    
    socket.on('roundActivated', (data) => {
        console.log('Round activated:', data);
        handleRoundActivated(data);
    });
    
    socket.on('multiplierUpdate', (data) => {
        console.log('Multiplier update:', data);
        updateMultiplier(data.multiplier);
        updateChart(data.multiplier);
    });
    
    socket.on('roundCrashed', (data) => {
        console.log('Round crashed:', data);
        handleRoundCrashed(data);
    });
    
    socket.on('betPlaced', (data) => {
        console.log('Bet placed:', data);
        handleBetPlaced(data);
    });
    
    socket.on('cashoutProcessed', (data) => {
        console.log('Cashout processed:', data);
        handleCashoutProcessed(data);
    });
    
    socket.on('playerJoined', (data) => {
        console.log('Player joined:', data);
        updateConnectedPlayers(data.connectedPlayers);
        addActivity(`Player ${data.username} joined the game`);
    });
    
    socket.on('playerLeft', (data) => {
        console.log('Player left:', data);
        updateConnectedPlayers(data.connectedPlayers);
        addActivity(`Player ${data.username} left the game`);
    });
    
    socket.on('cryptoPrices', (prices) => {
        console.log('Crypto prices:', prices);
        updateCryptoPrices(prices);
    });
    
    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showToast(data.message, 'error');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showToast('Connection lost. Reconnecting...', 'warning');
    });
}

// Place bet
function placeBet() {
    if (!playerData) {
        showToast('Please join the game first', 'error');
        return;
    }
    
    const amount = parseFloat(elements.betAmount.value);
    const currency = elements.betCurrency.value;
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid bet amount', 'error');
        return;
    }
    
    if (gameState.status !== 'waiting') {
        showToast('No active round accepting bets', 'error');
        return;
    }
    
    elements.placeBetBtn.disabled = true;
    elements.placeBetBtn.textContent = 'Placing Bet...';
    
    socket.emit('placeBet', {
        usdAmount: amount,
        currency: currency,
        playerId: playerData.playerId,
        username: playerData.username
    });
}

// Cashout
function cashout() {
    if (!playerData) {
        showToast('Please join the game first', 'error');
        return;
    }
    
    if (!gameState.hasActiveBet) {
        showToast('No active bet to cash out', 'error');
        return;
    }
    
    elements.cashoutBtn.disabled = true;
    elements.cashoutBtn.textContent = 'Cashing Out...';
    
    socket.emit('cashout', {
        playerId: playerData.playerId,
        username: playerData.username
    });
}

// Handle round start
function handleRoundStart(data) {
    gameState.status = 'waiting';
    gameState.currentRound = data;
    gameState.hasActiveBet = false;
    
    updateGameStatus('Waiting for bets...');
    showBettingInterface();
    resetChart();
    
    addActivity(`New round started (${data.roundId})`);
    addHistoryItem(`Round ${data.roundId}`, 'Waiting');
}

// Handle round activated
function handleRoundActivated(data) {
    gameState.status = 'active';
    gameState.multiplier = 1.0;
    
    updateGameStatus('Game in progress...');
    hideBettingInterface();
    showCashoutInterface();
    
    if (elements.gameArea) {
        elements.gameArea.classList.add('game-active');
        elements.gameArea.classList.remove('game-crashed');
    }
    
    addActivity('Round activated - multiplier increasing!');
}

// Handle round crashed
function handleRoundCrashed(data) {
    gameState.status = 'crashed';
    gameState.hasActiveBet = false;
    
    updateGameStatus(`Crashed at ${data.crashPoint.toFixed(2)}x`);
    hideCashoutInterface();
    showBettingInterface();
    
    if (elements.gameArea) {
        elements.gameArea.classList.add('game-crashed');
        elements.gameArea.classList.remove('game-active');
    }
    
    addActivity(`Round crashed at ${data.crashPoint.toFixed(2)}x`);
    updateHistoryItem(data.roundId, `Crashed at ${data.crashPoint.toFixed(2)}x`);
    
    // Reset after 3 seconds
    setTimeout(() => {
        if (elements.gameArea) {
            elements.gameArea.classList.remove('game-crashed');
        }
    }, 3000);
}

// Handle bet placed
function handleBetPlaced(data) {
    if (data.playerId === playerData.playerId) {
        gameState.hasActiveBet = true;
        elements.placeBetBtn.disabled = false;
        elements.placeBetBtn.textContent = 'Place Bet';
        
        showToast(`Bet placed: $${data.usdAmount} in ${data.currency.toUpperCase()}`, 'success');
        updatePlayerBalance(data.playerBalance);
    }
    
    addActivity(`${data.username} bet $${data.usdAmount} in ${data.currency.toUpperCase()}`);
}

// Handle cashout processed
function handleCashoutProcessed(data) {
    if (data.playerId === playerData.playerId) {
        gameState.hasActiveBet = false;
        elements.cashoutBtn.disabled = false;
        elements.cashoutBtn.textContent = 'Cash Out';
        
        showToast(`Cashed out at ${data.multiplier.toFixed(2)}x for $${data.payoutUsd.toFixed(2)}!`, 'success');
        updatePlayerBalance(data.playerBalance);
    }
    
    addActivity(`${data.username} cashed out at ${data.multiplier.toFixed(2)}x for $${data.payoutUsd.toFixed(2)}`);
}

// Update game state
function updateGameState(state) {
    gameState = { ...gameState, ...state };
    
    if (state.currentRound) {
        gameState.currentRound = state.currentRound;
    }
    
    updateGameStatus(getStatusText(state.status));
    
    if (state.status === 'waiting') {
        showBettingInterface();
        hideCashoutInterface();
    } else if (state.status === 'active') {
        hideBettingInterface();
        showCashoutInterface();
    }
}

// Update game status
function updateGameStatus(status) {
    const statusText = elements.gameStatus.querySelector('.status-text');
    statusText.textContent = status;
}

// Update multiplier
function updateMultiplier(multiplier) {
    gameState.multiplier = multiplier;
    elements.multiplierValue.textContent = `${multiplier.toFixed(2)}x`;
    elements.currentMultiplier.textContent = `${multiplier.toFixed(2)}x`;
    
    if (gameState.hasActiveBet) {
        updatePotentialWin();
    }
}

// Update crypto prices
function updateCryptoPrices(prices) {
    cryptoPrices = prices;
    elements.btcPrice.textContent = `$${prices.btc.toLocaleString()}`;
    elements.ethPrice.textContent = `$${prices.eth.toLocaleString()}`;
}

// Update connected players count
function updateConnectedPlayers(count) {
    elements.connectedPlayers.textContent = count;
}

// Update player balance
function updatePlayerBalance(balance) {
    elements.usdBalance.textContent = `$${balance.usd.toFixed(2)}`;
    elements.btcBalance.textContent = balance.btc.toFixed(8);
    elements.ethBalance.textContent = balance.eth.toFixed(6);
    // Update header wallet
    document.getElementById('headerUsdBalance').textContent = `$${balance.usd.toFixed(2)}`;
    document.getElementById('headerBtcBalance').textContent = `${balance.btc.toFixed(8)} BTC`;
    document.getElementById('headerEthBalance').textContent = `${balance.eth.toFixed(6)} ETH`;
}

// Load player balance
async function loadPlayerBalance() {
    try {
        const response = await fetch(`/api/wallet/balance/${playerData.playerId}`);
        const data = await response.json();
        
        if (data.wallet) {
            updatePlayerBalance(data.wallet);
        }
    } catch (error) {
        console.error('Error loading player balance:', error);
    }
}

// Show betting interface
function showBettingInterface() {
    elements.bettingInterface.style.display = 'block';
    elements.cashoutInterface.style.display = 'none';
}

// Hide betting interface
function hideBettingInterface() {
    elements.bettingInterface.style.display = 'none';
}

// Show cashout interface
function showCashoutInterface() {
    elements.cashoutInterface.style.display = 'block';
}

// Hide cashout interface
function hideCashoutInterface() {
    elements.cashoutInterface.style.display = 'none';
}

// Update potential win
function updatePotentialWin() {
    if (!gameState.hasActiveBet) return;
    
    const amount = parseFloat(elements.betAmount.value) || 0;
    const potentialWin = amount * gameState.multiplier;
    elements.potentialWin.textContent = `$${potentialWin.toFixed(2)}`;
}

// Add activity
function addActivity(text) {
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item fade-in';
    activityItem.innerHTML = `
        <span class="activity-text">${text}</span>
        <span class="activity-time">${getTimeString()}</span>
    `;
    
    elements.activityList.insertBefore(activityItem, elements.activityList.firstChild);
    
    // Keep only last 10 activities
    while (elements.activityList.children.length > 10) {
        elements.activityList.removeChild(elements.activityList.lastChild);
    }
}

// Add history item
function addHistoryItem(roundId, status) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item fade-in';
    historyItem.innerHTML = `
        <span class="history-text">${roundId}</span>
        <span class="history-time">${status}</span>
    `;
    
    elements.historyList.insertBefore(historyItem, elements.historyList.firstChild);
    
    // Keep only last 10 history items
    while (elements.historyList.children.length > 10) {
        elements.historyList.removeChild(elements.historyList.lastChild);
    }
}

// Update history item
function updateHistoryItem(roundId, status) {
    const historyItems = elements.historyList.querySelectorAll('.history-item');
    for (const item of historyItems) {
        const text = item.querySelector('.history-text');
        if (text.textContent.includes(roundId)) {
            const time = item.querySelector('.history-time');
            time.textContent = status;
            break;
        }
    }
}

// Initialize chart
function initializeChart() {
    const ctx = elements.gameChart.getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Multiplier',
                data: [],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    display: false
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// Update chart
function updateChart(multiplier) {
    if (!chart) return;
    
    const time = new Date().toLocaleTimeString();
    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(multiplier);
    
    // Keep only last 50 points
    if (chart.data.labels.length > 50) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    
    chart.update('none');
}

// Reset chart
function resetChart() {
    if (!chart) return;
    
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
}

// Show toast notification
function showToast(message, type = 'info') {
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast show toast-${type}`;
    
    setTimeout(() => {
        hideToast();
    }, 5000);
}

// Hide toast notification
function hideToast() {
    elements.toast.className = 'toast';
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'waiting': return 'Waiting for round...';
        case 'active': return 'Game in progress...';
        case 'crashed': return 'Game crashed!';
        default: return 'Unknown status';
    }
}

// Get time string
function getTimeString() {
    return new Date().toLocaleTimeString();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init); 