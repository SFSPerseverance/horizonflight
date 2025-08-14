// Sidebar hover functionality with delay
let sidebarTimeout;
const sidebar = document.getElementById('sidebar');

sidebar.addEventListener('mouseenter', () => {
    clearTimeout(sidebarTimeout);
});

sidebar.addEventListener('mouseleave', () => {
    sidebarTimeout = setTimeout(() => {
        // The CSS handles the collapse automatically
    }, 1000);
});

/* -------------------------
   Changelogs loader (unchanged)
   ------------------------- */
// (kept same as your original code)
async function loadChangelogs() {
    const container = document.getElementById('changelogContainer');
    const errorBox = document.getElementById('changelogError');

    try {
        const response = await fetch('changelogs.txt');
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const text = await response.text();
        const lines = text.split('\n');

        let entries = [];
        let currentEntry = [];

        // Split entries by [changelogentry]
        lines.forEach(line => {
            if (line.trim().startsWith('[changelogentry]')) {
                if (currentEntry.length > 0) {
                    entries.push(currentEntry);
                    currentEntry = [];
                }
                currentEntry.push(line.replace('[changelogentry]', '').trim());
            } else {
                currentEntry.push(line.trim());
            }
        });
        if (currentEntry.length > 0) {
            entries.push(currentEntry);
        }

        container.innerHTML = ''; // Clear "loading" spinner

        entries.forEach(entry => {
            const [version, date] = entry[0].split('|').map(s => s.trim());
            const subtitle = entry[1] || '';
            const bodyLines = entry.slice(2).filter(l => l);

            const entryDiv = document.createElement('div');
            entryDiv.className = 'changelog-entry';

            let bodyHTML = `<h3>${""}</h3><ul>`;
            let insideExpandable = false;
            let expandableItems = [];

            bodyLines.forEach(line => {
                if (line.startsWith('##')) {
                    // Close previous expandable if open
                    if (insideExpandable) {
                        bodyHTML += `
                <div class="expandable-content" style="display:none;">
                    <ul>${expandableItems.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            `;
                        expandableItems = [];
                        insideExpandable = false;
                    }
                    // Start new expandable category
                    const sectionTitle = line.replace('##', '').trim();
                    bodyHTML += `<li class="expandable-toggle"><strong>${sectionTitle}</strong> <span class="arrow">▼</span></li>`;
                    insideExpandable = true;
                } else if (insideExpandable) {
                    if (line.startsWith('-') || line === '') {
                        // Close expandable before adding normal bullets
                        bodyHTML += `
                <div class="expandable-content" style="display:none;">
                    <ul>${expandableItems.map(item => `<li>${item}</li>`).join('')}</ul>
                </div>
            `;
                        expandableItems = [];
                        insideExpandable = false;
                        if (line.startsWith('-')) {
                            bodyHTML += `<li>${line.replace(/^- /, '')}</li>`;
                        }
                    } else {
                        // Split comma-separated items into vertical list
                        line.split(',').forEach(item => {
                            const trimmed = item.trim();
                            if (trimmed) expandableItems.push(trimmed);
                        });
                    }
                } else {
                    bodyHTML += `<li>${line.replace(/^- /, '')}</li>`;
                }
            });

            // Close last expandable if still open
            if (insideExpandable) {
                bodyHTML += `
        <div class="expandable-content" style="display:none;">
            <ul>${expandableItems.map(item => `<li>${item}</li>`).join('')}</ul>
        </div>
    `;
            }

            bodyHTML += `</ul>`;

            entryDiv.innerHTML = `
                <div class="changelog-header changelog-toggle">
                    <div class="changelog-version">${version}</div>
                    <div class="changelog-date">${subtitle || ''}</div>
                    <span class="arrow">▼</span>
                </div>
                <div class="changelog-content" style="display:none;">
                    ${bodyHTML}
                </div>
            `;

            container.appendChild(entryDiv);
        });

        // Click event for main changelog toggle
        document.querySelectorAll('.changelog-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const content = toggle.nextElementSibling;
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    toggle.querySelector('.arrow').textContent = '▲';
                } else {
                    content.style.display = 'none';
                    toggle.querySelector('.arrow').textContent = '▼';
                }
            });
        });

        // Click events for expandable categories inside changelog
        document.querySelectorAll('.expandable-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const content = toggle.nextElementSibling;
                if (content && content.classList.contains('expandable-content')) {
                    if (content.style.display === 'none') {
                        content.style.display = 'block';
                        toggle.querySelector('.arrow').textContent = '▲';
                    } else {
                        content.style.display = 'none';
                        toggle.querySelector('.arrow').textContent = '▼';
                    }
                }
            });
        });

    } catch (err) {
        console.error('Error loading changelogs:', err);
        container.style.display = 'none';
        errorBox.style.display = 'flex';
    }
}

