(() => {
    const auth = window.NhaTroAuth;
    const statsGrid = document.querySelector(".stats-grid");
    const favoritesGrid = document.querySelector("#favorites .room-grid");
    const favoriteExpandButton = document.querySelector("[data-show-all-favorites]");
    const requestsBody = document.querySelector("#requests tbody");
    const appointmentsBody = document.querySelector("#appointments tbody");
    const notificationsList = document.querySelector("#notifications .compact-list");
    const rentedRoomContainer = document.querySelector("[data-rented-room]");
    const FAVORITE_PREVIEW_LIMIT = 3;
    const isFavoritesFullPage = Boolean(document.querySelector("[data-favorites-full]"));
    const currentUser = auth?.currentUser?.();
    let favoriteRooms = [];
    let showAllFavorites = isFavoritesFullPage;
    let notificationReadObserver = null;
    let notificationAutoReadTimer = null;
    const hasTenantWidgets = Boolean(statsGrid || favoritesGrid || requestsBody || appointmentsBody || notificationsList || rentedRoomContainer);

    if (!hasTenantWidgets || !auth?.token?.() || currentUser?.role !== "USER") {
        return;
    }

    async function loadDashboard() {
        setLoading();

        const shouldLoadFavorites = Boolean(favoritesGrid || statsGrid);
        const shouldLoadRequests = Boolean(requestsBody || rentedRoomContainer || statsGrid);
        const shouldLoadAppointments = Boolean(appointmentsBody || statsGrid);
        const shouldLoadNotifications = Boolean(notificationsList || statsGrid);

        const [favorites, requests, appointments, notifications] = await Promise.all([
            shouldLoadFavorites ? optionalApi("/api/favorite-rooms", []) : [],
            shouldLoadRequests ? optionalApi("/api/rental-requests/my", []) : [],
            shouldLoadAppointments ? optionalApi("/api/viewing-appointments/my", []) : [],
            shouldLoadNotifications ? optionalApi("/api/notifications", []) : []
        ]);

        if (statsGrid) {
            renderStats(favorites, requests, appointments, notifications);
        }
        renderFavorites(favorites);
        renderRequests(requests);
        renderAppointments(appointments);
        await renderRentedRooms(requests);
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
        if (rentedRoomContainer) {
            rentedRoomContainer.innerHTML = `<div class="empty-state">Đang tải phòng đang thuê...</div>`;
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
        if (!isFavoritesFullPage && favoriteRooms.length <= FAVORITE_PREVIEW_LIMIT) {
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
        const visibleRooms = showAllFavorites || isFavoritesFullPage ? favoriteRooms : favoriteRooms.slice(0, FAVORITE_PREVIEW_LIMIT);
        favoritesGrid.innerHTML = visibleRooms.map(roomCard).join("");
        updateFavoriteExpandButton();
    }

    function updateFavoriteExpandButton() {
        if (!favoriteExpandButton) {
            return;
        }
        if (isFavoritesFullPage) {
            favoriteExpandButton.hidden = true;
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

    async function renderRentedRooms(requests) {
        if (!rentedRoomContainer) {
            return;
        }

        const acceptedRequests = requests.filter((item) => item.status === "ACCEPTED");
        if (!acceptedRequests.length) {
            rentedRoomContainer.innerHTML = `<div class="empty-state">Bạn chưa có phòng đang thuê. Khi chủ trọ xác nhận yêu cầu thuê, phòng sẽ xuất hiện tại đây.</div>`;
            return;
        }

        const entries = await Promise.all(acceptedRequests.map(async (request) => ({
            request,
            room: await optionalApi(`/api/rooms/${request.roomId}`, null)
        })));

        rentedRoomContainer.innerHTML = `
            <div class="rented-room-list">
                ${entries.map(rentedRoomCard).join("")}
            </div>
        `;
    }

    function rentedRoomCard({ request, room }) {
        const title = room?.title || request.roomTitle || "Phòng đang thuê";
        const image = room?.imageUrls?.[0] || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=85";
        const amenities = amenityChips(room?.amenities);
        return `
            <article class="rented-room-card">
                <div class="room-media"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(title)}"></div>
                <div class="rented-room-content">
                    <span class="badge badge-approved">Đang thuê</span>
                    <h3>${escapeHtml(title)}</h3>
                    <p class="room-address">${escapeHtml(room?.address || "Địa chỉ đang cập nhật")}</p>
                    <dl class="rented-room-details">
                        ${detailItem("Giá thuê", room ? `${formatMoney(room.price)}/tháng` : "Đang cập nhật")}
                        ${detailItem("Tiền cọc", room ? `${formatMoney(room.deposit)}` : "Đang cập nhật")}
                        ${detailItem("Diện tích", room?.area ? `${room.area} m²` : "Đang cập nhật")}
                        ${detailItem("Thời gian thuê", request.expectedRentalTime || "Chưa cập nhật")}
                        ${detailItem("Người thuê", request.fullName || currentUser?.fullName || "Chưa cập nhật")}
                        ${detailItem("Số điện thoại", request.phone || currentUser?.phone || "Chưa cập nhật")}
                        ${detailItem("Chủ trọ", room?.landlordName || "Đang cập nhật")}
                        ${detailItem("Liên hệ chủ trọ", room?.landlordPhone || "Đang cập nhật")}
                    </dl>
                    ${amenities ? `<div class="amenities rented-room-amenities">${amenities}</div>` : ""}
                    <div class="table-actions">
                        <a class="btn btn-primary" href="room-detail.html?id=${request.roomId}">Xem chi tiết phòng</a>
                    </div>
                </div>
            </article>
        `;
    }

    function detailItem(label, value) {
        return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
    }

    function amenityChips(value) {
        return String(value || "")
            .split(/[,\n]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 8)
            .map((item) => `<span>${escapeHtml(item)}</span>`)
            .join("");
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
