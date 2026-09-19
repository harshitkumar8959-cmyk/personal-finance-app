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
let currentMonthlyBudget = 0;

// Category Definitions & Dynamic Icons
const categoryIcons = {
  "Salary": "💰",
  "Business": "🏢",
  "Freelance": "💻",
  "Investment": "📈",
  "Other Income": "💵",
  "Food & Grocery": "🍔",
  "Shopping": "🛍️",
  "Rent": "🏠",
  "Utilities": "⚡",
  "Entertainment": "🎬",
  "Health": "🏥",
  "Travel": "✈️",
  "Other Expense": "💸",
  "General": "📌"
};

const categories = {
  income: ["Salary", "Business", "Freelance", "Investment", "Other Income"],
  expense: ["Food & Grocery", "Shopping", "Rent", "Utilities", "Entertainment", "Health", "Travel", "Other Expense"]
};

// Dark Mode Toggle Logic
function applyTheme(theme) {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    if (toggleBtn) toggleBtn.textContent = '☀️ Light';
  } else {
    document.body.classList.remove('dark-theme');
    if (toggleBtn) toggleBtn.textContent = '🌙 Dark';
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.contains('dark-theme');
  const newTheme = isDark ? 'light' : 'dark';
  localStorage.setItem('app-theme', newTheme);
  applyTheme(newTheme);
}

const savedTheme = localStorage.getItem('app-theme') || 'light';
applyTheme(savedTheme);

// App Initialization
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
    .map(c => `<option value="${c}">${categoryIcons[c] || '📌'} ${c}</option>`)
    .join('');
}

// Auth Handlers
function logoutUser() {
  auth.signOut().then(() => window.location.href = 'login.html');
}

function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const userEmailEl = document.getElementById('user-email-display');

    if (user) {
      currentUser = user;
      if (userEmailEl) userEmailEl.textContent = user.email;
      if (isDashboard) {
        initAppUI();
        loadUserSettings();
        fetchTransactionsRealtime();
        fetchSavingsGoalsRealtime();
      }
    } else {
      currentUser = null;
      if (isDashboard) window.location.href = 'login.html';
    }
  });
}
checkAuthState();

// Monthly Budget Settings (Firestore)
function loadUserSettings() {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid).get().then(doc => {
    if (doc.exists && doc.data().monthlyBudget) {
      currentMonthlyBudget = doc.data().monthlyBudget;
      const budgetInput = document.getElementById('monthly-budget-input');
      if (budgetInput) budgetInput.value = currentMonthlyBudget;
    }
  });
}

function saveMonthlyBudget() {
  if (!currentUser) return;
  const input = document.getElementById('monthly-budget-input');
  const budgetVal = parseFloat(input.value);

  if (isNaN(budgetVal) || budgetVal <= 0) {
    alert("Please enter a valid budget amount!");
    return;
  }

  db.collection("users").doc(currentUser.uid).set({
    monthlyBudget: budgetVal
  }, { merge: true }).then(() => {
    currentMonthlyBudget = budgetVal;
    alert("Monthly Budget Saved!");
    applyFilters();
  }).catch(err => alert("Failed to save budget: " + err.message));
}

// Savings Goals Logic (Firestore Realtime - Index Safe)
function addSavingsGoal(e) {
  e.preventDefault();
  if (!currentUser) return;

  const title = document.getElementById('goal-title').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value);
  const saved = parseFloat(document.getElementById('goal-saved').value);

  if (!title || isNaN(target) || isNaN(saved) || target <= 0) {
    alert("Please enter valid Goal info!");
    return;
  }

  db.collection("users")
    .doc(currentUser.uid)
    .collection("goals")
    .add({
      title: title,
      target: target,
      saved: saved,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      document.getElementById('goal-title').value = '';
      document.getElementById('goal-target').value = '';
      document.getElementById('goal-saved').value = '';
    })
    .catch(err => alert("Goal save failed: " + err.message));
}

function deleteGoal(goalId) {
  if (!currentUser) return;
  if (confirm("Delete this savings goal?")) {
    db.collection("users").doc(currentUser.uid).collection("goals").doc(goalId).delete();
  }
}

