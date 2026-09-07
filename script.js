// Secret Password for Owner Access
const OWNER_PASSWORD = "Cris90";

// Custom fixed outputs set by owner (null = random generator mode)
let customCodeOutput = null;
let customTokenOutput = null;

// Navigation elements
const mainMenu = document.getElementById('main-menu');
const chatSection = document.getElementById('chat-section');
const dashSection = document.getElementById('dashboard-section');
const nameSection = document.getElementById('name-section');

const openChatBtn = document.getElementById('open-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');

const openDashBtn = document.getElementById('open-dash-btn');
const closeDashBtn = document.getElementById('close-dash-btn');

const openNameBtn = document.getElementById('open-name-btn');
const closeNameBtn = document.getElementById('close-name-btn');

// Change Name Elements
const nameForm = document.getElementById('name-form');
const usernameInput = document.getElementById('username-input');
const nameStatus = document.getElementById('name-status');
const currentNameDisplay = document.getElementById('current-name-display');

let currentUsername = "User";

// Owner Access Elements
const ownerModal = document.getElementById('owner-modal');
const ownerCodeMsgBtn = document.getElementById('owner-code-msg-btn');
const ownerTokenMsgBtn = document.getElementById('owner-token-msg-btn');
const closeOwnerBtn = document.getElementById('close-owner-btn');
const ownerForm = document.getElementById('owner-form');
const ownerPassInput = document.getElementById('owner-pass-input');
const ownerNewMsgInput = document.getElementById('owner-new-msg-input');
const ownerStatus = document.getElementById('owner-status');
const modalTitle = document.getElementById('modal-title');
const ownerSubmitBtn = document.getElementById('owner-submit-btn');

let targetOwnerTarget = null; // 'code' or 'token'
let isOwnerAuthenticated = false;

// Navigation Handlers
openChatBtn.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  chatSection.classList.remove('hidden');
});

closeChatBtn.addEventListener('click', () => {
  chatSection.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

openDashBtn.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  dashSection.classList.remove('hidden');
});

closeDashBtn.addEventListener('click', () => {
  dashSection.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

openNameBtn.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  nameSection.classList.remove('hidden');
});

closeNameBtn.addEventListener('click', () => {
  nameSection.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

// Name Change Logic
nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newName = usernameInput.value.trim();
  if (newName !== "") {
    currentUsername = newName;
    nameStatus.textContent = `Name changed to: ${currentUsername}`;
    currentNameDisplay.textContent = `Current name: ${currentUsername}`;
    usernameInput.value = "";
  }
});

// Owner Control Logic
function openOwnerPanel(target) {
  targetOwnerTarget = target;
  dashSection.classList.add('hidden');
  ownerModal.classList.remove('hidden');
  ownerStatus.textContent = "";
  
  if (isOwnerAuthenticated) {
    ownerPassInput.classList.add('hidden');
    ownerNewMsgInput.classList.remove('hidden');
    modalTitle.textContent = target === 'code' ? 'Set Fixed Token Code' : 'Set Fixed Token Result';
    ownerSubmitBtn.textContent = "Save Output Text";
  } else {
    ownerPassInput.classList.remove('hidden');
    ownerNewMsgInput.classList.add('hidden');
    modalTitle.textContent = "Owner Authentication";
    ownerSubmitBtn.textContent = "Verify Owner";
  }
}

ownerCodeMsgBtn.addEventListener('click', () => openOwnerPanel('code'));
ownerTokenMsgBtn.addEventListener('click', () => openOwnerPanel('token'));

closeOwnerBtn.addEventListener('click', () => {
  ownerModal.classList.add('hidden');
  dashSection.classList.remove('hidden');
  ownerPassInput.value = "";
  ownerNewMsgInput.value = "";
});

ownerForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!isOwnerAuthenticated) {
    if (ownerPassInput.value === OWNER_PASSWORD) {
      isOwnerAuthenticated = true;
      ownerStatus.style.color = "#00ffcc";
      ownerStatus.textContent = "Access Granted!";
      
      setTimeout(() => {
        openOwnerPanel(targetOwnerTarget);
      }, 800);
    } else {
      ownerStatus.style.color = "#ff4444";
      ownerStatus.textContent = "Incorrect password! Access denied.";
    }
  } else {
    const newOutput = ownerNewMsgInput.value.trim();
    if (newOutput !== "") {
      if (targetOwnerTarget === 'code') {
        customCodeOutput = newOutput;
      } else {
        customTokenOutput = newOutput;
      }
      ownerStatus.style.color = "#00ffcc";
      ownerStatus.textContent = "Sent result updated successfully!";
      
      setTimeout(() => {
        ownerModal.classList.add('hidden');
        dashSection.classList.remove('hidden');
        ownerNewMsgInput.value = "";
      }, 1000);
    }
  }
});

// Dashboard Generator Elements & Fast Countdown Timer
const outputText = document.getElementById('output-text');
const genCodeBtn = document.getElementById('gen-code-btn');
const genTokenBtn = document.getElementById('gen-token-btn');
const countdownDisplay = document.getElementById('countdown-display');

let isGenerating = false;

function startFastCountdown(type) {
  if (isGenerating) return;
  isGenerating = true;
  
  genCodeBtn.disabled = true;
  genTokenBtn.disabled = true;
  
  outputText.textContent = `Generating Token for (${currentUsername})`;
  
  let count = 3;
  countdownDisplay.textContent = `Generating in ${count}...`;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownDisplay.textContent = `Generating in ${count}...`;
    } else {
      clearInterval(timer);
      countdownDisplay.textContent = "Done!";
      
      // Send the custom owner-defined output if set, otherwise fallback to random generation
      if (type === 'code') {
        outputText.textContent = customCodeOutput !== null 
          ? customCodeOutput 
          : 'CODE-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      } else {
        outputText.textContent = customTokenOutput !== null 
          ? customTokenOutput 
          : 'REFRESH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      }
      
      setTimeout(() => {
        countdownDisplay.textContent = "";
      }, 1500);

      genCodeBtn.disabled = false;
      genTokenBtn.disabled = false;
      isGenerating = false;
    }
  }, 500);
}

genCodeBtn.addEventListener('click', () => startFastCountdown('code'));
genTokenBtn.addEventListener('click', () => startFastCountdown('token'));

// Global Chat Logic
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text !== '') {
    const msg = document.createElement('div');
    msg.classList.add('message');
    msg.textContent = `${currentUsername}: ${text}`;
    chatMessages.appendChild(msg);
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
