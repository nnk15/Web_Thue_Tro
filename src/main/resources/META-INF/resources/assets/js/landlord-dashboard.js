(() => {
    const auth = window.NhaTroAuth;
    const fallbackImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80";

    const statsGrid = document.querySelector("#stats");
    const roomsBody = document.querySelector("[data-rooms-body], #rooms tbody");
    const roomListSummary = document.querySelector("#room-list-summary");
    const requestsBody = document.querySelector("#rental-requests tbody");
    const appointmentsBody = document.querySelector("#appointments tbody");
    const notificationsList = document.querySelector("#notifications .compact-list");
    const roomForm = document.querySelector("[data-room-form], #create-room form");
    const resetRoomFormButton = document.querySelector("[data-reset-room-form]");
    const roomFormTitle = document.querySelector("[data-room-form-title]");
    const roomSubmitButton = document.querySelector("[data-room-submit]");

    let roomsCache = [];
    let pendingEditId = new URLSearchParams(window.location.search).get("edit");
    let notificationReadObserver = null;
    let notificationAutoReadTimer = null;

    if (!auth?.token?.()) {
        return;
    }

    async function loadDashboard() {
        setLoading();

        const shouldLoadRooms = Boolean(roomsBody || roomForm || statsGrid);
        const shouldLoadRequests = Boolean(requestsBody || statsGrid);
        const shouldLoadAppointments = Boolean(appointmentsBody || statsGrid);
        const shouldLoadNotifications = Boolean(notificationsList);

        const [rooms, requests, appointments, notifications] = await Promise.all([
            shouldLoadRooms ? optionalApi("/api/rooms/my", []) : [],
            shouldLoadRequests ? optionalApi("/api/landlord/rental-requests", []) : [],
            shouldLoadAppointments ? optionalApi("/api/landlord/viewing-appointments", []) : [],
            shouldLoadNotifications ? optionalApi("/api/notifications", []) : []
        ]);

        roomsCache = rooms || [];

        if (statsGrid) {
            renderStats(roomsCache, requests || [], appointments || []);
        }
        renderRooms(roomsCache);
        openPendingEdit();
        renderRequests(requests || []);
        renderAppointments(appointments || []);
        renderNotifications(notifications || []);
        scheduleNotificationAutoRead(notifications || []);
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
        if (roomsBody) {
            roomsBody.innerHTML = emptyRow(7, "Đang tải danh sách phòng...");
        }
        if (requestsBody) {
            requestsBody.innerHTML = emptyRow(6, "Đang tải yêu cầu thuê...");
        }
        if (appointmentsBody) {
            appointmentsBody.innerHTML = emptyRow(6, "Đang tải lịch xem phòng...");
        }
        if (notificationsList) {
            notificationsList.innerHTML = `<div class="empty-state">Đang tải thông báo...</div>`;
        }
    }

    function renderStats(rooms, requests, appointments) {
        if (!statsGrid) {
            return;
        }
        statsGrid.innerHTML = `
            <div class="metric"><span>Phòng đang hiển thị</span><strong>${rooms.filter((room) => room.status !== "HIDDEN" && room.approvalStatus === "APPROVED").length}</strong></div>
            <div class="metric"><span>Tin chờ duyệt</span><strong>${rooms.filter((room) => room.approvalStatus === "PENDING").length}</strong></div>
            <div class="metric"><span>Yêu cầu thuê</span><strong>${requests.filter((item) => item.status === "PENDING").length}</strong></div>
            <div class="metric"><span>Lịch xem sắp tới</span><strong>${appointments.filter((item) => item.status !== "CANCELLED" && new Date(item.appointmentTime) >= new Date()).length}</strong></div>
        `;
    }

    function renderRooms(rooms) {
        if (!roomsBody) {
            return;
        }
        if (roomListSummary) {
            const visible = rooms.filter((room) => room.status !== "HIDDEN").length;
            const pending = rooms.filter((room) => room.approvalStatus === "PENDING").length;
            roomListSummary.textContent = `${rooms.length} phòng trong database, ${visible} phòng không bị ẩn, ${pending} tin đang chờ duyệt.`;
        }
        if (!rooms.length) {
            roomsBody.innerHTML = emptyRow(7, "Bạn chưa đăng phòng trọ nào.");
            return;
        }
        roomsBody.innerHTML = rooms.map((room) => {
            const image = room.imageUrls?.[0] || fallbackImage;
            return `
                <tr>
                    <td><img class="table-room-thumb" src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}"></td>
                    <td>
                        <a class="table-room-title" href="landlord-room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a>
                        <span class="table-room-address">${escapeHtml(room.address)}</span>
                    </td>
                    <td>${formatMoney(room.price)}</td>
                    <td>${formatArea(room.area)}</td>
                    <td>${roomStatusBadge(room.status)}</td>
                    <td>${approvalBadge(room.approvalStatus)}</td>
                    <td>
                        <div class="table-actions">
                            <a class="btn btn-outline" href="landlord-room-detail.html?id=${room.id}">Xem</a>
                            <button class="btn btn-outline" type="button" data-edit-room="${room.id}">Sửa</button>
                            <button class="btn btn-danger" type="button" data-delete-room="${room.id}">Xóa</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderRequests(requests) {
        if (!requestsBody) {
            return;
        }
        if (!requests.length) {
            requestsBody.innerHTML = emptyRow(6, "Chưa có yêu cầu thuê phòng.");
            return;
        }
        requestsBody.innerHTML = requests.map((item) => `
            <tr>
                <td>${escapeHtml(item.fullName || item.tenantName)}</td>
                <td><a href="room-detail.html?id=${item.roomId}">${escapeHtml(item.roomTitle)}</a></td>
                <td>${escapeHtml(item.phone)}</td>
                <td>${escapeHtml(item.expectedRentalTime || "Chưa cập nhật")}</td>
                <td>${requestStatusBadge(item.status)}</td>
                <td>${requestActions(item.id, item.status, "rental")}</td>
            </tr>
        `).join("");
    }

    function renderAppointments(appointments) {
        if (!appointmentsBody) {
            return;
        }
        if (!appointments.length) {
            appointmentsBody.innerHTML = emptyRow(6, "Chưa có lịch xem phòng.");
            return;
        }
        appointmentsBody.innerHTML = appointments.map((item) => `
            <tr>
                <td>${escapeHtml(item.fullName || item.tenantName)}</td>
                <td><a href="room-detail.html?id=${item.roomId}">${escapeHtml(item.roomTitle)}</a></td>
                <td>${escapeHtml(item.phone)}</td>
                <td>${formatDateTime(item.appointmentTime)}</td>
                <td>${requestStatusBadge(item.status)}</td>
                <td>${requestActions(item.id, item.status, "appointment")}</td>
            </tr>
        `).join("");
    }

    function requestActions(id, status, type) {
        if (status !== "PENDING") {
            return `<span class="muted-text">Đã xử lý</span>`;
        }
        return `
            <div class="table-actions">
                <button class="btn btn-primary" type="button" data-accept-${type}="${id}">Chấp nhận</button>
                <button class="btn btn-outline" type="button" data-reject-${type}="${id}">Hủy</button>
            </div>
        `;
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
            <div class="list-item notification-item">
                <div>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.content)}</p>
                    <span class="table-room-address">${formatDateTime(item.createdAt)}</span>
                </div>
                <div class="notification-actions">
                    <span class="badge ${isNotificationRead(item) ? "badge-muted" : "badge-pending"}">${isNotificationRead(item) ? "Đã đọc" : "Mới"}</span>
                    ${isNotificationRead(item) ? "" : `<button class="btn btn-outline" type="button" data-read-notification="${item.id}">Đánh dấu đã đọc</button>`}
                </div>
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

    function bindRoomForm() {
        roomForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const id = field("roomId")?.value;
            const isEditing = Boolean(id);
            const button = roomSubmitButton || roomForm.querySelector("button[type='submit']");

            button.disabled = true;
            showMessage(roomForm, "info", isEditing ? "Đang cập nhật phòng..." : "Đang thêm phòng...");

            try {
                const payload = await roomPayload();
                await auth.api(isEditing ? `/api/rooms/${id}` : "/api/rooms", {
                    method: isEditing ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                });
                resetRoomForm();
                showMessage(roomForm, "success", isEditing ? "Đã cập nhật phòng. Tin sẽ chờ duyệt lại." : "Đã thêm phòng. Tin sẽ hiển thị sau khi được duyệt.");
                await loadDashboard();
            } catch (error) {
                showMessage(roomForm, "error", error.message);
            } finally {
                button.disabled = false;
            }
        });

        resetRoomFormButton?.addEventListener("click", () => {
            resetRoomForm();
            roomForm?.querySelector(".form-message")?.remove();
        });
    }

    async function roomPayload() {
        showMessage(roomForm, "info", "Đang xử lý ảnh và video...");
        const uploadedImages = await uploadFiles("imageFiles");
        const uploadedVideos = await uploadFiles("videoFiles");
        return {
            title: value("title"),
            price: numberValue("price"),
            deposit: numberValue("deposit"),
            area: numberValue("area"),
            address: value("address"),
            description: value("description"),
            amenities: selectedAmenities().join(", "),
            rules: value("rules"),
            furnitureType: value("furnitureType"),
            status: value("status") || "AVAILABLE",
            latitude: null,
            longitude: null,
            imageUrls: [...splitList(value("imageUrls")), ...uploadedImages],
            videoUrls: [...splitList(value("videoUrls")), ...uploadedVideos]
        };
    }

    async function uploadFiles(fieldName) {
        const input = field(fieldName);
        const files = [...(input?.files || [])];
        if (!files.length) {
            return [];
        }

        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/uploads/rooms", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${auth.token()}`
            },
            body: formData
        });
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
            throw new Error(data.message || "Không upload được file");
        }
        return data.urls || [];
    }

    function editRoom(id) {
        const room = roomsCache.find((item) => Number(item.id) === Number(id));
        if (!room || !roomForm) {
            return;
        }

        setValue("roomId", room.id);
        setValue("title", room.title);
        setValue("price", room.price);
        setValue("deposit", room.deposit);
        setValue("area", room.area);
        setValue("status", room.status || "AVAILABLE");
        setValue("furnitureType", room.furnitureType || "Đầy đủ");
        setValue("address", room.address);
        setValue("imageUrls", (room.imageUrls || []).join(", "));
        setValue("videoUrls", (room.videoUrls || []).join(", "));
        setValue("description", room.description);
        setValue("rules", room.rules);
        setAmenities(room.amenities);

        if (roomFormTitle) {
            roomFormTitle.textContent = "Sửa phòng trọ";
        }
        if (roomSubmitButton) {
            roomSubmitButton.textContent = "Cập nhật phòng";
        }
        if (resetRoomFormButton) {
            resetRoomFormButton.hidden = false;
        }
        document.querySelector("#create-room")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function openPendingEdit() {
        if (!pendingEditId || !roomForm) {
            return;
        }
        editRoom(pendingEditId);
        pendingEditId = "";
        window.history.replaceState(null, "", "landlord-dashboard.html#create-room");
    }

    function resetRoomForm() {
        if (!roomForm) {
            return;
        }
        roomForm.reset();
        setValue("roomId", "");
        if (roomFormTitle) {
            roomFormTitle.textContent = "Thêm phòng trọ";
        }
        if (roomSubmitButton) {
            roomSubmitButton.textContent = "Thêm phòng";
        }
        if (resetRoomFormButton) {
            resetRoomFormButton.hidden = true;
        }
    }

    function selectedAmenities() {
        if (!roomForm) {
            return [];
        }
        return [...roomForm.querySelectorAll('input[name="amenities"]:checked')]
            .map((input) => input.value)
            .filter(Boolean);
    }

    function setAmenities(amenities) {
        if (!roomForm) {
            return;
        }
        const selected = splitList(amenities).map((item) => item.toLowerCase());
        roomForm.querySelectorAll('input[name="amenities"]').forEach((input) => {
            input.checked = selected.includes(input.value.toLowerCase());
        });
    }

    function bindActions() {
        document.addEventListener("click", async (event) => {
            const target = event.target;
            const editButton = target.closest("[data-edit-room]");
            const deleteButton = target.closest("[data-delete-room]");

            if (editButton) {
                editRoom(editButton.dataset.editRoom);
                return;
            }

            if (deleteButton) {
                const room = roomsCache.find((item) => Number(item.id) === Number(deleteButton.dataset.deleteRoom));
                const ok = confirm(`Xóa phòng "${room?.title || deleteButton.dataset.deleteRoom}"?`);
                if (!ok) {
                    return;
                }
                await runAction(`/api/rooms/${deleteButton.dataset.deleteRoom}`, "DELETE");
                return;
            }

            const actionMap = [
                [target.closest("[data-accept-rental]"), (el) => [`/api/rental-requests/${el.dataset.acceptRental}/accept`, "PUT"]],
                [target.closest("[data-reject-rental]"), (el) => [`/api/rental-requests/${el.dataset.rejectRental}/reject`, "PUT"]],
                [target.closest("[data-accept-appointment]"), (el) => [`/api/viewing-appointments/${el.dataset.acceptAppointment}/accept`, "PUT"]],
                [target.closest("[data-reject-appointment]"), (el) => [`/api/viewing-appointments/${el.dataset.rejectAppointment}/reject`, "PUT"]],
                [target.closest("[data-read-notification]"), (el) => [`/api/notifications/${el.dataset.readNotification}/read`, "PUT"]]
            ];

            for (const [element, build] of actionMap) {
                if (element) {
                    const [path, method] = build(element);
                    await runAction(path, method);
                    return;
                }
            }
        });
    }

    async function runAction(path, method) {
        try {
            await auth.api(path, { method });
            await loadDashboard();
        } catch (error) {
            alert(error.message);
        }
    }

    function roomStatusBadge(status) {
        const map = {
            AVAILABLE: ["Còn trống", "badge-available"],
            RENTED: ["Đã thuê", "badge-rented"],
            HIDDEN: ["Đang ẩn", "badge-muted"]
        };
        const [label, className] = map[status] || [status || "Đang cập nhật", "badge-muted"];
        return `<span class="badge ${className}">${label}</span>`;
    }

    function approvalBadge(status) {
        const map = {
            PENDING: ["Chờ duyệt", "badge-pending"],
            APPROVED: ["Đã duyệt", "badge-approved"],
            REJECTED: ["Từ chối", "badge-rented"]
        };
        const [label, className] = map[status] || [status || "Đang cập nhật", "badge-muted"];
        return `<span class="badge ${className}">${label}</span>`;
    }

    function requestStatusBadge(status) {
        const map = {
            PENDING: ["Đang chờ xác nhận", "badge-pending"],
            ACCEPTED: ["Đã xác nhận", "badge-approved"],
            REJECTED: ["Đã bị hủy", "badge-rented"],
            CANCELLED: ["Đã bị hủy", "badge-muted"]
        };
        const [label, className] = map[status] || [status || "Đang cập nhật", "badge-muted"];
        return `<span class="badge ${className}">${label}</span>`;
    }

    function isNotificationRead(item) {
        return Boolean(item.read || item.isRead);
    }

    function field(name) {
        return roomForm?.elements?.[name] || null;
    }

    function value(name) {
        return field(name)?.value.trim() || "";
    }

    function setValue(name, value) {
        const input = field(name);
        if (input) {
            input.value = value ?? "";
        }
    }

    function numberValue(name) {
        return Number(value(name) || 0);
    }

    function splitList(value) {
        return String(value || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function showMessage(form, type, message) {
        let box = form.querySelector(".form-message");
        if (!box) {
            box = document.createElement("div");
            box.className = "form-message";
            form.prepend(box);
        }
        box.className = `form-message ${type}`;
        box.textContent = message;
    }

    function emptyRow(columns, message) {
        return `<tr><td class="muted-cell" colspan="${columns}">${escapeHtml(message)}</td></tr>`;
    }

    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
    }

    function formatArea(value) {
        return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m2`;
    }

    function formatDateTime(value) {
        if (!value) {
            return "Chưa cập nhật";
        }
        return new Date(value).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
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

    bindRoomForm();
    bindActions();
    loadDashboard();
})();
