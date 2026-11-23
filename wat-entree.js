(() => {
  const copy = {
    fr: {
      title: "Bienvenue sur WAT Connect",
      intro: "Le siège numérique de l’ONG Wafa Al-Turath.",
      open: "Entrer dans WAT Connect",
      member: "Accéder à mon espace",
      public: "Découvrir l’ONG",
      label: "Langue de l’accueil"
    },
    en: {
      title: "Welcome to WAT Connect",
      intro: "The digital headquarters of Wafa Al-Turath NGO.",
      open: "Enter WAT Connect",
      member: "Access my workspace",
      public: "Discover the NGO",
      label: "Welcome language"
    },
    ar: {
      title: "مرحبًا بكم في وات كونكت",
      intro: "المقر الرقمي لمنظمة وفاء التراث.",
      open: "الدخول إلى وات كونكت",
      member: "الدخول إلى مساحتي",
      public: "تعرّفوا على المنظمة",
      label: "لغة الترحيب"
    }
  };
  const welcome = document.querySelector("#bienvenue");
  const launch = document.querySelector("#lancement");
  const sections = [welcome, launch];
  let language = "fr";
  try { language = sessionStorage.getItem("wat-welcome-language") || "fr"; } catch {}

  function update(next) {
    language = Object.hasOwn(copy, next) ? next : "fr";
    for (const section of sections) {
      section.lang = language;
      section.dir = language === "ar" ? "rtl" : "ltr";
      for (const node of section.querySelectorAll("[data-wat-copy]")) {
        const value = copy[language][node.dataset.watCopy];
        if (node.hasAttribute("aria-label")) node.setAttribute("aria-label", value);
        else node.textContent = value;
      }
      for (const button of section.querySelectorAll("[data-wat-lang]")) {
        button.setAttribute("aria-pressed", String(button.dataset.watLang === language));
      }
    }
    try { sessionStorage.setItem("wat-welcome-language", language); } catch {}
  }

  for (const section of sections) {
    section.addEventListener("click", event => {
      const button = event.target.closest("[data-wat-lang]");
      if (button) update(button.dataset.watLang);
    });
  }
  update(language);
  launch.addEventListener("close", () => {
    try { sessionStorage.setItem("wat-launch-seen", "1"); } catch {}
    document.querySelector("#bienvenue-titre").focus({ preventScroll: true });
  });
  let seen = false;
  try { seen = sessionStorage.getItem("wat-launch-seen") === "1"; } catch {}
  if (!location.hash && !seen && typeof launch.showModal === "function") launch.showModal();
})();
