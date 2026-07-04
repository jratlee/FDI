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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("wl-email");
      var msg = document.getElementById("wl-msg");
      var email = (input.value || "").trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!ok) { msg.textContent = "Please enter a valid email address."; input.focus(); return; }
      var subject = encodeURIComponent("Skillfoundry waitlist");
      var bodyTxt = encodeURIComponent("Please add me to the Skillfoundry waitlist.\n\nEmail: " + email);
      msg.textContent = "Opening your email app to confirm — thanks for your interest.";
      window.location.href = "mailto:hello@falsedawn.industries?subject=" + subject + "&body=" + bodyTxt;
    });
  }
})();