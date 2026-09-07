// Firebase Configuration Setup
const firebaseConfig = {
  apiKey: "AIzaSyBgGd4dstPXvjLfkjzvit8e11bvcqk0yKM",
  authDomain: "tokenbot-cb17d.firebaseapp.com",
  projectId: "tokenbot-cb17d",
  storageBucket: "tokenbot-cb17d.appspot.com",
  messagingSenderId: "367253457375",
  appId: "1:668379465130:web:af92c033db0f1de2bb97d3",
  databaseURL: "https://tokenbot-cb17d-default-rtdb.firebaseio.com"
};

// Initialize Firebase Realtime Database
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// State Variables
let userId = localStorage.getItem('app_user_id');
if (!userId) {
  userId = 'user_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('app_user_id', userId);
}

let currentUsername = localStorage.getItem('app_username') || '';
let hasChangedUsername = localStorage.getItem('has_changed_username') === 'true';

const OWNER_PASSWORD = "Cris90";
let isOwnerAuthenticated = false;
let targetOwnerTarget = null; // 'code', 'token', or 'whitelist'

let customCodeOutput = null;
let customTokenOutput = null;
let whitelistedUsers = [];
let allUsersData = {};

// Cooldown Management (5 minutes = 300,000 ms)
const COOLDOWN_TIME = 5 * 60 * 1000;
let lastGeneratedTime = localStorage.getItem('last_gen_time') || 0;
let cooldownInterval = null;

// DOM Element Selections
const firstTimeSection = document.getElementById('first-time-section');
const firstTimeForm = document.getElementById('first-time-form');
const firstTimeInput = document.getElementById('first-time-input');
const mainAppWrapper = document.getElementById('main-app-wrapper');

const headerUsername = document.getElementById('header-username');
const screens = document.querySelectorAll('.screen');
const dashSection = document.getElementById('dash-section');

const btnToDashboard = document.getElementById('btn-to-dashboard');
const btnToLeaderboard = document.getElementById('btn-to-leaderboard');
const btnToChat = document.getElementById('btn-to-chat');
const btnToName = document.getElementById('btn-to-name');
const backBtns = document.querySelectorAll('.back-btn');

const btnGenCode = document.getElementById('btn-gen-code');
const btnGenToken = document.getElementById('btn-gen-token');
const btnChangeCodeMsg = document.getElementById('btn-change-code-msg');
const btnChangeTokenMsg = document.getElementById('btn-change-token-msg');
const btnCooldownList = document.getElementById('btn-cooldown-list');

const activeCountEl = document.getElementById('active-count');
const inactiveCountEl = document.getElementById('inactive-count');
const btnActiveModal = document.getElementById('btn-active-modal');
const usersModal = document.getElementById('users-modal');
const usersList = document.getElementById('users-list');
const leaderboardList = document.getElementById('leaderboard-list');
const btnCloseUsersModal = document.getElementById('btn-close-users-modal');

const genDisplay = document.getElementById('gen-display');
const genStatus = document.getElementById('gen-status');
const genResult = document.getElementById('gen-result');

const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const btnSaveName = document.getElementById('btn-save-name');

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatBox = document.getElementById('chat-box');

const ownerModal = document.getElementById('owner-modal');
const ownerForm = document.getElementById('owner-form');
const modalTitle = document.getElementById('modal-title');
const ownerPassInput = document.getElementById('owner-pass');
const ownerOverrideField = document.getElementById('owner-override-field');
const ownerNewMsgInput = document.getElementById('owner-new-msg');
const ownerStatus = document.getElementById('owner-status');
const btnCloseModal = document.getElementById('btn-close-modal');

// Initial App Entry Check
function initApp() {
  if (currentUsername) {
    firstTimeSection.classList.add('hidden');
    mainAppWrapper.classList.remove('hidden');
    headerUsername.textContent = `Welcome ${currentUsername}`;
    navigateTo('menu-section');
    setupPresenceTracking();
  } else {
    firstTimeSection.classList.remove('hidden');
    mainAppWrapper.classList.add('hidden');
  }
  checkUsernameChangeState();
}

// First-Time Form Submission Handler
firstTimeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const enteredName = firstTimeInput.value.trim();

  if (enteredName !== "") {
    currentUsername = enteredName;
    localStorage.setItem('app_username', currentUsername);

    // Hide input screen, reveal main application wrapper
    firstTimeSection.classList.add('hidden');
    mainAppWrapper.classList.remove('hidden');
    headerUsername.textContent = `Welcome ${currentUsername}`;

    // Show menu screen & sync with Firebase
    navigateTo('menu-section');
    setupPresenceTracking();
  }
});

// Firebase Realtime Data Listeners
database.ref('tokenData').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    if (data.codeOutput !== undefined) customCodeOutput = data.codeOutput;
    if (data.tokenOutput !== undefined) customTokenOutput = data.tokenOutput;
  }
});

database.ref('whitelistedUsers').on('value', (snapshot) => {
  const data = snapshot.val();
  whitelistedUsers = data ? Object.values(data) : [];
  checkCooldownState();
});

