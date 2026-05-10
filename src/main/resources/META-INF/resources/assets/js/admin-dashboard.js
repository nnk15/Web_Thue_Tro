(() => {
    const auth = window.NhaTroAuth;
    const statisticsGrid = document.querySelector("#statistics");
    const usersForm = document.querySelector("#users .search-box");
    const usersBody = document.querySelector("#users tbody");
    const landlordsBody = document.querySelector("#landlords tbody");
    const pendingRoomsBody = document.querySelector("#pending-rooms tbody");
    const reportsList = document.querySelector("#reports .compact-list");
    const systemStatsList = document.querySelector("aside.detail-panel .data-panel:not(#reports) .compact-list");

    if (!statisticsGrid || !auth?.token?.()) {
        return;
    }

    async function loadDashboard(keyword = "") {
        setLoading();

        const usersPath = keyword ? `/api/admin/users?keyword=${encodeURIComponent(keyword)}` : "/api/admin/users";
        const [statistics, users, rooms, pendingRooms, reports] = await Promise.all([
            optionalApi("/api/admin/statistics", null),
            optionalApi(usersPath, []),
            optionalApi("/api/rooms/my", []),
            optionalApi("/api/admin/rooms/pending", []),
            optionalApi("/api/admin/violation-reports", [])
        ]);

        renderStatistics(statistics);
        renderUsers(users);
        renderLandlords(users, rooms);
        renderPendingRooms(pendingRooms);
        renderReports(reports);
        renderSystemStats(statistics);
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
            <div class="list-item"><div><h3>Yêu cầu thuê</h3><p>${statistics.rentalRequests} yêu cầu trong hệ thống</p></div><span class="badge badge-approved">Live</span></div>
            <div class="list-item"><div><h3>Lịch xem phòng</h3><p>${statistics.viewingAppointments} lịch hẹn đã tạo</p></div><span class="badge badge-approved">Live</span></div>
            <div class="list-item"><div><h3>Phòng yêu thích</h3><p>${statistics.favoriteRooms} lượt lưu phòng</p></div><span class="badge badge-muted">Theo dõi</span></div>
            <div class="list-item"><div><h3>Báo cáo vi phạm</h3><p>${statistics.violationReports} báo cáo cần quản lý</p></div><span class="badge badge-pending">Kiểm tra</span></div>
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

    function emptyRow(columns, message) {
        return `<tr><td class="muted-cell" colspan="${columns}">${escapeHtml(message)}</td></tr>`;
    }

    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
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
