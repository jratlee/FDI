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
  var form = document.getElementById("waitlist-form");
  if (form) {
    var btn = form.querySelector("button[type=submit]");
    function setMsg(msg, text, state) {
      msg.textContent = text;
      msg.classList.remove("is-ok", "is-error");
      if (state) msg.classList.add(state);
    }
    function mailtoFallback(email) {
      var subject = encodeURIComponent("Skillfoundry waitlist");
      var bodyTxt = encodeURIComponent("Please add me to the Skillfoundry waitlist.\n\nEmail: " + email);
      window.location.href = "mailto:hello@falsedawn.industries?subject=" + subject + "&body=" + bodyTxt;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("wl-email");
      var msg = document.getElementById("wl-msg");
      var email = (input.value || "").trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) { setMsg(msg, "Please enter a valid email address.", "is-error"); input.focus(); return; }
      if (btn) btn.disabled = true;
      setMsg(msg, "Adding you to the waitlist…", null);
      fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      }).then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          form.reset();
          setMsg(msg, r.data.duplicate ? "You're already on the list — we'll be in touch." : "You're on the list. We'll reach out with early access.", "is-ok");
        } else if (r.status === 422) {
          setMsg(msg, "Please enter a valid email address.", "is-error");
          input.focus();
        } else {
          setMsg(msg, "Something went wrong — opening your email app instead.", "is-error");
          mailtoFallback(email);
        }
      }).catch(function () {
        setMsg(msg, "Couldn't reach the server — opening your email app instead.", "is-error");
        mailtoFallback(email);
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  }
})();