database.ref('chatMessages').limitToLast(50).on('value', (snapshot) => {
  chatBox.innerHTML = '';
  const messages = snapshot.val();
  if (messages) {
    Object.values(messages).forEach(msg => {
      const msgElement = document.createElement('div');
      msgElement.className = 'chat-msg';
      msgElement.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
      chatBox.appendChild(msgElement);
    });
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// Presence & Leaderboard System
function setupPresenceTracking() {
  if (!currentUsername) return;

  const userRef = database.ref(`users/${userId}`);
  const connectedRef = database.ref('.info/connected');

  connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
      userRef.onDisconnect().update({
        state: 'offline',
        last_changed: firebase.database.ServerValue.TIMESTAMP
      });

      userRef.update({
        username: currentUsername,
        hasChangedName: hasChangedUsername,
        state: 'online',
        last_changed: firebase.database.ServerValue.TIMESTAMP
      });
    }
  });

  database.ref('users').on('value', (snapshot) => {
    allUsersData = snapshot.val() || {};
    updatePresenceCounts();
    renderUsersList(leaderboardList);
  });
}

function updatePresenceCounts() {
  let active = 0;
  let inactive = 0;

  Object.values(allUsersData).forEach(u => {
    if (u.state === 'online') {
      active++;
    } else {
      inactive++;
    }
  });

  if (activeCountEl) activeCountEl.textContent = active;
  if (inactiveCountEl) inactiveCountEl.textContent = inactive;
}

function renderUsersList(targetContainer) {
  if (!targetContainer) return;
  targetContainer.innerHTML = '';
  const usersArray = Object.values(allUsersData);

  if (usersArray.length === 0) {
    targetContainer.innerHTML = '<p class="status-user-item">No users online.</p>';
    return;
  }

  usersArray.forEach(user => {
    const item = document.createElement('div');
    item.className = 'status-user-item';

    const isOnline = user.state === 'online';
    const dotClass = isOnline ? 'dot-online' : 'dot-offline';

    item.innerHTML = `
      <span>${user.username || 'Anonymous'}</span>
      <span class="status-dot ${dotClass}"></span>
    `;

    targetContainer.appendChild(item);
  });
}

// Whitelist & Cooldown Status
function isUserWhitelisted() {
  return isOwnerAuthenticated || whitelistedUsers.includes(currentUsername);
}

function checkCooldownState() {
  if (isUserWhitelisted()) {
    enableButtons();
    return;
  }

  const now = Date.now();
  const timeElapsed = now - lastGeneratedTime;

  if (timeElapsed < COOLDOWN_TIME) {
    startCooldownTimer(COOLDOWN_TIME - timeElapsed);
  } else {
    enableButtons();
  }
}

function startCooldownTimer(remainingTime) {
  btnGenCode.disabled = true;
  btnGenToken.disabled = true;

  clearInterval(cooldownInterval);

  let remainingSeconds = Math.ceil(remainingTime / 1000);

  const updateDisplay = () => {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const formattedSecs = secs < 10 ? `0${secs}` : secs;

    btnGenCode.textContent = `Wait (${mins}:${formattedSecs})`;
    btnGenToken.textContent = `Wait (${mins}:${formattedSecs})`;

    if (remainingSeconds <= 0) {
      clearInterval(cooldownInterval);
      enableButtons();
    }
    remainingSeconds--;
  };

  updateDisplay();
  cooldownInterval = setInterval(updateDisplay, 1000);
}

function enableButtons() {
  clearInterval(cooldownInterval);
  btnGenCode.disabled = false;
  btnGenToken.disabled = false;
  btnGenCode.textContent = "Generate Code";
  btnGenToken.textContent = "Generate Token";
}

// Username Limit Tracking
function checkUsernameChangeState() {
  if (hasChangedUsername) {
    btnToName.disabled = true;
    btnToName.textContent = "Username Changed (Limit Reached)";
    nameInput.disabled = true;
    btnSaveName.disabled = true;
    btnSaveName.textContent = "Already Changed";
  }
}

// Global Screen Navigation Handler
function navigateTo(targetId) {
  screens.forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.remove('hidden');
  }
}

btnToDashboard.addEventListener('click', () => navigateTo('dash-section'));
btnToLeaderboard.addEventListener('click', () => {
  renderUsersList(leaderboardList);
  navigateTo('leaderboard-section');
});
btnToChat.addEventListener('click', () => navigateTo('chat-section'));
btnToName.addEventListener('click', () => {
  if (!hasChangedUsername) {
    navigateTo('name-section');
  }
});

backBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navigateTo(btn.dataset.target);
  });
});

// Rename Form Handler
nameForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (hasChangedUsername) return;

  const newName = nameInput.value.trim();
  if (newName) {
    currentUsername = newName;
    hasChangedUsername = true;

    localStorage.setItem('app_username', currentUsername);
    localStorage.setItem('has_changed_username', 'true');

    database.ref(`users/${userId}`).update({
      username: currentUsername,
      hasChangedName: true
    });

    headerUsername.textContent = `Welcome ${currentUsername}`;
    nameInput.value = '';

    checkUsernameChangeState();
    checkCooldownState();
    navigateTo('menu-section');
  }
});

