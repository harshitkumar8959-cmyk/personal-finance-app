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

// Global Instances
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

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
    .then(() => {
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
    .then(() => {
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

// 5. Auth State Observer
function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isLogin = window.location.pathname.includes('login.html');
    const isRegister = window.location.pathname.includes('register.html');

    const userEmailElement = document.getElementById('user-email-display');

    if (user) {
      currentUser = user;
      if (userEmailElement) {
        userEmailElement.textContent = user.email;
      }
      if (isLogin || isRegister) {
        window.location.href = 'dashboard.html';
      }
      if (isDashboard) {
        fetchTransactionsRealtime();
      }
    } else {
      currentUser = null;
      if (isDashboard) {
        window.location.href = 'login.html';
      }
    }
  });
}

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

// --- FIRESTORE DATABASE LOGIC ---

// Add Transaction
function addTransaction(e) {
  e.preventDefault();

  if (!currentUser) {
    alert("User session invalid. Please log in again.");
    return;
  }

  const desc = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const addBtn = document.getElementById('add-btn');

  if (!desc || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid description and amount!");
    return;
  }

  addBtn.disabled = true;
  addBtn.textContent = "Saving...";

  db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .add({
      desc: desc,
      amount: amount,
      type: type,
      date: new Date().toLocaleDateString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      document.getElementById('transaction-form').reset();
    })
    .catch((error) => {
      console.error("Error adding transaction:", error);
      alert("Failed to save: " + error.message);
    })
    .finally(() => {
      addBtn.disabled = false;
      addBtn.textContent = "Add Transaction";
    });
}

// Delete Transaction
function deleteTransaction(id) {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .doc(id)
    .delete()
    .catch((error) => {
      console.error("Error deleting transaction:", error);
      alert("Error deleting item: " + error.message);
    });
}

// Fetch Realtime Transactions
function fetchTransactionsRealtime() {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      const list = document.getElementById('transaction-list');
      const totalBalanceEl = document.getElementById('total-balance');
      const totalIncomeEl = document.getElementById('total-income');
      const totalExpenseEl = document.getElementById('total-expense');

      if (!list || !totalBalanceEl) return;

      list.innerHTML = '';
      let income = 0;
      let expense = 0;

      if (snapshot.empty) {
        list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No transactions added yet.</li>';
      } else {
        snapshot.forEach((doc) => {
          const t = doc.data();
          const docId = doc.id;

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
              <span class="item-date">${t.date || ''}</span>
            </div>
            <div style="display: flex; align-items: center;">
              <span class="item-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}</span>
              <button class="delete-btn" onclick="deleteTransaction('${docId}')">✖</button>
            </div>
          `;
          list.appendChild(li);
        });
      }

      const balance = income - expense;
      totalBalanceEl.textContent = `₹${balance.toFixed(2)}`;
      totalIncomeEl.textContent = `₹${income.toFixed(2)}`;
      totalExpenseEl.textContent = `₹${expense.toFixed(2)}`;
    }, (error) => {
      console.error("Firestore Listen Error:", error);
    });
}
