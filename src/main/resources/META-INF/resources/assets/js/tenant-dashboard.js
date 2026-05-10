(() => {
    const auth = window.NhaTroAuth;
    const statsGrid = document.querySelector(".stats-grid");
    const favoritesGrid = document.querySelector("#favorites .room-grid");
    const favoriteExpandButton = document.querySelector("[data-show-all-favorites]");
    const requestsBody = document.querySelector("#requests tbody");
    const appointmentsBody = document.querySelector("#appointments tbody");
    const notificationsList = document.querySelector("#notifications .compact-list");
    const FAVORITE_PREVIEW_LIMIT = 3;
    const currentUser = auth?.currentUser?.();
    let favoriteRooms = [];
    let showAllFavorites = false;
    let notificationReadObserver = null;
    let notificationAutoReadTimer = null;

    if (!statsGrid || !auth?.token?.() || currentUser?.role !== "USER") {
        return;
    }

    async function loadDashboard() {
        setLoading();

        const [favorites, requests, appointments, notifications] = await Promise.all([
            optionalApi("/api/favorite-rooms", []),
            optionalApi("/api/rental-requests/my", []),
            optionalApi("/api/viewing-appointments/my", []),
            optionalApi("/api/notifications", [])
        ]);

        renderStats(favorites, requests, appointments, notifications);
        renderFavorites(favorites);
        renderRequests(requests);
        renderAppointments(appointments);
        renderNotifications(notifications);
        scheduleNotificationAutoRead(notifications);
        auth.refreshNotificationIndicators?.();
    }

    async function optionalApi(path, fallback) {
        try {
            return await auth.api(path);
        } catch {
            return fallback;
        }
    }

    function setLoading() {
        if (favoritesGrid) {
            favoritesGrid.innerHTML = `<div class="empty-state">Đang tải phòng yêu thích...</div>`;
        }
        if (requestsBody) {
            requestsBody.innerHTML = emptyRow(4, "Đang tải yêu cầu thuê...");
        }
        if (appointmentsBody) {
            appointmentsBody.innerHTML = emptyRow(4, "Đang tải lịch xem phòng...");
        }
        if (notificationsList) {
            notificationsList.innerHTML = `<div class="empty-state">Đang tải thông báo...</div>`;
        }
    }

    function renderStats(favorites, requests, appointments, notifications) {
        statsGrid.innerHTML = `
            <div class="metric"><span>Phòng yêu thích</span><strong>${favorites.length}</strong></div>
            <div class="metric"><span>Đang chờ xác nhận</span><strong>${countByStatus(requests, "PENDING")}</strong></div>
            <div class="metric"><span>Lịch sắp xem</span><strong>${upcomingAppointments(appointments)}</strong></div>
            <div class="metric"><span>Thông báo mới</span><strong>${notifications.filter((item) => !isNotificationRead(item)).length}</strong></div>
        `;
    }

    function renderFavorites(rooms) {
        if (!favoritesGrid) {
            return;
        }
        favoriteRooms = rooms;
        if (favoriteRooms.length <= FAVORITE_PREVIEW_LIMIT) {
            showAllFavorites = false;
        }
        renderFavoriteCards();
    }

    function renderFavoriteCards() {
        if (!favoriteRooms.length) {
            favoritesGrid.innerHTML = `<div class="empty-state">Bạn chưa lưu phòng nào. Hãy mở danh sách phòng để lưu các phòng phù hợp.</div>`;
            updateFavoriteExpandButton();
            return;
        }
        const visibleRooms = showAllFavorites ? favoriteRooms : favoriteRooms.slice(0, FAVORITE_PREVIEW_LIMIT);
        favoritesGrid.innerHTML = visibleRooms.map(roomCard).join("");
        updateFavoriteExpandButton();
    }

    function updateFavoriteExpandButton() {
        if (!favoriteExpandButton) {
            return;
        }
        const canExpand = favoriteRooms.length > FAVORITE_PREVIEW_LIMIT;
        favoriteExpandButton.hidden = !canExpand;
        favoriteExpandButton.textContent = showAllFavorites ? "Thu gọn" : "Xem thêm";
    }

    function roomCard(room) {
        const image = room.imageUrls?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=85";
        const statusClass = room.status === "AVAILABLE" ? "badge-available" : "badge-rented";
        const statusText = room.status === "AVAILABLE" ? "Còn trống" : "Đã thuê";
        return `
            <article class="room-card">
                <div class="room-media"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}"></div>
                <div class="room-body">
                    <span class="badge ${statusClass}">${statusText}</span>
                    <h3>${escapeHtml(room.title)}</h3>
                    <p class="room-address">${escapeHtml(room.address)}</p>
                    <div class="price">${formatMoney(room.price)}/tháng</div>
                    <div class="table-actions">
                        <a class="btn btn-primary" href="room-detail.html?id=${room.id}">Xem chi tiết</a>
                        <button class="btn btn-outline" type="button" data-remove-favorite="${room.id}">Bỏ lưu</button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderRequests(requests) {
        if (!requestsBody) {
            return;
        }
        if (!requests.length) {
            requestsBody.innerHTML = emptyRow(4, "Chưa có yêu cầu thuê phòng.");
            return;
        }
        requestsBody.innerHTML = requests.map((item) => `
            <tr>
                <td><a href="room-detail.html?id=${item.roomId}">${escapeHtml(item.roomTitle)}</a></td>
                <td>${escapeHtml(item.expectedRentalTime || "Chưa cập nhật")}</td>
                <td>${statusBadge(item.status)}</td>
                <td>${item.status === "PENDING" ? `<button class="btn btn-outline" type="button" data-cancel-rental="${item.id}">Hủy</button>` : `<a class="btn btn-outline" href="room-detail.html?id=${item.roomId}">Chi tiết</a>`}</td>
            </tr>
        `).join("");
    }

    function renderAppointments(appointments) {
        if (!appointmentsBody) {
            return;
        }
        if (!appointments.length) {
            appointmentsBody.innerHTML = emptyRow(4, "Chưa có lịch xem phòng.");
            return;
        }
        appointmentsBody.innerHTML = appointments.map((item) => `
            <tr>
                <td><a href="room-detail.html?id=${item.roomId}">${escapeHtml(item.roomTitle)}</a></td>
                <td>${formatDateTime(item.appointmentTime)}</td>
                <td>${statusBadge(item.status)}</td>
                <td>${item.status === "PENDING" ? `<button class="btn btn-outline" type="button" data-cancel-appointment="${item.id}">Hủy</button>` : `<a class="btn btn-outline" href="room-detail.html?id=${item.roomId}">Chi tiết</a>`}</td>
            </tr>
        `).join("");
    }

    function renderNotifications(notifications) {
        if (!notificationsList) {
            return;
        }
        if (!notifications.length) {
            notificationsList.innerHTML = `<div class="empty-state">Chưa có thông báo mới.</div>`;
            return;
        }
        notificationsList.innerHTML = notifications.map((item) => `
            <div class="list-item">
                <div>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.content)}</p>
                </div>
                <span class="badge ${isNotificationRead(item) ? "badge-muted" : "badge-approved"}">${isNotificationRead(item) ? "Đã đọc" : "Mới"}</span>
            </div>
        `).join("");
    }

    function scheduleNotificationAutoRead(notifications) {
        if (!notificationsList) {
            return;
        }

        notificationReadObserver?.disconnect();
        notificationReadObserver = null;
        clearTimeout(notificationAutoReadTimer);

        const unread = (notifications || []).filter((item) => item.id && !isNotificationRead(item));
        if (!unread.length) {
            auth.refreshNotificationIndicators?.();
            return;
        }

        const target = document.querySelector("#notifications") || notificationsList;
        const markWhenViewed = () => {
            notificationReadObserver?.disconnect();
            notificationReadObserver = null;
            notificationAutoReadTimer = setTimeout(async () => {
                await markNotificationsRead(unread);
                unread.forEach((item) => {
                    item.read = true;
                    item.isRead = true;
                });
                renderNotifications(notifications);
                auth.refreshNotificationIndicators?.();
            }, 700);
        };

        if (!("IntersectionObserver" in window)) {
            markWhenViewed();
            return;
        }

        notificationReadObserver = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                markWhenViewed();
            }
        }, { threshold: 0.35 });
        notificationReadObserver.observe(target);
    }

    async function markNotificationsRead(notifications) {
        await Promise.allSettled(
            notifications.map((item) => auth.api(`/api/notifications/${item.id}/read`, { method: "PUT" }))
        );
    }

    function bindActions() {
        document.addEventListener("click", async (event) => {
            const favorite = event.target.closest("[data-remove-favorite]");
            const favoriteExpand = event.target.closest("[data-show-all-favorites]");
            const rental = event.target.closest("[data-cancel-rental]");
            const appointment = event.target.closest("[data-cancel-appointment]");

            if (favoriteExpand) {
                showAllFavorites = !showAllFavorites;
                renderFavoriteCards();
                document.querySelector("#favorites")?.scrollIntoView({ block: "start" });
                return;
            }
            if (favorite) {
                await action(`/api/favorite-rooms/${favorite.dataset.removeFavorite}`, "DELETE");
            }
            if (rental) {
                await action(`/api/rental-requests/${rental.dataset.cancelRental}/cancel`, "PUT");
            }
            if (appointment) {
                await action(`/api/viewing-appointments/${appointment.dataset.cancelAppointment}/cancel`, "PUT");
            }
        });
    }

    async function action(path, method) {
        try {
            await auth.api(path, { method });
            await loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    }

    function statusBadge(status) {
        const map = {
            PENDING: ["Đang chờ xác nhận", "badge-pending"],
            ACCEPTED: ["Đã xác nhận", "badge-approved"],
            REJECTED: ["Đã bị hủy", "badge-rented"],
            CANCELLED: ["Đã bị hủy", "badge-muted"]
        };
        const [label, className] = map[status] || [status || "Đang cập nhật", "badge-muted"];
        return `<span class="badge ${className}">${label}</span>`;
    }

    function countByStatus(items, status) {
        return items.filter((item) => item.status === status).length;
    }

    function upcomingAppointments(items) {
        const now = new Date();
        return items.filter((item) => item.status !== "CANCELLED" && new Date(item.appointmentTime) >= now).length;
    }

    function isNotificationRead(item) {
        return Boolean(item.read || item.isRead);
    }

    function emptyRow(columns, message) {
        return `<tr><td class="muted-cell" colspan="${columns}">${escapeHtml(message)}</td></tr>`;
    }

    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
    }

    function formatDateTime(value) {
        if (!value) {
            return "Chưa cập nhật";
        }
        return new Date(value).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function escapeHtml(value) {
        return String(value || "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    bindActions();
    loadDashboard();
})();
