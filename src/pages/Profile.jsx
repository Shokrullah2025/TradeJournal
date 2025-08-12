import React, { useState } from "react";
import {
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfilePictureUpload from "../components/profile/ProfilePictureUpload";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    birthday: user?.birthday || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zipCode: user?.zipCode || "",
    country: user?.country || "",
    bio: user?.bio || "",
    tradingExperience: user?.tradingExperience || "",
    preferredMarkets: user?.preferredMarkets || [],
    riskTolerance: user?.riskTolerance || "",
    investmentGoals: user?.investmentGoals || "",
    timezone:
      user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMultiSelectChange = (e) => {
    const { name, value } = e.target;
    const selectedOptions = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData((prev) => ({
      ...prev,
      [name]: selectedOptions,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast.error(
          "Please fill in all required fields (First Name, Last Name, Email)"
        );
        setIsSubmitting(false);
        return;
      }

      // Here you would typically send data to your backend API
      // For now, we'll update the user context
      await updateUserProfile(formData);

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("Profile update error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your personal information and trading preferences
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  firstName: user?.firstName || "",
                  lastName: user?.lastName || "",
                  email: user?.email || "",
                  phone: user?.phone || "",
                  birthday: user?.birthday || "",
                  address: user?.address || "",
                  city: user?.city || "",
                  state: user?.state || "",
                  zipCode: user?.zipCode || "",
                  country: user?.country || "",
                  bio: user?.bio || "",
                  tradingExperience: user?.tradingExperience || "",
                  preferredMarkets: user?.preferredMarkets || [],
                  riskTolerance: user?.riskTolerance || "",
                  investmentGoals: user?.investmentGoals || "",
                  timezone:
                    user?.timezone ||
                    Intl.DateTimeFormat().resolvedOptions().timeZone,
                });
              }}
              className="btn btn-secondary flex items-center space-x-2"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary flex items-center space-x-2"
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Picture Section */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Profile Picture
            </h2>
          </div>

          <ProfilePictureUpload user={user} onUpdate={updateUserProfile} />
        </div>

        {/* Personal Information */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
                required
              />
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
                required
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
                required
              />
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
              />
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
              />
            </div>

            <div>
              <label className="label">Timezone</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="input"
                disabled={!isEditing}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Asia/Kolkata">Mumbai</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Address Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="label">Street Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your street address"
                disabled={!isEditing}
              />
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
              />
            </div>

            <div>
              <label className="label">State/Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your state/province"
                disabled={!isEditing}
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
              />
            </div>

            <div>
              <label className="label">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="input"
                placeholder="Enter your country"
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Trading Profile */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
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
              <select
                name="preferredMarkets"
                value={formData.preferredMarkets}
                onChange={handleMultiSelectChange}
                className="input"
                multiple
                disabled={!isEditing}
                size="3"
              >
                {marketOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple markets
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
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="input resize-none"
                rows="4"
                placeholder="Tell us about yourself..."
                disabled={!isEditing}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