// Call when page loads
document.addEventListener('DOMContentLoaded', loadChangelogs);

async function getRobloxAvatar(userId) {
    try {
        const response = await fetch(
            `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${userId}&size=100x100&format=Png&isCircular=true`
        );
        const data = await response.json();

        if (data.data && data.data.length > 0 && data.data[0].state === "Completed") {
            const avatarUrl = data.data[0].imageUrl;
            return avatarUrl;
        } else {
            // If the avatar isn't ready yet, return a placeholder
            return "https://via.placeholder.com/100?text=Avatar";
        }
    } catch (err) {
        console.error("Error fetching Roblox avatar:", err);
        return "https://via.placeholder.com/100?text=Avatar";
    }
}

async function getRobloxUsername(userId) {
    try {
        const response = await fetch(`https://users.roproxy.com/v1/users/${userId}`);
        const data = await response.json();

        if (data && data.name) {
            return data.name; // the Roblox username
        } else {
            return null; // user not found
        }
    } catch (err) {
        console.error("Error fetching Roblox username:", err);
        return null;
    }
}

/* -------------------------
   UI helpers
   ------------------------- */
function animateModalOpen(modal) {
    modal.style.display = 'block';
    // add class to trigger CSS animation
    modal.classList.remove('modal-anim-out');
    modal.classList.add('modal-anim-in');
    // animate content
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('anim-out');
        content.classList.add('anim-in');
    }
}

function animateModalClose(modal) {
    // play closing animation then hide
    modal.classList.remove('modal-anim-in');
    modal.classList.add('modal-anim-out');

    const content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('anim-in');
        content.classList.add('anim-out');
        content.addEventListener('animationend', function _onEnd() {
            modal.style.display = 'none';
            content.classList.remove('anim-out');
            content.removeEventListener('animationend', _onEnd);
        });
    } else {
        // fallback
        setTimeout(() => (modal.style.display = 'none'), 250);
    }
}

function generateVerificationCode() {
    // 6-digit, leading zeros allowed
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* -------------------------
   Smooth scrolling & UI niceties
   ------------------------- */
// Smooth scrolling for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add active state management for menu items
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function (e) {
        e.preventDefault();

        // Remove active class from all items
        document.querySelectorAll('.menu-item').forEach(menuItem => {
            menuItem.classList.remove('active');
        });

        // Add active class to clicked item
        this.classList.add('active');
    });
});

// Add some interactive animations on scroll
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;

    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        heroSection.style.transform = `translate3d(0, ${rate}px, 0)`;
    }
});

