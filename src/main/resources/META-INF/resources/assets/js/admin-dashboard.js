(() => {
    const auth = window.NhaTroAuth;
    const statisticsGrid = document.querySelector("#statistics");
    const usersForm = document.querySelector("#users .search-box");
    const usersBody = document.querySelector("#users tbody");
    const landlordsBody = document.querySelector("#landlords tbody");
    const pendingRoomsBody = document.querySelector("#pending-rooms tbody");
    const reportsList = document.querySelector("#reports .compact-list");
    const reportsNavLink = document.querySelector('.side-nav a[href="#reports"]');
    const systemStatsList = document.querySelector("#system-statistics .compact-list");
    const systemDetailPanel = document.querySelector("#system-detail");
    const systemDetailTitle = document.querySelector("[data-system-detail-title]");
    const systemDetailContent = document.querySelector("[data-system-detail-content]");
    const systemDetailClose = document.querySelector("[data-close-system-detail]");
    let rentalRequestsCache = [];
    let viewingAppointmentsCache = [];
    let reportsCache = [];
    let activeSystemView = "";

    if (!statisticsGrid || !auth?.token?.()) {
        return;
    }

    async function loadDashboard(keyword = "") {
        setLoading();

        const usersPath = keyword ? `/api/admin/users?keyword=${encodeURIComponent(keyword)}` : "/api/admin/users";
        const [statistics, users, rooms, pendingRooms, reports, rentalRequests, viewingAppointments] = await Promise.all([
            optionalApi("/api/admin/statistics", null),
            optionalApi(usersPath, []),
            optionalApi("/api/rooms/my", []),
            optionalApi("/api/admin/rooms/pending", []),
            optionalApi("/api/admin/violation-reports", []),
            optionalApi("/api/landlord/rental-requests", []),
            optionalApi("/api/landlord/viewing-appointments", [])
        ]);

        rentalRequestsCache = rentalRequests || [];
        viewingAppointmentsCache = viewingAppointments || [];
        reportsCache = reports || [];

        renderStatistics(statistics);
        renderUsers(users);
        renderLandlords(users, rooms);
        renderPendingRooms(pendingRooms);
        renderReports(reportsCache);
        renderSystemStats(statistics);

        if (activeSystemView) {
            renderSystemDetail(activeSystemView, false);
        }
    }

    async function optionalApi(path, fallback) {
        try {
            return await auth.api(path);
        } catch {
            return fallback;
        }
    }

    function setLoading() {
        if (usersBody) {
            usersBody.innerHTML = emptyRow(6, "Đang tải người dùng...");
        }
        if (landlordsBody) {
            landlordsBody.innerHTML = emptyRow(5, "Đang tải chủ trọ...");
        }
        if (pendingRoomsBody) {
            pendingRoomsBody.innerHTML = emptyRow(5, "Đang tải tin chờ duyệt...");
        }
        if (reportsList) {
            reportsList.innerHTML = `<div class="empty-state">Đang tải báo cáo...</div>`;
        }
    }

    function renderStatistics(statistics) {
        if (!statistics) {
            statisticsGrid.innerHTML = `<div class="empty-state">Không tải được thống kê hệ thống.</div>`;
            return;
        }
        statisticsGrid.innerHTML = `
            <div class="metric"><span>Người dùng</span><strong>${statistics.users}</strong></div>
            <div class="metric"><span>Chủ trọ</span><strong>${statistics.landlords}</strong></div>
            <div class="metric"><span>Phòng đang đăng</span><strong>${statistics.rooms}</strong></div>
            <div class="metric"><span>Tin chờ duyệt</span><strong>${statistics.pendingRooms}</strong></div>
        `;
    }

    function renderUsers(users) {
        if (!usersBody) {
            return;
        }
        if (!users.length) {
            usersBody.innerHTML = emptyRow(6, "Không tìm thấy người dùng.");
            return;
        }
        usersBody.innerHTML = users.map((user) => `
            <tr>
                <td>${escapeHtml(user.fullName)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.phone)}</td>
                <td>${roleLabel(user.role)}</td>
                <td>${userStatusBadge(user.status)}</td>
                <td>
                    <div class="table-actions">
                        ${user.status === "LOCKED"
                            ? `<button class="btn btn-primary" type="button" data-unlock-user="${user.id}">Mở khóa</button>`
                            : `<button class="btn btn-outline" type="button" data-lock-user="${user.id}">Khóa</button>`}
                        <button class="btn btn-outline" type="button" data-delete-user="${user.id}">Xóa</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    function renderLandlords(users, rooms) {
        if (!landlordsBody) {
            return;
        }
        const landlords = users.filter((user) => user.role === "LANDLORD");
        if (!landlords.length) {
            landlordsBody.innerHTML = emptyRow(5, "Không có chủ trọ trong danh sách hiện tại.");
            return;
        }

        landlordsBody.innerHTML = landlords.map((landlord) => {
            const landlordRooms = rooms.filter((room) => room.landlordId === landlord.id);
            const pending = landlordRooms.filter((room) => room.approvalStatus === "PENDING").length;
            return `
                <tr>
                    <td>${escapeHtml(landlord.fullName)}</td>
                    <td>${landlordRooms.length}</td>
                    <td>${pending}</td>
                    <td>${userStatusBadge(landlord.status)}</td>
                    <td>
                        <div class="table-actions">
                            ${landlord.status === "LOCKED"
                                ? `<button class="btn btn-primary" type="button" data-unlock-user="${landlord.id}">Mở khóa</button>`
                                : `<button class="btn btn-outline" type="button" data-lock-user="${landlord.id}">Khóa</button>`}
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function renderPendingRooms(rooms) {
        if (!pendingRoomsBody) {
            return;
        }
        if (!rooms.length) {
            pendingRoomsBody.innerHTML = emptyRow(5, "Không có tin đăng chờ duyệt.");
            return;
        }
        pendingRoomsBody.innerHTML = rooms.map((room) => `
            <tr>
                <td><a href="room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a></td>
                <td>${escapeHtml(room.landlordName)}</td>
                <td>${formatMoney(room.price)}</td>
                <td>${approvalBadge(room.approvalStatus)}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-primary" type="button" data-approve-room="${room.id}">Duyệt</button>
                        <button class="btn btn-outline" type="button" data-reject-room="${room.id}">Từ chối</button>
                    </div>
                </td>
            </tr>
        `).join("");
    }

    function renderReports(reports) {
        if (!reportsList) {
            return;
        }
        updateReportsMenuIndicator(reports);
        if (!reports.length) {
            reportsList.innerHTML = `<div class="empty-state">Chưa có báo cáo vi phạm.</div>`;
            return;
        }
        reportsList.innerHTML = reports.map((report) => `
            <div class="list-item">
                <div>
                    <h3>${escapeHtml(report.reason)}</h3>
                    <p>${escapeHtml(report.roomTitle)}. Báo cáo bởi ${escapeHtml(report.reporterName)}.</p>
                </div>
                <div class="table-actions">
                    ${reportStatusBadge(report.status)}
                    ${report.status !== "RESOLVED" ? `<button class="btn btn-outline" type="button" data-resolve-report="${report.id}">Xử lý</button>` : ""}
                </div>
            </div>
        `).join("");
    }

    function renderSystemStats(statistics) {
        if (!systemStatsList || !statistics) {
            return;
        }
        systemStatsList.innerHTML = `
            <div class="list-item">
                <div>
                    <h3>Yêu cầu thuê</h3>
                    <p>${statistics.rentalRequests} yêu cầu trong hệ thống</p>
                </div>
                <button class="btn btn-outline" type="button" data-system-view="rental-requests">Xem</button>
            </div>
            <div class="list-item">
                <div>
                    <h3>Lịch xem phòng</h3>
                    <p>${statistics.viewingAppointments} lịch hẹn đã tạo</p>
                </div>
                <button class="btn btn-outline" type="button" data-system-view="viewing-appointments">Xem</button>
            </div>
        `;
    }

    function updateReportsMenuIndicator(reports) {
        if (!reportsNavLink) {
            return;
        }

        const activeReports = reports.filter((report) => report.status !== "RESOLVED").length;
        reportsNavLink.classList.toggle("has-notifications", activeReports > 0);
        if (activeReports > 0) {
            reportsNavLink.dataset.notificationCount = String(activeReports);
            reportsNavLink.setAttribute("aria-label", `Báo cáo vi phạm - ${activeReports} báo cáo cần xử lý`);
        } else {
            delete reportsNavLink.dataset.notificationCount;
            reportsNavLink.removeAttribute("aria-label");
        }
    }

    function renderSystemDetail(type, shouldFocus = true) {
        if (!systemDetailPanel || !systemDetailTitle || !systemDetailContent) {
            return;
        }

        activeSystemView = type;
        systemDetailPanel.hidden = false;
        systemDetailPanel.setAttribute("aria-hidden", "false");
        document.body.classList.add("admin-modal-open");
        if (type === "rental-requests") {
            systemDetailTitle.textContent = "Tất cả yêu cầu thuê";
            systemDetailContent.innerHTML = rentalRequestsTable();
        } else if (type === "viewing-appointments") {
            systemDetailTitle.textContent = "Tất cả lịch xem phòng";
            systemDetailContent.innerHTML = viewingAppointmentsTable();
        } else {
            systemDetailTitle.textContent = "Tất cả báo cáo vi phạm";
            systemDetailContent.innerHTML = violationReportsTable();
        }

        if (shouldFocus) {
            systemDetailClose?.focus();
        }
    }

    function closeSystemDetail() {
        if (!systemDetailPanel) {
            return;
        }

        activeSystemView = "";
        systemDetailPanel.hidden = true;
        systemDetailPanel.setAttribute("aria-hidden", "true");
        document.body.classList.remove("admin-modal-open");
    }

    function rentalRequestsTable() {
        if (!rentalRequestsCache.length) {
            return `<div class="empty-state">Chưa có yêu cầu thuê.</div>`;
        }
        return `
            <div class="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Phòng</th>
                        <th>Người thuê</th>
                        <th>Số điện thoại</th>
                        <th>Thời gian thuê</th>
                        <th>Trạng thái</th>
                        <th>Ngày gửi</th>
                    </tr>
                    </thead>
                    <tbody>
                    ${rentalRequestsCache.map((item) => `
                        <tr>
                            <td><a href="room-detail.html?id=${item.roomId}">${escapeHtml(item.roomTitle)}</a></td>
                            <td>${escapeHtml(item.fullName || item.tenantName)}</td>
                            <td>${escapeHtml(item.phone)}</td>
                            <td>${escapeHtml(item.expectedRentalTime || "Chưa cập nhật")}</td>
                            <td>${requestStatusBadge(item.status)}</td>
                            <td>${formatDateTime(item.createdAt)}</td>
                        </tr>
                    `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function viewingAppointmentsTable() {
        if (!viewingAppointmentsCache.length) {
            return `<div class="empty-state">Chưa có lịch xem phòng.</div>`;
        }
        return `
            <div class="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Phòng</th>
                        <th>Người xem</th>
                        <th>Số điện thoại</th>
                        <th>Thời gian xem</th>
                        <th>Trạng thái</th>
                        <th>Ngày gửi</th>
                    </tr>
                    </thead>
                    <tbody>
                    ${viewingAppointmentsCache.map((item) => `
                        <tr>
                            <td><a href="room-detail.html?id=${item.roomId}">${escapeHtml(item.roomTitle)}</a></td>
                            <td>${escapeHtml(item.fullName || item.tenantName)}</td>
                            <td>${escapeHtml(item.phone)}</td>
                            <td>${formatDateTime(item.appointmentTime)}</td>
                            <td>${requestStatusBadge(item.status)}</td>
                            <td>${formatDateTime(item.createdAt)}</td>
                        </tr>
                    `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function violationReportsTable() {
        if (!reportsCache.length) {
            return `<div class="empty-state">Chưa có báo cáo vi phạm.</div>`;
        }
        return `
            <div class="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Phòng</th>
                        <th>Người báo cáo</th>
                        <th>Lý do</th>
                        <th>Trạng thái</th>
                        <th>Ngày gửi</th>
                        <th>Thao tác</th>
                    </tr>
                    </thead>
                    <tbody>
                    ${reportsCache.map((report) => `
                        <tr>
                            <td><a href="room-detail.html?id=${report.roomId}">${escapeHtml(report.roomTitle)}</a></td>
                            <td>${escapeHtml(report.reporterName)}</td>
                            <td>${escapeHtml(report.reason)}</td>
                            <td>${reportStatusBadge(report.status)}</td>
                            <td>${formatDateTime(report.createdAt)}</td>
                            <td>${report.status !== "RESOLVED"
                                ? `<button class="btn btn-outline" type="button" data-resolve-report="${report.id}">Xử lý</button>`
                                : `<span class="muted-text">Đã xử lý</span>`}</td>
                        </tr>
                    `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    function bindSearch() {
        usersForm?.addEventListener("submit", (event) => {
            event.preventDefault();
            const keyword = usersForm.elements.keyword?.value.trim() || "";
            loadDashboard(keyword);
        });
    }

    function bindActions() {
        document.addEventListener("click", async (event) => {
            const target = event.target;
            if (target.closest("[data-close-system-detail]") || target === systemDetailPanel) {
                closeSystemDetail();
                return;
            }

            const systemView = target.closest("[data-system-view]");
            if (systemView) {
                renderSystemDetail(systemView.dataset.systemView);
                return;
            }

            const actionMap = [
                [target.closest("[data-lock-user]"), (el) => [`/api/admin/users/${el.dataset.lockUser}/lock`, "PUT"]],
                [target.closest("[data-unlock-user]"), (el) => [`/api/admin/users/${el.dataset.unlockUser}/unlock`, "PUT"]],
                [target.closest("[data-delete-user]"), (el) => [`/api/admin/users/${el.dataset.deleteUser}`, "DELETE"]],
                [target.closest("[data-approve-room]"), (el) => [`/api/admin/rooms/${el.dataset.approveRoom}/approve`, "PUT"]],
                [target.closest("[data-reject-room]"), (el) => [`/api/admin/rooms/${el.dataset.rejectRoom}/reject`, "PUT"]],
                [target.closest("[data-resolve-report]"), (el) => [`/api/admin/violation-reports/${el.dataset.resolveReport}/resolve`, "PUT"]]
            ];

            for (const [element, build] of actionMap) {
                if (element) {
                    const [path, method] = build(element);
                    if (element.matches("[data-delete-user]") && !confirm("Xóa tài khoản này?")) {
                        return;
                    }
                    await runAction(path, method);
                    return;
                }
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && systemDetailPanel && !systemDetailPanel.hidden) {
                closeSystemDetail();
            }
        });
    }

    async function runAction(path, method) {
        try {
            await auth.api(path, { method });
            const keyword = usersForm?.elements.keyword?.value.trim() || "";
            await loadDashboard(keyword);
        } catch (error) {
            alert(error.message);
        }
    }

    function roleLabel(role) {
        const map = {
            USER: "Người thuê",
            LANDLORD: "Chủ trọ",
            ADMIN: "Quản trị viên"
        };
        return map[role] || role || "Đang cập nhật";
    }

    function userStatusBadge(status) {
        const map = {
            ACTIVE: ["ACTIVE", "badge-approved"],
            LOCKED: ["LOCKED", "badge-rented"]
        };
        const [label, className] = map[status] || [status || "UNKNOWN", "badge-muted"];
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

    function reportStatusBadge(status) {
        const map = {
            PENDING: ["Chờ xử lý", "badge-pending"],
            RESOLVED: ["Đã xử lý", "badge-approved"]
        };
        const [label, className] = map[status] || [status || "Đang cập nhật", "badge-muted"];
        return `<span class="badge ${className}">${label}</span>`;
    }

    function requestStatusBadge(status) {
        const map = {
            PENDING: ["Đang chờ xác nhận", "badge-pending"],
            ACCEPTED: ["Đã xác nhận", "badge-approved"],
            REJECTED: ["Đã bị hủy", "badge-rented"],
            CANCELLED: ["Đã hủy", "badge-muted"]
        };
        const [label, className] = map[status] || [status || "Đang cập nhật", "badge-muted"];
        return `<span class="badge ${className}">${label}</span>`;
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

    bindSearch();
    bindActions();
    loadDashboard();
})();
