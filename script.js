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

// Safe Crash-Proof Firestore Init
let db = null;
if (typeof firebase.firestore === 'function') {
  db = firebase.firestore();
} else {
  console.warn("Firestore SDK not loaded yet.");
}

let currentUser = null;
let rawTransactions = [];
let filteredTransactions = [];
let financeChartInstance = null;

// Password Eye Toggle
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// Login Handler
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const loginBtn = document.getElementById('login-btn');

  if (!email || !password) {
    alert("Please fill both Email and Password!");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert("Login Successful!");
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      console.error("Login Error:", error);
      alert("Login Error: " + error.message);
    })
    .finally(() => {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    });
}

// Forgot Password Handler
function handleForgotPassword() {
  const emailInput = document.getElementById('login-email');
  const email = emailInput ? emailInput.value.trim() : "";

  if (!email) {
    alert("Please enter your registered Email ID in the input box first!");
    return;
  }

  if (confirm(`Send password reset email to ${email}?`)) {
    auth.sendPasswordResetEmail(email)
      .then(() => {
        alert("Password reset link sent! Check your Email inbox/spam.");
      })
      .catch((error) => {
        console.error("Forgot Password Error:", error);
        alert("Error: " + error.message);
      });
  }
}

// Currency Engine
const currencyMap = { "INR": "₹", "USD": "$", "EUR": "€" };
let selectedCurrency = localStorage.getItem('user_currency') || "INR";

function changeCurrency() {
  const selector = document.getElementById('currency-selector');
  if (selector) {
    selectedCurrency = selector.value;
    localStorage.setItem('user_currency', selectedCurrency);
    updateCurrencySymbolsUI();
    applyFilters();
  }
}

function updateCurrencySymbolsUI() {
  const symbol = currencyMap[selectedCurrency] || "₹";
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = symbol;
  });
}

// Categories & Icons
const categoryIcons = {
  "Salary": "💰", "Business": "🏢", "Freelance": "💻", "Investment": "📈", "Other Income": "💵",
  "Food & Grocery": "🍔", "Shopping": "🛍️", "Rent": "🏠", "Utilities": "⚡", "Entertainment": "🎬", 
  "Health": "🏥", "Travel": "✈️", "Other Expense": "💸", "General": "📌"
};

const categories = {
  income: ["Salary", "Business", "Freelance", "Investment", "Other Income"],
  expense: ["Food & Grocery", "Shopping", "Rent", "Utilities", "Entertainment", "Health", "Travel", "Other Expense"]
};

// Dark Mode Toggle
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
applyTheme(localStorage.getItem('app-theme') || 'light');

// Modal Logic
function openProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.add('active');
  if (currentUser) {
    const input = document.getElementById('profile-name-input');
    if (input) input.value = currentUser.displayName || '';
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.remove('active');
}

// Name Update
function updateUserProfileName() {
  const newName = document.getElementById('profile-name-input').value.trim();
  if (!newName) {
    alert("Please enter a valid Name!");
    return;
  }

  currentUser.updateProfile({ displayName: newName }).then(() => {
    if (db) {
      return db.collection("users").doc(currentUser.uid).set({ displayName: newName }, { merge: true });
    }
  }).then(() => {
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.textContent = newName;
    alert("Profile name updated!");
    closeProfileModal();
  }).catch(err => alert("Error updating name: " + err.message));
}

