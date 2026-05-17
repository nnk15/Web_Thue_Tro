(() => {
    const main = document.querySelector("main");
    const DETAIL_GEOCODE_CACHE_KEY = "nhatro.detailGeocodeCache.v1";
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
            await initDetailMap(room);
            loadRelatedRooms(room);
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
        const images = room.imageUrls?.length ? room.imageUrls : [fallbackImage];
        const galleryImages = normalizeGalleryImages(images);
        const videos = room.videoUrls || [];
        const amenities = splitText(room.amenities, ["Đang cập nhật"]).filter((item) => !isDeprecatedAmenity(item));
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
                                    Ảnh
                                </a>
                                <a class="detail-tool-btn" href="#videos">
                                    ${icon("play")}
                                    Video
                                </a>
                                <a class="detail-tool-btn" href="#map">
                                    ${icon("map")}
                                    Bản đồ
                                </a>
                                <div class="detail-summary-rating">
                                    ${ratingHtml(rating, reviewCount)}
                                </div>
                            </div>

                            <div class="detail-title-row">
                                <div>
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
                                ${amenities.map((item) => amenityChip(item)).join("")}
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

                        <section class="detail-block detail-map-section" id="map">
                            <h2>Bản đồ vị trí</h2>
                            <div class="map-frame interactive-map-frame">
                                <div id="detailMap" class="interactive-map" aria-label="Bản đồ vị trí phòng trọ"></div>
                                <iframe src="${mapUrl(room)}" loading="lazy" title="Bản đồ phòng trọ"></iframe>
                            </div>
                            <aside class="detail-map-info">
                                <h3>${escapeHtml(district)}</h3>
                                <dl>
                                    <div>
                                        <dt>Địa chỉ phòng</dt>
                                        <dd>${escapeHtml(room.address)}</dd>
                                    </div>
                                    <div>
                                        <dt>Tọa độ vị trí</dt>
                                        <dd data-map-coordinate>${formatCoordinate(room.latitude)}, ${formatCoordinate(room.longitude)}</dd>
                                    </div>
                                    <div>
                                        <dt>Khu vực xung quanh</dt>
                                        <dd>${escapeHtml(nearbyAreaText(room, district))}</dd>
                                    </div>
                                </dl>
                                <div class="map-nearby-tags">
                                    ${nearbyTags(room, district).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
                                </div>
                                <div class="distance-tool">
                                    <strong>Xem khoảng cách</strong>
                                    <label>
                                        <span>Từ</span>
                                        <select data-distance-origin>
                                            ${distanceOrigins().map((item) => `<option value="${escapeAttribute(item.key)}">${escapeHtml(item.label)}</option>`).join("")}
                                        </select>
                                    </label>
                                    <label>
                                        <span>Hoặc nhập tọa độ</span>
                                        <input data-distance-custom placeholder="Ví dụ: 21.0379,105.7824">
                                    </label>
                                    <p data-distance-result>Chọn điểm bắt đầu để tính khoảng cách đến phòng.</p>
                                    <div class="distance-actions">
                                        <button type="button" data-calculate-distance>Tính khoảng cách</button>
                                        <a href="${escapeAttribute(mapDirectionsUrl(room))}" target="_blank" rel="noopener" data-map-route>Mở chỉ đường</a>
                                    </div>
                                </div>
                            </aside>
                        </section>

                        <section class="detail-block detail-related-section" data-related-section hidden>
                            <div class="detail-related-head">
                                <div>
                                    <h2>Phòng trọ liên quan</h2>
                                    <p>Các phòng cùng khu vực hoặc có mức giá tương tự để bạn so sánh nhanh.</p>
                                </div>
                                <a href="rooms.html?location=${encodeURIComponent(district)}">Xem tất cả</a>
                            </div>
                            <div class="detail-related-grid" data-related-rooms></div>
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
                            <button class="detail-secondary-action detail-report-action" type="button" data-open-report-form>Báo cáo vi phạm</button>
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

                <section class="detail-request-modal booking-flow-modal" data-rental-modal hidden>
                    <div class="detail-request-card booking-flow-card" role="dialog" aria-modal="true" aria-labelledby="rental-form-title">
                        <div class="booking-flow-header">
                            <div>
                                <h2 id="rental-form-title" data-rental-heading>Cảm ơn ${escapeHtml(user?.fullName || "bạn")}, hãy giữ chỗ phòng này.</h2>
                                <p data-rental-subtitle>Điền thông tin để gửi yêu cầu thuê phòng nhanh hơn.</p>
                            </div>
                            <button class="modal-close" type="button" data-close-rental-form aria-label="Đóng">&times;</button>
                        </div>
                        <div class="booking-stepper" data-rental-stepper>
                            <span class="active" data-step="details">
                                <strong>1</strong>
                                <small>Bước 1</small>
                                <b>Thông tin đặt thuê</b>
                            </span>
                            <i></i>
                            <span data-step="payment">
                                <strong>2</strong>
                                <small>Bước 2</small>
                                <b>Thanh toán</b>
                            </span>
                            <i></i>
                            <span data-step="confirmation">
                                <strong>3</strong>
                                <small>Bước 3</small>
                                <b>Xác nhận</b>
                            </span>
                        </div>
                        <form class="booking-flow-form" data-rental-form>
                            <input type="hidden" name="roomId" value="${room.id}">
                            <div class="form-message" data-rental-message></div>

                            <section class="booking-page-card" data-booking-page="personal">
                                <h3>Thông tin cá nhân</h3>
                                <div class="booking-field-grid">
                                    <label class="booking-field wide">
                                        <span>Họ và tên</span>
                                        <input name="fullName" value="${escapeAttribute(user?.fullName || "")}" required>
                                    </label>
                                    <label class="booking-field">
                                        <span>CCCD</span>
                                        <input name="citizenId" value="${escapeAttribute(user?.citizenId || "")}" placeholder="012345678901" required>
                                    </label>
                                    <label class="booking-field">
                                        <span>Số điện thoại</span>
                                        <input name="phone" value="${escapeAttribute(user?.phone || "")}" required>
                                    </label>
                                    <label class="booking-field wide">
                                        <span>Email</span>
                                        <input name="email" type="email" value="${escapeAttribute(user?.email || "")}" required>
                                    </label>
                                </div>
                                <div class="modal-actions">
                                    <button class="btn btn-outline" type="button" data-close-rental-form>Hủy</button>
                                    <button class="btn btn-primary booking-primary" type="button" data-booking-next="accommodation">Tiếp tục</button>
                                </div>
                            </section>

                            <section class="booking-page-card" data-booking-page="accommodation" hidden>
                                <h3>Thông tin phòng thuê</h3>
                                <div class="booking-field-grid">
                                    <label class="booking-field">
                                        <span>Loại phòng</span>
                                        <input name="roomType" value="${escapeAttribute(room.furnitureType || room.title)}" required>
                                    </label>
                                    <label class="booking-field">
                                        <span>Thời hạn thuê</span>
                                        <input name="stayDuration" value="6 tháng" placeholder="Ví dụ: 6 tháng, 12 tháng" required>
                                    </label>
                                    <label class="booking-field wide">
                                        <span>Ngày nhận phòng | Ngày trả phòng</span>
                                        <input name="moveInOut" placeholder="Ví dụ: Nhận 01/06/2026 | Trả 01/12/2026" required>
                                    </label>
                                </div>
                                <div class="booking-room-summary">
                                    <div><span>Tên phòng</span><strong>${escapeHtml(room.title)}</strong></div>
                                    <div><span>Địa chỉ</span><strong>${escapeHtml(room.address)}</strong></div>
                                    <div><span>Diện tích</span><strong>${formatArea(room.area)}</strong></div>
                                    <div class="highlight"><span>Giá thuê</span><strong>${formatMoney(room.price)}/tháng</strong></div>
                                    <div class="highlight"><span>Tiền cọc</span><strong>${formatMoney(room.deposit)}</strong></div>
                                    <div><span>Chủ trọ</span><strong>${escapeHtml(room.landlordName || "Chủ trọ")}</strong></div>
                                    <div><span>CCCD chủ trọ</span><strong>${escapeHtml(room.landlordCitizenId || "Chưa cập nhật")}</strong></div>
                                </div>
                                <div class="modal-actions">
                                    <button class="btn btn-outline" type="button" data-booking-prev="personal">Quay lại</button>
                                    <button class="btn btn-primary booking-primary" type="button" data-booking-next="application">Tiếp tục</button>
                                </div>
                            </section>

                            <section class="booking-page-card" data-booking-page="application" hidden>
                                <h3>Thông tin bổ sung</h3>
                                <div class="booking-field-grid">
                                    <label class="booking-field">
                                        <span>Ngày sinh</span>
                                        <input name="dateOfBirth" type="date" required>
                                    </label>
                                    <div class="booking-gender-group">
                                        <label><input type="radio" name="gender" value="Nam" required><span>Nam</span></label>
                                        <label><input type="radio" name="gender" value="Nữ"><span>Nữ</span></label>
                                        <label><input type="radio" name="gender" value="Khác"><span>Khác</span></label>
                                    </div>
                                    <label class="booking-field wide">
                                        <span>Địa chỉ</span>
                                        <input name="permanentAddress" placeholder="Số nhà, phường/xã, quận/huyện, tỉnh/thành" required>
                                    </label>
                                </div>
                                <div class="modal-actions">
                                    <button class="btn btn-outline" type="button" data-booking-prev="accommodation">Quay lại</button>
                                    <button class="btn btn-primary booking-primary" type="button" data-booking-confirm-details>Xác nhận</button>
                                </div>
                            </section>

                            <section class="booking-page-card payment-page-card" data-booking-page="payment" hidden>
                                <h3>Thanh toán tiền cọc</h3>
                                <div class="payment-layout">
                                    <div class="payment-form-box">
                                        <label class="booking-field">
                                            <span>Số tiền cọc</span>
                                            <input value="${formatMoney(room.deposit)}" readonly>
                                        </label>
                                        <label class="booking-field">
                                            <span>Nội dung chuyển khoản</span>
                                            <input data-payment-code value="COC PHONG ${room.id}" readonly>
                                        </label>
                                        <label class="booking-field">
                                            <span>Người nhận</span>
                                            <input value="${escapeAttribute(room.landlordName || "Chủ trọ")}" readonly>
                                        </label>
                                        <label class="booking-field">
                                            <span>Quốc gia</span>
                                            <input value="Việt Nam" readonly>
                                        </label>
                                    </div>
                                    <div class="payment-checklist">
                                        <div><span>✓</span> Chính sách hủy phòng rõ ràng</div>
                                        <div><span>✓</span> Giá thuê và tiền cọc minh bạch</div>
                                        <div><span>✓</span> Thanh toán an toàn</div>
                                        <div><span>✓</span> Chủ trọ nhận yêu cầu sau khi xác nhận</div>
                                    </div>
                                </div>
                                <div class="things-to-know">
                                    <strong>Lưu ý</strong>
                                    <p>Yêu cầu thuê chỉ được gửi sau khi bạn xác nhận đã chuyển tiền cọc.</p>
                                </div>
                                <div class="modal-actions">
                                    <button class="btn btn-outline" type="button" data-booking-prev="application">Quay lại</button>
                                    <button class="btn btn-primary booking-primary" type="button" data-rental-confirm-payment>Xác nhận đã chuyển tiền cọc</button>
                                </div>
                            </section>

                            <section class="booking-page-card confirmation-page-card" data-booking-page="confirmation" hidden>
                                <div class="booking-success-icon">✓</div>
                                <h3>Yêu cầu thuê phòng thành công</h3>
                                <p>Hệ thống đã gửi yêu cầu thuê phòng đến chủ trọ và tạo thông báo xác nhận cho bạn.</p>
                                <div class="modal-actions">
                                    <a class="btn btn-outline" href="profile-requests.html">Xem yêu cầu thuê</a>
                                    <button class="btn btn-primary booking-primary" type="button" data-close-rental-form>Đóng</button>
                                </div>
                            </section>
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

                <section class="detail-request-modal" data-report-modal hidden>
                    <div class="detail-request-card detail-report-card" role="dialog" aria-modal="true" aria-labelledby="report-form-title">
                        <div class="modal-head">
                            <div>
                                <h2 id="report-form-title">Báo cáo vi phạm</h2>
                                <p>${escapeHtml(room.title)}</p>
                            </div>
                            <button class="modal-close" type="button" data-close-report-form aria-label="Đóng">&times;</button>
                        </div>
                        <form class="form-grid detail-report-form" data-report-form>
                            <input type="hidden" name="roomId" value="${room.id}">
                            <div class="form-message" data-report-message></div>
                            <label class="form-field full">
                                <span>Nội dung vi phạm</span>
                                <textarea name="reason" rows="6" minlength="10" required placeholder="Ví dụ: địa chỉ không đúng, ảnh không giống thực tế, giá thuê sai, chủ trọ có dấu hiệu lừa đảo..."></textarea>
                            </label>
                            <div class="modal-actions">
                                <button class="btn btn-outline" type="button" data-close-report-form>Hủy</button>
                                <button class="btn btn-primary" type="submit">Gửi báo cáo</button>
                            </div>
                        </form>
                    </div>
                </section>
            </section>
        `;
    }

    async function loadRelatedRooms(room) {
        const section = document.querySelector("[data-related-section]");
        const grid = document.querySelector("[data-related-rooms]");
        if (!section || !grid) {
            return;
        }

        const district = districtFromAddress(room.address);
        const currentId = Number(room.id);
        const related = [];
        const seenIds = new Set([currentId]);

        const addRooms = (rooms) => {
            (rooms || []).forEach((item) => {
                const itemId = Number(item.id);
                if (!itemId || seenIds.has(itemId)) {
                    return;
                }
                seenIds.add(itemId);
                related.push(item);
            });
        };

        section.hidden = false;
        grid.innerHTML = `<div class="detail-related-loading">Đang tải phòng trọ liên quan...</div>`;

        try {
            addRooms(await relatedRoomBatch({
                location: district,
                status: "AVAILABLE",
                page: "0",
                size: "6"
            }));

            if (related.length < 3) {
                const price = Number(room.price || 0);
                const priceParams = {
                    status: "AVAILABLE",
                    page: "0",
                    size: "6"
                };
                if (price > 0) {
                    priceParams.minPrice = String(Math.max(price - 1000000, 0));
                    priceParams.maxPrice = String(price + 1000000);
                }
                addRooms(await relatedRoomBatch(priceParams));
            }

            if (related.length < 3) {
                addRooms(await relatedRoomBatch({
                    status: "AVAILABLE",
                    page: "0",
                    size: "6"
                }));
            }

            if (!related.length) {
                section.hidden = true;
                return;
            }

            grid.innerHTML = related.slice(0, 3).map(relatedRoomCard).join("");
        } catch {
            section.hidden = true;
        }
    }

    async function relatedRoomBatch(params) {
        const query = new URLSearchParams(params);
        const data = await publicJson(`/api/rooms?${query.toString()}`);
        return data.rooms || [];
    }

    function relatedRoomCard(room) {
        const image = room.imageUrls?.[0] || fallbackImage;
        const amenities = splitText(room.amenities, []).filter((item) => !isDeprecatedAmenity(item)).slice(0, 2);
        const rating = Number(room.averageRating || 0);
        const reviewCount = Number(room.reviewCount || 0);

        return `
            <article class="detail-related-card">
                <a class="detail-related-media" href="room-detail.html?id=${room.id}">
                    <img src="${escapeAttribute(image)}" alt="${escapeAttribute(room.title)}">
                </a>
                <div class="detail-related-body">
                    <h3><a href="room-detail.html?id=${room.id}">${escapeHtml(room.title)}</a></h3>
                    <p>${escapeHtml(room.address)}</p>
                    <div class="detail-related-meta">
                        <span>${formatArea(room.area)}</span>
                        <span>${escapeHtml(room.furnitureType || "Đang cập nhật")}</span>
                    </div>
                    ${amenities.length ? `<div class="detail-related-tags">${amenities.map((item) => amenityChip(item)).join("")}</div>` : ""}
                    <div class="detail-related-bottom">
                        <div>
                            <span>Từ</span>
                            <strong>${formatMoney(room.price)}</strong>
                            <small>/ tháng</small>
                        </div>
                        ${relatedRatingHtml(rating, reviewCount)}
                    </div>
                </div>
            </article>
        `;
    }

    function relatedRatingHtml(rating, reviewCount) {
        if (!reviewCount) {
            return `<span class="detail-related-new">Mới</span>`;
        }
        const percent = Math.max(0, Math.min(100, (rating / 5) * 100));
        return `
            <span class="detail-related-rating">
                <span>${rating.toFixed(1)}</span>
                <span class="rating-stars" style="--rating-percent: ${percent}%">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            </span>
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
        const bookingNextButtons = document.querySelectorAll("[data-booking-next]");
        const bookingPrevButtons = document.querySelectorAll("[data-booking-prev]");
        const confirmDetailsButton = document.querySelector("[data-booking-confirm-details]");
        const confirmPaymentButton = document.querySelector("[data-rental-confirm-payment]");
        const appointmentModal = document.querySelector("[data-appointment-modal]");
        const appointmentForm = document.querySelector("[data-appointment-form]");
        const openAppointmentButton = document.querySelector("[data-open-appointment-form]");
        const closeAppointmentButtons = document.querySelectorAll("[data-close-appointment-form]");
        const reportModal = document.querySelector("[data-report-modal]");
        const reportForm = document.querySelector("[data-report-form]");
        const openReportButton = document.querySelector("[data-open-report-form]");
        const closeReportButtons = document.querySelectorAll("[data-close-report-form]");
        let rentalDraft = null;

        openButton?.addEventListener("click", async () => {
            const auth = window.NhaTroAuth;
            const user = auth?.currentUser?.();
            if (!auth?.token?.() || user?.role !== "USER") {
                window.location.href = `login.html?next=${encodeURIComponent(`room-detail.html?id=${room.id}`)}`;
                return;
            }
            clearRentalMessage();
            rentalDraft = null;
            setRentalStage("details");
            setBookingPage("personal");
            updateRentalHeader("details");
            modal.hidden = false;
            document.body.classList.add("modal-open");
            await hydrateRentalProfile(form);
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

        openReportButton?.addEventListener("click", () => {
            const auth = window.NhaTroAuth;
            if (!auth?.token?.()) {
                window.location.href = `login.html?next=${encodeURIComponent(`room-detail.html?id=${room.id}`)}`;
                return;
            }
            showReportMessage("", "");
            reportModal.hidden = false;
            document.body.classList.add("modal-open");
            reportForm?.elements.reason?.focus();
        });

        closeButtons.forEach((button) => {
            button.addEventListener("click", () => closeRentalModal());
        });

        closeAppointmentButtons.forEach((button) => {
            button.addEventListener("click", () => closeAppointmentModal());
        });

        closeReportButtons.forEach((button) => {
            button.addEventListener("click", () => closeReportModal());
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

        reportModal?.addEventListener("click", (event) => {
            if (event.target === reportModal) {
                closeReportModal();
            }
        });

        form?.addEventListener("submit", (event) => {
            event.preventDefault();
        });

        bookingNextButtons.forEach((button) => {
            button.addEventListener("click", () => {
                clearRentalMessage();
                const currentPage = visibleBookingPage();
                if (!validateBookingPage(currentPage)) {
                    return;
                }
                setBookingPage(button.dataset.bookingNext);
            });
        });

        bookingPrevButtons.forEach((button) => {
            button.addEventListener("click", () => {
                clearRentalMessage();
                const nextPage = button.dataset.bookingPrev;
                setBookingPage(nextPage);
                setRentalStage(nextPage === "payment" ? "payment" : "details");
                updateRentalHeader(nextPage === "payment" ? "payment" : "details");
            });
        });

        confirmDetailsButton?.addEventListener("click", () => {
            clearRentalMessage();
            const invalidPage = firstInvalidBookingPage(["personal", "accommodation", "application"]);
            if (invalidPage) {
                setBookingPage(invalidPage);
                validateBookingPage(invalidPage);
                return;
            }
            rentalDraft = collectRentalDraft(form, room);
            updatePaymentCode(rentalDraft);
            setRentalStage("payment");
            updateRentalHeader("payment");
            setBookingPage("payment");
        });

        confirmPaymentButton?.addEventListener("click", async () => {
            if (!rentalDraft) {
                showRentalMessage("error", "Vui lòng nhập thông tin yêu cầu thuê trước.");
                setRentalStage("details");
                updateRentalHeader("details");
                setBookingPage("personal");
                return;
            }

            confirmPaymentButton.disabled = true;
            showRentalMessage("info", "Đang gửi yêu cầu thuê phòng...");

            try {
                await window.NhaTroAuth.api("/api/rental-requests", {
                    method: "POST",
                    body: JSON.stringify(rentalPayload(rentalDraft))
                });
                showRentalMessage("success", "Yêu cầu thuê phòng thành công. Hệ thống đã gửi thông báo xác nhận.");
                window.NhaTroAuth?.refreshNotificationIndicators?.();
                setRentalStage("confirmation");
                updateRentalHeader("confirmation");
                setBookingPage("confirmation");
            } catch (error) {
                showRentalMessage("error", error.message);
            } finally {
                confirmPaymentButton.disabled = false;
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

        reportForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const reason = reportForm.elements.reason.value.trim();
            if (reason.length < 10) {
                showReportMessage("error", "Vui lòng mô tả vi phạm ít nhất 10 ký tự.");
                return;
            }

            const submitButton = reportForm.querySelector("button[type='submit']");
            submitButton.disabled = true;
            showReportMessage("info", "Đang gửi báo cáo vi phạm...");

            try {
                await window.NhaTroAuth.api("/api/violation-reports", {
                    method: "POST",
                    body: JSON.stringify({ roomId: Number(room.id), reason })
                });
                showReportMessage("success", "Đã gửi báo cáo vi phạm. Quản trị viên sẽ kiểm tra và xử lý.");
                reportForm.reset();
                setTimeout(() => closeReportModal(), 900);
            } catch (error) {
                showReportMessage("error", error.message);
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

    function setRentalStage(stage) {
        const order = ["details", "payment", "confirmation"];
        const activeIndex = order.indexOf(stage);
        document.querySelectorAll("[data-rental-stepper] [data-step]").forEach((item) => {
            const itemIndex = order.indexOf(item.dataset.step);
            item.classList.toggle("active", item.dataset.step === stage);
            item.classList.toggle("done", itemIndex > -1 && itemIndex < activeIndex);
        });
    }

    function setBookingPage(page) {
        document.querySelectorAll("[data-booking-page]").forEach((panel) => {
            panel.hidden = panel.dataset.bookingPage !== page;
        });
    }

    function visibleBookingPage() {
        const panel = document.querySelector("[data-booking-page]:not([hidden])");
        return panel?.dataset.bookingPage || "personal";
    }

    function firstInvalidBookingPage(pages) {
        return pages.find((page) => !bookingPageIsValid(page));
    }

    function validateBookingPage(page) {
        const panel = document.querySelector(`[data-booking-page="${page}"]`);
        if (!panel) {
            return true;
        }
        const controls = bookingPageControls(panel);
        const invalidControl = controls.find((control) => !control.checkValidity());
        if (invalidControl) {
            invalidControl.reportValidity();
            return false;
        }
        return true;
    }

    function bookingPageIsValid(page) {
        const panel = document.querySelector(`[data-booking-page="${page}"]`);
        if (!panel) {
            return true;
        }
        return bookingPageControls(panel).every((control) => control.checkValidity());
    }

    function bookingPageControls(panel) {
        return Array.from(panel.querySelectorAll("input, select, textarea"))
            .filter((control) => !control.disabled && control.type !== "hidden");
    }

    async function hydrateRentalProfile(form) {
        try {
            const user = await window.NhaTroAuth.api("/api/users/profile");
            fillFormValue(form, "fullName", user.fullName);
            fillFormValue(form, "phone", user.phone);
            fillFormValue(form, "email", user.email);
            fillFormValue(form, "citizenId", user.citizenId);
            updateRentalHeader("details", user);
        } catch {
            // Keep the cached values already rendered in the form.
        }
    }

    function fillFormValue(form, name, value) {
        if (form?.elements?.[name] && value) {
            form.elements[name].value = value;
        }
    }

    function updateRentalHeader(stage, userOverride = null) {
        const name = userOverride?.fullName || window.NhaTroAuth?.currentUser?.()?.fullName || "bạn";
        const heading = document.querySelector("[data-rental-heading]");
        const subtitle = document.querySelector("[data-rental-subtitle]");
        const copy = {
            details: {
                heading: `Cảm ơn ${name}, hãy giữ chỗ phòng này.`,
                subtitle: "Điền thông tin để gửi yêu cầu thuê phòng nhanh hơn."
            },
            payment: {
                heading: `Chào ${name}, gần hoàn tất! Bước cuối.`,
                subtitle: "Xác nhận chuyển tiền cọc để chủ trọ nhận được yêu cầu thuê."
            },
            confirmation: {
                heading: "Yêu cầu thuê phòng đã được gửi",
                subtitle: "Bạn có thể theo dõi trạng thái trong mục yêu cầu thuê phòng."
            }
        }[stage];
        if (heading && copy) {
            heading.textContent = copy.heading;
        }
        if (subtitle && copy) {
            subtitle.textContent = copy.subtitle;
        }
    }

    function closeAppointmentModal() {
        const modal = document.querySelector("[data-appointment-modal]");
        if (modal) {
            modal.hidden = true;
        }
        document.body.classList.remove("modal-open");
    }

    function closeReportModal() {
        const modal = document.querySelector("[data-report-modal]");
        if (modal) {
            modal.hidden = true;
        }
        document.body.classList.remove("modal-open");
    }

    function showReportMessage(type, message) {
        const node = document.querySelector("[data-report-message]");
        if (!node) {
            return;
        }
        node.className = type ? `form-message ${type}` : "form-message";
        node.textContent = message || "";
    }

    function collectRentalDraft(form, room) {
        const data = new FormData(form);
        const stayDuration = String(data.get("stayDuration") || "").trim();
        const moveInOut = String(data.get("moveInOut") || "").trim();
        return {
            room: {
                id: room.id,
                title: room.title,
                address: room.address,
                area: room.area,
                price: room.price,
                deposit: room.deposit,
                landlordName: room.landlordName || "Chủ trọ",
                landlordCitizenId: room.landlordCitizenId || "Chưa cập nhật",
                landlordPhone: room.landlordPhone || "Chưa cập nhật"
            },
            fullName: String(data.get("fullName") || "").trim(),
            phone: String(data.get("phone") || "").trim(),
            citizenId: String(data.get("citizenId") || "").trim(),
            gender: String(data.get("gender") || "").trim(),
            email: String(data.get("email") || "").trim(),
            roomType: String(data.get("roomType") || "").trim(),
            stayDuration,
            moveInOut,
            dateOfBirth: data.get("dateOfBirth") || null,
            permanentAddress: String(data.get("permanentAddress") || "").trim(),
            expectedRentalTime: [stayDuration, moveInOut].filter(Boolean).join(" | ")
        };
    }

    function updatePaymentCode(draft) {
        const paymentCode = document.querySelector("[data-payment-code]");
        if (paymentCode) {
            paymentCode.value = `COC PHONG ${draft.room.id} ${draft.phone}`;
        }
    }

    function rentalPayload(draft) {
        const note = [
            `Email người thuê: ${draft.email}`,
            `Giới tính: ${draft.gender}`,
            `Loại phòng: ${draft.roomType}`,
            `Thời hạn thuê: ${draft.stayDuration}`,
            `Ngày nhận/trả phòng: ${draft.moveInOut}`,
            `Đã xác nhận chuyển tiền cọc: ${formatMoney(draft.room.deposit)}`,
            `Mã chuyển khoản: COC PHONG ${draft.room.id} ${draft.phone}`,
            `Chủ trọ: ${draft.room.landlordName}`,
            `CCCD chủ trọ: ${draft.room.landlordCitizenId}`
        ].filter(Boolean).join("\n");

        return {
            roomId: Number(draft.room.id),
            fullName: draft.fullName,
            phone: draft.phone,
            citizenId: draft.citizenId,
            dateOfBirth: draft.dateOfBirth,
            permanentAddress: draft.permanentAddress,
            expectedRentalTime: draft.expectedRentalTime,
            note
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

    function clearRentalMessage() {
        const box = document.querySelector("[data-rental-message]");
        if (!box) {
            return;
        }
        box.className = "form-message";
        box.textContent = "";
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
            ...amenities.slice(0, 4)
        ];
        return [...new Set(chips.filter(Boolean))]
                .slice(0, 9)
                .map((item, index) => `<span>${amenityIconHtml(item) || chipIcon(index)}${escapeHtml(item)}</span>`)
                .join("");
    }

    function amenityChip(item, className = "") {
        const iconPath = amenityIcon(item);
        const classAttr = className ? ` class="${className}"` : "";
        const iconHtml = iconPath ? `<img class="amenity-icon" src="${iconPath}" alt="" aria-hidden="true">` : "";
        return `<span${classAttr}>${iconHtml}${escapeHtml(item)}</span>`;
    }

    function amenityIconHtml(item) {
        const iconPath = amenityIcon(item);
        return iconPath ? `<img class="amenity-icon" src="${iconPath}" alt="" aria-hidden="true">` : "";
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

    async function initDetailMap(room) {
        const mapNode = document.querySelector("#detailMap");
        const point = await resolveRoomPoint(room);
        if (point) {
            room.latitude = point.lat;
            room.longitude = point.lng;
            updateMapCoordinateText(point);
        }
        bindDetailDistanceTool(room, point);

        if (!mapNode) {
            return;
        }

        if (!point) {
            mapNode.innerHTML = `
                <div class="map-fallback">
                    <strong>Phòng này chưa có tọa độ.</strong>
                    <a href="${escapeAttribute(mapUrl(room))}" target="_blank" rel="noopener">Mở bản đồ theo địa chỉ</a>
                </div>
            `;
            return;
        }

        if (!window.L) {
            mapNode.innerHTML = `
                <div class="map-fallback">
                    <strong>Không tải được bản đồ tương tác.</strong>
                    <a href="${escapeAttribute(mapUrl(room))}" target="_blank" rel="noopener">Mở OpenStreetMap</a>
                </div>
            `;
            return;
        }

        const map = L.map(mapNode, { scrollWheelZoom: false }).setView([point.lat, point.lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);

        L.marker([point.lat, point.lng])
                .addTo(map)
                .bindPopup(`
                    <div class="map-popup">
                        <strong>${escapeHtml(room.title)}</strong>
                        <span>${escapeHtml(room.address)}</span>
                        <b>${formatMoney(room.price)} / tháng</b>
                    </div>
                `)
                .openPopup();

        L.circle([point.lat, point.lng], {
            radius: 900,
            color: "#ef3f68",
            weight: 2,
            fillColor: "#ef3f68",
            fillOpacity: 0.08
        }).addTo(map);

        distanceOrigins().forEach((origin) => {
            L.circleMarker([origin.lat, origin.lng], {
                radius: 6,
                color: "#0ea5e9",
                fillColor: "#0ea5e9",
                fillOpacity: 0.85,
                weight: 2
            }).addTo(map).bindPopup(`<strong>${escapeHtml(origin.label)}</strong>`);
        });

        setTimeout(() => map.invalidateSize(), 80);
    }

    function bindDetailDistanceTool(room, roomLocation) {
        const originSelect = document.querySelector("[data-distance-origin]");
        const customInput = document.querySelector("[data-distance-custom]");
        const result = document.querySelector("[data-distance-result]");
        const route = document.querySelector("[data-map-route]");
        const calculate = document.querySelector("[data-calculate-distance]");
        if (!originSelect || !result || !calculate) {
            return;
        }

        const update = () => {
            if (!roomLocation) {
                result.textContent = "Phòng này chưa có tọa độ nên chưa tính được khoảng cách.";
                return;
            }
            const customPoint = parseLatLng(customInput?.value);
            const origin = customPoint || distanceOrigins().find((item) => item.key === originSelect.value) || distanceOrigins()[0];
            const distance = haversineKm(origin, roomLocation);
            result.textContent = `Từ ${origin.label || "tọa độ đã nhập"} đến phòng khoảng ${formatDistance(distance)} theo đường thẳng.`;
            if (route) {
                route.href = mapDirectionsUrl(room, origin);
            }
        };

        calculate.addEventListener("click", update);
        originSelect.addEventListener("change", () => {
            if (customInput) {
                customInput.value = "";
            }
            update();
        });
        update();
    }

    function distanceOrigins() {
        return [
            { key: "center", label: "Trung tâm Hồ Gươm", lat: 21.0285, lng: 105.8542 },
            { key: "university", label: "ĐHQG Hà Nội - Cầu Giấy", lat: 21.0379, lng: 105.7824 },
            { key: "bk", label: "Đại học Bách Khoa Hà Nội", lat: 21.0058, lng: 105.8431 },
            { key: "office", label: "Khu văn phòng Keangnam", lat: 21.0171, lng: 105.7847 },
            { key: "industrial", label: "Khu công nghiệp Thăng Long", lat: 21.1398, lng: 105.7894 }
        ];
    }

    function nearbyTags(room, district) {
        const roomLocation = roomPoint(room);
        const tags = [district, "Gần tuyến giao thông chính", "Khu dân cư tiện ích"];
        if (roomLocation) {
            const nearest = distanceOrigins()
                    .map((origin) => ({ ...origin, distance: haversineKm(origin, roomLocation) }))
                    .sort((left, right) => left.distance - right.distance)
                    .slice(0, 2)
                    .map((origin) => `${origin.label} - ${formatDistance(origin.distance)}`);
            tags.push(...nearest);
        }
        return [...new Set(tags)].slice(0, 6);
    }

    function nearbyAreaText(room, district) {
        const roomLocation = roomPoint(room);
        if (!roomLocation) {
            return `Khu vực ${district}, Hà Nội`;
        }
        const nearest = distanceOrigins()
                .map((origin) => ({ ...origin, distance: haversineKm(origin, roomLocation) }))
                .sort((left, right) => left.distance - right.distance)[0];
        return `Khu vực ${district}, gần ${nearest.label} khoảng ${formatDistance(nearest.distance)}`;
    }

    function roomPoint(room) {
        const lat = Number(room?.latitude);
        const lng = Number(room?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
        }
        return { label: room.title || "Phòng trọ", lat, lng };
    }

    async function resolveRoomPoint(room) {
        const storedPoint = roomPoint(room);
        if (storedPoint) {
            return storedPoint;
        }

        const point = await geocodeAddress(room?.address);
        return point ? { label: room.title || "Phòng trọ", ...point } : null;
    }

    async function geocodeAddress(address) {
        const key = normalizeAddress(address);
        if (!key) {
            return null;
        }

        const cache = readDetailGeocodeCache();
        if (cache[key]) {
            return cache[key];
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
            cache[key] = point;
            writeDetailGeocodeCache(cache);
            return point;
        } catch {
            return null;
        }
    }

    function normalizeAddress(address) {
        return String(address || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
    }

    function readDetailGeocodeCache() {
        try {
            const parsed = JSON.parse(localStorage.getItem(DETAIL_GEOCODE_CACHE_KEY) || "{}");
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }

    function writeDetailGeocodeCache(cache) {
        try {
            localStorage.setItem(DETAIL_GEOCODE_CACHE_KEY, JSON.stringify(cache));
        } catch {
            // The map can still render without local cache.
        }
    }

    function updateMapCoordinateText(point) {
        const node = document.querySelector("[data-map-coordinate]");
        if (node) {
            node.textContent = `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`;
        }
    }

    function parseLatLng(value) {
        const parts = String(value || "").split(",").map((item) => Number(item.trim()));
        if (parts.length !== 2 || parts.some((item) => !Number.isFinite(item))) {
            return null;
        }
        return { label: "tọa độ đã nhập", lat: parts[0], lng: parts[1] };
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

    function formatCoordinate(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number.toFixed(6) : "Chưa cập nhật";
    }

    function mapUrl(room) {
        const point = roomPoint(room);
        if (!point) {
            return `https://www.openstreetmap.org/search?query=${encodeURIComponent(room.address || "Hà Nội")}`;
        }

        const delta = 0.01;
        const left = point.lng - delta;
        const right = point.lng + delta;
        const bottom = point.lat - delta;
        const top = point.lat + delta;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${point.lat}%2C${point.lng}`;
    }

    function mapDirectionsUrl(room, origin = null) {
        const destination = roomPoint(room);
        if (!destination) {
            return mapUrl(room);
        }
        const originPoint = origin || { lat: 21.0285, lng: 105.8542 };
        const route = `${originPoint.lat},${originPoint.lng};${destination.lat},${destination.lng}`;
        return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`;
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
