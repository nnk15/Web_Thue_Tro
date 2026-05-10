(() => {
    const auth = window.NhaTroAuth;
    const main = document.querySelector("[data-landlord-room-detail]");
    const fallbackImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85";

    if (!main || !auth?.token?.()) {
        return;
    }

    async function loadDetail() {
        const roomId = new URLSearchParams(window.location.search).get("id");
        if (!roomId) {
            renderError("Thiếu mã phòng cần xem.");
            return;
        }

        try {
            const [room, requests] = await Promise.all([
                auth.api(`/api/rooms/${roomId}`),
                auth.api("/api/landlord/rental-requests")
            ]);
            const roomRequests = (requests || []).filter((item) => Number(item.roomId) === Number(roomId));
            const acceptedTenant = roomRequests
                .filter((item) => item.status === "ACCEPTED")
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
            renderRoom(room, acceptedTenant, roomRequests);
        } catch (error) {
            renderError(error.message);
        }
    }

    function renderRoom(room, tenant, requests) {
        const images = room.imageUrls?.length ? room.imageUrls : [fallbackImage];
        const videos = room.videoUrls || [];
        const amenities = splitText(room.amenities, ["Chưa cập nhật tiện ích"]);
        const rules = splitText(room.rules, ["Chưa cập nhật nội quy"]);

        document.title = `${room.title} | Chi tiết phòng`;
        main.innerHTML = `
            <div class="dashboard-top">
                <div>
                    <h1>${escapeHtml(room.title)}</h1>
                    <p>${escapeHtml(room.address)}</p>
                </div>
                <div class="table-actions">
                    <a class="btn btn-outline" href="landlord-dashboard.html#rooms">Quay lại</a>
                    <a class="btn btn-primary" href="landlord-dashboard.html?edit=${room.id}#create-room">Sửa phòng</a>
                </div>
            </div>

            <div class="landlord-detail-layout">
                <section class="detail-panel">
                    <div class="detail-block">
                        <div class="landlord-detail-gallery">
                            <img class="landlord-gallery-main" src="${escapeAttribute(images[0])}" alt="${escapeAttribute(room.title)}">
                            <div class="landlord-gallery-strip">
                                ${images.slice(1, 5).map((image, index) => `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(`${room.title} ${index + 2}`)}">`).join("")}
                            </div>
                        </div>
                    </div>

                    <div class="detail-block">
                        <h2>Thông tin phòng</h2>
                        <div class="detail-stats">
                            <div class="stat-box"><span>Giá thuê</span><strong>${formatMoney(room.price)}</strong></div>
                            <div class="stat-box"><span>Tiền cọc</span><strong>${formatMoney(room.deposit)}</strong></div>
                            <div class="stat-box"><span>Diện tích</span><strong>${formatArea(room.area)}</strong></div>
                            <div class="stat-box"><span>Nội thất</span><strong>${escapeHtml(room.furnitureType || "Chưa cập nhật")}</strong></div>
                        </div>
                        <div class="landlord-info-grid">
                            ${infoItem("Trạng thái phòng", roomStatusText(room.status))}
                            ${infoItem("Duyệt tin", approvalText(room.approvalStatus))}
                            ${infoItem("Chủ trọ", room.landlordName || "Chưa cập nhật")}
                            ${infoItem("Số điện thoại chủ trọ", room.landlordPhone || "Chưa cập nhật")}
                            ${infoItem("Ngày tạo", formatDateTime(room.createdAt))}
                            ${infoItem("Cập nhật", formatDateTime(room.updatedAt))}
                        </div>
                    </div>

                    <div class="detail-block">
                        <h2>Mô tả</h2>
                        <p>${escapeHtml(room.description || "Chưa cập nhật mô tả.")}</p>
                    </div>

                    <div class="detail-block">
                        <h2>Tiện ích</h2>
                        <div class="amenities">${amenities.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
                    </div>

                    <div class="detail-block">
                        <h2>Nội quy</h2>
                        <ul class="feature-list">
                            ${rules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                        </ul>
                    </div>

                    <div class="detail-block">
                        <h2>Video</h2>
                        ${videoBlock(videos)}
                    </div>

                    <div class="detail-block">
                        <h2>Bản đồ</h2>
                        <div class="map-frame">
                            <iframe src="${mapUrl(room)}" loading="lazy" title="Bản đồ phòng trọ"></iframe>
                        </div>
                    </div>
                </section>

                <aside class="detail-panel">
                    <section class="detail-block">
                        <h2>Thông tin người thuê</h2>
                        ${tenantBlock(tenant)}
                    </section>

                    <section class="detail-block">
                        <h2>Yêu cầu thuê liên quan</h2>
                        ${requestList(requests)}
                    </section>
                </aside>
            </div>
        `;
    }

    function tenantBlock(tenant) {
        if (!tenant) {
            return `<div class="empty-state compact-empty">Chưa có người thuê đã xác nhận cho phòng này.</div>`;
        }
        return `
            <div class="tenant-card">
                <div class="tenant-avatar">${initial(tenant.fullName || tenant.tenantName)}</div>
                <div>
                    <h3>${escapeHtml(tenant.fullName || tenant.tenantName)}</h3>
                    <p>${escapeHtml(tenant.phone || "Chưa cập nhật số điện thoại")}</p>
                </div>
            </div>
            <div class="landlord-info-grid single">
                ${infoItem("CCCD", tenant.citizenId || "Chưa cập nhật")}
                ${infoItem("Ngày sinh", formatDate(tenant.dateOfBirth))}
                ${infoItem("Địa chỉ thường trú", tenant.permanentAddress || "Chưa cập nhật")}
                ${infoItem("Thời gian muốn thuê", tenant.expectedRentalTime || "Chưa cập nhật")}
                ${infoItem("Ghi chú", tenant.note || "Không có ghi chú")}
                ${infoItem("Trạng thái", requestStatusText(tenant.status))}
            </div>
        `;
    }

    function requestList(requests) {
        if (!requests.length) {
            return `<div class="empty-state compact-empty">Chưa có yêu cầu thuê nào cho phòng này.</div>`;
        }
        return `
            <div class="compact-list">
                ${requests.map((request) => `
                    <div class="list-item">
                        <div>
                            <h3>${escapeHtml(request.fullName || request.tenantName)}</h3>
                            <p>${escapeHtml(request.phone)} · ${escapeHtml(request.expectedRentalTime || "Chưa cập nhật")}</p>
                        </div>
                        ${requestStatusBadge(request.status)}
                    </div>
                `).join("")}
            </div>
        `;
    }

    function videoBlock(videos) {
        if (!videos.length) {
            return `<div class="video-box">Chưa cập nhật video cho phòng này.</div>`;
        }
        return `<video class="room-video" controls src="${escapeAttribute(videos[0])}"></video>`;
    }

    function infoItem(label, value) {
        return `
            <div class="info-tile">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
            </div>
        `;
    }

    function renderError(message) {
        main.innerHTML = `
            <div class="dashboard-top">
                <div>
                    <h1>Không tải được chi tiết phòng</h1>
                    <p>${escapeHtml(message)}</p>
                </div>
                <a class="btn btn-outline" href="landlord-dashboard.html#rooms">Quay lại</a>
            </div>
        `;
    }

    function roomStatusText(status) {
        const map = {
            AVAILABLE: "Còn trống",
            RENTED: "Đã thuê",
            HIDDEN: "Đang ẩn"
        };
        return map[status] || status || "Chưa cập nhật";
    }

    function approvalText(status) {
        const map = {
            PENDING: "Chờ duyệt",
            APPROVED: "Đã duyệt",
            REJECTED: "Từ chối"
        };
        return map[status] || status || "Chưa cập nhật";
    }

    function requestStatusText(status) {
        const map = {
            PENDING: "Đang chờ xác nhận",
            ACCEPTED: "Đã xác nhận",
            REJECTED: "Đã từ chối",
            CANCELLED: "Đã hủy"
        };
        return map[status] || status || "Chưa cập nhật";
    }

    function requestStatusBadge(status) {
        const classMap = {
            PENDING: "badge-pending",
            ACCEPTED: "badge-approved",
            REJECTED: "badge-rented",
            CANCELLED: "badge-muted"
        };
        return `<span class="badge ${classMap[status] || "badge-muted"}">${escapeHtml(requestStatusText(status))}</span>`;
    }

    function mapUrl(room) {
        const query = room.latitude && room.longitude ? `${room.latitude},${room.longitude}` : room.address || "Hà Nội";
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }

    function splitText(value, fallback = []) {
        if (!value) {
            return fallback;
        }
        return String(value)
            .split(/[,;\n]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    function initial(value) {
        return String(value || "U").trim().charAt(0).toUpperCase() || "U";
    }

    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
    }

    function formatArea(value) {
        return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m2`;
    }

    function formatDate(value) {
        if (!value) {
            return "Chưa cập nhật";
        }
        return new Date(value).toLocaleDateString("vi-VN");
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
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    loadDetail();
})();