function fetchSavingsGoalsRealtime() {
  if (!currentUser) return;

  db.collection("users")
    .doc(currentUser.uid)
    .collection("goals")
    .onSnapshot((snapshot) => {
      const goalsList = document.getElementById('goals-list');
      if (!goalsList) return;

      goalsList.innerHTML = '';
      if (snapshot.empty) {
        goalsList.innerHTML = '<p style="color: var(--subtext-color); font-size: 13px; grid-column: 1 / -1; padding: 10px 0;">No savings goals added yet. Add one above!</p>';
        return;
      }

      snapshot.forEach(doc => {
        const goal = doc.data();
        const targetVal = Number(goal.target) || 1;
        const savedVal = Number(goal.saved) || 0;
        const percent = Math.min((savedVal / targetVal) * 100, 100).toFixed(1);

        const goalCard = document.createElement('div');
        goalCard.className = 'goal-item';
        goalCard.innerHTML = `
          <div class="goal-title">
            <span>🎯 ${goal.title}</span>
            <button onclick="deleteGoal('${doc.id}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-weight:bold;">✖</button>
          </div>
          <div style="font-size: 12px; color: var(--subtext-color);">₹${savedVal.toFixed(2)} / ₹${targetVal.toFixed(2)} (${percent}%)</div>
          <div class="goal-progress-bg">
            <div class="goal-progress-bar" style="width: ${percent}%;"></div>
          </div>
        `;
        goalsList.appendChild(goalCard);
      });
    }, (error) => {
      console.error("Error fetching goals: ", error);
    });
}

// Transaction Firestore Operations
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
    .onSnapshot((snapshot) => {
      rawTransactions = [];
      snapshot.forEach(doc => {
        rawTransactions.push({ id: doc.id, ...doc.data() });
      });
      populateFilterDropdowns();
      applyFilters();
    });
}

// Filters & Dynamic Rendering
function populateFilterDropdowns() {
  const filterCat = document.getElementById('filter-category');
  if (!filterCat) return;

  const uniqueCategories = [...new Set(rawTransactions.map(t => t.category || "General"))];
  filterCat.innerHTML = `<option value="all">All Categories</option>` +
    uniqueCategories.map(c => `<option value="${c}">${categoryIcons[c] || '📌'} ${c}</option>`).join('');
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
    list.innerHTML = '<li style="text-align: center; color: var(--subtext-color); padding: 20px;">No matching transactions.</li>';
  } else {
    dataList.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;

      const itemTitle = t.desc || t.description || 'Transaction';
      const itemCategory = t.category || 'General';
      const itemDate = t.date || '';
      const icon = categoryIcons[itemCategory] || '📌';

      const li = document.createElement('li');
      li.className = `transaction-item ${t.type}`;
      li.innerHTML = `
        <div>
          <div class="item-title"><span>${icon}</span> ${itemTitle}</div>
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
  updateBudgetProgress(expense);
}

// Budget Progress Calculator
function updateBudgetProgress(currentTotalExpense) {
  const progressBar = document.getElementById('budget-progress-bar');
  const budgetStatus = document.getElementById('budget-status');
  if (!progressBar || !budgetStatus) return;

  if (currentMonthlyBudget <= 0) {
    progressBar.style.width = '0%';
    budgetStatus.textContent = "Set target budget for current month";
    return;
  }

  const percentage = Math.min((currentTotalExpense / currentMonthlyBudget) * 100, 100);
  progressBar.style.width = `${percentage}%`;

  if (percentage < 70) {
    progressBar.style.backgroundColor = '#2ecc71';
    budgetStatus.textContent = `Spent ₹${currentTotalExpense.toFixed(2)} of ₹${currentMonthlyBudget.toFixed(2)} (${percentage.toFixed(1)}%)`;
  } else if (percentage < 90) {
    progressBar.style.backgroundColor = '#f39c12';
    budgetStatus.textContent = `Warning: Spent ₹${currentTotalExpense.toFixed(2)} of ₹${currentMonthlyBudget.toFixed(2)} (${percentage.toFixed(1)}%)`;
  } else {
    progressBar.style.backgroundColor = '#e74c3c';
    budgetStatus.textContent = `Alert: High spending! Spent ₹${currentTotalExpense.toFixed(2)} of ₹${currentMonthlyBudget.toFixed(2)} (${percentage.toFixed(1)}%)`;
  }
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
      plugins: { legend: { position: 'bottom' } }
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
