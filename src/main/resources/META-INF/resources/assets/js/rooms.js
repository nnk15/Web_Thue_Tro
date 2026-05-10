(() => {
    const grid = document.querySelector("#roomsGrid");
    const summary = document.querySelector("#roomResultsSummary");
    const countNode = document.querySelector("#listingRoomCount");
    const searchForm = document.querySelector(".listing-search-form") || document.querySelector(".page-title .search-box");
    const filterForm = document.querySelector(".listing-filter-bar") || document.querySelector(".filter-panel form");

    if (!grid) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    let favoriteRoomIds = new Set();

    function value(name) {
        return params.get(name) || "";
    }

    function syncParams(nextParams) {
        [...params.keys()].forEach((key) => params.delete(key));
        nextParams.forEach((paramValue, key) => params.set(key, paramValue));
    }

    function setFormValues() {
        [searchForm, filterForm].forEach((form) => {
            if (!form) {
                return;
            }
            [...form.elements].forEach((element) => {
                if (!element.name || !params.has(element.name)) {
                    return;
                }
                element.value = params.get(element.name);
            });
        });
    }

    function collectFormParams(form) {
        const next = new URLSearchParams(window.location.search);
        [...form.elements].forEach((element) => {
            if (!element.name || element.type === "submit" || element.type === "button") {
                return;
            }
            const fieldValue = element.value.trim();
            if (fieldValue) {
                next.set(element.name, fieldValue);
            } else {
                next.delete(element.name);
            }
        });
        next.delete("page");
        return next;
    }

    function bindForms() {
        [searchForm, filterForm].forEach((form) => {
            form?.addEventListener("submit", (event) => {
                event.preventDefault();
                const next = collectFormParams(form);
                const query = next.toString();
                window.history.pushState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
                syncParams(next);
                setFormValues();
                loadRooms();
            });
        });

        window.addEventListener("popstate", () => {
            syncParams(new URLSearchParams(window.location.search));
            setFormValues();
            loadRooms();
        });
    }

    function bindFavoriteButtons() {
        grid.addEventListener("click", async (event) => {
            const button = event.target.closest("[data-room-id]");
            if (!button) {
                return;
            }

            const auth = window.NhaTroAuth;
            const user = auth?.currentUser?.();
            if (!auth?.token?.() || user?.role !== "USER") {
                window.location.href = `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                return;
            }

            button.disabled = true;
            try {
                const roomId = Number(button.dataset.roomId);
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

    function bindImageCarousel() {
        grid.addEventListener("click", (event) => {
            const button = event.target.closest("[data-gallery-step]");
            if (!button) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const media = button.closest(".listing-room-media");
            const images = (media?.dataset.images || "").split("|").filter(Boolean);
            if (!media || images.length < 2) {
                return;
            }

            const currentIndex = Number(media.dataset.imageIndex || 0);
            const step = Number(button.dataset.galleryStep || 0);
            const nextIndex = (currentIndex + step + images.length) % images.length;
            const image = media.querySelector("img");

            media.dataset.imageIndex = String(nextIndex);
            if (image) {
                image.src = images[nextIndex];
            }
            media.querySelectorAll(".listing-photo-dots span").forEach((dot, index) => {
                dot.classList.toggle("active", index === nextIndex);
            });
        });
    }
 
    function apiUrl() {
        const apiParams = new URLSearchParams();
        [
            "keyword",
            "location",
            "minPrice",
            "maxPrice",
            "minArea",
            "maxArea",
            "status",
            "furnitureType"
        ].forEach((key) => {
            const paramValue = value(key);
            if (paramValue) {
                apiParams.set(key, paramValue);
            }
        });
        apiParams.set("page", value("page") || "0");
        apiParams.set("size", value("size") || "50");
        return `/api/rooms?${apiParams.toString()}`;
    }

    async function loadRooms() {
        grid.innerHTML = "";
        summary.textContent = "Đang tải danh sách phòng trọ tại Hà Nội...";
        if (countNode) {
            countNode.textContent = "0";
        }

        try {
            await loadFavoriteRoomIds();
            const response = await fetch(apiUrl());
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Không tải được danh sách phòng");
            }
            renderRooms(data.rooms || [], data.total || 0);
        } catch (error) {
            summary.textContent = error.message;
            grid.innerHTML = `<div class="empty-state">Không thể tải danh sách phòng. Vui lòng kiểm tra backend và database.</div>`;
        }
    }

    function renderRooms(rooms, total) {
        if (countNode) {
            countNode.textContent = total.toLocaleString("vi-VN");
        }

        summary.textContent = total > 0
                ? `Sinh sống và học tập tại Hà Nội thuận tiện hơn với ${total.toLocaleString("vi-VN")} phòng trọ, studio và căn hộ mini đã được kiểm duyệt.`
                : "Không tìm thấy phòng phù hợp với bộ lọc hiện tại.";

        if (!rooms.length) {
            grid.innerHTML = `<div class="empty-state">Thử đổi khu vực, khoảng giá hoặc trạng thái phòng.</div>`;
            return;
        }

        grid.innerHTML = rooms.map(roomCard).join("");
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

    function roomCard(room, index) {
        const images = room.imageUrls?.length ? room.imageUrls : ["assets/img/logo.png"];
        const image = images[0];
        const imageData = images.map(escapeAttribute).join("|");
        const mediaClass = images.length > 1 ? "listing-room-media" : "listing-room-media single-image";
        const statusText = room.status === "AVAILABLE" ? "Còn trống" : room.status === "RENTED" ? "Đã thuê" : "Đang ẩn";
        const statusClass = room.status === "AVAILABLE" ? "badge-available" : "badge-rented";
        const amenities = splitAmenities(room.amenities).slice(0, 8);
        const rating = Number(room.averageRating || 0);
        const reviewCount = Number(room.reviewCount || 0);
        const ratingLabel = reviewCount > 0 ? rating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "Mới";
        const district = districtFromAddress(room.address);
        const isFavorite = favoriteRoomIds.has(Number(room.id));

        return `
            <article class="listing-room-card">
                <div class="${mediaClass}" data-images="${imageData}" data-image-index="0">
                    <a class="listing-room-image-link" href="room-detail.html?id=${room.id}">
                        <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}">
                    </a>
                    ${index === 0 ? `<span class="listing-room-badge">Món đồ của ngày</span>` : ""}
                    <button class="listing-gallery-arrow listing-gallery-prev" type="button" data-gallery-step="-1" aria-label="Ảnh trước">‹</button>
                    <button class="listing-gallery-arrow listing-gallery-next" type="button" data-gallery-step="1" aria-label="Ảnh tiếp theo">›</button>
                    <div class="listing-photo-dots">
                        ${images.map((_, imageIndex) => `<span class="${imageIndex === 0 ? "active" : ""}"></span>`).join("")}
                    </div>
                </div>

                <div class="listing-room-info">
                    <div class="listing-room-title-row">
                        <div>
                            <h2><a href="room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a></h2>
                            <p>${escapeHtml(room.address)}</p>
                        </div>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>

                    <div class="listing-distance">
                        <span>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                            Cách trung tâm Hà Nội ${distanceFor(index)} km
                        </span>
                        <span>·</span>
                        <span>${formatArea(room.area)}</span>
                        <span>·</span>
                        <span>${escapeHtml(room.furnitureType || "Đang cập nhật")}</span>
                    </div>

                    <div class="listing-distance">
                        <span>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V7l8-4 8 4v12"/><path d="M9 22V12h6v10"/></svg>
                            Gần khu vực ${escapeHtml(district)}
                        </span>
                    </div>

                    <div class="listing-amenities">
                        ${amenities.map((item, amenityIndex) => `<span class="${amenityIndex === 0 ? "highlight" : ""}">${escapeHtml(item)}</span>`).join("")}
                    </div>
                </div>

                <aside class="listing-room-price">
                    <div class="listing-rating">
                        <strong>${ratingLabel}</strong>
                        ${ratingStars(rating, reviewCount)}
                        <span>(${reviewCount})</span>
                        <button class="listing-heart ${isFavorite ? "is-active" : ""}" aria-label="${isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}" data-room-id="${room.id}">${isFavorite ? "♥" : "♡"}</button>
                    </div>
                    <div class="listing-price-block">
                        <span>Từ</span>
                        <strong>${formatMoney(room.price)}</strong>
                        <small>/ tháng</small>
                    </div>
                    <a class="listing-info-btn" href="room-detail.html?id=${room.id}">Hỏi thông tin</a>
                </aside>
            </article>
        `;
    }

    function setFavoriteButtonState(button, isFavorite) {
        button.textContent = isFavorite ? "♥" : "♡";
        button.classList.toggle("is-active", isFavorite);
        button.setAttribute("aria-label", isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích");
    }

    function ratingStars(rating, reviewCount) {
        const percent = reviewCount > 0 ? Math.max(0, Math.min(100, rating / 5 * 100)) : 0;
        const label = reviewCount > 0
                ? `${rating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} trên 5 sao`
                : "Chưa có đánh giá";
        return `<span class="stars rating-stars" style="--rating-percent:${percent}%" aria-label="${escapeAttribute(label)}">★★★★★</span>`;
    }

    function splitAmenities(value) {
        if (!value) {
            return ["Đang cập nhật"];
        }
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    function districtFromAddress(address) {
        const parts = String(address || "Hà Nội").split(",").map((item) => item.trim()).filter(Boolean);
        return parts.length > 1 ? parts[parts.length - 2] : "Hà Nội";
    }

    function distanceFor(index) {
        return (2 + (index % 9) * 0.4).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
    }

    function formatMoney(value) {
        const million = Number(value || 0) / 1000000;
        return `${million.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
    }

    function formatArea(value) {
        return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m2`;
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

    setFormValues();
    bindForms();
    bindFavoriteButtons();
    bindImageCarousel();
    loadRooms();
})();
