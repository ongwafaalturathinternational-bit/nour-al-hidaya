(() => {
  const copy = {
    fr: {
      selector: "Langue", launchTitle: "Bienvenue sur WAT Connect",
      launchText: "Le siège numérique de l’ONG Wafa Al-Turath.", continue: "Continuer",
      title: "Votre espace WAT Connect", intro: "Retrouvez votre espace membre et les programmes publics de l’ONG Wafa Al-Turath.",
      member: "Accéder à l’espace membre", programmes: "Découvrir les programmes"
    },
    en: {
      selector: "Language", launchTitle: "Welcome to WAT Connect",
      launchText: "The digital headquarters of Wafa Al-Turath NGO.", continue: "Continue",
      title: "Your WAT Connect workspace", intro: "Access your member workspace and explore Wafa Al-Turath’s public programmes.",
      member: "Open the member workspace", programmes: "Explore programmes"
    },
    ar: {
      selector: "اللغة", launchTitle: "مرحبًا بكم في وات كونكت",
      launchText: "المقر الرقمي لمنظمة وفاء التراث.", continue: "متابعة",
      title: "مساحتكم في وات كونكت", intro: "ادخلوا إلى مساحة الأعضاء وتعرّفوا على البرامج العامة لمنظمة وفاء التراث.",
      member: "الدخول إلى مساحة الأعضاء", programmes: "استكشاف البرامج"
    }
  };
  const launch = document.querySelector(".wat-launch");
  const welcome = document.querySelector(".wat-landing");
  const languageControls = document.querySelectorAll("[data-wat-language]");
  const store = (key, value) => {
    try {
      if (value !== undefined) sessionStorage.setItem(key, value);
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };
  function apply(language) {
    if (!Object.hasOwn(copy, language)) language = "fr";
    for (const screen of [launch, welcome]) {
      screen.lang = language;
      screen.dir = language === "ar" ? "rtl" : "ltr";
      for (const label of screen.querySelectorAll("[data-wat-copy]")) {
        label.textContent = copy[language][label.dataset.watCopy];
      }
    }
    for (const button of languageControls) {
      button.setAttribute("aria-pressed", String(button.dataset.watLanguage === language));
    }
  }
  apply(store("wat-welcome-language"));
  for (const button of languageControls) {
    button.addEventListener("click", () => {
      store("wat-welcome-language", button.dataset.watLanguage);
      apply(button.dataset.watLanguage);
    });
  }
  launch.addEventListener("close", () => {
    store("wat-launch-seen", "1");
    welcome.querySelector("h1").focus({ preventScroll: true });
  });
  if (!location.hash && store("wat-launch-seen") !== "1" && typeof launch.showModal === "function") {
    launch.showModal();
  }
})();
