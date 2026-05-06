// Initialize Firebase (from firebase-config.js already loaded)
const auth = firebase.auth();

// ===============================
// LOGIN FUNCTION
// ===============================
const loginForm = document.getElementById("login-form");
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("admin-dashboard");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            loginScreen.classList.add("hidden");
            dashboard.classList.remove("hidden");
        })
        .catch((error) => {
            loginError.textContent = error.message;
            loginError.classList.remove("hidden");
        });
});

// ===============================
// AUTH STATE CHECK
// ===============================
auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.classList.add("hidden");
        dashboard.classList.remove("hidden");
        loadDashboardData();
    } else {
        loginScreen.classList.remove("hidden");
        dashboard.classList.add("hidden");
    }
});

// ===============================
// LOGOUT
// ===============================
document.getElementById("logout-btn").addEventListener("click", () => {
    auth.signOut();
});

// ===============================
// LOAD DASHBOARD DATA
// ===============================
function loadDashboardData() {
    loadStats();
    loadDonations();
    loadMessages();
}

// ===============================
// LOAD STATS
// ===============================
function loadStats() {
    db.collection("stats").doc("main").get().then(doc => {
        if (doc.exists) {
            const data = doc.data();

            document.getElementById("admin-communities").textContent = data.communities || 0;
            document.getElementById("admin-donors").textContent = data.donors || 0;
            document.getElementById("admin-funds").textContent = "KES " + (data.funds || 0);

            // Fill settings form
            document.getElementById("edit-communities").value = data.communities || 0;
            document.getElementById("edit-donors").value = data.donors || 0;
            document.getElementById("edit-funds").value = data.funds || 0;
        }
    });
}

// ===============================
// UPDATE COUNTERS
// ===============================
document.getElementById("counters-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const communities = Number(document.getElementById("edit-communities").value);
    const donors = Number(document.getElementById("edit-donors").value);
    const funds = Number(document.getElementById("edit-funds").value);

    db.collection("stats").doc("main").set({
        communities,
        donors,
        funds
    }).then(() => {
        alert("Stats updated!");
        loadStats();
    });
});

// ===============================
// LOAD DONATIONS
// ===============================
function loadDonations() {
    const table = document.getElementById("all-donations-body");
    table.innerHTML = "";

    db.collection("donations").orderBy("date", "desc").get()
        .then(snapshot => {

            if (snapshot.empty) {
                table.innerHTML = `<tr><td colspan="6">No donations yet</td></tr>`;
                return;
            }

            snapshot.forEach(doc => {
                const d = doc.data();

                const row = `
                    <tr>
                        <td>${new Date(d.date).toLocaleDateString()}</td>
                        <td>${d.transactionId || "-"}</td>
                        <td>${d.name || "Anonymous"}</td>
                        <td>${d.phone || "-"}</td>
                        <td>KES ${d.amount}</td>
                        <td>${d.status || "completed"}</td>
                    </tr>
                `;
                table.innerHTML += row;
            });
        });
}

// ===============================
// LOAD MESSAGES
// ===============================
function loadMessages() {
    const list = document.getElementById("messages-list");
    list.innerHTML = "";

    db.collection("messages").orderBy("date", "desc").get()
        .then(snapshot => {

            if (snapshot.empty) {
                list.innerHTML = "<p>No messages yet</p>";
                return;
            }

            snapshot.forEach(doc => {
                const m = doc.data();

                const item = document.createElement("div");
                item.classList.add("message-item");

                item.innerHTML = `
                    <h4>${m.name}</h4>
                    <p>${m.email}</p>
                    <p>${m.message}</p>
                    <small>${new Date(m.date).toLocaleString()}</small>
                `;

                list.appendChild(item);
            });
        });
}

// ===============================
// SIDEBAR NAVIGATION
// ===============================
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const section = btn.getAttribute("data-section");

        document.querySelectorAll(".admin-section").forEach(sec => {
            sec.classList.remove("active");
        });

        document.getElementById("section-" + section).classList.add("active");
    });
});
