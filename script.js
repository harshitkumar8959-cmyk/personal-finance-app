// Complete Firebase Configuration
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

  if (email === null) {
    return;
  }

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
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Domain issue: Firebase Console mein Domain Authorized nahi hai.");
      } else {
        alert("Reset Error: " + error.message);
      }
    });
}

// 5. Auth State Observer (Protect Routes Automatically)
function checkAuthState() {
  auth.onAuthStateChanged((user) => {
    // Current file ka name fetch karein
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1);

    // Dynamic User Email Display (agar element exist karta hai)
    const userEmailElement = document.getElementById('user-email-display');
    if (userEmailElement && user) {
      userEmailElement.textContent = user.email;
    }

    // Unauthenticated user attempting to view Dashboard
    if (!user && (currentPage === 'dashboard.html' || currentPage === '')) {
      window.location.href = 'login.html';
    }
    
    // Already authenticated user attempting to view Login/Register
    if (user && (currentPage === 'login.html' || currentPage === 'register.html')) {
      window.location.href = 'dashboard.html';
    }
  });
}

// Run protection check automatically on page load
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
