(() => {
    const carousel = document.querySelector(".property-carousel");
    const proofNumbers = document.querySelectorAll(".home-proof-item h2");
    const areaCards = document.querySelectorAll("[data-popular-area]");
    const fallbackImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=85";
    let favoriteRoomIds = new Set();

    if (!carousel) {
        return;
    }

    async function fetchRooms() {
        const response = await fetch("/api/rooms?status=AVAILABLE&page=0&size=10");
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Không tải được danh sách phòng nổi bật");
        }
        return data;
    }

    async function loadFeaturedRooms() {
        carousel.innerHTML = `<div class="empty-state">Đang tải phòng trọ nổi bật...</div>`;

        try {
            await loadFavoriteRoomIds();
            const data = await fetchRooms();
            const rooms = data.rooms || [];
            updateProof(data.total || rooms.length);
            renderRooms(rooms);
        } catch (error) {
            carousel.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    }

    function updateProof(totalRooms) {
        if (proofNumbers[0]) {
            proofNumbers[0].textContent = `${formatCompact(totalRooms)}+ phòng`;
        }
        if (proofNumbers[2]) {
            proofNumbers[2].textContent = "12+ quận Hà Nội";
        }
    }

    async function loadPopularAreaCounts() {
        await Promise.all(Array.from(areaCards).map(async (card) => {
            const area = card.dataset.popularArea;
            const countTarget = card.querySelector("[data-area-count]");
            if (!area || !countTarget) {
                return;
            }

            try {
                const response = await fetch(`/api/rooms?location=${encodeURIComponent(area)}&page=0&size=1`);
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || "Khong tai duoc so phong");
                }
                countTarget.textContent = `${formatExact(data.total)} phòng`;
            } catch {
                countTarget.textContent = "Chưa có dữ liệu";
            }
        }));
    }

    function renderRooms(rooms) {
        if (!rooms.length) {
            carousel.innerHTML = `<div class="empty-state">Chưa có phòng trọ được duyệt để hiển thị.</div>`;
            return;
        }

        carousel.innerHTML = rooms.map((room, index) => propertyCard(room, index)).join("");
    }

    function propertyCard(room, index) {
        const image = room.imageUrls?.[0] || fallbackImage;
        const badges = ["Phòng nổi bật", "Gần trường học", "Giá tốt", "Mới đăng"];
        const badge = badges[index % badges.length];
        const faded = index === 5 ? " faded" : "";
        const isFavorite = favoriteRoomIds.has(Number(room.id));

        return `
            <article class="property-card${faded}">
                <div class="property-photo">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}">
                    <span class="property-badge${index === 0 ? " dark" : ""}">${escapeHtml(badge)}</span>
                    <button class="property-heart ${isFavorite ? "is-active" : ""}" type="button" aria-label="${isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}" data-favorite-room="${room.id}">${isFavorite ? "♥" : "♡"}</button>
                    <div class="property-dots"><span></span><span></span><span></span></div>
                </div>
                <div class="property-info">
                    <h3><a href="room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a></h3>
                    <p>${escapeHtml(shortAddress(room.address))}</p>
                    <div class="property-price">Từ <strong>${formatMillion(room.price)}</strong> / tháng</div>
                </div>
            </article>
        `;
    }

    function bindFavoriteButtons() {
        carousel.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-favorite-room]");
            if (!button) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const auth = window.NhaTroAuth;
            const user = auth?.currentUser?.();
            if (!auth?.token?.() || user?.role !== "USER") {
                window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                return;
            }

            button.disabled = true;
            try {
                const roomId = Number(button.dataset.favoriteRoom);
                if (favoriteRoomIds.has(roomId)) {
                    await auth.api(`/api/favorite-rooms/${roomId}`, { method: "DELETE" });
                    favoriteRoomIds.delete(roomId);
                    setFavoriteButtonState(button, false);
                } else {
                    await auth.api(`/api/favorite-rooms/${roomId}`, { method: "POST" });
                    favoriteRoomIds.add(roomId);
                    setFavoriteButtonState(button, true);
                }
            } catch (error) {
                alert(error.message);
            } finally {
                button.disabled = false;
            }
        });
    }

    async function loadFavoriteRoomIds() {
        const auth = window.NhaTroAuth;
        const user = auth?.currentUser?.();
        if (!auth?.token?.() || user?.role !== "USER") {
            favoriteRoomIds = new Set();
            return;
        }

        try {
            const favorites = await auth.api("/api/favorite-rooms");
            favoriteRoomIds = new Set((favorites || []).map((room) => Number(room.id)));
        } catch {
            favoriteRoomIds = new Set();
        }
    }

    function setFavoriteButtonState(button, isFavorite) {
        button.textContent = isFavorite ? "♥" : "♡";
        button.classList.toggle("is-active", isFavorite);
        button.setAttribute("aria-label", isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích");
    }

    function shortAddress(address) {
        const parts = String(address || "Hà Nội").split(",").map((item) => item.trim()).filter(Boolean);
        return parts.slice(-2).join(", ") || address || "Hà Nội";
    }

    function formatCompact(value) {
        const number = Number(value || 0);
        if (number >= 1000) {
            return `${Math.floor(number / 1000)}K`;
        }
        return number.toLocaleString("vi-VN");
    }

    function formatExact(value) {
        return Number(value || 0).toLocaleString("vi-VN");
    }

    function formatMillion(value) {
        const million = Number(value || 0) / 1000000;
        return `${million.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
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

    bindFavoriteButtons();
    loadPopularAreaCounts();
    loadFeaturedRooms();
})();
