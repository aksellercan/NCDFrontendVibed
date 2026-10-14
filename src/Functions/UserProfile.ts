import { UserProfile } from "../types";

export const USER_PROFILE_STORAGE_KEY = "user_profile";
export const DEFAULT_USER_PROFILE: UserProfile = {
  appearance: { accentColor: "#467ea1" }
};

export function loadUserProfile(): UserProfile {
  const legacyAccent = localStorage.getItem("appearance_accent");
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) {
      if (legacyAccent) {
        const migrated: UserProfile = {
          appearance: { accentColor: legacyAccent }
        };
        saveUserProfile(migrated);
        localStorage.removeItem("appearance_accent");
        return migrated;
      }
      return DEFAULT_USER_PROFILE;
    }

    const parsed = JSON.parse(raw);
    return {
      appearance: {
        accentColor:
          typeof parsed?.appearance?.accentColor === "string"
            ? parsed.appearance.accentColor
            : DEFAULT_USER_PROFILE.appearance.accentColor
      }
    };
  } catch {
    if (legacyAccent) {
      const migrated: UserProfile = {
        appearance: { accentColor: legacyAccent }
      };
      try {
        saveUserProfile(migrated);
        localStorage.removeItem("appearance_accent");
      } catch {
        // Ignore storage errors.
      }
      return migrated;
    }
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function applyUserProfile(profile: UserProfile): void {
  document.documentElement.style.setProperty("--navbar-bg", profile.appearance.accentColor);
  document.documentElement.style.setProperty("--nav-mobile-bg", profile.appearance.accentColor);
}