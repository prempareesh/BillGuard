import { create } from "zustand";

export interface ConsumerProfile {
  fullName: string;
  email: string;
  phone: string;
  serviceNumber: string;
  consumerNumber: string;
  discom: "APSPDCL" | "APCPDCL" | "APEPDCL" | "";
  consumerCategory: "Domestic" | "Commercial" | "";
  distributionSection: string;
  updatedAt?: string;
}

export const EMPTY_PROFILE: ConsumerProfile = {
  fullName: "",
  email: "",
  phone: "",
  serviceNumber: "",
  consumerNumber: "",
  discom: "",
  consumerCategory: "",
  distributionSection: "",
  updatedAt: undefined,
};

const STORAGE_KEY = "billguard_consumer_profile";

/**
 * Extracts 1-2 uppercase initials from a person's full name.
 * e.g., "K. Raghunath Reddy" -> "KR", "Prashanth" -> "PR", "" -> "CP"
 */
export function getProfileInitials(name?: string): string {
  if (!name || !name.trim()) return "CP";
  const cleaned = name.replace(/[^a-zA-Z\s]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CP";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Validates consumer profile fields.
 */
export function validateProfile(data: ConsumerProfile): {
  isValid: boolean;
  errors: Partial<Record<keyof ConsumerProfile, string>>;
} {
  const errors: Partial<Record<keyof ConsumerProfile, string>> = {};

  // Full Name validation (Required)
  const trimmedName = data.fullName.trim();
  if (!trimmedName) {
    errors.fullName = "Full name is required.";
  } else if (trimmedName.length < 2) {
    errors.fullName = "Full name must be at least 2 characters long.";
  } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
    errors.fullName = "Full name contains invalid characters.";
  }

  // Email validation (Optional, but must be valid if provided)
  const trimmedEmail = data.email.trim();
  if (trimmedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }
  }

  // Phone validation (Optional, 10-digit standard if provided)
  const trimmedPhone = data.phone.trim().replace(/[\s-]/g, "");
  if (trimmedPhone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      errors.phone = "Please enter a valid 10-digit Indian mobile number.";
    }
  }

  // Service Number validation (Optional, alphanumeric USC identifier)
  const trimmedService = data.serviceNumber.trim();
  if (trimmedService && trimmedService.length < 3) {
    errors.serviceNumber = "Service connection number must be at least 3 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

interface ProfileStoreState {
  profile: ConsumerProfile;
  isLoaded: boolean;
  saveProfile: (updated: ConsumerProfile) => { success: boolean; errors?: Partial<Record<keyof ConsumerProfile, string>> };
  clearProfile: () => void;
  loadFromStorage: () => void;
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  profile: EMPTY_PROFILE,
  isLoaded: false,

  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          profile: {
            fullName: String(parsed.fullName || ""),
            email: String(parsed.email || ""),
            phone: String(parsed.phone || ""),
            serviceNumber: String(parsed.serviceNumber || ""),
            consumerNumber: String(parsed.consumerNumber || ""),
            discom: (parsed.discom as ConsumerProfile["discom"]) || "",
            consumerCategory: (parsed.consumerCategory as ConsumerProfile["consumerCategory"]) || "",
            distributionSection: String(parsed.distributionSection || ""),
            updatedAt: parsed.updatedAt ? String(parsed.updatedAt) : undefined,
          },
          isLoaded: true,
        });
        return;
      }
    } catch (e) {
      console.warn("Could not load consumer profile from localStorage:", e);
    }
    set({ profile: EMPTY_PROFILE, isLoaded: true });
  },

  saveProfile: (updated: ConsumerProfile) => {
    const { isValid, errors } = validateProfile(updated);
    if (!isValid) {
      return { success: false, errors };
    }

    const payload: ConsumerProfile = {
      ...updated,
      fullName: updated.fullName.trim(),
      email: updated.email.trim(),
      phone: updated.phone.trim().replace(/[\s-]/g, ""),
      serviceNumber: updated.serviceNumber.trim(),
      consumerNumber: updated.consumerNumber.trim(),
      distributionSection: updated.distributionSection.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.error("Failed to save profile to localStorage:", e);
        return {
          success: false,
          errors: { fullName: "Storage access error. Could not save to browser cache." },
        };
      }
    }

    set({ profile: payload, isLoaded: true });
    return { success: true };
  },

  clearProfile: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn("Could not remove profile from localStorage:", e);
      }
    }
    set({ profile: EMPTY_PROFILE, isLoaded: true });
  },
}));
