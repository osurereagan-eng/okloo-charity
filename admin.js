// ================= CONFIG =================

// 🔥 Cloudinary
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET";

// 🔥 Backend (for delete + M-Pesa)
const API_BASE = "https://your-backend.com";

// 🔥 Firebase
const auth = firebase.auth();

// ================= CLOUDINARY UPLOAD =================
async function uploadToCloudinary(file, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", url);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.responseText));
            } else {
                reject(xhr.responseText);
            }
        };

        xhr.onerror = reject;
        xhr.send(formData);
    });
}


// ================= DELETE FROM CLOUDINARY =================
async function deleteFromCloudinary(publicId) {
    try {
        await fetch(`${API_BASE}/delete-media`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ public_id: publicId })
        });
    } catch (err) {
        console.error("Cloudinary delete failed:", err);
    }
}


// ================= LOGIN =================
const loginForm = document.getElementById("login-form");
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("admin-dashboard");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    auth.signInWithEmailAndPassword(email, password)
        .catch(err => {
            loginError.textContent = err.message;
            loginError.classList.remove("hidden");
        });
});


// ================= AUTH STATE =================
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


// ================= LOGOUT =================
document.getElementById("logout-btn").onclick = () => auth.signOut();


// ================= LOAD DASHBOARD =================
function loadDashboardData() {
    loadStats();
    loadDonations();
    loadMessages();
    loadMedia();
}


// ================= STATS =================
function loadStats() {
    db.collection("stats").doc("main").get().then(doc => {
        if (!doc.exists) return;

        const d = doc.data();

        document.getElementById("admin-communities").textContent = d.communities || 0;
        document.getElementById("admin-donors").textContent = d.donors || 0;
        document.getElementById("admin-funds").textContent = "KES " + (d.funds || 0);

        document.getElementById("edit-communities").value = d.communities || 0;
        document.getElementById("edit-donors").value = d.donors || 0;
        document.getElementById("edit-funds").value = d.funds || 0;
    });
}


// ================= UPDATE COUNTERS =================
document.getElementById("counters-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    await db.collection("stats").doc("main").set({
        communities: Number(edit-communities.value),
        donors: Number(edit-donors.value),
        funds: Number(edit-funds.value)
    });

    alert("Stats updated!");
    loadStats();
});


// ================= DONATIONS =================
function loadDonations() {
    const table = document.getElementById("all-donations-body");
    table.innerHTML = "";

    db.collection("donations").orderBy("date", "desc").get()
        .then(snapshot => {

            if (snapshot.empty) {
                table.innerHTML = `<tr><td colspan="6">No donations</td></tr>`;
                return;
            }

            snapshot.forEach(doc => {
                const d = doc.data();

                table.innerHTML += `
                    <tr>
                        <td>${new Date(d.date).toLocaleDateString()}</td>
                        <td>${d.transactionId || "-"}</td>
                        <td>${d.name || "Anonymous"}</td>
                        <td>${d.phone || "-"}</td>
                        <td>KES ${d.amount}</td>
                        <td>${d.status || "completed"}</td>
                    </tr>
                `;
            });
        });
}


// ================= MEDIA UPLOAD =================
const uploadArea = document.getElementById("upload-area");
const mediaInput = document.getElementById("media-input");
const preview = document.getElementById("upload-preview");
const confirmUpload = document.getElementById("confirm-upload");

let selectedFiles = [];

// Drag events
uploadArea.addEventListener("dragover", e => {
    e.preventDefault();
    uploadArea.classList.add("dragging");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragging");
});

uploadArea.addEventListener("drop", e => {
    e.preventDefault();
    uploadArea.classList.remove("dragging");

    selectedFiles = Array.from(e.dataTransfer.files);
    showPreview();
});

// Click select
uploadArea.onclick = () => mediaInput.click();

mediaInput.onchange = e => {
    selectedFiles = Array.from(e.target.files);
    showPreview();
};


// Preview
function showPreview() {
    preview.innerHTML = "";

    selectedFiles.forEach((file, i) => {
        preview.innerHTML += `
            <div class="preview-item">
                <p>${file.name}</p>
                <div class="progress-bar">
                    <div class="progress" id="progress-${i}"></div>
                </div>
            </div>
        `;
    });

    confirmUpload.disabled = selectedFiles.length === 0;
}


// Upload files
confirmUpload.onclick = async () => {
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const res = await uploadToCloudinary(file, percent => {
            document.getElementById(`progress-${i}`).style.width = percent + "%";
        });

        await db.collection("media").add({
            url: res.secure_url,
            public_id: res.public_id,
            type: res.resource_type === "video" ? "video" : "image",
            createdAt: new Date().toISOString()
        });
    }

    alert("Upload complete!");
    selectedFiles = [];
    preview.innerHTML = "";
    confirmUpload.disabled = true;

    loadMedia();
};


// ================= LOAD MEDIA =================
function loadMedia() {
    const grid = document.getElementById("admin-media-grid");
    grid.innerHTML = "";

    db.collection("media").orderBy("createdAt", "desc").get()
        .then(snapshot => {

            snapshot.forEach(doc => {
                const m = doc.data();

                const item = document.createElement("div");
                item.className = "media-item";

                item.innerHTML = `
                    ${m.type === "image"
                        ? `<img src="${m.url}" />`
                        : `<video src="${m.url}" controls></video>`}
                    <button class="delete-btn">Delete</button>
                `;

                item.querySelector(".delete-btn").onclick = async () => {
                    if (!confirm("Delete this media?")) return;

                    await deleteFromCloudinary(m.public_id);
                    await db.collection("media").doc(doc.id).delete();

                    loadMedia();
                };

                grid.appendChild(item);
            });
        });
}


// ================= LOGO UPLOAD =================
const logoInput = document.getElementById("logo-input");
const selectLogo = document.getElementById("select-logo");
const uploadLogoBtn = document.getElementById("upload-logo");

let logoFile = null;

selectLogo.onclick = () => logoInput.click();

logoInput.onchange = e => {
    logoFile = e.target.files[0];
    uploadLogoBtn.classList.remove("hidden");
};

uploadLogoBtn.onclick = async () => {
    const res = await uploadToCloudinary(logoFile);

    await db.collection("settings").doc("branding").set({
        logo: res.secure_url
    });

    document.getElementById("current-logo").src = res.secure_url;

    alert("Logo updated!");
};


// ================= MESSAGES =================
function loadMessages() {
    const list = document.getElementById("messages-list");
    list.innerHTML = "";

    db.collection("messages").orderBy("date", "desc").get()
        .then(snapshot => {

            if (snapshot.empty) {
                list.innerHTML = "<p>No messages</p>";
                return;
            }

            snapshot.forEach(doc => {
                const m = doc.data();

                list.innerHTML += `
                    <div class="message-item">
                        <h4>${m.name}</h4>
                        <p>${m.email}</p>
                        <p>${m.message}</p>
                        <small>${new Date(m.date).toLocaleString()}</small>
                    </div>
                `;
            });
        });
}


// ================= SIDEBAR NAV =================
document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".admin-section").forEach(sec => sec.classList.remove("active"));

        document.getElementById("section-" + btn.dataset.section).classList.add("active");
    };
});


// ================= M-PESA AUTO LOGGING =================
async function fetchMpesaPayments() {
    try {
        const res = await fetch(`${API_BASE}/mpesa/transactions`);
        const data = await res.json();

        for (let tx of data) {
            await db.collection("donations").doc(tx.transactionId).set(tx);
        }
    } catch (err) {
        console.log("M-Pesa error:", err);
    }
}

setInterval(fetchMpesaPayments, 30000);
