export const CONTACT_SUPPORT_HREF = "/#contact";

export function goToContactSupport() {
  if (typeof window === "undefined") return;

  if (window.location.pathname === "/" || window.location.pathname === "") {
    const contactSection = document.getElementById("contact");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
      return;
    }
  }

  window.location.href = CONTACT_SUPPORT_HREF;
}
