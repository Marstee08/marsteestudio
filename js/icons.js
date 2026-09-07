/* =========================================
   MARS TEE — LOCAL INLINE SVG ICONS
   ========================================= */

(() => {
  const paths = {
    code: '<path d="m8 9-3 3 3 3"/><path d="m16 9 3 3-3 3"/><path d="m14 5-4 14"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    heart: '<path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/>',
    diamond: '<path d="m12 2 9 10-9 10L3 12Z"/><path d="m3 12 9 2 9-2"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h6"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    whatsapp: '<path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z"/><path d="M8.5 8.5c.3-.4.7-.4 1-.1l1.1 1c.3.3.3.7.1 1l-.5.7c.7 1.1 1.6 2 2.8 2.6l.7-.5c.3-.2.7-.2 1 .1l1 1c.3.3.3.7-.1 1-1 .9-2.4.9-4.1.1-1.8-.8-3.7-2.7-4.5-4.5-.8-1.7-.8-3.1.1-4.1Z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><path d="M17.5 6.5h.01"/>',
    tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3-3.46"/><path d="M14 4c.8 2 2.1 3.2 4 3.6"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    sparkles: '<path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7Z"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 5.8M18 14c2.3.8 3.8 2.8 4 5"/>',
    lightbulb: '<path d="M9 18h6M10 22h4"/><path d="M8.5 14.5A6 6 0 1 1 15.5 14c-.8.6-1.2 1.4-1.3 2H9.8c-.1-.6-.5-1.4-1.3-1.5Z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.4 1.4-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2v-.4a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L9 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H7v-2h.4a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L8.6 9 10 7.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V6h2v.4a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.4 9l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.4v2h-.4a1.7 1.7 0 0 0-1.2 1Z"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'
  };

  function svg(name) {
    const wrapper = document.createElement("span");
    wrapper.className = "mt-icon";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = `<svg viewBox="0 0 24 24" focusable="false">${paths[name] || paths.sparkles}</svg>`;
    return wrapper;
  }

  function replaceWithIcon(element, name) {
    if (!element || element.querySelector(".mt-icon")) return;
    element.textContent = "";
    element.appendChild(svg(name));
  }

  document.addEventListener("DOMContentLoaded", () => {
    const serviceIcons = ["code", "pen", "heart", "diamond", "file", "plus"];
    document.querySelectorAll(".service-icon").forEach((el, i) => {
      replaceWithIcon(el, serviceIcons[i] || "sparkles");
    });

    const contactIcons = {
      W: "whatsapp",
      "@": "mail",
      IG: "instagram",
      TT: "tiktok"
    };

    document.querySelectorAll(".contact-method-icon").forEach(el => {
      replaceWithIcon(el, contactIcons[el.textContent.trim()] || "send");
    });

    document.querySelectorAll(".floating-icon").forEach(el => {
      const icon = el.textContent.trim() === "↗" ? "arrow" : "sparkles";
      replaceWithIcon(el, icon);
    });

    const headingIcons = {
      "Purpose": "target",
      "Clarity": "eye",
      "Detail": "settings",
      "Impact": "sparkles",
      "Clear Communication": "send",
      "Attention to Detail": "eye",
      "Collaboration": "users",
      "Professional Delivery": "check",
      "Creativity": "lightbulb",
      "Quality": "check",
      "Purpose": "target",
      "Growth": "arrow",
      "Understand": "eye",
      "Create": "sparkles",
      "Refine": "settings",
      "Deliver": "check",
      "Explore": "sparkles",
      "Choose": "target",
      "Customise": "settings",
      "Order": "send"
    };

    document.querySelectorAll(
      ".principle-card, .expectation-card, .catalogue-step, .value-card, .story-point"
    ).forEach(card => {
      const heading = card.querySelector("h3");
      if (!heading || heading.querySelector(".card-icon")) return;

      const iconBox = document.createElement("span");
      iconBox.className = "card-icon";
      iconBox.appendChild(svg(headingIcons[heading.textContent.trim()] || "sparkles"));
      heading.parentNode.insertBefore(iconBox, heading);
    });

    const featureIcons = {
      Responsive: "settings",
      Professional: "check",
      Custom: "pen",
      Scalable: "arrow",
      Flyers: "fileText",
      "Social Media": "sparkles",
      Posters: "target",
      "Custom Designs": "pen",
      "Logo Design": "diamond",
      "Brand Guidelines": "fileText",
      "Colour System": "sparkles",
      "Typography": "settings"
    };

    document.querySelectorAll(".service-features > div").forEach(item => {
      const strong = item.querySelector("strong");
      if (!strong || item.querySelector(".card-icon")) return;
      const iconBox = document.createElement("span");
      iconBox.className = "card-icon";
      iconBox.appendChild(svg(featureIcons[strong.textContent.trim()] || "sparkles"));
      item.insertBefore(iconBox, item.firstChild);
    });

    document.querySelectorAll(".empty-icon").forEach(el => {
      replaceWithIcon(el, "sparkles");
    });
  });
})();
