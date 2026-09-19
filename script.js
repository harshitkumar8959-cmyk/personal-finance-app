// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHkgJ4Bh9EHKraQFT6-9HbOvTcxeARXMo",
  authDomain: "personal-finance-app-7506a.firebaseapp.com",
  projectId: "personal-finance-app-7506a",
  storageBucket: "personal-finance-app-7506a.firebasestorage.app",
  messagingSenderId: "975303702668",
  appId: "1:975303702668:web:25cbfb91906d7b041e63a9"
};

// Initialize Firebase App
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global Auth Instance
const auth = firebase.auth();

// Global Array to store transactions in local memory
let transactions = JSON.parse(localStorage.getItem('user_transactions')) || [];

// 1. User Registration Handler
function registerUser() {
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please fill in both email and password!");
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert("Account created successfully!");
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      console.error("Registration Error:", error);
      alert("Error: " + error.message);
    });
}

// 2. User Login Handler
function loginUser() {
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password!");
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      window.location.href = 'dashboard.html';
    })
    .catch((error) => {
      console.error("Login Error:", error);
      alert("Error: " + error.message);
    });
}

// 3. Show / Hide Password Toggle
function togglePassword(inputId, iconElement) {
  const passwordInput = document.getElementById(inputId);
  if (!passwordInput) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    iconElement.textContent = "🙈";
  } else {
    passwordInput.type = "password";
    iconElement.textContent = "👁️";
  }
}

// 4. Forgot Password Reset Handler
function handleForgotPassword() {
  const email = prompt("Enter your registered Email address:");

  if (email === null) return;

  const trimmedEmail = email.trim();

  if (trimmedEmail === "") {
    alert("Email address cannot be empty!");
    return;
  }

  auth.sendPasswordResetEmail(trimmedEmail)
    .then(() => {
      alert("Password reset email sent! Please check your Inbox and Spam/Junk folder.");
    })
    .catch((error) => {
      console.error("Password Reset Failed:", error);
      if (error.code === 'auth/user-not-found') {
        alert("Is email address se koi account registered nahi hai.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Kripya sahi email format daalein.");
      } else {
        alert("Reset Error: " + error.message);
      }
    });
}

// 5. Auth State Observer (Protect Routes Automatically)
function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isLogin = window.location.pathname.includes('login.html');
    const isRegister = window.location.pathname.includes('register.html');

    const userEmailElement = document.getElementById('user-email-display');

    if (user) {
      // User is Logged In
      if (userEmailElement) {
        userEmailElement.textContent = user.email;
      }
      if (isLogin || isRegister) {
        window.location.href = 'dashboard.html';
      }
      if (isDashboard) {
        renderDashboard();
      }
    } else {
      // User is NOT Logged In
      if (isDashboard) {
        window.location.href = 'login.html';
      }
    }
  });
}

// Run auth check
checkAuthState();

// 6. User Logout Handler
function logoutUser() {
  auth.signOut()
    .then(() => {
      alert("Logged out successfully!");
      window.location.href = 'login.html';
    })
    .catch((error) => {
      console.error("Logout Error:", error);
      alert("Error logging out: " + error.message);
    });
}

// --- DASHBOARD TRACKER LOGIC ---

// Add Transaction
function addTransaction(e) {
  e.preventDefault();

  const desc = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;

  if (!desc || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid description and amount!");
    return;
  }

  const transaction = {
    id: Date.now(),
    desc: desc,
    amount: amount,
    type: type,
    date: new Date().toLocaleDateString()
  };

  transactions.push(transaction);
  saveAndRender();

  // Reset Form
  document.getElementById('transaction-form').reset();
}

// Delete Transaction
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();
}

// Save to Local Storage & Render UI
function saveAndRender() {
  localStorage.setItem('user_transactions', JSON.stringify(transactions));
  renderDashboard();
}

// Render Dashboard UI
function renderDashboard() {
  const list = document.getElementById('transaction-list');
  const totalBalanceEl = document.getElementById('total-balance');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');

  if (!list || !totalBalanceEl) return;

  list.innerHTML = '';

  let income = 0;
  let expense = 0;

  if (transactions.length === 0) {
    list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No transactions added yet.</li>';
  } else {
    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }

      const li = document.createElement('li');
      li.className = `transaction-item ${t.type}`;
      li.innerHTML = `
        <div class="item-details">
          <span class="item-title">${t.desc}</span>
          <span class="item-date">${t.date}</span>
        </div>
        <div style="display: flex; align-items: center;">
          <span class="item-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}</span>
          <button class="delete-btn" onclick="deleteTransaction(${t.id})">✖</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  const balance = income - expense;

  totalBalanceEl.textContent = `₹${balance.toFixed(2)}`;
  totalIncomeEl.textContent = `₹${income.toFixed(2)}`;
  totalExpenseEl.textContent = `₹${expense.toFixed(2)}`;
}
