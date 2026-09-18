// Firebase Configuration Setup
const firebaseConfig = {
  apiKey: "AIzaSyCHkgJ4Bh9EHKraQFT6-9HbOvTcxeARXMo",
  authDomain: "personal-finance-app-7506a.firebaseapp.com",
  projectId: "personal-finance-app-7506a",
  storageBucket: "personal-finance-app-7506a.firebasestorage.app",
  messagingSenderId: "975303702668",
  appId: "1:975303702668:web:25cbfb91906d7b041e63a9"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let isSignUp = false;
let myChart = null;

// DOM Loaded Event Listener
document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authForm");
    if (authForm) {
        authForm.addEventListener("submit", (e) => {
            e.preventDefault();
            handleAuth();
        });
    }

    const transactionForm = document.getElementById("transactionForm");
    if (transactionForm) {
        transactionForm.addEventListener("submit", addTransaction);
    }
});

// Auth State Observer
auth.onAuthStateChanged(user => {
    const path = window.location.pathname;
    const isLoginPage = path.endsWith("index.html") || path.endsWith("login.html") || path === "/" || path.endsWith("/");

    if (user) {
        if (isLoginPage) window.location.href = "dashboard.html";
        else updateDashboard();
    } else {
        if (!isLoginPage) window.location.href = "index.html";
    }
});

// Toggle Login / Sign Up UI
function toggleMode() {
    isSignUp = !isSignUp;
    document.getElementById("form-title").innerText = isSignUp ? "Create Account" : "Login to App";
    document.getElementById("auth-btn").innerText = isSignUp ? "Sign Up" : "Login";
    document.getElementById("toggle-msg").innerText = isSignUp ? "Already have an account?" : "Don't have an account?";
    document.getElementById("toggle-btn").innerText = isSignUp ? "Login" : "Sign Up";
}

// Authentication Logic
function handleAuth() {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    if (isSignUp) {
        auth.createUserWithEmailAndPassword(email, password)
            .then(() => alert("Account successfully created!"))
            .catch(err => alert("Error: " + err.message));
    } else {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                window.location.href = "dashboard.html";
            })
            .catch(err => alert("Login Error: " + err.message));
    }
}

// Logout Logic
function logout() {
    auth.signOut().then(() => window.location.href = "index.html");
}

// Add Transaction to Firestore Cloud
function addTransaction(e) {
    if (e) e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    let amount = document.getElementById("amount").value;
    let category = document.getElementById("category").value;
    let description = document.getElementById("description").value;
    let date = document.getElementById("date").value;
    let type = document.getElementById("type").value;

    if (!amount || !description) {
        alert("Amount and Description are required fields.");
        return;
    }

    db.collection("users").doc(user.uid).collection("transactions").add({
        amount: parseFloat(amount),
        category: category,
        description: description,
        date: date,
        type: type.toLowerCase(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Transaction successfully saved to Cloud!");
        window.location.href = "dashboard.html";
    }).catch(err => alert("Save Error: " + err.message));
}

// Delete Transaction from Firestore Cloud
function deleteTransaction(id) {
    const user = auth.currentUser;
    if (!user) return;

    db.collection("users").doc(user.uid).collection("transactions").doc(id).delete()
        .then(() => updateDashboard());
}

// Fetch Real-time Cloud Data & Update Dashboard
function updateDashboard() {
    const user = auth.currentUser;
    if (!user) return;

    db.collection("users").doc(user.uid).collection("transactions")
        .get()
        .then(snapshot => {
            let totalIncome = 0;
            let totalExpense = 0;
            let listElement = document.getElementById("transaction-list");
            if (listElement) listElement.innerHTML = "";

            snapshot.forEach(doc => {
                let t = doc.data();
                let amountNum = parseFloat(t.amount) || 0;
                let transactionType = (t.type || "income").toLowerCase();

                if (transactionType === "income") totalIncome += amountNum;
                else if (transactionType === "expense") totalExpense += amountNum;

                if (listElement) {
                    let row = document.createElement("tr");
                    let amountDisplay = transactionType === "expense" ? `-₹${amountNum}` : `+₹${amountNum}`;
                    let amountColor = transactionType === "expense" ? "red" : "green";

                    row.innerHTML = `
                        <td>${t.date || 'N/A'}</td>
                        <td>${t.description} (${t.category})</td>
                        <td style="color: ${amountColor}; font-weight: bold;">${amountDisplay}</td>
                        <td><button onclick="deleteTransaction('${doc.id}')" style="background-color: #ff4d4d; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Delete</button></td>
                    `;
                    listElement.appendChild(row);
                }
            });

            let balance = totalIncome - totalExpense;
            if (document.getElementById("total-income")) document.getElementById("total-income").innerText = `₹${totalIncome}`;
            if (document.getElementById("total-expense")) document.getElementById("total-expense").innerText = `₹${totalExpense}`;
            if (document.getElementById("total-balance")) document.getElementById("total-balance").innerText = `₹${balance}`;

            renderChart(totalIncome, totalExpense);
        });
}

// Render Pie Chart
function renderChart(income, expense) {
    let ctx = document.getElementById('financeChart');
    if (!ctx) return;
    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#2ea44f', '#ff4d4d']
            }]
        }
    });
}
