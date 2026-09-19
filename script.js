// Firebase Configuration (Apne Firebase Console ka real credentials yahan rakhein)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// Register Function
async function registerUser() {
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  if (!email || !password) return alert("Please fill all details!");

  try {
    await auth.createUserWithEmailAndPassword(email, password);
    alert("Account created successfully!");
    window.location.href = 'dashboard.html';
  } catch (error) {
    alert("Error: " + error.message);
  }
}

// Login Function
async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) return alert("Please fill all details!");

  try {
    await auth.signInWithEmailAndPassword(email, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    alert("Error: " + error.message);
  }
}

// 1. Show/Hide Password Toggle
function togglePassword(inputId, iconElement) {
  const passwordInput = document.getElementById(inputId);
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    iconElement.textContent = "🙈";
  } else {
    passwordInput.type = "password";
    iconElement.textContent = "👁️";
  }
}

// 2. Forgot Password Handler
async function handleForgotPassword() {
  const email = prompt("Enter your registered Email address:");
  if (!email) {
    if (email !== null) alert("Email field cannot be empty!");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email.trim());
    alert("Password reset email sent! Please check your inbox.");
  } catch (error) {
    console.error("Forgot Password Error:", error);
    alert("Error: " + error.message);
  }
}
