(() => {
    const RECENT_SEARCHES_KEY = "nhatro.recentSearches";
    const MAX_RECENT_SEARCHES = 6;
    const FEATURED_ROOM_LIMIT = 5;
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
    const FEATURED_SEARCH_AREAS = [
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
        "Hoàn Kiếm"
    ];
    const POPULAR_AREA_IMAGES = [
        "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1524230572899-a752b3835840?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=700&q=85",
        "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=700&q=85"
    ];
    const carousel = document.querySelector(".property-carousel");
    const proofNumbers = document.querySelectorAll(".home-proof-item h2");
    const searchWrap = document.querySelector(".home-search-wrap");
    const searchInput = document.querySelector("#home-search-input");
    const headerSearchForm = document.querySelector(".home-header-search");
    const headerSearchInput = headerSearchForm?.querySelector('input[type="search"]');
    const searchSuggestions = document.querySelector("#home-search-suggestions");
    const recentSearchesContainer = document.querySelector("[data-recent-searches]");
    const popularAreaCarousel = document.querySelector("[data-popular-area-carousel]");
    const popularAreaPrev = document.querySelector("[data-popular-area-prev]");
    const popularAreaNext = document.querySelector("[data-popular-area-next]");
    const propertyTabs = document.querySelector("[data-property-tabs]");
    const propertyTabsPrev = document.querySelector("[data-property-tabs-prev]");
    const propertyTabsNext = document.querySelector("[data-property-tabs-next]");
    const fallbackImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=85";
    let favoriteRoomIds = new Set();
    let selectedArea = propertyTabs?.querySelector("[data-property-area].selected")?.dataset.propertyArea || "Cầu Giấy";

    if (!carousel) {
        return;
    }

    async function fetchRooms(location = selectedArea) {
        const params = new URLSearchParams({
            status: "AVAILABLE",
            page: "0",
            size: String(FEATURED_ROOM_LIMIT)
        });
        if (location) {
            params.set("location", location);
        }

        const response = await fetch(`/api/rooms?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Không tải được danh sách phòng trọ");
        }
        return data;
    }

    async function loadFeaturedRooms(location = selectedArea) {
        selectedArea = location || selectedArea;
        carousel.innerHTML = `<div class="empty-state">Đang tải phòng trọ ${escapeHtml(selectedArea)}...</div>`;

        try {
            await loadFavoriteRoomIds();
            const data = await fetchRooms(selectedArea);
            const rooms = (data.rooms || []).slice(0, FEATURED_ROOM_LIMIT);
            updateProof(data.total || rooms.length);
            renderRooms(rooms, selectedArea);
            carousel.scrollLeft = 0;
        } catch (error) {
            carousel.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
        }
    }

    function updateProof(totalRooms) {
        if (proofNumbers[0]) {
            proofNumbers[0].textContent = `${formatCompact(totalRooms)}+ phòng`;
        }
        if (proofNumbers[2]) {
            proofNumbers[2].textContent = `${HANOI_AREAS.length} quận/huyện Hà Nội`;
        }
    }

    async function loadPopularAreaCounts() {
        await Promise.all(Array.from(document.querySelectorAll("[data-popular-area]")).map(async (card) => {
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

    function hydrateHanoiAreas() {
        hydrateSearchAreaSuggestions();
        hydratePopularAreaCards();
    }

    function hydrateSearchAreaSuggestions() {
        if (!searchSuggestions) {
            return;
        }

        const tabs = searchSuggestions.querySelector(".suggestion-tabs");
        FEATURED_SEARCH_AREAS.forEach((area) => appendSuggestionButton(tabs, area));

        const areaList = Array.from(searchSuggestions.querySelectorAll(".suggestion-section .suggestion-list:not(.compact)"))
                .find((list) => list.querySelector('[data-search-suggestion="Cầu Giấy"]'));
        FEATURED_SEARCH_AREAS.forEach((area) => appendSuggestionButton(areaList, area));
    }

    function appendSuggestionButton(container, area) {
        if (!container || hasDataValue(container, "searchSuggestion", area)) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.searchSuggestion = area;
        button.dataset.searchType = "location";
        button.textContent = area;
        container.appendChild(button);
    }

    function hydratePopularAreaCards() {
        if (!popularAreaCarousel) {
            return;
        }

        HANOI_AREAS.forEach((area, index) => {
            if (hasDataValue(popularAreaCarousel, "popularArea", area)) {
                return;
            }

            const card = document.createElement("a");
            card.className = "popular-area-card";
            card.href = `rooms.html?location=${encodeURIComponent(area)}`;
            card.dataset.popularArea = area;
            const image = POPULAR_AREA_IMAGES[index % POPULAR_AREA_IMAGES.length];
            card.innerHTML = `
                <img src="${escapeAttribute(image)}" alt="Phòng trọ ${escapeAttribute(area)}">
                <span>${escapeHtml(area)}</span>
            `;
            popularAreaCarousel.appendChild(card);
        });
    }

    function renderRooms(rooms, area = selectedArea) {
        const seeAllCardHtml = seeAllCard(rooms, area);
        if (!rooms.length) {
            carousel.innerHTML = `<div class="empty-state">Chưa có phòng trọ được duyệt tại ${escapeHtml(area)}.</div>${seeAllCardHtml}`;
            return;
        }

        carousel.innerHTML = `${rooms.map((room) => propertyCard(room)).join("")}${seeAllCardHtml}`;
    }

    function propertyCard(room) {
        const images = (room.imageUrls?.length ? room.imageUrls : [fallbackImage]).filter(Boolean);
        const image = images[0] || fallbackImage;
        const isFavorite = favoriteRoomIds.has(Number(room.id));
        const hasGallery = images.length > 1;
        const dots = images.slice(0, Math.min(images.length, 4)).map((_, index) => (
            `<span class="${index === 0 ? "active" : ""}"></span>`
        )).join("");

        return `
            <article class="property-card">
                <div class="property-photo ${hasGallery ? "has-gallery" : "single-image"}" data-property-images="${escapeAttribute(JSON.stringify(images))}" data-property-image-index="0">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}" data-property-image>
                    ${hasGallery ? `
                        <button class="property-gallery-arrow property-gallery-prev" type="button" data-property-gallery-step="-1" aria-label="Ảnh trước">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <button class="property-gallery-arrow property-gallery-next" type="button" data-property-gallery-step="1" aria-label="Ảnh sau">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
                        </button>
                    ` : ""}
                    <button class="property-heart ${isFavorite ? "is-active" : ""}" type="button" aria-label="${isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích"}" data-favorite-room="${room.id}">${isFavorite ? "♥" : "♡"}</button>
                    ${hasGallery ? `<div class="property-dots" data-property-dots>${dots}</div>` : ""}
                </div>
                <div class="property-info">
                    <h3><a href="room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a></h3>
                    <p>${escapeHtml(shortAddress(room.address))}</p>
                    <div class="property-price">Từ <strong>${formatMillion(room.price)}</strong> / tháng</div>
                </div>
            </article>
        `;
    }

    function seeAllCard(rooms, area) {
        const params = new URLSearchParams();
        params.set("location", area);
        const image = rooms.find((room) => room.imageUrls?.length)?.imageUrls?.[0] || fallbackImage;

        return `
            <article class="property-see-all-card">
                <img src="${escapeAttribute(image)}" alt="Xem tất cả phòng trọ ${escapeAttribute(area)}">
                <a href="rooms.html?${params.toString()}">
                    <span>Xem tất cả</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
                </a>
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

    function bindPropertyGallery() {
        carousel.addEventListener("click", (event) => {
            const button = event.target.closest("[data-property-gallery-step]");
            if (!button) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const photo = button.closest(".property-photo");
            const image = photo?.querySelector("[data-property-image]");
            if (!photo || !image) {
                return;
            }

            let images = [];
            try {
                images = JSON.parse(photo.dataset.propertyImages || "[]");
            } catch {
                images = [];
            }
            if (images.length < 2) {
                return;
            }

            const step = Number(button.dataset.propertyGalleryStep || 0);
            const currentIndex = Number(photo.dataset.propertyImageIndex || 0);
            const nextIndex = (currentIndex + step + images.length) % images.length;

            photo.dataset.propertyImageIndex = String(nextIndex);
            image.src = images[nextIndex];
            updatePropertyDots(photo, nextIndex);
        });
    }

    function bindPopularAreaCarousel() {
        if (!popularAreaCarousel) {
            return;
        }

        popularAreaNext?.addEventListener("click", () => {
            popularAreaCarousel.scrollBy({
                left: Math.round(popularAreaCarousel.clientWidth * 0.82),
                behavior: "smooth"
            });
        });

        popularAreaPrev?.addEventListener("click", () => {
            popularAreaCarousel.scrollBy({
                left: -Math.round(popularAreaCarousel.clientWidth * 0.82),
                behavior: "smooth"
            });
        });

        popularAreaCarousel.addEventListener("scroll", updatePopularAreaButtons, { passive: true });
        window.addEventListener("resize", updatePopularAreaButtons);
        requestAnimationFrame(updatePopularAreaButtons);
    }

    function updatePopularAreaButtons() {
        if (!popularAreaCarousel) {
            return;
        }

        const maxScroll = Math.max(0, popularAreaCarousel.scrollWidth - popularAreaCarousel.clientWidth);
        const atStart = popularAreaCarousel.scrollLeft <= 4;
        const atEnd = popularAreaCarousel.scrollLeft >= maxScroll - 4;
        if (popularAreaPrev) {
            popularAreaPrev.hidden = atStart || maxScroll <= 4;
            popularAreaPrev.disabled = atStart || maxScroll <= 4;
        }
        if (popularAreaNext) {
            popularAreaNext.hidden = atEnd || maxScroll <= 4;
            popularAreaNext.disabled = atEnd || maxScroll <= 4;
        }
    }

    function updatePropertyDots(photo, activeIndex) {
        const dots = photo.querySelectorAll("[data-property-dots] span");
        const visualIndex = Math.min(activeIndex, Math.max(dots.length - 1, 0));
        dots.forEach((dot, index) => {
            dot.classList.toggle("active", index === visualIndex);
        });
    }

    function bindSearchSuggestions() {
        if (!searchWrap || !searchInput || !searchSuggestions) {
            return;
        }

        let activeSearchInput = searchInput;

        const show = (input = searchInput) => {
            activeSearchInput = input;
            renderRecentSearches();
            positionSearchSuggestions(input);
            searchSuggestions.hidden = false;
            input.setAttribute("aria-expanded", "true");
        };
        const hide = () => {
            searchSuggestions.hidden = true;
            searchInput.setAttribute("aria-expanded", "false");
            headerSearchInput?.setAttribute("aria-expanded", "false");
            resetSearchSuggestionsPosition();
        };

        searchInput.addEventListener("focus", () => show(searchInput));
        searchInput.addEventListener("click", () => show(searchInput));
        headerSearchInput?.addEventListener("focus", () => show(headerSearchInput));
        headerSearchInput?.addEventListener("click", () => show(headerSearchInput));
        searchSuggestions.addEventListener("click", (event) => {
            const button = event.target.closest("[data-search-suggestion]");
            if (!button) {
                return;
            }

            const value = button.dataset.searchSuggestion || button.textContent.trim();
            const type = button.dataset.searchType || "keyword";
            activeSearchInput.value = value;
            rememberSearch(value, type);
            goToSearch(value, type);
        });

        document.querySelectorAll(".home-search, .home-header-search").forEach((form) => {
            form.addEventListener("submit", () => {
                const field = form.querySelector('input[name="keyword"], input[type="search"]');
                const value = normalizeSearchValue(field?.value);
                if (value) {
                    rememberSearch(value, "keyword");
                }
            });
        });

        document.addEventListener("click", (event) => {
            if (!searchWrap.contains(event.target)
                    && !searchSuggestions.contains(event.target)
                    && !headerSearchForm?.contains(event.target)) {
                hide();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                hide();
                activeSearchInput.blur();
            }
        });

        window.addEventListener("resize", () => {
            if (!searchSuggestions.hidden) {
                positionSearchSuggestions(activeSearchInput);
            }
        });
        window.addEventListener("scroll", () => {
            if (!searchSuggestions.hidden) {
                positionSearchSuggestions(activeSearchInput);
            }
        }, { passive: true });

        renderRecentSearches();
    }

    function positionSearchSuggestions(input) {
        if (input !== headerSearchInput || !headerSearchForm) {
            resetSearchSuggestionsPosition();
            return;
        }

        const rect = headerSearchForm.getBoundingClientRect();
        searchSuggestions.classList.add("is-header-panel");
        searchSuggestions.style.top = `${rect.bottom + 8}px`;
        searchSuggestions.style.left = `${rect.left}px`;
        searchSuggestions.style.right = "auto";
        searchSuggestions.style.width = `${rect.width}px`;
    }

    function resetSearchSuggestionsPosition() {
        searchSuggestions.classList.remove("is-header-panel");
        searchSuggestions.style.removeProperty("top");
        searchSuggestions.style.removeProperty("left");
        searchSuggestions.style.removeProperty("right");
        searchSuggestions.style.removeProperty("width");
    }

    function bindPropertyTabs() {
        if (!propertyTabs) {
            return;
        }

        propertyTabs.addEventListener("click", (event) => {
            const chip = event.target.closest("[data-property-area]");
            if (!chip) {
                return;
            }

            const area = normalizeSearchValue(chip.dataset.propertyArea);
            if (!area || area === selectedArea) {
                return;
            }

            propertyTabs.querySelectorAll("[data-property-area]").forEach((item) => {
                item.classList.toggle("selected", item === chip);
            });
            chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            rememberSearch(area, "location");
            loadFeaturedRooms(area);
        });

        propertyTabsNext?.addEventListener("click", () => {
            const atEnd = propertyTabs.scrollLeft + propertyTabs.clientWidth >= propertyTabs.scrollWidth - 12;
            propertyTabs.scrollBy({
                left: atEnd ? -propertyTabs.scrollWidth : Math.round(propertyTabs.clientWidth * 0.75),
                behavior: "smooth"
            });
        });

        propertyTabsPrev?.addEventListener("click", () => {
            const atStart = propertyTabs.scrollLeft <= 12;
            propertyTabs.scrollBy({
                left: atStart ? propertyTabs.scrollWidth : -Math.round(propertyTabs.clientWidth * 0.75),
                behavior: "smooth"
            });
        });
    }

    function syncSelectedPropertyTab() {
        if (!propertyTabs) {
            return;
        }

        propertyTabs.querySelectorAll("[data-property-area]").forEach((item) => {
            if (item.dataset.propertyArea === selectedArea) {
                item.classList.add("selected");
            } else {
                item.classList.remove("selected");
            }
        });
    }

    function goToSearch(value, type = "keyword") {
        const searchValue = normalizeSearchValue(value);
        if (!searchValue) {
            return;
        }

        const params = new URLSearchParams();
        params.set(type === "location" ? "location" : "keyword", searchValue);
        window.location.href = `rooms.html?${params.toString()}`;
    }

    function renderRecentSearches() {
        if (!recentSearchesContainer) {
            return;
        }

        const searches = readRecentSearches();
        if (!searches.length) {
            recentSearchesContainer.innerHTML = `<span class="suggestion-empty">Chưa có tìm kiếm gần đây.</span>`;
            return;
        }

        recentSearchesContainer.innerHTML = searches.map((item) => `
            <button type="button" data-search-suggestion="${escapeAttribute(item.value)}" data-search-type="${escapeAttribute(item.type)}">
                <span class="suggestion-icon" aria-hidden="true">&#8635;</span>${escapeHtml(item.value)}
            </button>
        `).join("");
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
            return;
        }

        renderRecentSearches();
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

    function hasDataValue(container, key, value) {
        return Array.from(container.querySelectorAll(`[data-${dataAttributeName(key)}]`))
                .some((item) => item.dataset[key] === value);
    }

    function dataAttributeName(key) {
        return String(key).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    }

    hydrateHanoiAreas();
    bindFavoriteButtons();
    bindPropertyGallery();
    bindPopularAreaCarousel();
    bindSearchSuggestions();
    bindPropertyTabs();
    syncSelectedPropertyTab();
    loadPopularAreaCounts();
    loadFeaturedRooms(selectedArea);
})();
