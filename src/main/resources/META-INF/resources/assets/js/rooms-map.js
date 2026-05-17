(() => {
    const GEOCODE_CACHE_KEY = "nhatro.geocodeCache.v1";
    const HANOI_CENTER = [21.0285, 105.8542];
    const listNode = document.querySelector("[data-map-room-list]");
    const countNode = document.querySelector("[data-map-count]");
    const statusNode = document.querySelector("[data-map-status]");
    const mapNode = document.querySelector("#roomsMapFull");
    const searchForm = document.querySelector(".listing-search-form");
    const filterForm = document.querySelector(".listing-filter-bar");
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

    if (!listNode || !mapNode) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const geocodeCache = readGeocodeCache();
    let map = null;
    let markers = [];
    let roomsById = new Map();
    let formsBound = false;

    async function init() {
        populateLocationFilter();
        setupForms();
        await initMap();
        loadRooms();
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

    function setupForms() {
        [searchForm, filterForm].forEach((form) => {
            if (!form) {
                return;
            }
            [...form.elements].forEach((element) => {
                if (element.name && params.has(element.name)) {
                    element.value = params.get(element.name);
                }
            });
        });

        if (formsBound) {
            return;
        }
        formsBound = true;

        [searchForm, filterForm].forEach((form) => {
            if (!form) {
                return;
            }
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                const next = collectFormParams(form);
                const query = next.toString();
                window.history.pushState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
                syncParams(next);
                setupForms();
                loadRooms();
            });
        });

        window.addEventListener("popstate", () => {
            syncParams(new URLSearchParams(window.location.search));
            loadRooms();
        });
    }

    function syncParams(nextParams) {
        [...params.keys()].forEach((key) => params.delete(key));
        nextParams.forEach((value, key) => params.set(key, value));
    }

    function collectFormParams(form) {
        const next = new URLSearchParams(window.location.search);
        [...form.elements].forEach((element) => {
            if (!element.name || element.type === "submit" || element.type === "button") {
                return;
            }
            const value = element.value.trim();
            if (value) {
                next.set(element.name, value);
            } else {
                next.delete(element.name);
            }
        });
        next.delete("page");
        return next;
    }

    async function initMap() {
        if (!window.L) {
            mapNode.innerHTML = `<div class="map-fallback">Không tải được bản đồ tương tác.</div>`;
            return;
        }
        map = L.map(mapNode, { zoomControl: true }).setView(HANOI_CENTER, 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);
    }

    function apiUrl() {
        const apiParams = new URLSearchParams();
        ["keyword", "location", "minPrice", "maxPrice", "minArea", "maxArea", "furnitureType"].forEach((key) => {
            const value = params.get(key);
            if (value) {
                apiParams.set(key, value);
            }
        });
        apiParams.set("page", "0");
        apiParams.set("size", "100");
        apiParams.set("status", "AVAILABLE");
        return `/api/rooms?${apiParams.toString()}`;
    }

    async function loadRooms() {
        listNode.innerHTML = `<div class="empty-state">Đang tải danh sách phòng...</div>`;
        setStatus("Đang tải dữ liệu phòng...");
        clearMarkers();

        try {
            const response = await fetch(apiUrl());
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Không tải được danh sách phòng");
            }
            const rooms = data.rooms || [];
            roomsById = new Map(rooms.map((room) => [Number(room.id), room]));
            if (countNode) {
                countNode.textContent = Number(data.total || rooms.length).toLocaleString("vi-VN");
            }
            renderList(rooms);
            await renderMarkers(rooms);
        } catch (error) {
            listNode.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
            setStatus(error.message);
        }
    }

    function renderList(rooms) {
        if (!rooms.length) {
            listNode.innerHTML = `<div class="empty-state">Không tìm thấy phòng phù hợp với bộ lọc hiện tại.</div>`;
            return;
        }
        listNode.innerHTML = rooms.map(roomListCard).join("");
        listNode.querySelectorAll("[data-map-room-id]").forEach((card) => {
            card.addEventListener("click", () => {
                focusRoom(Number(card.dataset.mapRoomId));
            });
        });
    }

    async function renderMarkers(rooms) {
        if (!map || !rooms.length) {
            return;
        }

        const resolved = [];
        for (const room of rooms) {
            setStatus(`Đang xác thực tọa độ: ${resolved.length}/${rooms.length} phòng...`);
            const result = await resolveRoomPoint(room);
            const point = result.point;
            if (point) {
                resolved.push({ room, point });
                addPriceMarker(room, point);
            }
        }

        if (resolved.length) {
            fitMapToMarkers();
            setStatus(`Đã đánh dấu ${resolved.length}/${rooms.length} phòng có tọa độ tìm được từ địa chỉ.`);
        } else {
            resetMapCenter();
            setStatus("Chưa tìm được tọa độ thực tế từ các địa chỉ hiện tại.");
        }
    }

    function addPriceMarker(room, point) {
        const marker = L.marker([point.lat, point.lng], {
            roomId: Number(room.id),
            icon: L.divIcon({
                className: "map-price-marker-wrap",
                html: `<button class="map-price-marker" type="button">${formatShortPrice(room.price)}</button>`,
                iconSize: [76, 38],
                iconAnchor: [38, 19],
                popupAnchor: [0, -18]
            })
        }).addTo(map);
        marker.bindPopup(roomPopup(room), {
            className: "map-room-popup-shell",
            closeButton: true,
            maxWidth: 280,
            minWidth: 260
        });
        marker.on("click", () => selectRoom(room.id));
        markers.push(marker);
    }

    function focusRoom(roomId) {
        const marker = markers.find((item) => markerRoomId(item) === Number(roomId));
        if (marker) {
            marker.openPopup();
            return;
        }
        const room = roomsById.get(Number(roomId));
        if (room) {
            setStatus(`Phòng "${room.title}" chưa có tọa độ tìm được từ địa chỉ.`);
        }
    }

    function selectRoom(roomId) {
        listNode.querySelectorAll("[data-map-room-id]").forEach((card) => {
            card.classList.toggle("active", Number(card.dataset.mapRoomId) === Number(roomId));
        });
        listNode.querySelector(`[data-map-room-id="${roomId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function clearMarkers() {
        markers.forEach((marker) => {
            marker.remove();
        });
        markers = [];
    }

    function fitMapToMarkers() {
        if (!markers.length) {
            return;
        }
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.14), { maxZoom: 14 });
    }

    function resetMapCenter() {
        map.setView(HANOI_CENTER, 12);
    }

    function markerRoomId(marker) {
        return Number(marker.options.roomId);
    }

    async function resolveRoomPoint(room) {
        const storedPoint = getStoredPoint(room);
        if (storedPoint) {
            return { point: storedPoint, fetched: false };
        }

        const key = normalizeAddress(room.address);
        if (!key) {
            return { point: null, fetched: false };
        }
        if (geocodeCache[key]) {
            return { point: geocodeCache[key], fetched: false };
        }
        return { point: await geocodeAddress(room.address), fetched: false };
    }

    function getStoredPoint(room) {
        const lat = Number(room.latitude);
        const lng = Number(room.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
        }
        return null;
    }

    async function geocodeAddress(address) {
        const key = normalizeAddress(address);
        if (!key) {
            return null;
        }
        if (geocodeCache[key]) {
            return geocodeCache[key];
        }

        try {
            const response = await fetch(`/api/geocoding?address=${encodeURIComponent(address)}`, {
                headers: { Accept: "application/json" }
            });
            const data = await response.json();
            if (!response.ok || !data?.found) {
                return null;
            }

            const point = { lat: Number(data.latitude), lng: Number(data.longitude) };
            if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
                return null;
            }
            geocodeCache[key] = point;
            writeGeocodeCache();
            return point;
        } catch {
            return null;
        }
    }

    function roomListCard(room) {
        const image = room.imageUrls?.[0] || "assets/img/logo.png";
        const amenities = splitList(room.amenities).filter((item) => !isDeprecatedAmenity(item)).slice(0, 8);
        return `
            <article class="map-list-card" data-map-room-id="${room.id}">
                <a class="map-list-photo" href="room-detail.html?id=${room.id}" aria-label="Xem chi tiết ${escapeAttribute(room.title)}">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}">
                    <span class="map-list-save">Giá tốt</span>
                    <span class="map-list-heart" aria-hidden="true">♡</span>
                    <div class="map-list-dots"><span></span><span></span><span></span><span></span></div>
                </a>
                <div class="map-list-body">
                    <div class="map-list-rating">
                        <span>★</span>
                        <b>${formatRating(room.averageRating)}</b>
                        <small>(${Number(room.reviewCount || 0)})</small>
                    </div>
                    <h2><a href="room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a></h2>
                    <p>${escapeHtml(room.address)}</p>
                    <div class="map-list-meta">
                        <span>${distanceFromCenter(room)}</span>
                        <span>${formatArea(room.area)}</span>
                        <span>${escapeHtml(room.furnitureType || "Đang cập nhật")}</span>
                    </div>
                    <div class="map-list-amenities">
                        ${amenities.map((item, index) => amenityChip(item, index === 0 ? "primary" : "")).join("")}
                    </div>
                    <div class="map-list-bottom">
                        <span><small>Từ</small><strong>${formatMoney(room.price)}</strong><small>/ tháng</small></span>
                        <a href="room-detail.html?id=${room.id}">Chi tiết</a>
                    </div>
                </div>
            </article>
        `;
    }

    function roomPopup(room) {
        const image = room.imageUrls?.[0] || "assets/img/logo.png";
        return `
            <article class="map-room-popup">
                <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}">
                <div class="map-room-popup-body">
                    <div class="map-list-rating">
                        <span>★</span>
                        <b>${formatRating(room.averageRating)}</b>
                        <small>(${Number(room.reviewCount || 0)})</small>
                    </div>
                    <h3>${escapeHtml(room.title)}</h3>
                    <p>${escapeHtml(room.address)}</p>
                    <strong>${formatMoney(room.price)}<small>/tháng</small></strong>
                    <a href="room-detail.html?id=${room.id}">Xem chi tiết</a>
                </div>
            </article>
        `;
    }

    function readGeocodeCache() {
        try {
            const parsed = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || "{}");
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }

    function writeGeocodeCache() {
        try {
            localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(geocodeCache));
        } catch {
            // Local storage can fail in private mode; map still works without cache.
        }
    }

    function normalizeAddress(address) {
        return String(address || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
    }

    function setStatus(message) {
        if (statusNode) {
            statusNode.textContent = message;
        }
    }

    function formatShortPrice(value) {
        const million = Number(value || 0) / 1000000;
        return `${million.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr`;
    }

    function formatMoney(value) {
        const million = Number(value || 0) / 1000000;
        return `${million.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
    }

    function formatArea(value) {
        return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m2`;
    }

    function formatRating(value) {
        const rating = Number(value || 0);
        return rating ? rating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "Mới";
    }

    function splitList(value) {
        return String(value || "Đang cập nhật")
                .split(/[,;\n]/)
                .map((item) => item.trim())
                .filter(Boolean);
    }

    function amenityChip(item, className = "") {
        const iconPath = amenityIcon(item);
        const classAttr = className ? ` class="${className}"` : "";
        const iconHtml = iconPath ? `<img class="amenity-icon" src="${iconPath}" alt="" aria-hidden="true">` : "";
        return `<span${classAttr}>${iconHtml}${escapeHtml(item)}</span>`;
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

    function isDeprecatedAmenity(item) {
        const normalized = normalizeAmenity(item);
        return [
            "cho de xe",
            "may giat chung",
            "internet toc do cao",
            "gio giac tu do"
        ].includes(normalized);
    }

    function distanceFromCenter(room) {
        const point = getStoredPoint(room);
        if (!point) {
            return "Gần trung tâm Hà Nội";
        }
        return `${formatDistance(haversineKm({ lat: HANOI_CENTER[0], lng: HANOI_CENTER[1] }, point))} tới Hồ Gươm`;
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

    function searchKey(value) {
        return String(value || "").trim().toLocaleLowerCase("vi-VN");
    }

    init();
})();
