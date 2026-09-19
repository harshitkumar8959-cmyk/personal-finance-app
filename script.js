// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHkgJ4Bh9EHKraQFT6-9HbOvTcxeARXMo",
  authDomain: "personal-finance-app-7506a.firebaseapp.com",
  projectId: "personal-finance-app-7506a",
  storageBucket: "personal-finance-app-7506a.firebasestorage.app",
  messagingSenderId: "975303702668",
  appId: "1:975303702668:web:25cbfb91906d7b041e63a9"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let rawTransactions = [];
let financeChartInstance = null;

// Categories Definition
const categories = {
  income: ["Salary", "Business", "Freelance", "Investment", "Other Income"],
  expense: ["Food & Grocery", "Rent", "Utilities", "Shopping", "Entertainment", "Health", "Travel", "Other Expense"]
};

// Initial Setup
function initAppUI() {
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  updateCategoryOptions();
}

function updateCategoryOptions() {
  const typeSelect = document.getElementById('type');
  const catSelect = document.getElementById('category');
  if (!typeSelect || !catSelect) return;

  const selectedType = typeSelect.value || 'income';
  catSelect.innerHTML = categories[selectedType]
    .map(c => `<option value="${c}">${c}</option>`)
    .join('');
}

// Auth Handlers
function registerUser() {
  const email = document.getElementById('register-email')?.value.trim();
  const password = document.getElementById('register-password')?.value;
  if (!email || !password) return alert("Fill all fields!");

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => window.location.href = 'dashboard.html')
    .catch(err => alert("Error: " + err.message));
}

function loginUser() {
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  if (!email || !password) return alert("Fill all fields!");

  auth.signInWithEmailAndPassword(email, password)
    .then(() => window.location.href = 'dashboard.html')
    .catch(err => alert("Error: " + err.message));
}

function logoutUser() {
  auth.signOut().then(() => window.location.href = 'login.html');
}

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  icon.textContent = input.type === "password" ? "👁️" : "🙈";
}

function handleForgotPassword() {
  const email = prompt("Enter email address:");
  if (email) {
    auth.sendPasswordResetEmail(email.trim())
      .then(() => alert("Reset email sent!"))
      .catch(err => alert("Error: " + err.message));
  }
}

// Auth State Listener
function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isLogin = window.location.pathname.includes('login.html');
    const isRegister = window.location.pathname.includes('register.html');
    const userEmailEl = document.getElementById('user-email-display');

    if (user) {
      currentUser = user;
      if (userEmailEl) userEmailEl.textContent = user.email;
      if (isLogin || isRegister) window.location.href = 'dashboard.html';
      if (isDashboard) {
        initAppUI();
        fetchTransactionsRealtime();
      }
    } else {
      currentUser = null;
      if (isDashboard) window.location.href = 'login.html';
    }
  });
}
checkAuthState();

// Firestore Operations
function addTransaction(e) {
  e.preventDefault();
  if (!currentUser) return;

  const desc = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const btn = document.getElementById('add-btn');

  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert("Please enter valid details!");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";

  db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .add({
      desc: desc,
      amount: amount,
      type: type,
      category: category,
      date: date,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      document.getElementById('transaction-form').reset();
      initAppUI();
    })
    .catch(err => alert("Save failed: " + err.message))
    .finally(() => {
      btn.disabled = false;
      btn.textContent = "Add Transaction";
    });
}

function deleteTransaction(id) {
  if (!currentUser) return;
  if (confirm("Delete this transaction?")) {
    db.collection("users")
      .doc(currentUser.uid)
      .collection("transactions")
      .doc(id)
      .delete();
  }
}

function fetchTransactionsRealtime() {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("transactions")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      rawTransactions = [];
      snapshot.forEach(doc => {
        rawTransactions.push({ id: doc.id, ...doc.data() });
      });
      populateFilterDropdowns();
      applyFilters();
    });
}

// Filter Engine
function populateFilterDropdowns() {
  const filterCat = document.getElementById('filter-category');
  if (!filterCat) return;

  const uniqueCategories = [...new Set(rawTransactions.map(t => t.category || "General"))];
  filterCat.innerHTML = `<option value="all">All Categories</option>` +
    uniqueCategories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function applyFilters() {
  const catVal = document.getElementById('filter-category').value;
  const monthVal = document.getElementById('filter-month').value;

  let filtered = rawTransactions;

  if (catVal !== "all") {
    filtered = filtered.filter(t => (t.category || "General") === catVal);
  }

  if (monthVal) {
    filtered = filtered.filter(t => t.date && t.date.startsWith(monthVal));
  }

  renderUI(filtered);
}

function resetFilters() {
  document.getElementById('filter-category').value = "all";
  document.getElementById('filter-month').value = "";
  renderUI(rawTransactions);
}

// UI Render & Chart Integration
function renderUI(dataList) {
  const list = document.getElementById('transaction-list');
  const totalBalanceEl = document.getElementById('total-balance');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');

  if (!list) return;

  list.innerHTML = '';
  let income = 0, expense = 0;

  if (dataList.length === 0) {
    list.innerHTML = '<li style="text-align: center; color: #888; padding: 20px;">No matching transactions.</li>';
  } else {
    dataList.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;

      // Compatibility fix for old and new database fields
      const itemTitle = t.desc || t.description || 'Transaction';
      const itemCategory = t.category || 'General';
      const itemDate = t.date || '';

      const li = document.createElement('li');
      li.className = `transaction-item ${t.type}`;
      li.innerHTML = `
        <div>
          <div class="item-title">${itemTitle}</div>
          <div class="item-meta">${itemCategory} • ${itemDate}</div>
        </div>
        <div style="display: flex; align-items: center;">
          <span class="item-amount ${t.type}">${t.type === 'income' ? '+' : '-'}₹${t.amount.toFixed(2)}</span>
          <button class="delete-btn" onclick="deleteTransaction('${t.id}')">✖</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  const balance = income - expense;
  totalBalanceEl.textContent = `₹${balance.toFixed(2)}`;
  totalIncomeEl.textContent = `₹${income.toFixed(2)}`;
  totalExpenseEl.textContent = `₹${expense.toFixed(2)}`;

  updateChart(income, expense);
}

function updateChart(income, expense) {
  const ctx = document.getElementById('financeChart');
  if (!ctx) return;

  if (financeChartInstance) {
    financeChartInstance.destroy();
  }

  financeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['#2ecc71', '#e74c3c'],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Export CSV
function exportToCSV() {
  if (rawTransactions.length === 0) {
    alert("No data available to export!");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Description,Amount,Type,Category,Date\n";

  rawTransactions.forEach(t => {
    const title = t.desc || t.description || 'Transaction';
    csvContent += `"${title}",${t.amount},${t.type},"${t.category || 'General'}",${t.date}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Finance_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
