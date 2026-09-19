// Firebase Configuration
// NOTE: Apne Firebase Console (Project Settings -> General -> Web App) se REAL credentials yahan paste karein
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase App
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Global Auth Instance
const auth = firebase.auth();

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

// 4. Forgot Password Reset Handler (FIXED)
function handleForgotPassword() {
  const email = prompt("Enter your registered Email address:");

  if (email === null) {
    // User clicked Cancel
    return;
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail === "") {
    alert("Email address cannot be empty!");
    return;
  }

  // Direct Firebase Authentication Trigger
  auth.sendPasswordResetEmail(trimmedEmail)
    .then(() => {
      alert("Password reset email sent! Please check your Inbox and Spam/Junk folder.");
    })
    .catch((error) => {
      console.error("Password Reset Failed:", error);
      
      // Clear human-readable error alerts
      if (error.code === 'auth/user-not-found') {
        alert("Is email address se koi account registered nahi hai.");
      } else if (error.code === 'auth/invalid-email') {
        alert("Kripya sahi email format daalein.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Domain issue: Firebase Console mein Netlify Link (Authorized Domains) add karein.");
      } else {
        alert("Reset Error: " + error.message);
      }
    });
}
