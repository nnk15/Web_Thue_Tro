(() => {
    const RECENT_SEARCHES_KEY = "nhatro.recentSearches";
    const MAX_RECENT_SEARCHES = 6;
    const PAGE_SIZE = 10;
    const grid = document.querySelector("#roomsGrid");
    const summary = document.querySelector("#roomResultsSummary");
    const countNode = document.querySelector("#listingRoomCount");
    const paginationNode = document.querySelector("[data-rooms-pagination]");
    const searchForm = document.querySelector(".listing-search-form") || document.querySelector(".page-title .search-box");
    const filterForm = document.querySelector(".listing-filter-bar") || document.querySelector(".filter-panel form");
    const roomsMapNode = document.querySelector("#roomsMap");
    const mapSummaryNode = document.querySelector("#listingMapSummary");
    const mapRadiusSelect = document.querySelector("[data-map-radius]");
    const mapViewLink = document.querySelector("[data-open-map-view]");
    const breadcrumbLocation = document.querySelector("#listingBreadcrumbLocation");
    const HANOI_AREAS = [
        "Cầu Giấy",
        "Đống Đa",
        "Hai Bà Trưng",
        "Thanh Xuân",
        "Tây Hồ",
        "Nam Từ Liêm",
        "Hà Đông",
        "Hoàng Mai",
        "Ba Đình",
        "Long Biên",
        "Bắc Từ Liêm",
        "Hoàn Kiếm",
        "Gia Lâm",
        "Đông Anh",
        "Hoài Đức",
        "Thanh Trì",
        "Sóc Sơn",
        "Sơn Tây",
        "Ba Vì",
        "Chương Mỹ",
        "Đan Phượng",
        "Mê Linh",
        "Mỹ Đức",
        "Phú Xuyên",
        "Phúc Thọ",
        "Quốc Oai",
        "Thạch Thất",
        "Thanh Oai",
        "Thường Tín",
        "Ứng Hòa"
    ];

    if (!grid) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    let favoriteRoomIds = new Set();
    let currentRooms = [];
    let currentTotal = 0;
    let listingMap = null;
    let listingMarkers = [];
    let listingRadiusCircle = null;
    let selectedMapPoint = null;

    const HANOI_CENTER = { label: "Trung tâm Hồ Gươm", lat: 21.0285, lng: 105.8542 };
    const MAP_POINTS = {
        university: { label: "ĐHQG Hà Nội - Cầu Giấy", lat: 21.0379, lng: 105.7824 },
        office: { label: "Khu văn phòng Keangnam", lat: 21.0171, lng: 105.7847 },
        industrial: { label: "Khu công nghiệp Thăng Long", lat: 21.1398, lng: 105.7894 },
        center: HANOI_CENTER
    };

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
        syncMapViewLink();
        syncBreadcrumbLocation();
    }

    function populateLocationFilter() {
        const locationSelect = filterForm?.querySelector('select[name="location"]');
        if (!locationSelect) {
            return;
        }

        const existing = new Set(Array.from(locationSelect.options).map((option) => searchKey(option.value || option.textContent)));
        HANOI_AREAS.forEach((area) => {
            if (existing.has(searchKey(area))) {
                return;
            }

            const option = document.createElement("option");
            option.value = area;
            option.textContent = area;
            locationSelect.appendChild(option);
        });
    }

    function syncMapViewLink() {
        if (!mapViewLink) {
            return;
        }
        const query = params.toString();
        mapViewLink.href = query ? `rooms-map.html?${query}` : "rooms-map.html";
    }

    function syncBreadcrumbLocation() {
        if (!breadcrumbLocation) {
            return;
        }
        breadcrumbLocation.textContent = value("location") || "Địa Phương";
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
        next.delete("size");
        return next;
    }

    function bindForms() {
        [searchForm, filterForm].forEach((form) => {
            form?.addEventListener("submit", (event) => {
                event.preventDefault();
                const next = collectFormParams(form);
                rememberSearchFromParams(next);
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

    function bindPagination() {
        paginationNode?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-rooms-page]");
            if (!button || button.disabled) {
                return;
            }
            goToRoomsPage(Number(button.dataset.roomsPage || 0));
        });
    }

    function goToRoomsPage(page) {
        const next = new URLSearchParams(window.location.search);
        const nextPage = Math.max(0, Number(page || 0));
        if (nextPage > 0) {
            next.set("page", String(nextPage));
        } else {
            next.delete("page");
        }
        next.delete("size");
        const query = next.toString();
        window.history.pushState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
        syncParams(next);
        setFormValues();
        loadRooms();
        document.querySelector(".listing-results-column")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function rememberSearchFromParams(nextParams) {
        const location = normalizeSearchValue(nextParams.get("location"));
        const keyword = normalizeSearchValue(nextParams.get("keyword"));
        if (location) {
            rememberSearch(location, "location");
            return;
        }
        if (keyword) {
            rememberSearch(keyword, "keyword");
        }
    }

    function rememberSearch(value, type = "keyword") {
        const searchValue = normalizeSearchValue(value);
        if (!searchValue) {
            return;
        }

        const searchType = type === "location" ? "location" : "keyword";
        const current = readRecentSearches().filter((item) => (
            item.type !== searchType || searchKey(item.value) !== searchKey(searchValue)
        ));
        const next = [{ value: searchValue, type: searchType }, ...current].slice(0, MAX_RECENT_SEARCHES);

        try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
        } catch {
            // Ignore storage failures so searching still works.
        }
    }

    function readRecentSearches() {
        try {
            const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed
                    .map((item) => {
                        if (typeof item === "string") {
                            return { value: normalizeSearchValue(item), type: "keyword" };
                        }

                        return {
                            value: normalizeSearchValue(item?.value),
                            type: item?.type === "location" ? "location" : "keyword"
                        };
                    })
                    .filter((item) => item.value)
                    .slice(0, MAX_RECENT_SEARCHES);
        } catch {
            return [];
        }
    }

    function normalizeSearchValue(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }

    function searchKey(value) {
        return normalizeSearchValue(value).toLocaleLowerCase("vi-VN");
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

    function bindMapSearchControls() {
        document.querySelectorAll("[data-map-focus]").forEach((button) => {
            button.addEventListener("click", () => {
                const point = MAP_POINTS[button.dataset.mapFocus];
                if (!point) {
                    return;
                }
                selectedMapPoint = point;
                document.querySelectorAll("[data-map-focus]").forEach((item) => {
                    item.classList.toggle("active", item === button);
                });
                renderRooms(sortRoomsByDistance(currentRooms, point), currentTotal);
            });
        });

        mapRadiusSelect?.addEventListener("change", () => {
            renderListingMap(currentRooms);
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
            "furnitureType"
        ].forEach((key) => {
            const paramValue = value(key);
            if (paramValue) {
                apiParams.set(key, paramValue);
            }
        });
        apiParams.set("page", String(currentPage()));
        apiParams.set("size", String(PAGE_SIZE));
        apiParams.set("status", "AVAILABLE");
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
            renderRoomsPagination(0);
            renderListingMap([]);
        }
    }

    function renderRooms(rooms, total) {
        currentRooms = rooms || [];
        currentTotal = Number(total || currentRooms.length || 0);
        if (countNode) {
            countNode.textContent = currentTotal.toLocaleString("vi-VN");
        }

        summary.textContent = currentTotal > 0
                ? `Sinh sống và học tập tại Hà Nội thuận tiện hơn với ${currentTotal.toLocaleString("vi-VN")} phòng trọ, studio và căn hộ mini đã được kiểm duyệt.`
                : "Không tìm thấy phòng phù hợp với bộ lọc hiện tại.";

        if (!rooms.length) {
            grid.innerHTML = `<div class="empty-state">Thử đổi khu vực, khoảng giá hoặc loại phòng.</div>`;
            renderRoomsPagination(currentTotal);
            renderListingMap([]);
            return;
        }

        grid.innerHTML = rooms.map(roomCard).join("");
        renderRoomsPagination(currentTotal);
        renderListingMap(rooms);
    }

    function renderRoomsPagination(total) {
        if (!paginationNode) {
            return;
        }

        const pageCount = Math.ceil(Number(total || 0) / PAGE_SIZE);
        if (pageCount <= 1) {
            paginationNode.innerHTML = "";
            return;
        }

        const page = Math.min(currentPage(), pageCount - 1);
        const items = paginationItems(page, pageCount).map((item) => {
            if (item === "ellipsis") {
                return `<span class="pagination-ellipsis">...</span>`;
            }
            return `
                <button class="${item === page ? "active" : ""}" type="button" data-rooms-page="${item}" aria-label="Trang ${item + 1}">
                    ${item + 1}
                </button>
            `;
        }).join("");

        paginationNode.innerHTML = `
            <button type="button" data-rooms-page="${page - 1}" ${page === 0 ? "disabled" : ""}>Trước</button>
            ${items}
            <button type="button" data-rooms-page="${page + 1}" ${page >= pageCount - 1 ? "disabled" : ""}>Sau</button>
        `;
    }

    function paginationItems(current, pageCount) {
        if (pageCount <= 7) {
            return Array.from({ length: pageCount }, (_, index) => index);
        }

        const pages = [];
        let previous = -1;
        for (let index = 0; index < pageCount; index += 1) {
            const shouldShow = index === 0
                    || index === pageCount - 1
                    || Math.abs(index - current) <= 1
                    || (current < 3 && index < 5)
                    || (current > pageCount - 4 && index >= pageCount - 5);

            if (!shouldShow) {
                continue;
            }
            if (previous >= 0 && index - previous > 1) {
                pages.push("ellipsis");
            }
            pages.push(index);
            previous = index;
        }
        return pages;
    }

    function currentPage() {
        const page = Number(value("page") || 0);
        return Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
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
        const rating = Number(room.averageRating || 0);
        const reviewCount = Number(room.reviewCount || 0);
        const ratingLabel = reviewCount > 0 ? rating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "Mới";
        const district = districtFromAddress(room.address);
        const isFavorite = favoriteRoomIds.has(Number(room.id));
        const selectedDistance = selectedMapPoint ? distanceFromPoint(room, selectedMapPoint) : null;
        const distanceLine = selectedDistance !== null
                ? `Cách ${escapeHtml(selectedMapPoint.label)} ${formatDistance(selectedDistance)}`
                : `Cách trung tâm Hà Nội ${distanceFor(index)} km`;

        return `
            <article class="listing-room-card">
                <div class="${mediaClass}" data-images="${imageData}" data-image-index="0">
                    <a class="listing-room-image-link" href="room-detail.html?id=${room.id}">
                        <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}">
                    </a>
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
                    </div>

                    <div class="listing-distance">
                        <span>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                            ${distanceLine}
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
                        ${furnitureChip(room.furnitureType)}
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
                    <a class="listing-info-btn" href="room-detail.html?id=${room.id}">Chi tiết</a>
                </aside>
            </article>
        `;
    }

    function setFavoriteButtonState(button, isFavorite) {
        button.textContent = isFavorite ? "♥" : "♡";
        button.classList.toggle("is-active", isFavorite);
        button.setAttribute("aria-label", isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích");
    }

    function renderListingMap(rooms) {
        if (!roomsMapNode) {
            return;
        }

        const points = (rooms || [])
                .map((room) => ({ room, point: roomPoint(room) }))
                .filter((item) => item.point);

        if (!window.L) {
            roomsMapNode.innerHTML = `
                <div class="map-fallback">
                    <strong>Không tải được bản đồ tương tác.</strong>
                    <a href="https://www.openstreetmap.org/search?query=ph%C3%B2ng%20tr%E1%BB%8D%20H%C3%A0%20N%E1%BB%99i" target="_blank" rel="noopener">Mở OpenStreetMap</a>
                </div>
            `;
            updateMapSummary(points);
            return;
        }

        if (!listingMap) {
            listingMap = L.map(roomsMapNode, { scrollWheelZoom: false }).setView([HANOI_CENTER.lat, HANOI_CENTER.lng], 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap"
            }).addTo(listingMap);
        }

        listingMarkers.forEach((marker) => marker.remove());
        listingMarkers = [];
        if (listingRadiusCircle) {
            listingRadiusCircle.remove();
            listingRadiusCircle = null;
        }

        points.forEach(({ room, point }) => {
            const distance = selectedMapPoint ? haversineKm(selectedMapPoint, point) : null;
            const marker = L.marker([point.lat, point.lng]).addTo(listingMap);
            marker.bindPopup(`
                <div class="map-popup">
                    <strong>${escapeHtml(room.title)}</strong>
                    <span>${escapeHtml(room.address)}</span>
                    <b>${formatMoney(room.price)} / tháng</b>
                    ${distance !== null ? `<small>Cách ${escapeHtml(selectedMapPoint.label)} ${formatDistance(distance)}</small>` : ""}
                    <a href="room-detail.html?id=${room.id}">Xem chi tiết</a>
                </div>
            `);
            listingMarkers.push(marker);
        });

        const center = selectedMapPoint || mapCenterFromPoints(points);
        listingMap.setView([center.lat, center.lng], selectedMapPoint ? 13 : 11);

        if (selectedMapPoint) {
            const radius = Number(mapRadiusSelect?.value || 5) * 1000;
            listingRadiusCircle = L.circle([selectedMapPoint.lat, selectedMapPoint.lng], {
                radius,
                color: "#ef3f68",
                weight: 2,
                fillColor: "#ef3f68",
                fillOpacity: 0.08
            }).addTo(listingMap);
        } else if (points.length > 1) {
            const group = L.featureGroup(listingMarkers);
            listingMap.fitBounds(group.getBounds().pad(0.16), { maxZoom: 13 });
        }

        setTimeout(() => listingMap.invalidateSize(), 80);
        updateMapSummary(points);
    }

    function updateMapSummary(points) {
        if (!mapSummaryNode) {
            return;
        }
        if (!points.length) {
            mapSummaryNode.textContent = "Chưa có phòng có tọa độ để hiển thị.";
            return;
        }
        if (!selectedMapPoint) {
            mapSummaryNode.textContent = `Đang đánh dấu ${points.length} phòng trên bản đồ.`;
            return;
        }
        const radius = Number(mapRadiusSelect?.value || 5);
        const nearby = points.filter(({ point }) => haversineKm(selectedMapPoint, point) <= radius).length;
        mapSummaryNode.textContent = `${nearby}/${points.length} phòng trong bán kính ${radius} km quanh ${selectedMapPoint.label}.`;
    }

    function roomPoint(room) {
        const lat = Number(room?.latitude);
        const lng = Number(room?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }
        return { lat, lng };
    }

    function mapCenterFromPoints(points) {
        if (!points.length) {
            return HANOI_CENTER;
        }
        const sum = points.reduce((acc, item) => ({
            lat: acc.lat + item.point.lat,
            lng: acc.lng + item.point.lng
        }), { lat: 0, lng: 0 });
        return { label: "Trung tâm danh sách", lat: sum.lat / points.length, lng: sum.lng / points.length };
    }

    function sortRoomsByDistance(rooms, point) {
        return [...(rooms || [])].sort((left, right) => {
            const leftDistance = distanceFromPoint(left, point);
            const rightDistance = distanceFromPoint(right, point);
            return (leftDistance ?? Number.MAX_VALUE) - (rightDistance ?? Number.MAX_VALUE);
        });
    }

    function distanceFromPoint(room, point) {
        const roomLocation = roomPoint(room);
        return roomLocation ? haversineKm(point, roomLocation) : null;
    }

    function haversineKm(from, to) {
        const radius = 6371;
        const dLat = toRadians(to.lat - from.lat);
        const dLng = toRadians(to.lng - from.lng);
        const lat1 = toRadians(from.lat);
        const lat2 = toRadians(to.lat);
        const a = Math.sin(dLat / 2) ** 2
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function toRadians(value) {
        return value * Math.PI / 180;
    }

    function formatDistance(value) {
        return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} km`;
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
        return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
    }

    function amenityChip(item, className = "") {
        const iconPath = amenityIcon(item);
        const classAttr = className ? ` class="${className}"` : "";
        const iconHtml = iconPath ? `<img class="amenity-icon" src="${iconPath}" alt="" aria-hidden="true">` : "";
        return `<span${classAttr}>${iconHtml}${escapeHtml(item)}</span>`;
    }

    function furnitureChip(value) {
        return `<span class="highlight">${escapeHtml(furnitureLabel(value))}</span>`;
    }

    function furnitureLabel(value) {
        const normalized = normalizeAmenity(value);
        if (normalized.includes("khong")) {
            return "Không nội thất";
        }
        if (normalized.includes("co ban")) {
            return "Cơ bản";
        }
        if (normalized.includes("day du") || normalized.includes("full")) {
            return "Đầy đủ";
        }
        return value || "Đang cập nhật";
    }

    function amenityIcon(item) {
        const normalized = normalizeAmenity(item);
        const mapping = [
            { keys: ["wifi", "wi fi", "internet"], file: "wi-fi.png" },
            { keys: ["camera", "cam"], file: "security-camera.png" },
            { keys: ["thang may"], file: "elevator.png" },
            { keys: ["cho de xe", "giu xe", "de xe", "bai xe", "xe dap"], file: "bicycle.png" },
            { keys: ["tu lanh"], file: "fridge.png" },
            { keys: ["may lanh", "dieu hoa"], file: "air-conditioner.png" },
            { keys: ["may say", "say quan ao"], file: "tumble-dry.png" },
            { keys: ["may giat", "do gia dung"], file: "appliance.png" },
            { keys: ["khoa van tay", "khoa cua"], file: "lock.png" },
            { keys: ["an ninh", "bao ve"], file: "security.png" },
            { keys: ["ban cong"], file: "balcony.png" },
            { keys: ["gio giac"], file: "clock.png" },
            { keys: ["giuong", "phong ngu"], file: "single-bed.png" },
            { keys: ["tu quan ao"], file: "wardrobe.png" },
            { keys: ["ban hoc", "ban lam viec"], file: "desk-chair.png" },
            { keys: ["bep rieng", "nau an", "bep"], file: "kitchen.png" },
            { keys: ["nong lanh", "binh nong lanh", "nuoc nong"], file: "water-boiler.png" },
            { keys: ["ve sinh", "nha tam", "phong tam"], file: "bath.png" }
        ];
        const match = mapping.find((itemMap) => itemMap.keys.some((key) => normalized.includes(key)));
        return match ? `assets/img/${match.file}` : "";
    }

    function normalizeAmenity(value) {
        return String(value || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/đ/g, "d")
                .replace(/Đ/g, "d")
                .toLowerCase();
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

    populateLocationFilter();
    setFormValues();
    bindForms();
    bindPagination();
    bindFavoriteButtons();
    bindImageCarousel();
    bindMapSearchControls();
    loadRooms();
})();
