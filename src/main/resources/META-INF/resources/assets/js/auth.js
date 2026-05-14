(() => {
    const TOKEN_KEY = "nhatro.token";
    const USER_KEY = "nhatro.user";
    const LEGACY_TOKEN_KEY = "token";

    const page = window.location.pathname.split("/").pop() || "index.html";
    const USER_PROFILE_PAGES = new Set([
        "profile.html",
        "profile-favorites.html",
        "profile-requests.html",
        "profile-rented-room.html",
        "profile-notifications.html"
    ]);

    function token() {
        return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
    }

    function currentUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch {
            return null;
        }
    }

    function saveSession(data) {
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(LEGACY_TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    function clearSession() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }

    function dashboardFor(role) {
        if (role === "ADMIN") {
            return "admin-dashboard.html";
        }
        if (role === "LANDLORD") {
            return "landlord-dashboard.html";
        }
        return "profile.html";
    }

    function loginDestination(role) {
        if (role === "USER") {
            return "index.html";
        }
        return dashboardFor(role);
    }

    function accountInitial(user) {
        const source = user?.fullName || user?.email || "U";
        return source.trim().charAt(0).toUpperCase() || "U";
    }

    async function api(path, options = {}) {
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };
        const jwt = token();
        if (jwt) {
            headers.Authorization = `Bearer ${jwt}`;
        }

        const response = await fetch(path, { ...options, headers });
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
            throw new Error(data.message || "Yêu cầu không thành công");
        }
        return data;
    }

    function messageBox(form) {
        let box = form.querySelector(".form-message");
        if (!box) {
            box = document.createElement("div");
            box.className = "form-message";
            form.prepend(box);
        }
        return box;
    }

    function showMessage(form, type, message) {
        const box = messageBox(form);
        box.className = `form-message ${type}`;
        box.textContent = message;
    }

    function field(form, name) {
        return form.elements[name];
    }

    function updateHeader() {
        const jwt = token();
        const user = currentUser();

        document.querySelectorAll(".home-account-group").forEach((group) => {
            group.hidden = !jwt;
            if (!jwt) {
                group.classList.remove("is-open");
                return;
            }
            group.dataset.accountMenuRoot = "true";
            renderAccountMenu(group, user);
        });

        document.querySelectorAll(".home-user-btn").forEach((link) => {
            link.href = jwt ? "#" : "login.html";
            link.dataset.accountToggle = jwt ? "true" : "false";
            if (jwt) {
                link.innerHTML = `<span class="account-initial">${accountInitial(user)}</span>`;
                link.setAttribute("aria-label", "Mở menu tài khoản");
            }
        });

        document.querySelectorAll(".home-menu-btn").forEach((link) => {
            link.href = jwt ? "#" : "rooms.html";
            link.dataset.accountToggle = jwt ? "true" : "false";
        });

        document.querySelectorAll(".home-login, .listing-login").forEach((link) => {
            link.hidden = Boolean(jwt);
        });

        document.querySelectorAll(".header-actions").forEach((actions) => {
            actions.querySelectorAll('a[href="login.html"], a[href="register.html"]').forEach((link) => {
                link.hidden = Boolean(jwt);
            });

            if (!jwt || actions.querySelector("[data-auth-session]")) {
                return;
            }

            const dashboard = document.createElement("a");
            dashboard.className = "btn btn-outline";
            dashboard.href = dashboardFor(user?.role);
            dashboard.dataset.authSession = "true";
            dashboard.textContent = user?.role === "USER" ? "Tài khoản" : "Dashboard";

            const logout = document.createElement("a");
            logout.className = "btn btn-primary";
            logout.href = "login.html";
            logout.dataset.authLogout = "true";
            logout.dataset.authSession = "true";
            logout.textContent = "Đăng xuất";

            actions.append(dashboard, logout);
        });
    }

    async function refreshNotificationIndicators() {
        const jwt = token();
        if (!jwt) {
            applyNotificationIndicators(0);
            return;
        }

        try {
            const notifications = await api("/api/notifications");
            const unreadCount = (notifications || []).filter((item) => !isNotificationRead(item)).length;
            applyNotificationIndicators(unreadCount);
        } catch {
            applyNotificationIndicators(0);
        }
    }

    function applyNotificationIndicators(unreadCount) {
        const hasUnread = unreadCount > 0;

        document.querySelectorAll(".home-user-btn").forEach((button) => {
            button.classList.toggle("has-notifications", hasUnread);
            if (hasUnread) {
                button.dataset.notificationCount = String(unreadCount);
            } else {
                delete button.dataset.notificationCount;
            }
        });

        document.querySelectorAll('.side-nav a[href="#notifications"], .side-nav a[href*="notifications"], .account-menu-item[data-notification-link="true"]').forEach((link) => {
            link.classList.toggle("has-notifications", hasUnread);
            if (hasUnread) {
                link.dataset.notificationCount = String(unreadCount);
                link.setAttribute("aria-label", `${link.textContent.trim()} - ${unreadCount} thông báo mới`);
            } else {
                delete link.dataset.notificationCount;
                link.removeAttribute("aria-label");
            }
        });
    }

    function isNotificationRead(item) {
        return Boolean(item?.read || item?.isRead);
    }

    function renderAccountMenu(group, user) {
        if (group.querySelector(".account-menu")) {
            updateAccountMenuLinks(group, user);
            return;
        }

        const menu = document.createElement("div");
        menu.className = "account-menu";
        menu.hidden = true;
        group.append(menu);
        updateAccountMenuLinks(group, user);
    }

    function updateAccountMenuLinks(group, user) {
        const menu = group.querySelector(".account-menu");
        if (!menu) {
            return;
        }

        const isLandlord = user?.role === "LANDLORD";
        const isAdmin = user?.role === "ADMIN";
        const profileHref = isLandlord ? "landlord-profile.html" : "profile.html";
        const manageHref = isLandlord ? "landlord-dashboard.html#rooms" : isAdmin ? "admin-dashboard.html" : "profile-requests.html";
        const notificationsHref = isLandlord ? "landlord-notifications.html" : isAdmin ? "admin-dashboard.html" : "profile-notifications.html";

        menu.innerHTML = `
            <a class="account-menu-item" href="${profileHref}" data-profile-link="true">
                ${menuIcon("user")}
                <span>Thông tin cá nhân</span>
            </a>
            <a class="account-menu-item is-active" href="${manageHref}">
                ${menuIcon("calendar")}
                <span>Quản lý thuê phòng</span>
            </a>
            <a class="account-menu-item" href="${notificationsHref}" data-notification-link="true">
                ${menuIcon("bell")}
                <span>Thông báo</span>
            </a>
            <a class="account-menu-item" href="rooms.html">
                ${menuIcon("search")}
                <span>Tìm phòng</span>
            </a>
            <div class="account-menu-separator"></div>
            <a class="account-menu-item" href="login.html" data-auth-logout="true">
                ${menuIcon("logout")}
                <span>Đăng xuất</span>
            </a>
        `;
    }

    function menuIcon(type) {
        const icons = {
            user: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>`,
            calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="m9 15 2 2 4-5"/></svg>`,
            heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
            download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 19h14"/></svg>`,
            group: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 11a4 4 0 1 0-8 0"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M17 14a4 4 0 0 1 4 4v3"/><path d="M18 8a3 3 0 0 1 3 3"/></svg>`,
            refer: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="4"/><path d="M3 21a6 6 0 0 1 12 0"/><path d="M18 8v6M15 11h6"/></svg>`,
            partner: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 11 3 3 7-7"/><path d="M2 12c3-5 7-5 10 0 3 5 7 5 10 0"/></svg>`,
            list: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
            bell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
            search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>`,
            logout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4v18h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>`
        };
        return icons[type] || icons.user;
    }

    function bindLogout() {
        document.addEventListener("click", (event) => {
            const link = event.target.closest("[data-auth-logout]");
            if (!link) {
                return;
            }
            event.preventDefault();
            clearSession();
            window.location.href = "index.html";
        });
    }

    function bindAccountMenu() {
        document.addEventListener("click", (event) => {
            const profileLink = event.target.closest("[data-profile-link='true']");
            if (profileLink) {
                event.preventDefault();
                window.location.href = profileLink.getAttribute("href") || "profile.html";
                return;
            }

            const toggle = event.target.closest("[data-account-toggle='true']");
            const root = event.target.closest("[data-account-menu-root]");

            if (toggle) {
                event.preventDefault();
                const group = toggle.closest("[data-account-menu-root]");
                const menu = group?.querySelector(".account-menu");
                if (!group || !menu) {
                    return;
                }
                const willOpen = !group.classList.contains("is-open");
                closeAccountMenus();
                group.classList.toggle("is-open", willOpen);
                menu.hidden = !willOpen;
                return;
            }

            if (!root) {
                closeAccountMenus();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeAccountMenus();
            }
        });
    }

    function closeAccountMenus() {
        document.querySelectorAll("[data-account-menu-root]").forEach((group) => {
            group.classList.remove("is-open");
            const menu = group.querySelector(".account-menu");
            if (menu) {
                menu.hidden = true;
            }
        });
    }

    function protectPage() {
        const protectedPages = {
            "profile.html": ["USER", "LANDLORD", "ADMIN"],
            "profile-favorites.html": ["USER"],
            "profile-requests.html": ["USER"],
            "profile-rented-room.html": ["USER"],
            "profile-notifications.html": ["USER"],
            "tenant-dashboard.html": ["USER", "ADMIN"],
            "landlord-dashboard.html": ["LANDLORD", "ADMIN"],
            "landlord-profile.html": ["LANDLORD", "ADMIN"],
            "landlord-room-detail.html": ["LANDLORD", "ADMIN"],
            "landlord-requests.html": ["LANDLORD", "ADMIN"],
            "landlord-appointments.html": ["LANDLORD", "ADMIN"],
            "landlord-notifications.html": ["LANDLORD", "ADMIN"],
            "admin-dashboard.html": ["ADMIN"]
        };
        const allowedRoles = protectedPages[page];
        if (!allowedRoles) {
            return;
        }

        const jwt = token();
        const user = currentUser();
        if (!jwt || !user) {
            window.location.href = `login.html?next=${encodeURIComponent(page)}`;
            return;
        }

        if (USER_PROFILE_PAGES.has(page) && user.role === "LANDLORD") {
            window.location.href = "landlord-profile.html";
            return;
        }

        if (!allowedRoles.includes(user.role)) {
            window.location.href = dashboardFor(user.role);
        }
    }

    function bindLoginForm() {
        if (page !== "login.html") {
            return;
        }

        const form = document.querySelector("form");
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = form.querySelector("button[type='submit']");
            button.disabled = true;
            showMessage(form, "info", "Đang đăng nhập...");

            try {
                const data = await api("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        login: field(form, "login").value.trim(),
                        password: field(form, "password").value
                    })
                });
                saveSession(data);
                const next = new URLSearchParams(window.location.search).get("next");
                window.location.href = next || loginDestination(data.user.role);
            } catch (error) {
                showMessage(form, "error", error.message);
            } finally {
                button.disabled = false;
            }
        });
    }

    function bindRegisterForm() {
        if (page !== "register.html") {
            return;
        }

        const form = document.querySelector("form");
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = form.querySelector("button[type='submit']");
            button.disabled = true;
            showMessage(form, "info", "Đang tạo tài khoản...");

            try {
                const data = await api("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        fullName: field(form, "fullName").value.trim(),
                        email: field(form, "email").value.trim(),
                        phone: field(form, "phone").value.trim(),
                        password: field(form, "password").value,
                        confirmPassword: field(form, "confirmPassword").value,
                        role: field(form, "role").value
                    })
                });
                saveSession(data);
                window.location.href = dashboardFor(data.user.role);
            } catch (error) {
                showMessage(form, "error", error.message);
            } finally {
                button.disabled = false;
            }
        });
    }

    function applyProfile(user) {
        if (!user || page !== "profile.html") {
            return;
        }

        if (user.role === "LANDLORD") {
            renderLandlordProfile(user);
        }

        const roleLabels = {
            USER: "Nguoi thue",
            LANDLORD: "Chu tro",
            ADMIN: "Quan tri vien"
        };
        const fullName = user.fullName || "";
        const email = user.email || "";
        const phone = user.phone || "";
        const emailName = email.split("@")[0] || "";
        const fallbackId = (fullName || emailName || phone || "user")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();
        const profileId = fallbackId || "user";

        const setText = (selector, value) => {
            document.querySelectorAll(selector).forEach((element) => {
                element.textContent = value;
            });
        };

        setText("[data-profile-id]", profileId);
        setText("[data-profile-email]", email || "Not set");
        setText("[data-profile-phone]", phone || "Not set");
        setText("[data-profile-role]", roleLabels[user.role] || user.role || "User");
        setText("[data-profile-name]", fullName || "Not set");

        const emailLink = document.querySelector("[data-profile-email-link]");
        if (emailLink) {
            emailLink.href = email ? `mailto:${email}` : "#general";
        }

        const phoneLink = document.querySelector("[data-profile-phone-link]");
        if (phoneLink) {
            phoneLink.href = phone ? `tel:${phone}` : "#general";
        }

        const summaryName = document.querySelector(".profile-summary h2");
        const summaryRole = document.querySelector(".profile-summary .badge");
        if (summaryName) {
            summaryName.textContent = fullName || profileId;
        }
        if (summaryRole) {
            summaryRole.textContent = roleLabels[user.role] || user.role;
        }

        const values = document.querySelectorAll(".info-row strong");
        if (values[0]) values[0].textContent = fullName;
        if (values[1]) values[1].textContent = email;
        if (values[2]) values[2].textContent = phone;
        if (values[3]) values[3].textContent = user.role;

        if (document.querySelector("#fullName")) document.querySelector("#fullName").value = fullName;
        if (document.querySelector("#email")) document.querySelector("#email").value = email;
        if (document.querySelector("#phone")) document.querySelector("#phone").value = phone;
        if (document.querySelector("#avatar")) document.querySelector("#avatar").value = user.avatar || "";
    }

    function renderLandlordProfile(user) {
        if (!document.body.classList.contains("landlord-profile-page")) {
            document.body.classList.add("landlord-profile-page");
            document.querySelector("#password-modal")?.remove();

            const sidebarNav = document.querySelector(".account-sidebar .side-nav");
            if (sidebarNav) {
                sidebarNav.innerHTML = `
                    <a href="landlord-dashboard.html#rooms">Quản lý phòng</a>
                    <a href="landlord-dashboard.html#create-room">Đăng tin mới</a>
                    <a href="landlord-requests.html">Yêu cầu thuê</a>
                    <a href="landlord-appointments.html">Lịch xem</a>
                    <a href="landlord-notifications.html">Thông báo</a>
                    <a class="active" href="landlord-profile.html">Tài khoản</a>
                    <a href="login.html" data-auth-logout="true">Đăng xuất</a>
                `;
            }

            const main = document.querySelector(".account-main");
            if (main) {
                main.innerHTML = `
                    <div class="dashboard-top landlord-profile-top">
                        <div>
                            <h1>Tài khoản chủ trọ</h1>
                            <p>Thông tin đăng nhập và bảo mật tài khoản.</p>
                        </div>
                        <a class="btn btn-outline" href="landlord-dashboard.html">Quay lại quản lý phòng</a>
                    </div>

                    <section class="data-panel landlord-profile-panel" id="account-details">
                        <div class="profile-identity">
                            <div class="profile-identity-avatar" aria-hidden="true">
                                <svg viewBox="0 0 64 64">
                                    <circle cx="32" cy="24" r="13"/>
                                    <path d="M12 56c3.5-13 11-19 20-19s16.5 6 20 19"/>
                                </svg>
                            </div>
                            <div class="profile-identity-text">
                                <strong data-profile-name>loading</strong>
                                <span data-profile-email>loading</span>
                            </div>
                        </div>

                        <div class="settings-title">
                            <h2>Thông tin chi tiết</h2>
                        </div>

                        <div class="settings-card account-settings-card">
                            <a class="settings-row" href="#account-details">
                                <span class="settings-row-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
                                </span>
                                <span class="settings-row-content">
                                    <strong>Full name</strong>
                                    <span data-profile-name>loading</span>
                                </span>
                                <span class="settings-arrow" aria-hidden="true">&rarr;</span>
                            </a>

                            <a class="settings-row" href="#account-details" data-profile-email-link>
                                <span class="settings-row-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>
                                </span>
                                <span class="settings-row-content">
                                    <strong>Email</strong>
                                    <span data-profile-email>loading</span>
                                </span>
                                <span class="settings-arrow" aria-hidden="true">&rarr;</span>
                            </a>

                            <a class="settings-row" href="#account-details" data-profile-phone-link>
                                <span class="settings-row-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6.1 6.1l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
                                </span>
                                <span class="settings-row-content">
                                    <strong>Phone Number</strong>
                                    <span data-profile-phone>Not set</span>
                                </span>
                                <span class="settings-arrow" aria-hidden="true">&rarr;</span>
                            </a>

                            <a class="settings-row" href="#password-modal">
                                <span class="settings-row-icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 8-8"/><path d="m15 8 2 2 3-3-2-2"/></svg>
                                </span>
                                <span class="settings-row-content">
                                    <strong>Password</strong>
                                    <span>********</span>
                                </span>
                                <span class="settings-arrow" aria-hidden="true">&rarr;</span>
                            </a>
                        </div>
                    </section>

                    <section class="modal" id="password-modal" aria-labelledby="password-modal-title">
                        <div class="modal-card password-modal-card">
                            <div class="modal-head">
                                <h2 id="password-modal-title">Đổi mật khẩu</h2>
                                <a class="modal-close" href="#account-details" aria-label="Đóng">&times;</a>
                            </div>
                            <form class="form-grid password-modal-form" id="password-form" data-password-form>
                                <div class="form-field">
                                    <label for="oldPassword">Mật khẩu hiện tại</label>
                                    <input id="oldPassword" name="oldPassword" type="password" autocomplete="current-password" required>
                                </div>
                                <div class="form-field">
                                    <label for="newPassword">Mật khẩu mới</label>
                                    <input id="newPassword" name="newPassword" type="password" autocomplete="new-password" required>
                                </div>
                                <div class="modal-actions">
                                    <a class="btn btn-outline" href="#account-details">Hủy</a>
                                    <button class="btn btn-primary" type="submit">Đổi mật khẩu</button>
                                </div>
                            </form>
                        </div>
                    </section>
                `;
            }
        }
    }

    async function hydrateProfile() {
        if (page !== "profile.html" || !token()) {
            return;
        }

        const cachedUser = currentUser();
        if (cachedUser?.role === "LANDLORD") {
            return;
        }

        applyProfile(cachedUser);
        try {
            const user = await api("/api/users/profile");
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            applyProfile(user);
        } catch (error) {
            if (error.message.toLowerCase().includes("token")) {
                clearSession();
                window.location.href = "login.html";
            }
        }
    }

    function bindProfileForms() {
        if (page !== "profile.html") {
            return;
        }

        const profileForm = document.querySelector("#profile-form form, form[data-profile-form]");
        const passwordForm = document.querySelector("#password-form, form[data-password-form]");

        profileForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                const user = await api("/api/users/profile", {
                    method: "PUT",
                    body: JSON.stringify({
                        fullName: field(profileForm, "fullName").value.trim(),
                        email: field(profileForm, "email").value.trim(),
                        phone: field(profileForm, "phone")?.value.trim() || currentUser()?.phone || "",
                        avatar: field(profileForm, "avatar")?.value.trim() || currentUser()?.avatar || ""
                    })
                });
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                applyProfile(user);
                showMessage(profileForm, "success", "Cập nhật thông tin thành công");
            } catch (error) {
                showMessage(profileForm, "error", error.message);
            }
        });

        passwordForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            try {
                await api("/api/users/change-password", {
                    method: "PUT",
                    body: JSON.stringify({
                        oldPassword: field(passwordForm, "oldPassword").value,
                        newPassword: field(passwordForm, "newPassword").value
                    })
                });
                passwordForm.reset();
                showMessage(passwordForm, "success", "Đổi mật khẩu thành công");
            } catch (error) {
                showMessage(passwordForm, "error", error.message);
            }
        });
    }

    function bindHomeHeaderScroll() {
        const header = document.querySelector(".home-header");
        if (!header) {
            return;
        }

        const sync = () => {
            header.classList.toggle("is-scrolled", window.scrollY > 80);
        };

        sync();
        window.addEventListener("scroll", sync, { passive: true });
    }

    window.NhaTroAuth = {
        token,
        currentUser,
        api,
        dashboardFor,
        refreshNotificationIndicators,
        clearSession
    };

    document.addEventListener("DOMContentLoaded", () => {
        protectPage();
        updateHeader();
        refreshNotificationIndicators();
        bindHomeHeaderScroll();
        bindLogout();
        bindAccountMenu();
        bindLoginForm();
        bindRegisterForm();
        hydrateProfile();
        bindProfileForms();
    });
})();
