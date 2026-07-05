(function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.getAttribute("data-open") === "true";
      links.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var forms = document.querySelectorAll("form.js-capture");
  Array.prototype.forEach.call(forms, function (form) {
    var btn = form.querySelector("button[type=submit]");
    var input = form.querySelector("input[type=email]");
    var honeypot = form.querySelector("input[name=company]");
    var msg = form.parentNode.querySelector(".form-msg");
    var source = form.getAttribute("data-source") || "site";
    var subject = form.getAttribute("data-subject") || "FDI waitlist";
    var successText = form.getAttribute("data-success") || "You're on the list. We'll reach out with early access.";
    var dupText = form.getAttribute("data-duplicate") || "You're already on the list — we'll be in touch.";
    var download = form.getAttribute("data-download") || "";
    var mailBody = form.getAttribute("data-mail-body") || ("Please add me to the " + source + " list.");

    function setMsg(text, state) {
      if (!msg) return;
      msg.textContent = text;
      msg.classList.remove("is-ok", "is-error");
      if (state) msg.classList.add(state);
    }
    function mailtoFallback(email) {
      var s = encodeURIComponent(subject);
      var b = encodeURIComponent(mailBody + "\n\nEmail: " + email);
      window.location.href = "mailto:hello@falsedawn.industries?subject=" + s + "&body=" + b;
    }
    function triggerDownload() {
      if (!download) return;
      var a = document.createElement("a");
      a.href = download;
      a.setAttribute("download", "");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = ((input && input.value) || "").trim();
      if (!EMAIL_RE.test(email)) { setMsg("Please enter a valid email address.", "is-error"); if (input) input.focus(); return; }
      if (btn) btn.disabled = true;
      setMsg(download ? "Preparing your download…" : "Adding you to the list…", null);
      fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: source, company: (honeypot && honeypot.value) || "" })
      }).then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      }).then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          form.reset();
          if (download) {
            setMsg("Thanks — your download is starting. Check your downloads folder.", "is-ok");
            triggerDownload();
          } else {
            setMsg(r.data.duplicate ? dupText : successText, "is-ok");
          }
        } else if (r.status === 429) {
          setMsg((r.data && r.data.message) || "Too many attempts. Please try again later.", "is-error");
        } else if (r.status === 422) {
          setMsg((r.data && r.data.message) || "Please enter a valid email address.", "is-error");
          if (input) input.focus();
        } else {
          setMsg("Something went wrong — opening your email app instead.", "is-error");
          mailtoFallback(email);
        }
      }).catch(function () {
        setMsg("Couldn't reach the server — opening your email app instead.", "is-error");
        mailtoFallback(email);
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  });
})();