// Profile Picture Upload
function uploadProfilePicture() {
  const fileInput = document.getElementById('profile-pic-input');
  const uploadBtn = document.getElementById('btn-upload-pic');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Please select an image file first!");
    return;
  }

  const file = fileInput.files[0];
  if (file.size > 1024 * 1024) {
    alert("File size too large! Please upload under 1MB.");
    return;
  }

  if (uploadBtn) {
    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64Image = e.target.result;
    if (currentUser && db) {
      db.collection("users").doc(currentUser.uid).set({
        photoURL: base64Image,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(() => {
        const navAvatar = document.getElementById('user-avatar');
        const modalAvatar = document.getElementById('modal-avatar-preview');
        if (navAvatar) navAvatar.src = base64Image;
        if (modalAvatar) modalAvatar.src = base64Image;

        alert("Profile picture updated!");
        closeProfileModal();
      }).catch(err => alert("Upload failed: " + err.message))
      .finally(() => {
        if (uploadBtn) {
          uploadBtn.disabled = false;
          uploadBtn.textContent = "Upload Picture";
        }
      });
    }
  };
  reader.readAsDataURL(file);
}

function sendPasswordResetEmail() {
  if (!currentUser || !currentUser.email) return;
  if (confirm(`Send password reset email to ${currentUser.email}?`)) {
    auth.sendPasswordResetEmail(currentUser.email)
      .then(() => { alert("Password reset email sent!"); closeProfileModal(); })
      .catch(err => alert("Error: " + err.message));
  }
}

// Dashboard Init
function initAppUI() {
  const dateInput = document.getElementById('date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  const currSelect = document.getElementById('currency-selector');
  if (currSelect) currSelect.value = selectedCurrency;
  updateCurrencySymbolsUI();
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

// Auth State Controller
function logoutUser() {
  auth.signOut().then(() => window.location.href = 'login.html');
}

auth.onAuthStateChanged((user) => {
  const currentPage = window.location.pathname.split('/').pop();
  const isDashboard = currentPage === 'dashboard.html' || currentPage === '';

  if (user) {
    currentUser = user;
    if (currentPage === 'login.html' || currentPage === 'signup.html') {
      window.location.href = 'dashboard.html';
      return;
    }

    let displayName = user.displayName || user.email.split('@')[0];
    let photoURL = user.photoURL;

    if (db) {
      db.collection("users").doc(user.uid).get().then((doc) => {
        if (doc.exists) {
          if (doc.data().photoURL) photoURL = doc.data().photoURL;
          if (doc.data().displayName) displayName = doc.data().displayName;
        }

        if (!photoURL) {
          photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3498db&color=fff`;
        }

        const userDisplayEl = document.getElementById('user-display-name');
        const userAvatarEl = document.getElementById('user-avatar');
        const modalAvatarEl = document.getElementById('modal-avatar-preview');

        if (userDisplayEl) userDisplayEl.textContent = displayName;
        if (userAvatarEl) userAvatarEl.src = photoURL;
        if (modalAvatarEl) modalAvatarEl.src = photoURL;
      }).catch(e => console.log(e));
    }

    if (isDashboard) {
      initAppUI();
      fetchTransactionsRealtime();
    }
  } else {
    currentUser = null;
    if (isDashboard) {
      window.location.href = 'login.html';
    }
  }
});

// Transactions CRUD
function addTransaction(e) {
  e.preventDefault();
  if (!currentUser || !db) return;

  const desc = document.getElementById('desc').value.trim();
  const amount = parseFloat(document.getElementById('amount').value);
  const account = document.getElementById('account').value;
  const paymentMode = document.getElementById('payment-mode').value;
  const type = document.getElementById('type').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const btn = document.getElementById('add-btn');

  if (!desc || isNaN(amount) || amount <= 0 || !date) {
    alert("Please fill all valid details!");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";

  db.collection("users").doc(currentUser.uid).collection("transactions").add({
    desc: desc,
    amount: amount,
    account: account || 'Personal',
    paymentMode: paymentMode || 'UPI',
    type: type,
    category: category,
    date: date,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('transaction-form').reset();
    initAppUI();
  }).catch(err => alert("Save failed: " + err.message))
  .finally(() => {
    btn.disabled = false;
    btn.textContent = "Add Transaction";
  });
}

function deleteTransaction(id) {
  if (!currentUser || !db) return;
  if (confirm("Delete this transaction?")) {
    db.collection("users").doc(currentUser.uid).collection("transactions").doc(id).delete();
  }
}

function fetchTransactionsRealtime() {
  if (!currentUser || !db) return;

  db.collection("users").doc(currentUser.uid).collection("transactions").onSnapshot((snapshot) => {
    rawTransactions = [];
    snapshot.forEach(doc => {
      rawTransactions.push({ id: doc.id, ...doc.data() });
    });
    populateFilterDropdowns();
    applyFilters();
  });
}

function populateFilterDropdowns() {
  const filterCat = document.getElementById('filter-category');
  if (!filterCat) return;

  const uniqueCategories = [...new Set(rawTransactions.map(t => t.category || "General"))];
  filterCat.innerHTML = `<option value="all">All Categories</option>` +
    uniqueCategories.map(c => `<option value="${c}">${categoryIcons[c] || '📌'} ${c}</option>`).join('');
}

function applyFilters() {
  const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase().trim();
  const accountVal = document.getElementById('global-account-filter')?.value || 'all';
  const catVal = document.getElementById('filter-category')?.value || 'all';
  const modeVal = document.getElementById('filter-payment-mode')?.value || 'all';
  const monthVal = document.getElementById('filter-month')?.value || '';

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
  if (document.getElementById('global-account-filter')) document.getElementById('global-account-filter').value = "all";
  if (document.getElementById('filter-category')) document.getElementById('filter-category').value = "all";
  if (document.getElementById('filter-payment-mode')) document.getElementById('filter-payment-mode').value = "all";
  if (document.getElementById('filter-month')) document.getElementById('filter-month').value = "";
  applyFilters();
}

function renderUI(dataList) {
  const list = document.getElementById('transaction-list');
  const totalBalanceEl = document.getElementById('total-balance');
  const totalIncomeEl = document.getElementById('total-income');
  const totalExpenseEl = document.getElementById('total-expense');
  const symbol = currencyMap[selectedCurrency] || "₹";

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
          <span class="item-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${symbol}${t.amount.toFixed(2)}</span>
          <button class="delete-btn" onclick="deleteTransaction('${t.id}')">✖</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  const balance = income - expense;
  if (totalBalanceEl) totalBalanceEl.innerHTML = `<span class="currency-symbol">${symbol}</span>${balance.toFixed(2)}`;
  if (totalIncomeEl) totalIncomeEl.innerHTML = `<span class="currency-symbol">${symbol}</span>${income.toFixed(2)}`;
  if (totalExpenseEl) totalExpenseEl.innerHTML = `<span class="currency-symbol">${symbol}</span>${expense.toFixed(2)}`;

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
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function exportToCSV() {
  const listToExport = filteredTransactions.length > 0 ? filteredTransactions : rawTransactions;
  if (!listToExport || listToExport.length === 0) {
    alert("No data available to export!");
    return;
  }

  let csvContent = `data:text/csv;charset=utf-8,Description,Amount (${selectedCurrency}),Account,Payment Mode,Type,Category,Date\n`;
  listToExport.forEach(t => {
    csvContent += `"${t.desc || 'Transaction'}",${t.amount},"${t.account || 'Personal'}","${t.paymentMode || 'UPI'}",${t.type},"${t.category || 'General'}",${t.date}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Finance_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportToPDF() {
  const listToExport = filteredTransactions.length > 0 ? filteredTransactions : rawTransactions;
  if (!listToExport || listToExport.length === 0) {
    alert("No transactions available!");
    return;
  }

  const symbol = currencyMap[selectedCurrency] || "₹";
  const printWindow = window.open('', '_blank');
  
  let rowsHtml = listToExport.map(t => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">${t.date || '-'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${t.desc || 'Transaction'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${t.category || 'General'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${t.account || 'Personal'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${t.paymentMode || 'UPI'}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${(t.type || '').toUpperCase()}</td>
      <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${symbol}${Number(t.amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>Account Statement Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h2 { color: #2c3e50; margin-bottom: 5px; }
          p { color: #666; font-size: 12px; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th { background-color: #3498db; color: white; padding: 10px; border: 1px solid #2980b9; text-align: left; }
        </style>
      </head>
      <body>
        <h2>Account Statement / Report</h2>
        <p>User: ${currentUser ? (currentUser.displayName || currentUser.email) : 'N/A'}</p>
        <p>Currency: ${selectedCurrency} (${symbol})</p>
        <p>Generated On: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Description</th><th>Category</th><th>Account</th><th>Mode</th><th>Type</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
