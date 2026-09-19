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
let filteredTransactions = [];
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

// Savings Goals Logic
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
  const account = document.getElementById('account').value;
  const paymentMode = document.getElementById('payment-mode').value;
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
      account: account || 'Personal',
      paymentMode: paymentMode || 'UPI',
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

// Filters & Dynamic Search
function populateFilterDropdowns() {
  const filterCat = document.getElementById('filter-category');
  if (!filterCat) return;

  const uniqueCategories = [...new Set(rawTransactions.map(t => t.category || "General"))];
  filterCat.innerHTML = `<option value="all">All Categories</option>` +
    uniqueCategories.map(c => `<option value="${c}">${categoryIcons[c] || '📌'} ${c}</option>`).join('');
}

function applyFilters() {
  const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase().trim();
  const accountVal = document.getElementById('global-account-filter').value;
  const catVal = document.getElementById('filter-category').value;
  const modeVal = document.getElementById('filter-payment-mode').value;
  const monthVal = document.getElementById('filter-month').value;

  filteredTransactions = rawTransactions.filter(t => {
    const matchesSearch = !searchQuery || (t.desc || t.description || '').toLowerCase().includes(searchQuery);
    const matchesAccount = accountVal === "all" || (t.account || "Personal") === accountVal;
    const matchesCat = catVal === "all" || (t.category || "General") === catVal;
    const matchesMode = modeVal === "all" || (t.paymentMode || "UPI") === modeVal;
    const matchesMonth = !monthVal || (t.date && t.date.startsWith(monthVal));

    return matchesSearch && matchesAccount && matchesCat && matchesMode && matchesMonth;
  });

  renderUI(filteredTransactions);
}

function resetFilters() {
  if (document.getElementById('search-query')) document.getElementById('search-query').value = "";
  document.getElementById('global-account-filter').value = "all";
  document.getElementById('filter-category').value = "all";
  document.getElementById('filter-payment-mode').value = "all";
  document.getElementById('filter-month').value = "";
  applyFilters();
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
    list.innerHTML = '<li style="text-align: center; color: var(--subtext-color); padding: 20px;">No matching transactions found.</li>';
  } else {
    dataList.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;

      const itemTitle = t.desc || t.description || 'Transaction';
      const itemCategory = t.category || 'General';
      const itemAccount = t.account || 'Personal';
      const itemMode = t.paymentMode || 'UPI';
      const itemDate = t.date || '';
      const icon = categoryIcons[itemCategory] || '📌';

      const li = document.createElement('li');
      li.className = `transaction-item ${t.type}`;
      li.innerHTML = `
        <div>
          <div class="item-title"><span>${icon}</span> ${itemTitle}</div>
          <div class="item-meta">
            <span>${itemCategory}</span> • 
            <span>${itemDate}</span> 
            <span class="badge">📂 ${itemAccount}</span>
            <span class="badge">💳 ${itemMode}</span>
          </div>
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
  const listToExport = (typeof filteredTransactions !== 'undefined' && filteredTransactions.length > 0)
    ? filteredTransactions 
    : rawTransactions;

  if (!listToExport || listToExport.length === 0) {
    alert("No data available to export!");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Description,Amount,Account,Payment Mode,Type,Category,Date\n";

  listToExport.forEach(t => {
    const title = t.desc || t.description || 'Transaction';
    csvContent += `"${title}",${t.amount},"${t.account || 'Personal'}","${t.paymentMode || 'UPI'}",${t.type},"${t.category || 'General'}",${t.date}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Finance_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Reliable PDF Invoice / Statement Report Generation
function exportToPDF() {
  const listToExport = (typeof filteredTransactions !== 'undefined' && filteredTransactions.length > 0)
    ? filteredTransactions 
    : rawTransactions;

  if (!listToExport || listToExport.length === 0) {
    alert("No transactions available to generate PDF!");
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Document Header
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text("Account Statement / Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`User: ${currentUser ? currentUser.email : 'N/A'}`, 14, 28);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 34);

    // Prepare table data (Emojis stripped to prevent PDF crash)
    const tableData = listToExport.map(t => [
      t.date || '-',
      (t.desc || t.description || 'Transaction').replace(/[^\x00-\x7F]/g, ""), 
      (t.category || 'General').replace(/[^\x00-\x7F]/g, ""),
      t.account || 'Personal',
      t.paymentMode || 'UPI',
      t.type ? t.type.toUpperCase() : 'N/A',
      `Rs. ${Number(t.amount || 0).toFixed(2)}`
    ]);

    // Use autoTable safely
    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: 40,
        head: [['Date', 'Description', 'Category', 'Account', 'Mode', 'Type', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8, cellPadding: 3 }
      });
    } else if (window.jspdfAutoTable) {
      window.jspdfAutoTable(doc, {
        startY: 40,
        head: [['Date', 'Description', 'Category', 'Account', 'Mode', 'Type', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [52, 152, 219] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        styles: { fontSize: 8, cellPadding: 3 }
      });
    }

    // Save File
    doc.save(`Finance_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error("PDF Export Error:", error);
    alert("PDF generate karne me error aaya: " + error.message);
  }
}
