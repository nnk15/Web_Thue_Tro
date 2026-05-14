(() => {
    const main = document.querySelector("main");
    const fallbackImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85";

    if (!main) {
        return;
    }

    async function loadRoom() {
        showLoading();
        try {
            const roomId = new URLSearchParams(window.location.search).get("id");
            const room = roomId ? await publicJson(`/api/rooms/${roomId}`) : await firstRoom();
            renderRoom(room);
            await syncFavoriteButton(room.id);
            bindActions(room);
            bindGallery();
        } catch (error) {
            main.innerHTML = `
                <section class="room-detail-page">
                    <div class="detail-container">
                        <div class="empty-state">${escapeHtml(error.message)}</div>
                    </div>
                </section>
            `;
        }
    }

    async function firstRoom() {
        const data = await publicJson("/api/rooms?status=AVAILABLE&page=0&size=1");
        const room = data.rooms?.[0];
        if (!room) {
            throw new Error("Chưa có phòng trọ công khai để hiển thị.");
        }
        return room;
    }

    async function publicJson(path) {
        const headers = {};
        const jwt = window.NhaTroAuth?.token?.();
        if (jwt) {
            headers.Authorization = `Bearer ${jwt}`;
        }
        const response = await fetch(path, { headers });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Không tải được dữ liệu phòng trọ");
        }
        return data;
    }

    function showLoading() {
        main.innerHTML = `
            <section class="room-detail-page">
                <div class="detail-container">
                    <div class="empty-state">Đang tải chi tiết phòng trọ...</div>
                </div>
            </section>
        `;
    }

    function renderRoom(room) {
        const status = room.status === "AVAILABLE" ? "Còn trống" : room.status === "HIDDEN" ? "Đang ẩn" : "Đã thuê";
        const statusClass = room.status === "AVAILABLE" ? "badge-available" : "badge-rented";
        const images = room.imageUrls?.length ? room.imageUrls : [fallbackImage];
        const galleryImages = normalizeGalleryImages(images);
        const videos = room.videoUrls || [];
        const amenities = splitText(room.amenities, ["Wifi", "An ninh 24/7", "Giữ xe"]);
        const rules = splitText(room.rules, ["Liên hệ chủ trọ để cập nhật nội quy chi tiết."]);
        const district = districtFromAddress(room.address);
        const contactPhone = room.landlordPhone || "";
        const user = window.NhaTroAuth?.currentUser?.();
        const rating = Number(room.averageRating || 0);
        const reviewCount = Number(room.reviewCount || 0);

        document.title = `${room.title} | One Room One Love`;

        main.innerHTML = `
            <section class="room-detail-page">
                <div class="detail-container detail-shell">
                    <div class="detail-main-column">
                        <nav class="detail-breadcrumb" aria-label="Vị trí">
                            <a href="rooms.html?location=Hà%20Nội">Hà Nội</a>
                            <span>/</span>
                            <a href="rooms.html?location=${encodeURIComponent(district)}">${escapeHtml(district)}</a>
                            <span>/</span>
                            <span>${escapeHtml(room.title)}</span>
                        </nav>

                        <section class="detail-gallery-card" aria-label="Ảnh phòng trọ">
                            <div class="detail-gallery-main">
                                <img src="${escapeAttribute(galleryImages[0])}" alt="${escapeAttribute(room.title)}" data-gallery-main>
                                <button class="detail-gallery-arrow detail-gallery-prev" type="button" aria-label="Ảnh trước" data-gallery-prev>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
                                </button>
                                <button class="detail-gallery-arrow detail-gallery-next" type="button" aria-label="Ảnh tiếp theo" data-gallery-next>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                                </button>
                                <div class="detail-gallery-dots" data-gallery-dots>
                                    ${galleryImages.map((_, index) => `<span class="${index === 0 ? "active" : ""}"></span>`).join("")}
                                </div>
                            </div>

                            <div class="detail-gallery-side">
                                ${sideGallery(galleryImages, videos, room.title, images.length)}
                            </div>
                        </section>

                        <section class="detail-summary-card">
                            <div class="detail-tool-row">
                                <a class="detail-tool-btn" href="#photos">
                                    ${icon("camera")}
                                    Photos
                                </a>
                                <a class="detail-tool-btn" href="#videos">
                                    ${icon("play")}
                                    Videos
                                </a>
                                <a class="detail-tool-btn" href="#map">
                                    ${icon("map")}
                                    Map View
                                </a>
                                <div class="detail-summary-rating">
                                    ${ratingHtml(rating, reviewCount)}
                                </div>
                            </div>

                            <div class="detail-title-row">
                                <div>
                                    <span class="badge ${statusClass}">${status}</span>
                                    <h1>${escapeHtml(room.title)}</h1>
                                    <p>${escapeHtml(room.address)}</p>
                                </div>
                                <div class="detail-price-box">
                                    <span>Giá từ</span>
                                    <strong>${formatMoney(room.price)}</strong>
                                    <small>/ tháng</small>
                                </div>
                            </div>

                            <div class="detail-location-row">
                                <div class="detail-location-icon">${icon("pin")}</div>
                                <div>
                                    <strong>${escapeHtml(distanceText(district))}</strong>
                                    <span>${transportText(room.area)}</span>
                                </div>
                                <a href="#map">Xem bản đồ</a>
                            </div>

                            <div class="detail-chip-row">
                                ${detailChips(room, amenities)}
                            </div>
                        </section>

                        <section class="detail-info-grid">
                            <article class="detail-block" id="overview">
                                <h2>Thông tin phòng</h2>
                                <div class="detail-stats">
                                    <div class="stat-box"><span>Giá thuê</span><strong>${formatMoney(room.price)}</strong></div>
                                    <div class="stat-box"><span>Tiền cọc</span><strong>${formatMoney(room.deposit)}</strong></div>
                                    <div class="stat-box"><span>Diện tích</span><strong>${formatArea(room.area)}</strong></div>
                                    <div class="stat-box"><span>Nội thất</span><strong>${escapeHtml(room.furnitureType || "Đang cập nhật")}</strong></div>
                                </div>
                            </article>

                            <article class="detail-block">
                                <h2>Người cho thuê</h2>
                                <div class="landlord-card">
                                    <img class="avatar" src="assets/img/logo.png" alt="Logo người cho thuê">
                                    <div>
                                        <strong>${escapeHtml(room.landlordName || "Chủ trọ")}</strong>
                                        <p>${contactPhone ? `SĐT: ${escapeHtml(contactPhone)}` : "Chủ nhà đã xác minh"}</p>
                                    </div>
                                </div>
                            </article>
                        </section>

                        <section class="detail-block">
                            <h2>Mô tả</h2>
                            <p>${escapeHtml(room.description || "Chủ trọ chưa cập nhật mô tả chi tiết cho phòng này.")}</p>
                        </section>

                        <section class="detail-block">
                            <h2>Tiện ích</h2>
                            <div class="amenities detail-amenities">
                                ${amenities.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
                            </div>
                        </section>

                        <section class="detail-block">
                            <h2>Nội quy</h2>
                            <ul class="feature-list">
                                ${rules.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                            </ul>
                        </section>

                        <section class="detail-block" id="videos">
                            <h2>Video phòng</h2>
                            ${videoBlock(videos)}
                        </section>

                        <section class="detail-block" id="map">
                            <h2>Bản đồ vị trí</h2>
                            <div class="map-frame">
                                <iframe src="${mapUrl(room)}" loading="lazy" title="Bản đồ phòng trọ"></iframe>
                            </div>
                        </section>
                    </div>

                    <aside class="detail-side-column">
                        <section class="detail-action-card">
                            <div class="detail-action-head">
                                <h2>${escapeHtml(room.title)}</h2>
                                <div>
                                    <button class="detail-icon-btn" type="button" data-favorite-room="${room.id}" aria-label="Lưu yêu thích">
                                        ${favoriteIcon(false)}
                                    </button>
                                    <button class="detail-icon-btn" type="button" data-share-room aria-label="Chia sẻ phòng">
                                        ${icon("share")}
                                    </button>
                                </div>
                            </div>
                            <button class="detail-primary-action" type="button" data-open-rental-form>Gửi yêu cầu thuê</button>
                            <button class="detail-secondary-action" type="button" data-open-appointment-form>Đặt lịch xem phòng</button>
                            <a class="detail-contact-action" href="${contactPhone ? `tel:${escapeAttribute(contactPhone)}` : "#overview"}">Liên hệ người cho thuê</a>
                            <div class="detail-shortlist-note">
                                ${icon("heartFill")}
                                <span>${reviewCount + 24} người đã quan tâm phòng này trong 30 ngày qua</span>
                            </div>
                        </section>

                        <section class="detail-support-card" id="detail-support">
                            ${supportItem("calendar", "Đặt lịch nhanh", "Gửi lịch xem phòng và theo dõi trạng thái ngay trong tài khoản.")}
                            ${supportItem("price", "Giá minh bạch", "Giá thuê, tiền cọc và diện tích được hiển thị rõ ràng từ dữ liệu tin đăng.")}
                            ${supportItem("shield", "Phòng đã kiểm duyệt", "Tin đăng được kiểm duyệt trước khi hiển thị công khai.")}
                            ${supportItem("support", "Hỗ trợ cá nhân 24/7", "Liên hệ chủ trọ hoặc theo dõi thông báo khi yêu cầu được xử lý.")}
                            ${supportItem("star", `${reviewCount || "Chưa có"} đánh giá`, "Điểm sao lấy trực tiếp từ dữ liệu đánh giá phòng.")}
                        </section>
                    </aside>
                </div>

                <section class="detail-request-modal" data-rental-modal hidden>
                    <div class="detail-request-card" role="dialog" aria-modal="true" aria-labelledby="rental-form-title">
                        <div class="modal-head">
                            <div>
                                <h2 id="rental-form-title">Gửi yêu cầu thuê</h2>
                                <p>${escapeHtml(room.title)}</p>
                            </div>
                            <button class="modal-close" type="button" data-close-rental-form aria-label="Đóng">&times;</button>
                        </div>
                        <form class="form-grid detail-rental-form" data-rental-form>
                            <input type="hidden" name="roomId" value="${room.id}">
                            <div class="form-message" data-rental-message></div>
                            <label class="form-field">
                                <span>Họ tên</span>
                                <input name="fullName" value="${escapeAttribute(user?.fullName || "")}" required>
                            </label>
                            <label class="form-field">
                                <span>Số điện thoại</span>
                                <input name="phone" value="${escapeAttribute(user?.phone || "")}" required>
                            </label>
                            <label class="form-field">
                                <span>CCCD</span>
                                <input name="citizenId" placeholder="012345678901" required>
                            </label>
                            <label class="form-field">
                                <span>Ngày sinh</span>
                                <input name="dateOfBirth" type="date">
                            </label>
                            <label class="form-field full">
                                <span>Địa chỉ thường trú</span>
                                <input name="permanentAddress" placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành">
                            </label>
                            <label class="form-field full">
                                <span>Thời gian muốn thuê</span>
                                <input name="expectedRentalTime" placeholder="Ví dụ: Từ 01/06/2026, thuê tối thiểu 6 tháng" required>
                            </label>
                            <label class="form-field full">
                                <span>Ghi chú</span>
                                <textarea name="note" rows="3" placeholder="Nhu cầu thêm về hợp đồng, giờ nhận phòng..."></textarea>
                            </label>
                            <div class="modal-actions">
                                <button class="btn btn-outline" type="button" data-close-rental-form>Hủy</button>
                                <button class="btn btn-primary" type="submit">Gửi yêu cầu</button>
                            </div>
                        </form>
                    </div>
                </section>

                <section class="detail-request-modal" data-appointment-modal hidden>
                    <div class="detail-request-card" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title">
                        <div class="modal-head">
                            <div>
                                <h2 id="appointment-form-title">Đặt lịch xem phòng</h2>
                                <p>${escapeHtml(room.title)}</p>
                            </div>
                            <button class="modal-close" type="button" data-close-appointment-form aria-label="Đóng">&times;</button>
                        </div>
                        <form class="form-grid detail-appointment-form" data-appointment-form>
                            <input type="hidden" name="roomId" value="${room.id}">
                            <div class="form-message" data-appointment-message></div>
                            <label class="form-field">
                                <span>Họ tên</span>
                                <input name="fullName" value="${escapeAttribute(user?.fullName || "")}" required>
                            </label>
                            <label class="form-field">
                                <span>Số điện thoại</span>
                                <input name="phone" value="${escapeAttribute(user?.phone || "")}" required>
                            </label>
                            <label class="form-field full">
                                <span>Thời gian xem phòng</span>
                                <input name="appointmentTime" type="datetime-local" min="${minDateTimeLocal()}" required>
                            </label>
                            <label class="form-field full">
                                <span>Ghi chú</span>
                                <textarea name="note" rows="3" placeholder="Ví dụ: Tôi muốn xem phòng vào buổi chiều, cần chủ trọ gọi trước..."></textarea>
                            </label>
                            <div class="modal-actions">
                                <button class="btn btn-outline" type="button" data-close-appointment-form>Hủy</button>
                                <button class="btn btn-primary" type="submit">Gửi lịch xem</button>
                            </div>
                        </form>
                    </div>
                </section>
            </section>
        `;
    }

    function bindActions(room) {
        const favoriteButton = document.querySelector("[data-favorite-room]");
        favoriteButton?.addEventListener("click", async () => {
            const auth = window.NhaTroAuth;
            const user = auth?.currentUser?.();
            if (!auth?.token?.() || user?.role !== "USER") {
                window.location.href = `login.html?next=${encodeURIComponent(`room-detail.html?id=${room.id}`)}`;
                return;
            }

            favoriteButton.disabled = true;
            try {
                const isFavorite = favoriteButton.classList.contains("is-active");
                if (isFavorite) {
                    await auth.api(`/api/favorite-rooms/${room.id}`, { method: "DELETE" });
                    setFavoriteButtonState(favoriteButton, false);
                } else {
                    await auth.api(`/api/favorite-rooms/${room.id}`, { method: "POST" });
                    setFavoriteButtonState(favoriteButton, true);
                }
            } catch (error) {
                alert(error.message);
            } finally {
                favoriteButton.disabled = false;
            }
        });

        document.querySelector("[data-share-room]")?.addEventListener("click", async () => {
            const url = window.location.href;
            if (navigator.share) {
                await navigator.share({ title: room.title, url });
                return;
            }
            await navigator.clipboard?.writeText(url);
            alert("Đã sao chép liên kết phòng.");
        });

        const modal = document.querySelector("[data-rental-modal]");
        const form = document.querySelector("[data-rental-form]");
        const openButton = document.querySelector("[data-open-rental-form]");
        const closeButtons = document.querySelectorAll("[data-close-rental-form]");
        const appointmentModal = document.querySelector("[data-appointment-modal]");
        const appointmentForm = document.querySelector("[data-appointment-form]");
        const openAppointmentButton = document.querySelector("[data-open-appointment-form]");
        const closeAppointmentButtons = document.querySelectorAll("[data-close-appointment-form]");

        openButton?.addEventListener("click", () => {
            const auth = window.NhaTroAuth;
            const user = auth?.currentUser?.();
            if (!auth?.token?.() || user?.role !== "USER") {
                window.location.href = `login.html?next=${encodeURIComponent(`room-detail.html?id=${room.id}`)}`;
                return;
            }
            modal.hidden = false;
            document.body.classList.add("modal-open");
            form?.elements.fullName?.focus();
        });

        openAppointmentButton?.addEventListener("click", () => {
            const auth = window.NhaTroAuth;
            const user = auth?.currentUser?.();
            if (!auth?.token?.() || user?.role !== "USER") {
                window.location.href = `login.html?next=${encodeURIComponent(`room-detail.html?id=${room.id}`)}`;
                return;
            }
            appointmentModal.hidden = false;
            document.body.classList.add("modal-open");
            appointmentForm?.elements.fullName?.focus();
        });

        closeButtons.forEach((button) => {
            button.addEventListener("click", () => closeRentalModal());
        });

        closeAppointmentButtons.forEach((button) => {
            button.addEventListener("click", () => closeAppointmentModal());
        });

        modal?.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeRentalModal();
            }
        });

        appointmentModal?.addEventListener("click", (event) => {
            if (event.target === appointmentModal) {
                closeAppointmentModal();
            }
        });

        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = form.querySelector("button[type='submit']");
            submitButton.disabled = true;
            showRentalMessage("info", "Đang gửi yêu cầu thuê...");

            try {
                await window.NhaTroAuth.api("/api/rental-requests", {
                    method: "POST",
                    body: JSON.stringify(rentalPayload(form))
                });
                showRentalMessage("success", "Đã gửi yêu cầu thuê. Trạng thái hiện tại là chờ xác nhận.");
                setTimeout(() => {
                    window.location.href = "profile-requests.html";
                }, 900);
            } catch (error) {
                showRentalMessage("error", error.message);
            } finally {
                submitButton.disabled = false;
            }
        });

        appointmentForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = appointmentForm.querySelector("button[type='submit']");
            submitButton.disabled = true;
            showAppointmentMessage("info", "Đang gửi lịch xem phòng...");

            try {
                await window.NhaTroAuth.api("/api/viewing-appointments", {
                    method: "POST",
                    body: JSON.stringify(appointmentPayload(appointmentForm))
                });
                showAppointmentMessage("success", "Đã gửi lịch xem phòng. Trạng thái hiện tại là chờ xác nhận.");
                setTimeout(() => {
                    window.location.href = "profile-requests.html#appointments";
                }, 900);
            } catch (error) {
                showAppointmentMessage("error", error.message);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    function closeRentalModal() {
        const modal = document.querySelector("[data-rental-modal]");
        if (modal) {
            modal.hidden = true;
        }
        document.body.classList.remove("modal-open");
    }

    function closeAppointmentModal() {
        const modal = document.querySelector("[data-appointment-modal]");
        if (modal) {
            modal.hidden = true;
        }
        document.body.classList.remove("modal-open");
    }

    function rentalPayload(form) {
        const data = new FormData(form);
        return {
            roomId: Number(data.get("roomId")),
            fullName: String(data.get("fullName") || "").trim(),
            phone: String(data.get("phone") || "").trim(),
            citizenId: String(data.get("citizenId") || "").trim(),
            dateOfBirth: data.get("dateOfBirth") || null,
            permanentAddress: String(data.get("permanentAddress") || "").trim(),
            expectedRentalTime: String(data.get("expectedRentalTime") || "").trim(),
            note: String(data.get("note") || "").trim()
        };
    }

    function appointmentPayload(form) {
        const data = new FormData(form);
        return {
            roomId: Number(data.get("roomId")),
            fullName: String(data.get("fullName") || "").trim(),
            phone: String(data.get("phone") || "").trim(),
            appointmentTime: String(data.get("appointmentTime") || "").trim(),
            note: String(data.get("note") || "").trim()
        };
    }

    function showRentalMessage(type, message) {
        const box = document.querySelector("[data-rental-message]");
        if (!box) {
            return;
        }
        box.className = `form-message ${type}`;
        box.textContent = message;
    }

    function showAppointmentMessage(type, message) {
        const box = document.querySelector("[data-appointment-message]");
        if (!box) {
            return;
        }
        box.className = `form-message ${type}`;
        box.textContent = message;
    }

    function bindGallery() {
        const gallery = document.querySelector(".detail-gallery-card");
        const mainImage = gallery?.querySelector("[data-gallery-main]");
        const imageButtons = gallery?.querySelectorAll("[data-gallery-image]");
        const dots = gallery?.querySelectorAll("[data-gallery-dots] span");
        if (!gallery || !mainImage || !imageButtons?.length) {
            return;
        }

        const images = [mainImage.src, ...Array.from(imageButtons).map((button) => button.dataset.galleryImage)];
        let index = 0;
        const setImage = (nextIndex) => {
            index = (nextIndex + images.length) % images.length;
            mainImage.src = images[index];
            imageButtons.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex + 1 === index));
            dots?.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === index));
        };

        imageButtons.forEach((button, buttonIndex) => {
            button.addEventListener("click", () => setImage(buttonIndex + 1));
        });
        gallery.querySelector("[data-gallery-prev]")?.addEventListener("click", () => setImage(index - 1));
        gallery.querySelector("[data-gallery-next]")?.addEventListener("click", () => setImage(index + 1));
    }

    async function syncFavoriteButton(roomId) {
        const button = document.querySelector("[data-favorite-room]");
        const auth = window.NhaTroAuth;
        const user = auth?.currentUser?.();
        if (!button || !auth?.token?.() || user?.role !== "USER") {
            return;
        }

        try {
            const favorites = await auth.api("/api/favorite-rooms");
            const isFavorite = (favorites || []).some((room) => Number(room.id) === Number(roomId));
            setFavoriteButtonState(button, isFavorite);
        } catch {
            setFavoriteButtonState(button, false);
        }
    }

    function setFavoriteButtonState(button, isFavorite) {
        button.innerHTML = favoriteIcon(isFavorite);
        button.classList.toggle("is-active", isFavorite);
        button.setAttribute("aria-label", isFavorite ? "Bỏ lưu yêu thích" : "Lưu yêu thích");
    }

    function normalizeGalleryImages(images) {
        const normalized = images.slice(0, 4);
        while (normalized.length < 4) {
            normalized.push(images[normalized.length % images.length] || fallbackImage);
        }
        return normalized;
    }

    function sideGallery(images, videos, title, originalCount) {
        const firstVideo = videos[0];
        return images.slice(1, 4).map((image, index) => {
            const imageIndex = index + 1;
            if (index === 1 && firstVideo) {
                return `
                    <button class="detail-side-thumb video-thumb" type="button" data-gallery-image="${escapeAttribute(image)}">
                        <img src="${escapeAttribute(image)}" alt="${escapeAttribute(`${title} video`)}">
                        <span>${icon("play")}</span>
                    </button>
                `;
            }
            const extraCount = Math.max(originalCount - 4, 0);
            return `
                <button class="detail-side-thumb" type="button" data-gallery-image="${escapeAttribute(image)}">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(`${title} ${imageIndex + 1}`)}">
                    ${index === 2 && extraCount ? `<strong>+${extraCount}</strong>` : ""}
                </button>
            `;
        }).join("");
    }

    function ratingHtml(rating, reviewCount) {
        const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
        return `
            <span>${rating ? rating.toFixed(1) : "0.0"}</span>
            <span class="rating-stars" style="--rating-percent: ${percent}%">★★★★★</span>
            <a href="#overview">(${reviewCount || 0})</a>
        `;
    }

    function detailChips(room, amenities) {
        const chips = [
            `${districtFromAddress(room.address)}`,
            `${formatArea(room.area)}`,
            room.furnitureType || "Nội thất đang cập nhật",
            "Wifi",
            "An ninh 24/7",
            ...amenities.slice(0, 4)
        ];
        return [...new Set(chips.filter(Boolean))]
                .slice(0, 9)
                .map((item, index) => `<span>${chipIcon(index)}${escapeHtml(item)}</span>`)
                .join("");
    }

    function videoBlock(videos) {
        if (!videos.length) {
            return `<div class="video-box">Chủ trọ chưa cập nhật video cho phòng này.</div>`;
        }
        return `<video class="room-video" controls src="${escapeAttribute(videos[0])}"></video>`;
    }

    function supportItem(iconName, title, content) {
        return `
            <details>
                <summary>
                    ${icon(iconName)}
                    <span>${escapeHtml(title)}</span>
                    ${icon("chevron")}
                </summary>
                <p>${escapeHtml(content)}</p>
            </details>
        `;
    }

    function mapUrl(room) {
        const query = room.latitude && room.longitude
                ? `${room.latitude},${room.longitude}`
                : room.address || "Hà Nội";
        return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
    }

    function tenantActionUrl(roomId, sectionId) {
        const routes = {
            favorites: "profile-favorites.html",
            requests: "profile-requests.html",
            appointments: "profile-requests.html#appointments",
            notifications: "profile-notifications.html"
        };
        const next = routes[sectionId] || `room-detail.html?id=${roomId}`;
        const auth = window.NhaTroAuth;
        const user = auth?.currentUser?.();
        return auth?.token?.() && user?.role === "USER"
                ? next
                : `login.html?next=${encodeURIComponent(next)}`;
    }

    function districtFromAddress(address) {
        const parts = String(address || "Hà Nội")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
        return parts.length >= 2 ? parts[parts.length - 2] : "Hà Nội";
    }

    function distanceText(district) {
        return `Gần trung tâm ${district}`;
    }

    function transportText(area) {
        const minutes = Math.max(8, Math.round(Number(area || 20)));
        return `Xe máy ${Math.min(minutes, 25)}m · Đi bộ ${Math.min(minutes + 18, 55)}m`;
    }

    function minDateTimeLocal() {
        const date = new Date(Date.now() + 60 * 60 * 1000);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    }

    function splitText(value, fallback = ["Đang cập nhật"]) {
        if (!value) {
            return fallback;
        }
        return String(value)
                .split(/[,;\n]/)
                .map((item) => item.trim())
                .filter(Boolean);
    }

    function formatMoney(value) {
        return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
    }

    function formatArea(value) {
        return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m2`;
    }

    function favoriteIcon(isFavorite) {
        return isFavorite ? icon("heartFill") : icon("heart");
    }

    function chipIcon(index) {
        const names = ["school", "calendar", "parking", "bill", "wifi", "shield"];
        return icon(names[index % names.length]);
    }

    function icon(name) {
        const icons = {
            bill: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>`,
            calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4M16 2v4M3 10h18"/><path d="M5 5h14v16H5z"/></svg>`,
            camera: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/></svg>`,
            chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
            heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
            heartFill: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>`,
            map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/></svg>`,
            parking: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21V3h7a5 5 0 0 1 0 10H7"/><path d="M7 13h7"/></svg>`,
            pin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-5.2 7-12a7 7 0 1 0-14 0c0 6.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
            play: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/></svg>`,
            price: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6"/></svg>`,
            school: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>`,
            share: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8h16v-8"/><path d="M12 16V3"/><path d="m7 8 5-5 5 5"/></svg>`,
            shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>`,
            star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 3 6 6 .9-4.5 4.4 1.1 6.2L12 16.5 6.4 19.5l1.1-6.2L3 8.9 9 8l3-6Z"/></svg>`,
            support: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0v4a3 3 0 0 1-3 3h-2"/><path d="M6 13v5M18 13v5"/></svg>`,
            wifi: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><path d="M12 19h.01"/></svg>`
        };
        return icons[name] || "";
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

    loadRoom();
})();