/* -------------------------
   Authentication System
   ------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    checkLoginStatus();

    // Initialize authentication
    initializeAuth();

    // Add some simulator-specific interactions
    initializeSimulatorFeatures();
});

function initializeAuth() {
    const modal = document.getElementById('authModal');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginFormElement = document.getElementById('loginFormElement');
    const signupFormElement = document.getElementById('signupFormElement');
    const logoutBtn = document.getElementById('logoutBtn');

    // Show login modal
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // show modal with animation and login form
        animateModalOpen(modal);
        showLoginForm();
    });

    // Close modal by clicking X only
    closeBtn.addEventListener('click', () => {
        animateModalClose(modal);
    });

    // NOTE: clicking outside the modal no longer closes it (explicit requirement).
    // If you want to re-enable, attach an event listener to window and check e.target === modal.

    // Switch to signup form
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });

    // Switch to login form
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Handle login form submission
    loginFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    // Handle signup form submission
    signupFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSignup();
    });

    // Handle logout
    logoutBtn.addEventListener('click', () => {
        handleLogout();
    });
}

function showLoginForm() {
    // animate switch
    const login = document.getElementById('loginForm');
    const signup = document.getElementById('signupForm');
    const verify = document.getElementById('verifyForm');
    if (verify) verify.style.display = 'none';
    signup.style.display = 'none';
    login.style.display = 'block';
    // simple CSS class-based fade if desired
    login.classList.add('form-anim-in');
    setTimeout(() => login.classList.remove('form-anim-in'), 400);
}

function showSignupForm() {
    const login = document.getElementById('loginForm');
    const signup = document.getElementById('signupForm');
    const verify = document.getElementById('verifyForm');
    if (verify) verify.style.display = 'none';
    login.style.display = 'none';
    signup.style.display = 'block';
    signup.classList.add('form-anim-in');
    setTimeout(() => signup.classList.remove('form-anim-in'), 400);
}

function showVerificationForm(username, code) {
    // create or update a verification form inside the modal
    const existing = document.getElementById('verifyForm');
    if (existing) existing.remove();

    const container = document.querySelector('#authModal .modal-content');
    const verifyDiv = document.createElement('div');
    verifyDiv.id = 'verifyForm';
    verifyDiv.className = 'auth-form';
    verifyDiv.innerHTML = `
        <h2>Verify your account</h2>
        <p style="color:#b0b0b0; font-size:14px; margin-bottom:10px;">
            A one-time 6-digit verification code was generated for your signup.
            <strong>Enter that code in the Horizon Flight Roblox game</strong> (in the in-game verification UI).
            Once you've entered it there, click <em>Check verification</em> below.
        </p>
        <div class="input-group">
            <label>Your Roblox User id</label>
            <input type="text" id="verifyUserId" value="${username}" disabled>
        </div>
        <div class="input-group">
            <label>Verification Status</label>
            <div id="verifyStatus" style="color:#b0b0b0; font-size:14px;">Waiting for verification from the Roblox game...</div>
        </div>
        <div style="display:flex; gap:10px;">
            <button id="checkVerificationBtn" class="auth-btn" style="flex:1;">Check verification</button>
            <button id="showCodeBtn" class="auth-btn" style="flex:1; background:transparent; border:1px solid rgba(100,181,246,0.3);">Show code</button>
        </div>
        <div id="revealedCode" style="margin-top:12px; color:#64b5f6; font-weight:700; display:none;">${code}</div>
        <p style="margin-top:12px; font-size:13px; color:#888;">If you're testing locally, you can click "Show code" and paste it into the Roblox game's verification input. In production you'd typically hide the code and have the Roblox game send the code to your server to mark the account verified.</p>
    `;
    // hide login/signup while verification shown
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    container.appendChild(verifyDiv);

    // small animation
    verifyDiv.classList.add('form-anim-in');
    setTimeout(() => verifyDiv.classList.remove('form-anim-in'), 400);

    // Add button events
    document.getElementById('showCodeBtn').addEventListener('click', () => {
        const rc = document.getElementById('revealedCode');
        rc.style.display = rc.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('checkVerificationBtn').addEventListener('click', async () => {
        const API_BASE = "https://horizon-backend-4f8h.onrender.com";
        const statusResp = await fetch(`${API_BASE}/api/verify-status?user=${encodeURIComponent(username)}`);
        const statusJson = await statusResp.json();

        const statusEl = document.getElementById('verifyStatus');
        if (statusJson.ok && statusJson.verified) {
            statusEl.textContent = 'Verified — signup complete!';
            statusEl.style.color = '#8ee28e';

            // Now log in the user (store only the ID locally)
            setLoginCookie(username);
            updateUIForLoggedInUser(username);

            // Close modal
            setTimeout(() => animateModalClose(document.getElementById('authModal')), 800);
            showMessage('Verification successful — welcome!', 'success');
        } else {
            statusEl.textContent = 'Not verified yet. Enter the code in the Roblox game.';
            statusEl.style.color = '#ffbaba';
        }
    });
};

/* -------------------------
   Login / Signup / Verification handlers
   ------------------------- */
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // Get stored user data
    const userData = getUserData(username);

    if (!userData) {
        showMessage('Username not found. Please sign up first.', 'error');
        return;
    }

    if (userData.password !== password) {
        showMessage('Incorrect password', 'error');
        return;
    }

    if (!userData.verified) {
        // If user hasn't verified, show the verification form again
        showMessage('Account not verified yet — please verify using the Roblox game.', 'error');
        showVerificationForm(username, userData.verificationCode || '------');
        return;
    }

    // Set login cookie and update UI
    setLoginCookie(username);
    updateUIForLoggedInUser(username);
    const username2 = await getRobloxUsername(username);
    const modal = document.getElementById('authModal');
    animateModalClose(modal);
    showMessage(`Welcome back, ${username2}!`, 'success');
}