// Presence Modals
if (btnActiveModal) {
  btnActiveModal.addEventListener('click', () => {
    renderUsersList(usersList);
    usersModal.classList.remove('hidden');
  });
}

if (btnCloseUsersModal) {
  btnCloseUsersModal.addEventListener('click', () => {
    usersModal.classList.add('hidden');
  });
}

// Global Chat
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) {
    database.ref('chatMessages').push({
      user: currentUsername,
      text: text,
      timestamp: Date.now()
    });
    chatInput.value = '';
  }
});

// Code / Token Generators
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function handleGeneration(type) {
  const now = Date.now();

  if (!isUserWhitelisted() && (now - lastGeneratedTime < COOLDOWN_TIME)) {
    return;
  }

  if (!isUserWhitelisted()) {
    lastGeneratedTime = now;
    localStorage.setItem('last_gen_time', lastGeneratedTime);
    startCooldownTimer(COOLDOWN_TIME);
  }

  genDisplay.classList.remove('hidden');
  genStatus.textContent = 'Generating...';
  genResult.textContent = '';

  let countdown = 3;
  const interval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      genStatus.textContent = `Generating in ${countdown}s...`;
    } else {
      clearInterval(interval);
      genStatus.textContent = 'Complete!';

      if (type === 'code') {
        genResult.textContent = (customCodeOutput !== null && customCodeOutput !== "") ? customCodeOutput : `CODE-${generateRandomString(8)}`;
      } else {
        genResult.textContent = (customTokenOutput !== null && customTokenOutput !== "") ? customTokenOutput : `TKN-${generateRandomString(12)}`;
      }
    }
  }, 1000);
}

btnGenCode.addEventListener('click', () => handleGeneration('code'));
btnGenToken.addEventListener('click', () => handleGeneration('token'));

btnChangeCodeMsg.addEventListener('click', () => {
  targetOwnerTarget = 'code';
  openOwnerModal();
});

btnChangeTokenMsg.addEventListener('click', () => {
  targetOwnerTarget = 'token';
  openOwnerModal();
});

btnCooldownList.addEventListener('click', () => {
  targetOwnerTarget = 'whitelist';
  openOwnerModal();
});

// Owner Modal Logic
function openOwnerModal() {
  ownerModal.classList.remove('hidden');
  dashSection.classList.add('hidden');
  ownerStatus.textContent = '';

  if (targetOwnerTarget === 'whitelist') {
    modalTitle.textContent = "0sec-Cooldown List";
  } else {
    modalTitle.textContent = "Owner Controls";
  }

  if (isOwnerAuthenticated) {
    openOwnerPanel();
  } else {
    ownerPassInput.classList.remove('hidden');
    ownerOverrideField.classList.add('hidden');
  }
}

function openOwnerPanel() {
  ownerPassInput.classList.add('hidden');
  ownerOverrideField.classList.remove('hidden');
  ownerStatus.textContent = '';

  if (targetOwnerTarget === 'whitelist') {
    ownerNewMsgInput.placeholder = "Enter username to grant 0sec cooldown";
  } else {
    ownerNewMsgInput.placeholder = "Enter custom live output";
  }
  enableButtons();
}

btnCloseModal.addEventListener('click', () => {
  ownerModal.classList.add('hidden');
  dashSection.classList.remove('hidden');
  ownerPassInput.value = '';
});

ownerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!isOwnerAuthenticated) {
    if (ownerPassInput.value === OWNER_PASSWORD) {
      isOwnerAuthenticated = true;
      ownerStatus.style.color = "#2ea44f";
      ownerStatus.textContent = "Access Granted!";

      setTimeout(() => {
        openOwnerPanel();
      }, 800);
    } else {
      ownerStatus.style.color = "#f85149";
      ownerStatus.textContent = "Incorrect password!";
    }
  } else {
    const inputValue = ownerNewMsgInput.value.trim();
    if (inputValue !== "") {
      if (targetOwnerTarget === 'whitelist') {
        database.ref('whitelistedUsers').push(inputValue);
        ownerStatus.style.color = "#2ea44f";
        ownerStatus.textContent = `Added '${inputValue}' to 0sec list!`;
      } else if (targetOwnerTarget === 'code') {
        database.ref('tokenData').update({ codeOutput: inputValue });
        ownerStatus.style.color = "#2ea44f";
        ownerStatus.textContent = "Saved permanently online!";
      } else {
        database.ref('tokenData').update({ tokenOutput: inputValue });
        ownerStatus.style.color = "#2ea44f";
        ownerStatus.textContent = "Saved permanently online!";
      }

      setTimeout(() => {
        ownerModal.classList.add('hidden');
        dashSection.classList.remove('hidden');
        ownerNewMsgInput.value = "";
      }, 1000);
    }
  }
});

// Run Init Check
initApp();
