import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Save,
  X,
  Shield,
  Clock,
  Briefcase,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import ProfilePictureUpload from "../components/profile/ProfilePictureUpload";
import AddressAutocomplete from "../components/profile/AddressAutocomplete";
import { profileFormSchema } from "../utils/validation";
import { getCountries, getStatesForCountry } from "../utils/geo";
import toast from "react-hot-toast";

const COUNTRIES = getCountries();

const buildFormData = (user) => ({
  firstName: user?.firstName || "",
  lastName: user?.lastName || "",
  displayName: user?.displayName || "",
  email: user?.email || "",
  phone: user?.phone || "",
  birthday: user?.birthday || "",
  address: user?.address || "",
  city: user?.city || "",
  state: user?.state || "",
  zipCode: user?.zipCode || "",
  country: user?.country || "",
  tradingExperience: user?.tradingExperience || "",
  preferredMarkets: user?.preferredMarkets || [],
  riskTolerance: user?.riskTolerance || "",
  investmentGoals: user?.investmentGoals || "",
});

const tradingExperienceOptions = [
  { value: "beginner", label: "Beginner (0-1 years)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "advanced", label: "Advanced (3-5 years)" },
  { value: "expert", label: "Expert (5+ years)" },
];

const marketOptions = [
  { value: "stocks", label: "Stocks" },
  { value: "forex", label: "Forex" },
  { value: "futures", label: "Futures" },
  { value: "options", label: "Options" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "commodities", label: "Commodities" },
];

const riskToleranceOptions = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
  { value: "very_aggressive", label: "Very Aggressive" },
];

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => buildFormData(user));

  // Keep the form in sync with the source of truth when not actively editing
  // (e.g. after an avatar upload refreshes the user object).
  useEffect(() => {
    if (!isEditing) setFormData(buildFormData(user));
  }, [user, isEditing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // Chip toggle for preferred markets — adds or removes a market from the list.
  const toggleMarket = (value) => {
    setFormData((prev) => ({
      ...prev,
      preferredMarkets: prev.preferredMarkets.includes(value)
        ? prev.preferredMarkets.filter((m) => m !== value)
        : [...prev.preferredMarkets, value],
    }));
  };

  // States available for the currently selected country (empty if none/unknown).
  const stateOptions = useMemo(
    () => getStatesForCountry(formData.country),
    [formData.country]
  );

  // Changing country clears a state that no longer belongs to it.
  const handleCountryChange = (e) => {
    const country = e.target.value;
    const validStates = getStatesForCountry(country);
    setFormData((prev) => ({
      ...prev,
      country,
      state: validStates.includes(prev.state) ? prev.state : "",
    }));
  };

  // A picked autocomplete result fills street + city/state/zip/country at once.
  const handleAddressSelect = (parts) => {
    setFormData((prev) => ({
      ...prev,
      address: parts.address || prev.address,
      city: parts.city || prev.city,
      zipCode: parts.zipCode || prev.zipCode,
      country: parts.country || prev.country,
      // Only keep the parsed state if the country actually lists it.
      state: getStatesForCountry(parts.country).includes(parts.state)
        ? parts.state
        : parts.state || prev.state,
    }));
  };

  const handleCancel = () => {
    setErrors({});
    setIsEditing(false);
    setFormData(buildFormData(user));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = profileFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0]] = err.message;
      });
      setErrors(fieldErrors);
      toast.error(result.error.errors[0]?.message || "Please fix the errors below.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await updateUserProfile(formData);
      setIsEditing(false);
    } catch (error) {
      // updateUserProfile already surfaces a friendly toast
      console.error("Profile update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.displayName ||
    "Your Profile";
  const location = [user?.city, user?.country].filter(Boolean).join(", ");
  const memberSince = user?.createdAt
    ? format(new Date(user.createdAt), "MMMM yyyy")
    : null;
  const fieldError = (name) =>
    errors[name] ? (
      <p className="text-sm text-red-500 mt-1" data-testid={`profile-error-${name}`}>
        {errors[name]}
      </p>
    ) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="profile-page">
      {/* Hero / summary header */}
      <div
        className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.05)] dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,.3),0_20px_40px_rgba(0,0,0,.4)]"
        data-testid="profile-header-card"
      >
        <div className="h-[88px] bg-gradient-to-br from-primary-600 to-[#0f6b60]" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end space-x-4">
              <ProfilePictureUpload
                user={user}
                onUpdate={updateUserProfile}
                variant="avatar"
              />
              <div className="pb-1">
                <h1
                  className="text-2xl font-bold text-gray-900 dark:text-gray-300"
                  data-testid="profile-name-value"
                >
                  {fullName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {user?.role === "admin" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 capitalize">
                    {user?.status || "active"}
                  </span>
                  {user?.emailVerified && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 self-start rounded-[10px] bg-primary-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-primary-700 sm:self-auto dark:bg-teal-700 dark:text-white dark:hover:bg-teal-600"
                data-testid="profile-edit-btn"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2 self-start sm:self-auto">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 rounded-[10px] border border-gray-300 px-4 py-2.5 text-[13.5px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  disabled={isSubmitting}
                  data-testid="profile-cancel-btn"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 rounded-[10px] bg-primary-600 px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-primary-700 disabled:opacity-60 dark:bg-teal-700 dark:text-white dark:hover:bg-teal-600"
                  disabled={isSubmitting}
                  data-testid="profile-save-btn"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick facts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate" data-testid="profile-email-value">
                {user?.email || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{user?.phone || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{location || "Not set"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">
                {memberSince ? `Joined ${memberSince}` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" data-testid="profile-form">
        {/* Personal Information */}
        <div className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.05)] lg:p-8 dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,.3),0_20px_40px_rgba(0,0,0,.4)]">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#e7f5f2] dark:bg-[#2dd4bf]/10">
              <User className="h-4 w-4 text-primary-600 dark:text-[#2dd4bf]" />
            </span>
            <h2 className="text-[15px] font-bold text-gray-900 lg:text-[17px] dark:text-gray-300">
              Personal Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label required">First Name</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your first name"
                disabled={!isEditing}
                data-testid="profile-firstName-input"
              />
              {fieldError("firstName")}
            </div>

            <div>
              <label className="label required">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your last name"
                disabled={!isEditing}
                data-testid="profile-lastName-input"
              />
              {fieldError("lastName")}
            </div>

            <div>
              <label className="label">Display Name</label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="input"
                placeholder="How your name appears to others"
                disabled={!isEditing}
                data-testid="profile-displayName-input"
              />
            </div>

            <div>
              <label className="label required">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your email"
                disabled={!isEditing}
                data-testid="profile-email-input"
              />
              {fieldError("email")}
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your phone number"
                disabled={!isEditing}
                data-testid="profile-phone-input"
              />
              {fieldError("phone")}
            </div>

            <div>
              <label className="label">Birthday</label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleInputChange}
                className="input"
                disabled={!isEditing}
                data-testid="profile-birthday-input"
              />
            </div>

          </div>
        </div>

        {/* Address Information */}
        <div className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.05)] lg:p-8 dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,.3),0_20px_40px_rgba(0,0,0,.4)]">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#e7f5f2] dark:bg-[#2dd4bf]/10">
              <MapPin className="h-4 w-4 text-primary-600 dark:text-[#2dd4bf]" />
            </span>
            <h2 className="text-[15px] font-bold text-gray-900 lg:text-[17px] dark:text-gray-300">
              Address Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label">Street Address</label>
              <AddressAutocomplete
                value={formData.address}
                onChange={(text) =>
                  setFormData((prev) => ({ ...prev, address: text }))
                }
                onSelect={handleAddressSelect}
                disabled={!isEditing}
                testId="profile-address"
              />
            </div>

            <div>
              <label className="label">Country</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleCountryChange}
                className="input"
                disabled={!isEditing}
                data-testid="profile-country-select"
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.isoCode} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">State/Province</label>
              {stateOptions.length > 0 ? (
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="input"
                  disabled={!isEditing}
                  data-testid="profile-state-select"
                >
                  <option value="">Select your state/province</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="input"
                  placeholder={
                    formData.country
                      ? "Enter your state/province"
                      : "Select a country first"
                  }
                  disabled={!isEditing}
                  data-testid="profile-state-input"
                />
              )}
            </div>

            <div>
              <label className="label">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your city"
                disabled={!isEditing}
                data-testid="profile-city-input"
              />
            </div>

            <div>
              <label className="label">ZIP/Postal Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your ZIP code"
                disabled={!isEditing}
                data-testid="profile-zipCode-input"
              />
            </div>
          </div>
        </div>

        {/* Trading Profile */}
        <div className="rounded-[14px] border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.05)] lg:p-8 dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,.3),0_20px_40px_rgba(0,0,0,.4)]">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-[#e7f5f2] dark:bg-[#2dd4bf]/10">
              <Briefcase className="h-4 w-4 text-primary-600 dark:text-[#2dd4bf]" />
            </span>
            <h2 className="text-[15px] font-bold text-gray-900 lg:text-[17px] dark:text-gray-300">
              Trading Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Trading Experience</label>
              <select
                name="tradingExperience"
                value={formData.tradingExperience}
                onChange={handleInputChange}
                className="input"
                disabled={!isEditing}
                data-testid="profile-tradingExperience-select"
              >
                <option value="">Select experience level</option>
                {tradingExperienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Risk Tolerance</label>
              <select
                name="riskTolerance"
                value={formData.riskTolerance}
                onChange={handleInputChange}
                className="input"
                disabled={!isEditing}
                data-testid="profile-riskTolerance-select"
              >
                <option value="">Select risk tolerance</option>
                {riskToleranceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">Preferred Markets</label>
              <div
                className="flex flex-wrap gap-2"
                data-testid="profile-preferredMarkets-group"
              >
                {marketOptions.map((option) => {
                  const selected = formData.preferredMarkets.includes(
                    option.value
                  );
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleMarket(option.value)}
                      disabled={!isEditing}
                      aria-pressed={selected}
                      data-testid={`profile-preferredMarkets-${option.value}-chip`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selected
                          ? "bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:border-primary-400 dark:text-primary-300"
                          : "bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                      } ${
                        isEditing
                          ? "cursor-pointer hover:border-primary-400 dark:hover:border-primary-500"
                          : "cursor-default"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing
                  ? "Tap to select the markets you trade."
                  : formData.preferredMarkets.length === 0
                    ? "No markets selected yet."
                    : ""}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="label">Investment Goals</label>
              <textarea
                name="investmentGoals"
                value={formData.investmentGoals}
                onChange={handleInputChange}
                className="input resize-none"
                rows="3"
                placeholder="Describe your investment goals..."
                disabled={!isEditing}
                data-testid="profile-investmentGoals-input"
              />
              {fieldError("investmentGoals")}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
