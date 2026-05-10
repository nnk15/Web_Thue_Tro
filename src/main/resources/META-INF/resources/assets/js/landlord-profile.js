(() => {
    const auth = window.NhaTroAuth;
    const form = document.querySelector("[data-password-form]");

    if (!auth?.token?.()) {
        return;
    }

    async function loadProfile() {
        try {
            const user = await auth.api("/api/users/profile");
            applyProfile(user);
        } catch (error) {
            showPageError(error.message);
        }
    }

    function applyProfile(user) {
        setText("[data-profile-name]", user.fullName || "Chưa cập nhật");
        setText("[data-profile-email]", user.email || "Chưa cập nhật");
        setText("[data-profile-phone]", user.phone || "Chưa cập nhật");

        const emailLink = document.querySelector("[data-profile-email-link]");
        if (emailLink && user.email) {
            emailLink.href = `mailto:${user.email}`;
        }

        const phoneLink = document.querySelector("[data-profile-phone-link]");
        if (phoneLink && user.phone) {
            phoneLink.href = `tel:${user.phone}`;
        }
    }

    function bindPasswordForm() {
        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = form.querySelector("button[type='submit']");
            button.disabled = true;
            showMessage(form, "info", "Đang đổi mật khẩu...");
            try {
                await auth.api("/api/users/change-password", {
                    method: "PUT",
                    body: JSON.stringify({
                        oldPassword: form.elements.oldPassword.value,
                        newPassword: form.elements.newPassword.value
                    })
                });
                form.reset();
                showMessage(form, "success", "Đổi mật khẩu thành công");
            } catch (error) {
                showMessage(form, "error", error.message);
            } finally {
                button.disabled = false;
            }
        });
    }

    function setText(selector, value) {
        document.querySelectorAll(selector).forEach((element) => {
            element.textContent = value;
        });
    }

    function showMessage(targetForm, type, message) {
        let box = targetForm.querySelector(".form-message");
        if (!box) {
            box = document.createElement("div");
            box.className = "form-message";
            targetForm.prepend(box);
        }
        box.className = `form-message ${type}`;
        box.textContent = message;
    }

    function showPageError(message) {
        const panel = document.querySelector(".landlord-profile-panel");
        if (panel) {
            panel.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
        }
    }

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    bindPasswordForm();
    loadProfile();
})();