async function handleSignup() {
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!username || !password || !confirmPassword) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    if (!/^\d+$/.test(username)) {
        showMessage('User id must be numbers only', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
        showMessage('Password must be at least 8 characters and include uppercase, lowercase, number, and special character', 'error');
        return;
    }

    const username2 = await getRobloxUsername(username);
    if (!username2) {
        showMessage('Incorrect User id', 'error');
        return;
    }

    // Call backend to create verification code
    const API_BASE = "https://horizon-backend-4f8h.onrender.com";
    const resp = await fetch(`${API_BASE}/api/create-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: username })
    });
    const out = await resp.json();
    if (!out.ok) {
        showMessage("Server error creating verification", "error");
        return;
    }

    // Show verification UI (only show code if DEBUG_RETURN_CODE=true on backend)
    const codeForTesting = out.code || "------";
    showMessage('Signup created — awaiting verification from the Roblox game', 'success');
    showVerificationForm(username, codeForTesting);
}

function handleLogout() {
    // Clear login cookie
    document.cookie = "horizonUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Update UI
    updateUIForLoggedOutUser();
    showMessage('Logged out successfully', 'success');
}

/* -------------------------
   Cookie and Storage Functions
   ------------------------- */
function setLoginCookie(username) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    document.cookie = `horizonUser=${username}; expires=${expires.toUTCString()}; path=/`;
}

function getLoginCookie() {
    const name = "horizonUser=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');

    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getUserData(username) {
    const users = JSON.parse(localStorage.getItem('horizonUsers') || '{}');
    return users[username] || null;
}

/* -------------------------
   Check login status & UI updates
   ------------------------- */
function checkLoginStatus() {
    const loggedInUser = getLoginCookie();
    if (loggedInUser) {
        updateUIForLoggedInUser(loggedInUser);

        // Update last login time
        const userData = getUserData(loggedInUser);
        if (userData) {
            userData.lastLogin = new Date().toISOString();
            storeUserData(loggedInUser, userData.password, userData);
        }
    } else {
        updateUIForLoggedOutUser();
    }
}

async function updateUIForLoggedInUser(username) {
    document.body.classList.add('logged-in');
    document.getElementById('userInfo').style.display = 'flex';
    const userId = username;
    const username2 = await getRobloxUsername(userId);
    document.getElementById('currentUser').textContent = username2;

    // Update first menu item to Dashboard instead of Login
    const firstMenuItem = document.querySelector('.menu-item');

    const avatarUrl = await getRobloxAvatar(userId);

    document.querySelector('.user-avatar img').src = avatarUrl;
    if (firstMenuItem) {
        firstMenuItem.innerHTML = `
            <i class="fas fa-home"></i>
            <span class="menu-text">Dashboard</span>
        `;
        firstMenuItem.classList.add('active');
    }
}

function updateUIForLoggedOutUser() {
    document.body.classList.remove('logged-in');
    document.getElementById('userInfo').style.display = 'none';

    // Reset first menu item to Login
    const firstMenuItem = document.querySelector('.menu-item');
    if (firstMenuItem) {
        firstMenuItem.innerHTML = `
            <i class="fas fa-sign-in-alt"></i>
            <span class="menu-text">Login</span>
        `;
        firstMenuItem.id = 'loginBtn';
        firstMenuItem.classList.remove('active');

        // Re-attach login event listener
        firstMenuItem.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('authModal');
            animateModalOpen(modal);
            showLoginForm();
        });
    }
}

/* storeUserData helper that can overwrite with full object */
function storeUserData(username, password, fullUserObject = null) {
    const users = JSON.parse(localStorage.getItem('horizonUsers') || '{}');
    if (fullUserObject) {
        users[username] = fullUserObject;
    } else {
        users[username] = {
            username: username,
            password: password,
            joinDate: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
    }
    localStorage.setItem('horizonUsers', JSON.stringify(users));
}

function showMessage(text, type) {
    // Remove any existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());

    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;

    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 4000);
}

/* -------------------------
   Simulator-specific features (unchanged)
   ------------------------- */
function initializeSimulatorFeatures() {
    // Add click handlers for flight simulator specific actions
    const startFlightButton = document.querySelector('.cta-button');
    if (startFlightButton) {
        startFlightButton.addEventListener('click', function (e) {
            e.preventDefault();
            // showFlightStartModal();
            window.open("https://www.roblox.com/games/135839100919185/ALPHA-Horizon-Flight", '_blank').focus();
        });
    }

    // Add feature card interactions
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', function () {
            const title = this.querySelector('.feature-title').textContent;
            showFeatureDetails(title);
        });
    });
}

// Modal for flight start (placeholder function)
function showFlightStartModal() {
    // This would normally open a flight selection modal
    console.log('Starting flight simulator...');

    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #64b5f6, #42a5f5);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(100, 181, 246, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas fa-plane-departure" style="margin-right: 10px;"></i>
        Initializing Flight Simulator...
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Feature details function
function showFeatureDetails(featureTitle) {
    console.log(`Viewing details for: ${featureTitle}`);

    // Create feature detail notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        border: 1px solid rgba(100, 181, 246, 0.3);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <h4 style="color: #64b5f6; margin-bottom: 8px;">${featureTitle}</h4>
        <p style="font-size: 14px; color: #b0b0b0;">Click to learn more about this feature!</p>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts for simulator
document.addEventListener('keydown', (e) => {
    // ESC to close any modals or return to dashboard
    if (e.key === 'Escape') {
        // Remove any notifications
        document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
            if (el.style.zIndex === '10000') {
                el.remove();
            }
        });
    }

    // F1 for help
    if (e.key === 'F1') {
        e.preventDefault();
        const helpItem = document.querySelector('.menu-item:last-child');
        if (helpItem) {
            helpItem.click();
        }
    }
});

if (!document.getElementById('particles-base-style')) {
    const baseStyle = document.createElement('style');
    baseStyle.id = 'particles-base-style';
    baseStyle.textContent = `
      /* Ensure the particles container sits behind UI but above background */
      #particles {
        position: fixed;
        left: 0;
        top: 0;
        width: 100vw;
        height: 65vh;
        pointer-events: none;
        z-index: -1; /* keep behind UI; tweak if needed */
        overflow: hidden;
      }

      .weather-plane {
        position: absolute;
        pointer-events: none;
        will-change: transform, opacity;
        text-shadow: 0 2px 6px rgba(0,0,0,0.25);
        transform-origin: center;
        user-select: none;
      }
    `;
    document.head.appendChild(baseStyle);
}

function getParticlesContainer() {
    let container = document.getElementById('particles');
    if (!container) {
        container = document.createElement('div');
        container.id = 'particles';
        document.body.appendChild(container);
    }
    return container;
}

function addWeatherEffect() {
    const container = getParticlesContainer();
    // spawn chance (tweak to taste)
    if (1) { // ~12% chance
        const id = 'plane-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const plane = document.createElement('i');
        plane.className = `fas fa-plane weather-plane`;
        plane.setAttribute('aria-hidden', 'true');

        // get container bounds so planes stay in same area as rain
        const rect = container.getBoundingClientRect();

        // random start inside container
        const startX = Math.random() * rect.width;
        const startY = Math.random() * rect.height;

        // random direction (angle in radians), full 360°
        const theta = Math.random() * Math.PI * 2;
        // random distance to travel in pixels (adjust min/max to change travel length)
        const minDist = Math.min(rect.width, rect.height) * 0.15; // at least some travel
        const maxDist = Math.min(rect.width, rect.height) * 0.6;  // not too far
        const dist = minDist + Math.random() * (maxDist - minDist);

        const dx = Math.cos(theta) * dist;
        const dy = Math.sin(theta) * dist;

        // Make plane smaller and slightly transparent
        const sizePx = 8 + Math.floor(Math.random() * 8); // 8 - 15px
        const opacity = 0.35 + Math.random() * 0.25; // ~0.35 - 0.6

        plane.style.left = `${startX}px`;
        plane.style.top = `${startY}px`;
        plane.style.fontSize = `${sizePx}px`;
        plane.style.color = `rgba(100,181,246, ${opacity})`;

        // The plane glyph points to the RIGHT by default. Convert angle to degrees,
        // and rotate so it faces the movement direction.
        const angleDeg = theta * 180 / Math.PI;

        // initial transform includes rotation; the animation will animate translate + keep rotation
        plane.style.transform = `translate(0px, 0px) rotate(${angleDeg}deg)`;

        // random duration and small delay
        const duration = (2.2 + Math.random() * 2.4).toFixed(2); // 2.2s - 4.6s
        const delay = 0;

        // create per-plane keyframes so each plane moves exactly dx/dy and retains rotation
        const keyframeName = `planeFly_${id}`;
        const keyframes = `
          @keyframes ${keyframeName} {
            from {
              transform: translate(0px, 0px) rotate(${angleDeg}deg);
              opacity: ${opacity};
            }
            70% {
              opacity: ${Math.max(0, opacity - 0.08)};
            }
            to {
              transform: translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${angleDeg}deg);
              opacity: 0;
            }
          }
        `;

        // inject the keyframe rule in a style element and attach to DOM
        const styleEl = document.createElement('style');
        styleEl.id = `style-${id}`;
        styleEl.textContent = keyframes;
        document.head.appendChild(styleEl);

        // apply animation
        plane.style.animation = `${keyframeName} ${duration}s linear ${delay}s forwards`;

        // append to particles container (so it's behind UI as the rain was)
        container.appendChild(plane);

        // cleanup after animation finishes (duration + delay + small buffer)
        const totalMs = (parseFloat(duration) + parseFloat(delay) + 0.2) * 1000;
        setTimeout(() => {
            styleEl.remove();
            plane.remove();
        }, totalMs);
    }
}

// Add rain effect occasionally
setInterval(addWeatherEffect, 200);

// Add the rain animation
const rainStyle = document.createElement('style');
rainStyle.textContent = `
    @keyframes rainDrop {
        to {
            transform: translateY(100vh);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rainStyle);

function listTestUsers() {
    const users = JSON.parse(localStorage.getItem('horizonUsers') || '{}');
    return users; // object: { userId: userObj, ... }
}

function deleteTestUser(userId) {
    const users = JSON.parse(localStorage.getItem('horizonUsers') || '{}');
    if (!users[userId]) return false;
    delete users[userId];
    localStorage.setItem('horizonUsers', JSON.stringify(users));
    // If deleted user was logged-in user, clear cookie
    const loggedIn = getLoginCookie();
    if (loggedIn === userId) document.cookie = "horizonUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    return true;
}

function clearAllTestUsers() {
    localStorage.removeItem('horizonUsers');
    document.cookie = "horizonUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}


(function () {
    const openBtn = document.getElementById('openTestUsersBtn');
    const panel = document.getElementById('testUsersPanel');
    const closeBtn = document.getElementById('closeTestUsersBtn');
    const listEl = document.getElementById('testUsersList');
    const refreshBtn = document.getElementById('refreshTestUsersBtn');
    const clearBtn = document.getElementById('clearTestUsersBtn');

    if (!openBtn) return; // if not added to HTML, skip

    function render() {
        const users = JSON.parse(localStorage.getItem('horizonUsers') || '{}');
        listEl.innerHTML = '';
        const ids = Object.keys(users);
        if (ids.length === 0) {
            listEl.innerHTML = '<div style="color:#777">No test users</div>';
            return;
        }
        ids.forEach(id => {
            const li = document.createElement('div');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '6px 0';
            li.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:600">${id}</div>
          <div style="font-size:12px; color:#999;">${users[id].joinDate ? new Date(users[id].joinDate).toLocaleString() : ''}</div>
        </div>
        <div style="margin-left:8px; display:flex; gap:6px;">
          <button data-id="${id}" class="deleteTestUserBtn" style="background:#c0392b; color:#fff; border-radius:6px; padding:6px 8px; border:0;">Delete</button>
        </div>
      `;
            listEl.appendChild(li);
        });
        // attach delete handlers
        listEl.querySelectorAll('.deleteTestUserBtn').forEach(b => {
            b.addEventListener('click', (e) => {
                const uid = e.currentTarget.getAttribute('data-id');
                if (!confirm(`Delete test user ${uid}?`)) return;
                deleteTestUser(uid);
                render();
                showMessage(`Deleted ${uid}`, 'success');
            });
        });
    }

    openBtn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        if (panel.style.display === 'block') render();
    });
    closeBtn.addEventListener('click', () => panel.style.display = 'none');
    refreshBtn.addEventListener('click', render);
    clearBtn.addEventListener('click', () => {
        if (!confirm('Delete ALL test users?')) return;
        clearAllTestUsers();
        render();
        showMessage('All test users cleared', 'success');
    });
})();